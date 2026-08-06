# Agência RLG

Site responsivo com formulário de contato integrado a um back-end
**serverless** na AWS. Os contatos enviados pelo site são armazenados em banco de dados
e a equipe recebe um aviso por e-mail a cada novo lead.

🔗 **Site no ar:** [www.agenciarlg.com](https://www.agenciarlg.com)

---

## Sobre

Site da Agência RLG, em produção. Além da camada visual, o projeto inclui um back-end
para captação de leads que não depende de nenhum servidor mantido ligado, tudo é
executado sob demanda.

---

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Front-end | HTML5, CSS3, JavaScript |
| Hospedagem | Amazon S3 |
| CDN e HTTPS | Amazon CloudFront + AWS Certificate Manager |
| API | Amazon API Gateway |
| Processamento | AWS Lambda (Python 3) |
| Banco de dados | Amazon DynamoDB |
| Notificação por e-mail | Amazon SNS |
| DNS | Hostinger |

---

## Como a AWS foi utilizada

O projeto usa uma arquitetura **serverless**: não há máquina virtual nem servidor ligado
em nenhum momento. Cada serviço cuida de uma parte específica.

**Hospedagem — Amazon S3**
Os arquivos do site ficam em um bucket S3 com hospedagem de site estático habilitada.
Não existe servidor web tradicional: o próprio S3 entrega os arquivos.

**Entrega e HTTPS — CloudFront e Certificate Manager**
O CloudFront fica à frente do S3 e cumpre dois papéis. Distribui o conteúdo a partir de
servidores espalhados pelo mundo, de modo que o visitante brasileiro é atendido pelo ponto
de presença de São Paulo. E adiciona o HTTPS, com um certificado emitido gratuitamente
pelo Certificate Manager e renovado de forma automática.

**Domínio — DNS na Hostinger**
O domínio é registrado na Hostinger, e um registro de DNS direciona
`www.agenciarlg.com` para a distribuição do CloudFront.

**Recebimento do formulário — API Gateway**
Expõe o endereço público que o site chama no momento do envio. Também aplica um limite de
requisições por segundo, o que impede que envios automatizados sobrecarreguem o sistema.

**Processamento — AWS Lambda**
Uma função em Python é executada apenas quando alguém envia o formulário. Ela verifica se
os campos obrigatórios vieram preenchidos, grava o contato e dispara a notificação. Entre
um envio e outro não há nada em execução.

**Armazenamento — DynamoDB**
Cada contato vira um registro com identificador único, nome, e-mail, telefone, mensagem e
data de envio.

**Aviso por e-mail — Amazon SNS**
Assim que o contato é gravado, a Lambda publica uma mensagem no SNS, que envia o e-mail
para a equipe com os dados do lead já formatados.

---

## Estrutura do projeto

```
.
├── index.html          # Página única, com as seções do site
├── estilos/
│   ├── style.css       # Estilos base e mobile
│   └── telaGrande.css  # Ajustes para telas maiores
├── scripts/
│   └── script.js       # Interações e envio do formulário para a API
└── imagens/
```

---

## Licença

Distribuído sob a licença incluída em [LICENSE](LICENSE).
