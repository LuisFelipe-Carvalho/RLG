/* =========================================================
   Barra de navegação (pílula do topo)
   - Scroll-spy: a seção que cruza a linha a 40% da tela fica
     ativa; o link dela muda de cor e o traço desliza até ele.
     Só vale para links "#..." da própria página (nas páginas
     legais os links vão para index.html#... e nada é marcado).
   - Gaveta do celular: véu, Esc fecha, foco preso dentro dela,
     scroll da página travado, aria-expanded no botão.
   ========================================================= */
(() => {
    const menu = document.getElementById('menu-links');
    const btnMenu = document.getElementById('btn-menu');
    const veu = document.querySelector('.topo-veu');
    if (!menu || !btnMenu) return;

    const indicador = menu.querySelector('.topo-indicador');
    const linksDaLista = [...menu.querySelectorAll('.topo-links a')];
    const linksDaPagina = [...menu.querySelectorAll('a[href^="#"]')];
    const telaGrande = window.matchMedia('(min-width: 900px)');

    /* ---------- Scroll-spy e traço deslizante ---------- */

    let ativo = null;

    function moverTraco() {
        if (!indicador) return;
        // Na Home (o topo da página) e no Agendar (o botão já é o destaque) não há traço
        const alvo = ativo && linksDaLista.includes(ativo) && ativo.getAttribute('href') !== '#home' ? ativo : null;
        if (!alvo || !telaGrande.matches) {
            delete menu.dataset.indicador;
            return;
        }
        menu.style.setProperty('--x', `${alvo.offsetLeft + 12}px`);
        menu.style.setProperty('--w', String(Math.max(alvo.offsetWidth - 24, 0)));
        menu.dataset.indicador = '';
    }

    function marcar(id) {
        ativo = linksDaPagina.find(a => a.getAttribute('href') === `#${id}`) || null;
        linksDaPagina.forEach(a => a.classList.toggle('ativo', a === ativo));
        moverTraco();
    }

    const secoes = linksDaPagina
        .map(a => document.getElementById(a.getAttribute('href').slice(1)))
        .filter(Boolean);

    if (secoes.length && 'IntersectionObserver' in window) {
        // Uma linha fina a 40% da altura da tela (o mesmo gatilho da versão anterior)
        const observador = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) marcar(entrada.target.id);
            });
        }, { rootMargin: '-40% 0px -60% 0px' });
        secoes.forEach(secao => observador.observe(secao));
    }

    // A largura dos links muda quando as fontes carregam e quando a tela muda
    window.addEventListener('resize', moverTraco);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(moverTraco);

    /* ---------- Gaveta do celular ---------- */

    const focaveis = () => [btnMenu, ...menu.querySelectorAll('a[href], button')]
        .filter(el => el.offsetParent !== null || el === btnMenu);

    function abrir() {
        menu.classList.add('ativo-mobile');
        btnMenu.setAttribute('aria-expanded', 'true');
        btnMenu.setAttribute('aria-label', 'Fechar menu');
        if (veu) veu.hidden = false;
        document.documentElement.classList.add('menu-aberto');
        const primeiro = menu.querySelector('a[href]');
        if (primeiro) primeiro.focus();
    }

    function fechar({ devolverFoco = false } = {}) {
        if (!menu.classList.contains('ativo-mobile')) return;
        menu.classList.remove('ativo-mobile');
        btnMenu.setAttribute('aria-expanded', 'false');
        btnMenu.setAttribute('aria-label', 'Abrir menu');
        if (veu) veu.hidden = true;
        document.documentElement.classList.remove('menu-aberto');
        if (devolverFoco) btnMenu.focus();
    }

    btnMenu.addEventListener('click', () => {
        if (menu.classList.contains('ativo-mobile')) fechar({ devolverFoco: true });
        else abrir();
    });

    if (veu) veu.addEventListener('click', () => fechar({ devolverFoco: true }));

    // Clicar num link leva à seção e fecha a gaveta
    menu.querySelectorAll('a[href]').forEach(link => {
        link.addEventListener('click', () => fechar());
    });

    document.addEventListener('keydown', evento => {
        if (!menu.classList.contains('ativo-mobile')) return;

        if (evento.key === 'Escape') {
            fechar({ devolverFoco: true });
            return;
        }

        // Foco preso: Tab circula entre o botão de fechar e os links da gaveta
        if (evento.key === 'Tab') {
            const lista = focaveis();
            const primeiro = lista[0];
            const ultimo = lista[lista.length - 1];
            if (evento.shiftKey && document.activeElement === primeiro) {
                evento.preventDefault();
                ultimo.focus();
            } else if (!evento.shiftKey && document.activeElement === ultimo) {
                evento.preventDefault();
                primeiro.focus();
            }
        }
    });

    // Na tela grande não existe gaveta: fecha se estiver aberta e recalcula o traço
    telaGrande.addEventListener('change', () => {
        fechar();
        moverTraco();
    });
})();

/* Explicação: revelação e cenas ficam em scripts/explicacao-anima.js */

/* Envio do formulário de contato para a AWS (API Gateway -> Lambda -> DynamoDB)
   A Lambda exige nome, email, telefone e motivo. O motivo é montado aqui com
   os chips marcados ("O que mais pesa hoje?") mais o texto opcional.
   Erros aparecem embaixo de cada campo e numa área role="status"; o sucesso
   troca o formulário por um painel de confirmação. */
document.addEventListener('DOMContentLoaded', () => {
    // Invoke URL do API Gateway (rota /enviar).
    const urlDaAPI = 'https://khwjhz2sid.execute-api.us-east-2.amazonaws.com/enviar';

    const formulario = document.getElementById('formulario-call');
    if (!formulario) return;

    const campoNome = document.getElementById('nome');
    const campoEmail = document.getElementById('email');
    const campoTelefone = document.getElementById('telefone');
    const campoMotivo = document.getElementById('motivo');
    const campoOutro = document.getElementById('outro');
    const chipOutro = formulario.querySelector('.chip input[value="Outro"]');
    const chips = formulario.querySelector('.chips');
    const status = formulario.querySelector('.agendar-status');
    const sucesso = document.querySelector('.agendar-sucesso');
    const botao = formulario.querySelector('button[type="submit"]');

    // Mesmo padrão permissivo da Lambda: só barra o que está obviamente quebrado
    const PADRAO_EMAIL = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;

    /* ---------- Máscara do telefone: (00) 00000-0000 ---------- */
    function mascararTelefone(valor) {
        const d = valor.replace(/\D/g, '').slice(0, 11);
        if (d.length <= 2) return d.length ? `(${d}` : '';
        if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
        if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
        return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    }

    campoTelefone.addEventListener('input', () => {
        // número estrangeiro (com +) fica como a pessoa digitou
        if (campoTelefone.value.trim().startsWith('+')) return;
        campoTelefone.value = mascararTelefone(campoTelefone.value);
    });

    /* ---------- Erros por campo ---------- */
    function marcarErro(campo, mensagem) {
        const alvo = campo === chips ? campoMotivo : campo;
        const saida = document.getElementById(`${alvo.id}-erro`);
        campo.setAttribute('aria-invalid', mensagem ? 'true' : 'false');
        if (saida) saida.textContent = mensagem || '';
    }

    function marcados() {
        return [...chips.querySelectorAll('input:checked')].map(c => c.value);
    }

    function validar() {
        const erros = [];
        const nome = campoNome.value.trim();
        const email = campoEmail.value.trim();
        const digitos = campoTelefone.value.replace(/\D/g, '');

        if (!nome) erros.push([campoNome, 'Diga como podemos te chamar.']);
        else marcarErro(campoNome, '');

        if (!email) erros.push([campoEmail, 'Precisamos do seu email.']);
        else if (!PADRAO_EMAIL.test(email)) erros.push([campoEmail, 'Confira o email, parece incompleto.']);
        else marcarErro(campoEmail, '');

        if (digitos.length < 8) erros.push([campoTelefone, 'Coloque o telefone com DDD.']);
        else marcarErro(campoTelefone, '');

        if (!marcados().length && !campoMotivo.value.trim()) {
            erros.push([chips, 'Escolha pelo menos uma opção ou conte em poucas palavras.']);
        } else {
            marcarErro(chips, '');
        }

        if (chipOutro.checked && !campoOutro.value.trim()) {
            erros.push([campoOutro, 'Conte em poucas palavras o que é.']);
        } else {
            marcarErro(campoOutro, '');
        }

        erros.forEach(([campo, msg]) => marcarErro(campo, msg));
        return erros;
    }

    // O erro some assim que a pessoa corrige
    [campoNome, campoEmail, campoTelefone, campoMotivo, campoOutro].forEach(campo => {
        campo.addEventListener('input', () => {
            if (campo.getAttribute('aria-invalid') === 'true') validar();
        });
    });
    chips.addEventListener('change', (evento) => {
        // "Outro" marcado: a caixa de texto aparece (pelo CSS) e já recebe o cursor
        if (evento.target === chipOutro && chipOutro.checked) campoOutro.focus();
        const comErro = chips.getAttribute('aria-invalid') === 'true'
            || campoOutro.getAttribute('aria-invalid') === 'true';
        if (comErro) validar();
    });

    function montarMotivo() {
        const outro = campoOutro.value.trim();
        const lista = marcados().map(v => (v === 'Outro' && outro ? `Outro (${outro})` : v));
        const texto = campoMotivo.value.trim();
        const partes = [];
        if (lista.length) partes.push(`O que mais pesa: ${lista.join(', ')}.`);
        if (texto) partes.push(texto);
        return partes.join(' ');
    }

    // Erro devolvido pela Lambda: aponta o campo quando a mensagem diz qual é
    function focarPeloErro(mensagem) {
        const texto = (mensagem || '').toLowerCase();
        if (texto.includes('e-mail') || texto.includes('email')) campoEmail.focus();
        else if (texto.includes('telefone')) campoTelefone.focus();
        else if (texto.includes('nome')) campoNome.focus();
        else if (texto.includes('motivo')) campoMotivo.focus();
    }

    function mostrarSucesso(nome) {
        const primeiro = nome.split(/\s+/)[0];
        const titulo = sucesso.querySelector('.agendar-sucesso-titulo');
        if (primeiro) titulo.textContent = `Recebemos, ${primeiro}!`;
        formulario.hidden = true;
        sucesso.hidden = false;
        sucesso.focus();
    }

    formulario.addEventListener('submit', (evento) => {
        // Impede a página de recarregar ao enviar.
        evento.preventDefault();
        status.textContent = '';

        const erros = validar();
        if (erros.length) {
            const primeiro = erros[0][0];
            (primeiro === chips ? chips.querySelector('input') : primeiro).focus();
            return;
        }

        const textoOriginal = botao.textContent;
        botao.textContent = 'Enviando…';
        botao.disabled = true;

        const dados = {
            nome: campoNome.value.trim(),
            email: campoEmail.value.trim(),
            telefone: campoTelefone.value.trim(),
            motivo: montarMotivo()
        };

        fetch(urlDaAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        })
            .then(resposta => {
                if (resposta.ok) {
                    formulario.reset();
                    mostrarSucesso(dados.nome);
                    return;
                }

                // A Lambda devolve o motivo da recusa em {"error": "..."}.
                // Sem isso o visitante não sabe qual campo corrigir.
                return resposta.json()
                    .then(corpo => {
                        status.textContent = corpo.error || 'Não conseguimos enviar. Tente de novo em instantes.';
                        focarPeloErro(corpo.error);
                    })
                    .catch(() => {
                        status.textContent = 'Não conseguimos enviar. Tente de novo em instantes.';
                    });
            })
            .catch(erro => {
                console.error('Erro:', erro);
                status.textContent = 'Sem conexão com o servidor. Confira a internet e tente de novo.';
            })
            .finally(() => {
                botao.textContent = textoOriginal;
                botao.disabled = false;
            });
    });
});
