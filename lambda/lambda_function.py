import json
import os
import re
import uuid
from datetime import datetime, timezone, timedelta

import boto3

# Conecta ao DynamoDB
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('feedback-rlg')

# Conecta ao SNS (avisos por e-mail)
sns = boto3.client('sns')
TOPIC_ARN = os.environ.get('SNS_TOPIC_ARN')

# Brasil não usa mais horário de verão, então o offset é fixo
FUSO_BR = timezone(timedelta(hours=-3))

# Retenção de 24 meses, conforme a política de privacidade. O DynamoDB exige
# o TTL como número inteiro de segundos desde 1970 (epoch). Se gravar string
# ou milissegundos ele não reclama, só nunca apaga
RETENCAO_DIAS = 730

# Tamanho máximo do corpo cru, checado antes do parse: descarta um POST
# gigante sem gastar memória processando o JSON
LIMITE_CORPO_BYTES = 8 * 1024

# Só estes campos são aceitos. Qualquer outro que venha no JSON é ignorado,
# então ninguém consegue inflar o registro com dado extra
LIMITES = {
    'nome': 100,
    'email': 150,
    'telefone': 30,
    'motivo': 2000,
}

# Validação de e-mail deliberadamente permissiva. A regra oficial (RFC 5322)
# é grande demais e acaba rejeitando endereço válido. Aqui só barramos o que
# está obviamente quebrado
PADRAO_EMAIL = re.compile(r'^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$')

# Caracteres que fazem Excel, LibreOffice e Sheets tratarem a célula como
# fórmula em vez de texto. O \t e o \r entram na lista porque alguns leitores
# de CSV usam os dois para pular de célula, o que permite contrabandear um
# "=" para a célula seguinte
INICIAIS_PERIGOSAS = ('=', '+', '-', '@', '\t', '\r')

CABECALHOS = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
}


class DadoInvalido(Exception):
    """Erro de validação. A mensagem é segura para mostrar ao visitante."""


def resposta(status, corpo):
    """Monta o retorno no formato que o API Gateway espera."""
    return {
        'statusCode': status,
        'headers': CABECALHOS,
        'body': json.dumps(corpo, ensure_ascii=False)
    }


def limpar_controle(texto, permitir_quebra_linha):
    """Remove caracteres de controle invisíveis (\\x00 a \\x1f).

    Não têm uso legítimo num formulário de contato e servem para bagunçar
    CSV, log e terminal de quem for ler o dado depois.
    """
    permitidos = '\n' if permitir_quebra_linha else ''
    return ''.join(c for c in texto if c >= ' ' or c in permitidos)


def blindar_csv(texto):
    """Neutraliza CSV injection prefixando um apóstrofo.

    O apóstrofo faz a planilha tratar a célula como texto literal, e ele
    mesmo não aparece na exibição. Só é aplicado quando o campo de fato
    começa com caractere perigoso, então a grande maioria dos registros é
    gravada exatamente como o visitante digitou.
    """
    if texto and texto[0] in INICIAIS_PERIGOSAS:
        return "'" + texto
    return texto


def extrair(body, campo, permitir_quebra_linha=False):
    """Pega um campo do formulário já limpo, ou levanta DadoInvalido."""
    valor = body.get(campo)

    # Recusa número, lista, dicionário, None. Só string passa
    if not isinstance(valor, str):
        raise DadoInvalido('O campo ' + campo + ' é obrigatório.')

    valor = limpar_controle(valor, permitir_quebra_linha).strip()

    if not valor:
        raise DadoInvalido('O campo ' + campo + ' é obrigatório.')

    if len(valor) > LIMITES[campo]:
        raise DadoInvalido(
            'O campo ' + campo + ' passa do limite de '
            + str(LIMITES[campo]) + ' caracteres.'
        )

    return valor


def validar(body):
    """Recebe o JSON do formulário e devolve os campos limpos e blindados."""
    if not isinstance(body, dict):
        raise DadoInvalido('Formato de envio inválido.')

    nome = extrair(body, 'nome')
    email = extrair(body, 'email')
    telefone = extrair(body, 'telefone')
    motivo = extrair(body, 'motivo', permitir_quebra_linha=True)

    if not PADRAO_EMAIL.match(email):
        raise DadoInvalido('E-mail inválido.')

    # Exige um mínimo de dígitos para barrar "abc" ou "1". Não validamos o
    # formato brasileiro para não recusar número de fora
    if len(re.sub(r'\D', '', telefone)) < 8:
        raise DadoInvalido('Telefone inválido.')

    return {
        'nome': blindar_csv(nome),
        'email': blindar_csv(email),
        'telefone': blindar_csv(telefone),
        'motivo': blindar_csv(motivo),
    }


def avisar_novo_contato(dados, quando):
    """Envia o aviso por e-mail. Nunca derruba o fluxo do formulário."""
    if not TOPIC_ARN:
        print('SNS_TOPIC_ARN nao configurado; aviso ignorado.')
        return

    try:
        sns.publish(
            TopicArn=TOPIC_ARN,
            Subject='Novo contato pelo site',
            Message=(
                'Nome: ' + dados['nome'] + '\n'
                + 'E-mail: ' + dados['email'] + '\n'
                + 'Telefone: ' + dados['telefone'] + '\n'
                + 'Recebido em: ' + quando + '\n\n'
                + 'Mensagem:\n' + dados['motivo'] + '\n'
            )
        )
    except Exception as erro:
        print('Falha ao enviar aviso:', erro)


def lambda_handler(event, context):
    try:
        # O API Gateway envia os dados do formulário no campo 'body' como texto
        corpo_cru = event.get('body') or '{}'

        # len() de string conta caractere, não byte. Como o limite é de
        # tráfego, a medida tem que ser em bytes
        if len(corpo_cru.encode('utf-8')) > LIMITE_CORPO_BYTES:
            return resposta(413, {'error': 'Envio grande demais.'})

        try:
            body = json.loads(corpo_cru)
        except ValueError:
            return resposta(400, {'error': 'Formato de envio inválido.'})

        try:
            dados = validar(body)
        except DadoInvalido as erro:
            # Registra no CloudWatch para dar para diagnosticar a recusa
            print('Envio recusado:', erro)
            return resposta(400, {'error': str(erro)})

        agora = datetime.now(FUSO_BR)
        data_envio = agora.isoformat(timespec='seconds')

        # Salva o registro no banco com um ID único
        item = dict(dados)
        item['id'] = str(uuid.uuid4())
        item['data_envio'] = data_envio

        # int() é obrigatório: o TTL precisa ser Number, não String.
        # O .timestamp() já devolve o epoch correto em UTC mesmo o datetime
        # estando em horário de Brasília
        vencimento = agora + timedelta(days=RETENCAO_DIAS)
        item['expira_em'] = int(vencimento.timestamp())

        table.put_item(Item=item)

        # Só avisa depois que o dado está salvo
        avisar_novo_contato(dados, data_envio)

        return resposta(200, {'message': 'Salvo com sucesso!'})

    except Exception as e:
        print('Erro:', e)
        return resposta(500, {'error': 'Erro interno.'})
