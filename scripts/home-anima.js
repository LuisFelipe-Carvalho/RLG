/* =========================================================
   Animação da home: o agente responde, agenda e confirma.

   Cada elemento com data-passo="n" aparece no passo n
   (e some no passo data-ate, se tiver). Os elementos com
   data-verbo-passo trocam o fim do título: "A RLG responde /
   agenda / confirma por você". No começo e no fim do ciclo o
   título volta à frase da marca, "A RLG cuida da clínica".

   Sem JS, ou com "reduzir movimento" ligado, nada disso roda
   e a home mostra o estado final, estático.
   ========================================================= */
(() => {
    const visual = document.querySelector('#home .home-visual');
    if (!visual) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (movimentoReduzido.matches) return;

    const elementos = [...visual.querySelectorAll('[data-passo]')];
    const troca = document.querySelector('#home .troca');
    const verbos = troca ? [...troca.querySelectorAll('.verbo')] : [];
    const FRASE_DA_MARCA = 'cuida';

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
    let primeiraVez = true;

    // Troca o fim do título (a entrada e a saída estão no CSS)
    const trocarPalavra = (palavra) => {
        verbos.forEach(v => v.classList.toggle('ativo', v.dataset.verbo === palavra));
    };

    const mostrarPasso = (n) => {
        elementos.forEach(el => {
            const entra = Number(el.dataset.passo);
            const sai = el.dataset.ate ? Number(el.dataset.ate) : Infinity;
            el.classList.toggle('visivel', n >= entra && n < sai);
        });
        const ultimo = n === DURACAO.length - 1;
        const palavra = n === 0 || ultimo ? FRASE_DA_MARCA : verboDoPasso[n];
        if (palavra) trocarPalavra(palavra);
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
        // Na primeira vez, espera a entrada da hero (estilos/home.css) terminar
        const espera = primeiraVez ? 1400 : 0;
        primeiraVez = false;
        timer = setTimeout(proximo, espera + DURACAO[passo]);
    };

    const pausar = () => {
        rodando = false;
        clearTimeout(timer);
    };

    // Liga a animação: esconde tudo e começa do passo 0
    visual.dataset.js = 'anima';
    if (troca) troca.dataset.js = 'anima';
    mostrarPasso(0);
    // Liga a transição das frases só depois do primeiro quadro já escondido
    if (troca) requestAnimationFrame(() => requestAnimationFrame(() => { troca.dataset.transicao = ''; }));

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
        if (troca) { delete troca.dataset.js; delete troca.dataset.transicao; }
        elementos.forEach(el => el.classList.remove('visivel'));
        verbos.forEach(v => v.classList.remove('ativo'));
    });
})();
