/* =========================================================
   Explicação: movimento preso à rolagem (GSAP).

   Ferramentas (scripts/vendor/gsap, 3.13, servidas do próprio
   site): ScrollTrigger com scrub, SplitText e DrawSVG.
   Rolar para trás desfaz tudo junto.

   Em qualquer tela (com movimento):
   - o título e o texto de abertura acendem letra por letra
     conforme entram na tela.

   No computador, com a demo montada (scripts/explicacao-anima.js
   dispara 'exp:montou' e 'exp:desmontou'):
   - o palco chega inclinado e menor e se endireita; no fim
     da seção, recua;
   - uma linha à esquerda dos passos se desenha com a rolagem
     (DrawSVG), do primeiro ao último passo;
   - o título de cada passo sobe letra por letra e o texto
     linha por linha; quando o passo acaba, ele sai por cima;
   - o céu da seção (a tela toda, estilos/explicacao.css e
     scripts/explicacao-ceu.js) clareia aos poucos entre um
     passo e outro (noite, madrugada, amanhecer, dia) e, no
     fim da seção, volta ao escuro da página junto com o palco
     que recua. A rolagem move a variável --ceu-fase (0 a 4)
     na seção; o texto troca de tinta sozinho no meio da troca;
   - entre um passo e outro, a janela "respira": recua, gira
     de leve e volta.

   As cenas da Ana (a conversa, o relógio, a consulta) seguem
   tocando por tempo, no limiar de cada passo, como antes.
   Sem JS, sem GSAP ou com "reduzir movimento": nada disso
   roda e a seção fica como na versão estática.
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    const { gsap, ScrollTrigger, SplitText, DrawSVGPlugin } = window;
    if (!secao || !gsap || !ScrollTrigger || !SplitText || !DrawSVGPlugin) return;

    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);

    const mm = gsap.matchMedia();

    /* ---------- Abertura: o título acende letra por letra ---------- */

    mm.add('(prefers-reduced-motion: no-preference)', () => {
        const titulo = secao.querySelector('.exp-titulo');
        const abertura = secao.querySelector('.exp-cabecalho p');
        if (!titulo) return;

        const letras = SplitText.create(titulo, { type: 'words,chars' });
        gsap.from(letras.chars, {
            opacity: 0.12,
            stagger: 0.03,
            ease: 'none',
            scrollTrigger: { trigger: titulo, start: 'top 85%', end: 'bottom 45%', scrub: true }
        });

        if (abertura) {
            const palavras = SplitText.create(abertura, { type: 'words' });
            gsap.from(palavras.words, {
                opacity: 0.12,
                stagger: 0.05,
                ease: 'none',
                scrollTrigger: { trigger: abertura, start: 'top 85%', end: 'bottom 55%', scrub: true }
            });
        }
    });

    /* ---------- Demo do computador ---------- */

    const NS = 'http://www.w3.org/2000/svg';
    let ctx = null;

    function montar() {
        if (ctx || !window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;

        const demo = secao.querySelector('.exp-demo');
        const lista = secao.querySelector('.exp-passos');
        const passos = [...secao.querySelectorAll('.exp-passo')];
        const palco = secao.querySelector('.exp-fixo-palco');
        const janela = secao.querySelector('.app');
        if (!demo || !lista || !passos.length || !palco || !janela) return;

        ctx = gsap.context(() => {
            secao.dataset.gsap = '';

            /* O palco chega inclinado e se endireita; no fim, recua */
            gsap.fromTo(palco,
                { scale: 0.86, rotationX: 14, yPercent: 6, transformPerspective: 1400, transformOrigin: '50% 100%' },
                {
                    scale: 1, rotationX: 0, yPercent: 0, ease: 'none',
                    scrollTrigger: { trigger: demo, start: 'top bottom', end: 'top 15%', scrub: 0.6 }
                });

            gsap.to(palco, {
                scale: 0.9, yPercent: -4, opacity: 0.75, ease: 'none',
                scrollTrigger: { trigger: demo, start: 'bottom 85%', end: 'bottom 30%', scrub: 0.6 }
            });

            /* A linha dos passos, desenhada com a rolagem (DrawSVG) */
            const trilho = document.createElement('div');
            trilho.className = 'exp-trilho';
            trilho.setAttribute('aria-hidden', 'true');
            const svg = document.createElementNS(NS, 'svg');
            svg.setAttribute('viewBox', '0 0 4 100');
            svg.setAttribute('preserveAspectRatio', 'none');
            ['exp-trilho-base', 'exp-trilho-linha'].forEach(classe => {
                const linha = document.createElementNS(NS, 'line');
                linha.setAttribute('class', classe);
                linha.setAttribute('x1', '2'); linha.setAttribute('x2', '2');
                linha.setAttribute('y1', '0'); linha.setAttribute('y2', '100');
                svg.appendChild(linha);
            });
            trilho.appendChild(svg);
            demo.prepend(trilho);

            gsap.fromTo(svg.querySelector('.exp-trilho-linha'), { drawSVG: '0%' }, {
                drawSVG: '100%', ease: 'none',
                scrollTrigger: { trigger: lista, start: 'top 25%', end: 'bottom bottom', scrub: true }
            });

            /* O céu: cada passagem de um passo ao seguinte vale uma fase inteira (do
               passo surgir embaixo até chegar a 25% da tela, o mesmo trecho em que a
               janela respira) e o fim da seção vale a última, a volta ao escuro */
            let trechos = [];
            const medirTrechos = () => {
                const vh = window.innerHeight;
                const y = el => el.getBoundingClientRect().top + window.scrollY;
                trechos = passos.slice(1).map(p => [y(p) - vh, y(p) - 0.25 * vh]);
                const fim = y(demo) + demo.offsetHeight;
                trechos.push([fim - 0.85 * vh, fim - 0.3 * vh]);
            };
            const faseEm = rolagem => trechos.reduce((f, [a, b]) => f + gsap.utils.clamp(0, 1, (rolagem - a) / (b - a)), 0);

            ScrollTrigger.create({
                trigger: demo,
                start: 'top bottom',
                end: 'bottom top',
                onRefresh: () => {
                    medirTrechos();
                    gsap.set(secao, { '--ceu-fase': faseEm(window.scrollY) });
                },
                // o mesmo atraso macio do scrub dos outros movimentos
                onUpdate: self => gsap.to(secao, { '--ceu-fase': faseEm(self.scroll()), duration: 0.6, ease: 'power2.out', overwrite: true })
            });

            passos.forEach((passo, i) => {
                const titulo = passo.querySelector('h3');
                const texto = passo.querySelector('.exp-passo-texto p');
                const letras = SplitText.create(titulo, { type: 'words,chars' });
                const linhas = SplitText.create(texto, { type: 'lines', mask: 'lines' });

                /* Uma linha do tempo só por passo, presa à pista inteira dele (do topo
                   a 80% da tela até o fim a 45%): entrada, pausa enquanto a cena toca e
                   saída. Duas linhas do tempo nas mesmas letras brigariam numa rolagem
                   rápida (o atraso do scrub de uma desfaria a outra). As durações são em
                   pixels de rolagem, então cada trecho dura o que dura na tela. */
                const vh = window.innerHeight;
                const total = passo.offsetHeight + 0.35 * vh;
                const ENTRADA = 0.6 * vh;
                const SAIDA = 0.4 * vh;
                const ultimo = i === passos.length - 1;

                const tl = gsap.timeline({
                    scrollTrigger: { trigger: passo, start: 'top 80%', end: ultimo ? 'top 20%' : 'bottom 45%', scrub: 0.5 }
                });
                /* A bolinha do número (um ::before) acompanha o texto por uma variável */
                const bloco = passo.querySelector('.exp-passo-texto');
                tl.fromTo(bloco, { '--marca': 0 }, { '--marca': 1, ease: 'back.out(2)', duration: ENTRADA * 0.3 }, 0);
                if (!ultimo) tl.to(bloco, { '--marca': 0, ease: 'power2.in', duration: SAIDA * 0.4 }, total - SAIDA * 0.7);

                tl.from(letras.chars, { yPercent: 110, opacity: 0, rotationX: -70, stagger: ENTRADA * 0.012, ease: 'power2.out', duration: ENTRADA * 0.35 }, 0)
                    .from(linhas.lines, { yPercent: 100, stagger: ENTRADA * 0.08, ease: 'power2.out', duration: ENTRADA * 0.5 }, ENTRADA * 0.2);
                if (!ultimo) {
                    tl.to(letras.chars, { yPercent: -110, opacity: 0, stagger: SAIDA * 0.01, ease: 'power2.in', duration: SAIDA * 0.4 }, total - SAIDA)
                        .to(linhas.lines, { yPercent: -100, stagger: SAIDA * 0.06, ease: 'power2.in', duration: SAIDA * 0.6 }, total - SAIDA);
                }

                /* Passagem para este passo: a janela respira */
                if (i > 0) {
                    gsap.timeline({
                        scrollTrigger: { trigger: passo, start: 'top bottom', end: 'top 25%', scrub: 0.8 }
                    })
                        .to(janela, { scale: 0.94, rotationY: -8, y: 24, transformPerspective: 1600, ease: 'power1.inOut', duration: 0.5 }, 0)
                        .to(janela, { scale: 1, rotationY: 0, y: 0, ease: 'power1.inOut', duration: 0.5 }, 0.5);
                }
            });

            // Ao desmontar: tira a marca da seção (o resto o contexto desfaz sozinho)
            return () => {
                delete secao.dataset.gsap;
                // a fase é escrita nas chamadas da rolagem, fora do registro do contexto
                gsap.killTweensOf(secao, '--ceu-fase');
                secao.style.removeProperty('--ceu-fase');
                trilho.remove();
            };
        }, secao);

        ScrollTrigger.refresh();
    }

    function desmontar() {
        if (!ctx) return;
        ctx.revert();
        ctx = null;
    }

    secao.addEventListener('exp:montou', montar);
    secao.addEventListener('exp:desmontou', desmontar);

    // A demo pode ter montado antes deste arquivo carregar
    if (secao.dataset.js === 'demo') montar();

    // Fontes trocam as medidas: recalcula os pontos de início e fim
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
})();
