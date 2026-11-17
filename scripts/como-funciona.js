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
    const menosMovimento = window.matchMedia('(prefers-reduced-motion: reduce)');

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
    let tour = menosMovimento.matches ? 'parado' : 'rodando';
    const segura = { mouse: false, foco: false, fora: true, montando: false };

    const atualizarTour = () => {
        camadas.dataset.tour = tour;
        camadas.toggleAttribute('data-segura', Object.values(segura).some(Boolean));
        // O texto diz o que o botão faz; o estado vai só para o CSS (ícone)
        const parado = tour !== 'rodando';
        botao.dataset.estado = tour;
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

    // Foco de teclado numa aba ou no painel segura. O clique também foca, mas
    // aí quem segura é o mouse; e o foco no próprio botão não segura, senão
    // "Continuar" deixaria o tour parado enquanto o botão tiver foco.
    const focoSegura = () => {
        const el = document.activeElement;
        return Boolean(el && el !== botao && (palco.contains(el) || paineisCaixa.contains(el))
            && el.matches(':focus-visible'));
    };
    const conferirFoco = () => {
        segura.foco = focoSegura();
        atualizarTour();
    };
    [palco, paineisCaixa].forEach(el => {
        el.addEventListener('focusin', conferirFoco);
        // No focusout o novo foco ainda não chegou: confere no quadro seguinte
        el.addEventListener('focusout', () => setTimeout(conferirFoco));
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

    let montagem = null;

    // Enquanto não está montada: sem transição nas lâminas e o tour espera.
    // Os botões só aparecem a partir de 0,7 (CSS); antes disso as abas e o
    // botão do tour ficam inertes, para não receber clique nem Tab invisíveis.
    const marcar = junta => {
        const ocultos = junta < 0.75;
        lista.inert = ocultos;
        botao.inert = ocultos;

        const montando = junta < 0.999;
        if (montando === segura.montando) return;
        segura.montando = montando;
        palco.toggleAttribute('data-montando', montando);
        atualizarTour();
    };

    const montar = () => {
        if (menosMovimento.matches || !window.gsap || !window.ScrollTrigger) return;
        gsap.registerPlugin(ScrollTrigger);

        montagem = gsap.fromTo(palco, { '--junta': 0 }, {
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

    // "Reduzir movimento" ligado com a página aberta: monta a pilha na hora,
    // para o tour e some com o botão. Desligado: o botão volta (tour parado).
    menosMovimento.addEventListener('change', () => {
        if (menosMovimento.matches) {
            if (montagem) {
                montagem.scrollTrigger.kill();
                montagem.kill();
                montagem = null;
            }
            palco.style.setProperty('--junta', '1');
            marcar(1);
            tour = 'parado';
        }
        botao.hidden = menosMovimento.matches;
        atualizarTour();
    });

    /* ---------- Ligar ---------- */

    camadas.style.setProperty('--tempo', `${TEMPO}ms`);
    camadas.dataset.js = 'camadas';
    botao.hidden = menosMovimento.matches;
    atualizarTour();
    escolher(0);
    montar();
})();
