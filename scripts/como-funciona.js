/* =========================================================
   Como funciona: camadas da clínica.

   As ferramentas que a clínica já usa ficam empilhadas em
   perspectiva (só CSS, estilos/como-funciona.css). As sete
   lâminas são abas: a escolhida sai da pilha e o painel dela
   aparece.

   Montagem: as lâminas chegam soltas e se juntam conforme a
   rolagem (GSAP ScrollTrigger com scrub move a variável
   --junta de 0 a 1 no palco; o CSS faz o resto).

   Tour: enquanto a seção está à vista, a pilha passa sozinha
   de lâmina em lâmina a cada TEMPO. A barrinha no botão da
   aba escolhida mostra quanto falta (é o fim da animação
   dela que avança o tour). Segura ao passar o mouse, ao
   focar algo da seção e fora da tela; para de vez no
   primeiro clique numa lâmina; o botão pausa e continua.

   Sem JS: as lâminas são links para os painéis e os sete
   painéis ficam abertos. Sem GSAP ou com "reduzir movimento"
   a pilha já vem montada; com "reduzir movimento" também não
   há tour nem deslize.
   ========================================================= */
(() => {
    const camadas = document.querySelector('#como-funciona .camadas');
    if (!camadas) return;

    const palco = camadas.querySelector('.camadas-palco');
    const lista = camadas.querySelector('.pilha-abas');
    const botao = camadas.querySelector('.camadas-tour');
    const paineisCaixa = camadas.querySelector('.camadas-paineis');
    const abas = lista ? [...lista.querySelectorAll('.lamina')] : [];
    const paineis = abas.map(aba => document.getElementById(aba.hash.slice(1)));
    if (!palco || !botao || !paineisCaixa || !abas.length || paineis.includes(null)) return;

    const TEMPO = 5000;
    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---------- Abas (acessíveis) ---------- */

    lista.setAttribute('role', 'tablist');
    lista.setAttribute('aria-orientation', 'vertical');
    abas.forEach((aba, i) => {
        aba.setAttribute('role', 'tab');
        aba.setAttribute('aria-controls', paineis[i].id);
        paineis[i].setAttribute('role', 'tabpanel');
        paineis[i].setAttribute('aria-labelledby', aba.id);
        paineis[i].tabIndex = 0;
    });

    /* ---------- Escolher uma lâmina ---------- */

    let atual = -1;

    const escolher = (indice, { focar = false } = {}) => {
        if (indice === atual) return;
        atual = indice;

        abas.forEach((aba, i) => {
            const ativa = i === indice;
            aba.setAttribute('aria-selected', String(ativa));
            aba.tabIndex = ativa ? 0 : -1;
            paineis[i].hidden = !ativa;
        });

        if (focar) abas[indice].focus();
    };

    /* ---------- Tour ---------- */

    // 'rodando' ou 'parado'; o que segura o tour sem pará-lo fica em `segura`
    let tour = movimentoReduzido ? 'parado' : 'rodando';
    const segura = { mouse: false, foco: false, fora: true, montando: false };

    const atualizarTour = () => {
        camadas.dataset.tour = tour;
        camadas.toggleAttribute('data-segura', Object.values(segura).some(Boolean));
        const parado = tour !== 'rodando';
        botao.setAttribute('aria-pressed', String(parado));
        botao.querySelector('.tour-texto').textContent = parado ? 'Continuar' : 'Pausar';
    };

    // A barrinha da aba escolhida terminou: próxima lâmina, de cima para baixo
    lista.addEventListener('animationend', evento => {
        if (evento.animationName !== 'tour-progresso' || tour !== 'rodando') return;
        escolher((atual + 1) % abas.length);
    });

    botao.addEventListener('click', () => {
        tour = tour === 'rodando' ? 'parado' : 'rodando';
        atualizarTour();
    });

    // Mouse em cima da pilha ou do painel segura (toque não conta: o toque numa aba já para)
    [palco, paineisCaixa].forEach(el => {
        el.addEventListener('pointerenter', e => {
            if (e.pointerType !== 'mouse') return;
            segura.mouse = true;
            atualizarTour();
        });
        el.addEventListener('pointerleave', e => {
            if (e.pointerType !== 'mouse') return;
            segura.mouse = palco.matches(':hover') || paineisCaixa.matches(':hover');
            atualizarTour();
        });
    });

    // Foco em qualquer coisa da seção (abas, painel, botão) segura
    const dentro = el => el && (palco.contains(el) || paineisCaixa.contains(el));
    [palco, paineisCaixa].forEach(el => {
        el.addEventListener('focusin', () => { segura.foco = true; atualizarTour(); });
        el.addEventListener('focusout', e => {
            segura.foco = dentro(e.relatedTarget);
            atualizarTour();
        });
    });

    // Fora da tela segura (e o tour só começa quando a pilha aparece)
    new IntersectionObserver(([entrada]) => {
        segura.fora = !entrada.isIntersecting;
        atualizarTour();
    }, { threshold: 0.5 }).observe(palco);

    /* ---------- Clique e teclado ---------- */

    // Escolher com a mão para o tour de vez: a pessoa assumiu o controle
    const assumir = () => {
        if (tour !== 'rodando') return;
        tour = 'parado';
        atualizarTour();
    };

    abas.forEach((aba, i) => {
        aba.addEventListener('click', evento => {
            evento.preventDefault();
            assumir();
            escolher(i);
        });
    });

    // Setas, Home e End trocam de aba (padrão de abas do WAI-ARIA)
    lista.addEventListener('keydown', evento => {
        const teclas = {
            ArrowDown: atual + 1, ArrowRight: atual + 1,
            ArrowUp: atual - 1, ArrowLeft: atual - 1,
            Home: 0, End: abas.length - 1
        };
        if (!(evento.key in teclas)) return;
        evento.preventDefault();
        assumir();
        const total = abas.length;
        escolher((teclas[evento.key] + total) % total, { focar: true });
    });

    /* ---------- Montagem presa à rolagem ---------- */

    const montar = () => {
        if (movimentoReduzido || !window.gsap || !window.ScrollTrigger) return;
        gsap.registerPlugin(ScrollTrigger);

        // Enquanto não está montada: sem transição nas lâminas e o tour espera
        const marcar = junta => {
            const montando = junta < 0.999;
            if (montando === segura.montando) return;
            segura.montando = montando;
            palco.toggleAttribute('data-montando', montando);
            atualizarTour();
        };

        gsap.fromTo(palco, { '--junta': 0 }, {
            '--junta': 1,
            ease: 'none',
            scrollTrigger: {
                trigger: palco,
                start: 'top 90%',
                end: 'center 70%',
                scrub: 0.6
            },
            onStart: () => marcar(0),
            onUpdate: () => marcar(parseFloat(gsap.getProperty(palco, '--junta')))
        });
        marcar(parseFloat(gsap.getProperty(palco, '--junta')));
    };

    /* ---------- Ligar ---------- */

    camadas.style.setProperty('--tempo', `${TEMPO}ms`);
    camadas.dataset.js = 'camadas';
    botao.hidden = movimentoReduzido;
    atualizarTour();
    escolher(0);
    montar();
})();
