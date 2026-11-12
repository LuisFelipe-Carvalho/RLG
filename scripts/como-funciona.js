/* =========================================================
   Como funciona: um passo por vez, avançando no clique.

   "Próximo passo" (ou o clique num passo) desenha a linha
   do passo atual até o seguinte; quando a linha chega, o
   próximo passo acende, abre o texto e a imagem aproxima a
   parte que ele mostra. No último passo aparece a chamada.

   Sem JS a seção mostra tudo aberto (estado do HTML/CSS).
   Com "reduzir movimento" a troca é imediata.
   ========================================================= */
(() => {
    const secao = document.querySelector('#como-funciona');
    if (!secao) return;

    const passos = [...secao.querySelectorAll('.passo')];
    const gatilhos = passos.map(passo => passo.querySelector('.passo-gatilho'));
    const titulos = passos.map(passo => passo.querySelector('.passo-titulo').textContent.trim());
    const visual = secao.querySelector('.como-visual');
    const proximo = secao.querySelector('.passos-proximo');
    const cta = secao.querySelector('.passos-cta');
    const aviso = secao.querySelector('.como-aviso');
    if (!passos.length || !visual || !proximo) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const ultimo = passos.length - 1;

    // Tempo (ms) para a linha se desenhar antes do próximo passo acender.
    // Igual à transição de .passo-linha::after no CSS.
    const TEMPO_LINHA = 380;

    let atual = 0;   // passo aceso agora
    let destino = 0; // passo pedido pelo último clique
    let espera = null;

    function mostrar(indice, anunciar) {
        passos.forEach((passo, i) => {
            passo.dataset.estado = i < indice ? 'feito' : i === indice ? 'atual' : 'futuro';
            delete passo.dataset.avancando;
            gatilhos[i].setAttribute('aria-expanded', String(i === indice));
            if (i === indice) {
                gatilhos[i].setAttribute('aria-current', 'step');
            } else {
                gatilhos[i].removeAttribute('aria-current');
            }
        });

        visual.dataset.foco = String(indice + 1);
        atual = indice;

        const chegouNoFim = indice === ultimo;
        if (chegouNoFim) {
            // O botão some no último passo: o foco vai para a chamada
            const focoNoBotao = document.activeElement === proximo;
            secao.dataset.fim = '';
            if (focoNoBotao && cta) cta.focus();
        } else {
            delete secao.dataset.fim;
        }

        if (anunciar && aviso) {
            aviso.textContent = `Passo ${indice + 1} de ${passos.length}: ${titulos[indice]}`;
        }
    }

    function irPara(alvo) {
        alvo = Math.max(0, Math.min(alvo, ultimo));
        destino = alvo;
        clearTimeout(espera);

        // Voltar, ficar no mesmo ou menos movimento: muda na hora
        if (alvo <= atual || movimentoReduzido.matches) {
            mostrar(alvo, true);
            return;
        }

        // Avançar: desenha a linha do passo atual e, quando ela chega,
        // acende o próximo. Se o alvo estiver mais longe, repete.
        const avancar = () => {
            passos[atual].dataset.avancando = '';
            espera = setTimeout(() => {
                mostrar(atual + 1, atual + 1 === destino);
                if (atual < destino) avancar();
            }, TEMPO_LINHA);
        };
        avancar();
    }

    gatilhos.forEach((gatilho, i) => {
        gatilho.addEventListener('click', () => irPara(i));
    });

    proximo.addEventListener('click', () => irPara(destino + 1));

    // Liga o modo interativo: começa no primeiro passo
    secao.dataset.js = 'passos';
    mostrar(0, false);
})();
