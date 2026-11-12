/* =========================================================
   Animação da home: o agente responde, agenda e confirma.

   Cada elemento com data-passo="n" aparece no passo n
   (e some no passo data-ate, se tiver). Os elementos com
   data-verbo-passo acendem a palavra correspondente da frase
   "responde, agenda e confirma".

   Sem JS, ou com "reduzir movimento" ligado, nada disso roda
   e a home mostra o estado final, estático.
   ========================================================= */
(() => {
    const visual = document.querySelector('#home .home-visual');
    if (!visual) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (movimentoReduzido.matches) return;

    const elementos = [...visual.querySelectorAll('[data-passo]')];
    const verbos = [...document.querySelectorAll('#home .verbo')];

    // Quanto tempo (ms) cada passo fica na tela antes do próximo
    const DURACAO = [
        700,  // 0: conversa vazia
        1300, // 1: paciente pergunta (22:47, fora do expediente)
        1300, // 2: agente digitando
        1700, // 3: agente responde            -> "responde"
        1200, // 4: paciente escolhe o horário
        1500, // 5: horário marcado na agenda  -> "agenda"
        1200, // 6: agente digitando
        1500, // 7: agente confirma            -> "confirma"
        3200  // 8: lembrete programado (pausa no estado final)
    ];
    const REINICIO = 600;

    // Qual verbo acende em cada passo
    const verboDoPasso = {};
    elementos.forEach(el => {
        if (el.dataset.verboPasso) verboDoPasso[el.dataset.passo] = el.dataset.verboPasso;
    });

    let passo = 0;
    let timer = 0;
    let rodando = false;

    const mostrarPasso = (n) => {
        elementos.forEach(el => {
            const entra = Number(el.dataset.passo);
            const sai = el.dataset.ate ? Number(el.dataset.ate) : Infinity;
            el.classList.toggle('visivel', n >= entra && n < sai);
        });
        if (verboDoPasso[n]) {
            verbos.forEach(v => v.classList.toggle('ativo', v.dataset.verbo === verboDoPasso[n]));
        }
        if (n === 0) verbos.forEach(v => v.classList.remove('ativo'));
    };

    const proximo = () => {
        if (!rodando) return;
        if (passo < DURACAO.length - 1) {
            passo += 1;
            mostrarPasso(passo);
            timer = setTimeout(proximo, DURACAO[passo]);
            return;
        }
        // Fim do ciclo: as mensagens somem juntas e a conversa recomeça
        passo = 0;
        mostrarPasso(0);
        timer = setTimeout(proximo, REINICIO + DURACAO[0]);
    };

    const iniciar = () => {
        if (rodando) return;
        rodando = true;
        timer = setTimeout(proximo, DURACAO[passo]);
    };

    const pausar = () => {
        rodando = false;
        clearTimeout(timer);
    };

    // Liga a animação: esconde tudo e começa do passo 0
    visual.dataset.js = 'anima';
    mostrarPasso(0);

    let naTela = false;
    const atualizar = () => (naTela && !document.hidden ? iniciar() : pausar());

    new IntersectionObserver((entradas) => {
        naTela = entradas[0].isIntersecting;
        atualizar();
    }, { threshold: 0.3 }).observe(visual);

    document.addEventListener('visibilitychange', atualizar);

    // Se a pessoa ligar "reduzir movimento" com a página aberta: para no estado final
    movimentoReduzido.addEventListener('change', () => {
        if (!movimentoReduzido.matches) return;
        pausar();
        delete visual.dataset.js;
        elementos.forEach(el => el.classList.remove('visivel'));
        verbos.forEach(v => v.classList.remove('ativo'));
    });
})();
