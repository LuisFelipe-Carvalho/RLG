/* =========================================================
   Explicação no celular: os 4 passos num carrossel.

   Abaixo de 960px os passos ficam lado a lado e a pessoa
   arrasta para o lado (scroll-snap, só CSS). Este script:
   - cria os pontinhos embaixo (tocar leva ao passo), em
     qualquer navegador, com ou sem movimento;
   - toca a cena de cada passo uma vez, quando a tela do
     produto dele está de fato à vista; voltando a um passo
     já visto, ele está pronto.

   01 mapa      a Ana pergunta às 22:47, a noite passa, ela
                marca em outra clínica: o gargalo
   02 base      a ficha é preenchida e o agente responde
   03 conexoes  o agente é ligado e a consulta é marcada
   04 revisao   a consulta é confirmada e o sábado sobe

   Com "reduzir movimento" o carrossel continua, mas tudo
   aparece pronto. Sem JS, arrasta e mostra tudo pronto.
   Ajudantes e estados das telas: scripts/explicacao-cenas.js
   Demo do computador: scripts/explicacao-anima.js
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    if (!secao) return;

    const trilho = secao.querySelector('.exp-passos');
    const passos = [...secao.querySelectorAll('.exp-passo')];
    if (!trilho || !passos.length) return;

    const comMovimento = window.matchMedia('(prefers-reduced-motion: no-preference)');

    /* ---------- Pontinhos (não dependem de nada além do scroll) ---------- */

    const pontos = document.createElement('div');
    pontos.className = 'exp-pontos';
    pontos.setAttribute('role', 'group');
    pontos.setAttribute('aria-label', 'Passos da explicação');
    const botoes = passos.map((passo, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'exp-ponto';
        b.setAttribute('aria-label', `Passo ${i + 1}: ${passo.querySelector('h3').textContent}`);
        b.append(document.createElement('span'));
        b.addEventListener('click', () => irPara(i));
        pontos.append(b);
        return b;
    });
    trilho.after(pontos);

    // Medidas do trilho: só mudam com a tela, então ficam guardadas
    let largPasso = 1;
    let scrollMax = 0;

    function medir() {
        largPasso = passos.length > 1 ? (passos[1].offsetLeft - passos[0].offsetLeft) || 1 : 1;
        scrollMax = trilho.scrollWidth - trilho.clientWidth;
    }

    function marcarPonto() {
        // Sem carrossel (tela grande) não há o que rolar: fica no primeiro
        const fim = scrollMax > 2 && trilho.scrollLeft >= scrollMax - 2;
        const i = fim ? passos.length - 1 : Math.round(trilho.scrollLeft / largPasso);
        botoes.forEach((b, j) => {
            if (j === i) b.setAttribute('aria-current', 'step');
            else b.removeAttribute('aria-current');
        });
    }

    function irPara(i) {
        trilho.scrollTo({
            left: passos[i].offsetLeft - passos[0].offsetLeft,
            behavior: comMovimento.matches ? 'smooth' : 'auto'
        });
    }

    let quadro = 0;
    trilho.addEventListener('scroll', () => {
        if (quadro) return;
        quadro = requestAnimationFrame(() => {
            quadro = 0;
            marcarPonto();
        });
    }, { passive: true });

    // Girar o aparelho ou mudar de tamanho muda as medidas e o passo à vista
    let quadroResize = 0;
    window.addEventListener('resize', () => {
        if (quadroResize) return;
        quadroResize = requestAnimationFrame(() => {
            quadroResize = 0;
            medir();
            marcarPonto();
        });
    });

    medir();
    marcarPonto();

    /* ---------- Cenas: só com IntersectionObserver e o arquivo comum ---------- */

    const C = window.RLGExplicacao;
    if (!C || !('IntersectionObserver' in window)) return;
    const { PARADA, pausa, mostrar, esconder, digitaEMostra, relogioTexto } = C;

    const CENAS = C.cenas({
        // 01 · a noite em que ninguém respondeu
        async mapa(tela, exec) {
            const [pergunta, noite, resposta, perdido] = tela.querySelectorAll('.mapa li');
            const relogio = tela.querySelector('.tela-relogio');

            mostrar(tela.querySelector('.regua-ana'));
            mostrar(pergunta);
            await pausa(exec, 700);

            // A noite passa: o relógio corre de 22:47 até 09:15
            mostrar(noite);
            const inicio = 22 * 60 + 47;
            const fim = (24 + 9) * 60 + 15;
            const QUADROS = 36;
            for (let q = 1; q <= QUADROS; q++) {
                relogio.textContent = relogioTexto(Math.round(inicio + (fim - inicio) * (q / QUADROS)));
                await pausa(exec, 35);
            }

            mostrar(resposta);
            await pausa(exec, 700);
            relogio.textContent = '09:16';
            mostrar(perdido);
            await pausa(exec, 350);
            perdido.classList.add('riscado');
            await pausa(exec, 700);
            mostrar(tela.querySelector('.tela-achado'));
        },

        // 02 · a ficha é preenchida e o agente responde a Ana
        async base(tela, exec) {
            mostrar(tela.querySelector('.balao-paciente'));
            await pausa(exec, 600);

            for (const dd of tela.querySelectorAll('[data-digita]')) {
                dd.classList.add('cursor');
                const texto = dd.dataset.texto;
                for (let i = 1; i <= texto.length; i++) {
                    dd.textContent = texto.slice(0, i);
                    await pausa(exec, 18);
                }
                await pausa(exec, 120);
                dd.classList.remove('cursor');
            }

            await pausa(exec, 300);
            await digitaEMostra(exec, tela.querySelector('.vez'), 1100);
            tela.querySelector('[data-campo="horarios"]').classList.add('em-uso');
            await pausa(exec, 500);
            tela.querySelector('.tela-pilula').textContent = 'Pronto';
        },

        // 03 · o agente é ligado e a consulta é marcada
        async conexoes(tela, exec) {
            await pausa(exec, 300);
            tela.dataset.chave = 'ligada';
            tela.querySelector('.chave-rotulo').textContent = 'Ligado';
            await pausa(exec, 400);

            for (const li of tela.querySelectorAll('.canais li')) {
                li.dataset.estado = 'conectando';
                await pausa(exec, 350);
                li.dataset.estado = 'ok';
                await pausa(exec, 100);
            }

            // A prévia vira resposta enviada às 22:47
            await pausa(exec, 300);
            mostrar(tela.querySelector('.balao-agente .tela-tag'));
            await pausa(exec, 600);

            const [vezAna, vezAgente] = tela.querySelectorAll('.vez');
            await digitaEMostra(exec, vezAna, 900);
            await pausa(exec, 400);
            await digitaEMostra(exec, vezAgente, 900);
            await pausa(exec, 400);

            const consulta = tela.querySelector('.consulta');
            mostrar(consulta);
            await pausa(exec, 450);
            mostrar(consulta.querySelector('.tela-tag'));
        },

        // 04 · a consulta é confirmada e o sábado sobe
        async revisao(tela, exec) {
            const troca = tela.querySelector('.troca');
            const [vazava, ajuste, proxima] = tela.querySelectorAll('.campos > div');

            mostrar(tela.querySelector('.consulta'));
            await pausa(exec, 900);
            // O lembrete de sexta funcionou: a consulta de sábado é confirmada
            troca.textContent = troca.dataset.depois;
            await pausa(exec, 700);

            mostrar(tela.querySelector('.grafico-legenda'));
            mostrar(tela.querySelector('.barras'));
            await pausa(exec, 200);
            tela.dataset.fase = 'vaza';
            await pausa(exec, 1200);
            mostrar(vazava);
            await pausa(exec, 900);

            mostrar(ajuste);
            await pausa(exec, 500);
            tela.dataset.fase = 'ajustado';
            await pausa(exec, 900);
            mostrar(proxima);
        }
    });

    const itens = passos.map(passo => {
        const tela = passo.querySelector('.tela');
        return { passo, tela, cena: tela && CENAS[tela.dataset.cena] };
    });

    /* ---------- Motor ----------
       Cada cartão toca a sua cena uma vez, quando a TELA do produto dele está
       à vista: metade da largura dela no trilho e, na altura, metade dela ou
       metade da janela (o que for menor; com o celular deitado a tela não cabe
       inteira). No tablet aparecem dois cartões ao mesmo tempo, e os dois tocam. */

    let montado = false;
    const vistos = new Set();
    const execs = new Map();

    function aVista(entrada) {
        if (!entrada.isIntersecting) return false;
        const caixa = entrada.boundingClientRect;
        const visivel = entrada.intersectionRect;
        const alturaJanela = entrada.rootBounds ? entrada.rootBounds.height : window.innerHeight;
        const larguraOk = visivel.width >= caixa.width * 0.5;
        const alturaOk = visivel.height >= Math.min(caixa.height, alturaJanela) * 0.5;
        return larguraOk && alturaOk;
    }

    async function tocar(i) {
        const item = itens[i];
        if (!montado || !item.cena || vistos.has(i)) return;
        vistos.add(i);
        observador.unobserve(item.tela);
        const meu = { ativa: true };
        execs.set(i, meu);
        try {
            await pausa(meu, 250);
            await item.cena.tocar(item.tela, meu);
        } catch (erro) {
            if (erro !== PARADA) {
                // Uma cena quebrada nunca deixa o cartão pela metade
                console.error('Explicação: a cena do passo', i + 1, 'falhou.', erro);
                item.cena.final(item.tela);
            }
        } finally {
            execs.delete(i);
        }
    }

    // A raiz é a janela: o recorte do carrossel conta, então "à vista" é à vista de verdade
    const LIMIARES = Array.from({ length: 11 }, (_, k) => k / 10);
    const observador = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
            if (!aVista(entrada)) return;
            const i = itens.findIndex(it => it.tela === entrada.target);
            if (i >= 0) tocar(i);
        });
    }, { threshold: LIMIARES });

    function montar() {
        montado = true;
        secao.dataset.js = 'carrossel';
        itens.forEach((item, i) => {
            if (!item.cena) return;
            if (vistos.has(i)) {
                item.cena.final(item.tela);
            } else {
                item.cena.preparar(item.tela);
                observador.observe(item.tela);
            }
        });
        medir();
        marcarPonto();
    }

    function desmontar() {
        montado = false;
        execs.forEach(exec => { exec.ativa = false; });
        execs.clear();
        observador.disconnect();
        // Saindo do carrossel, tudo fica pronto (e não toca de novo se voltar)
        itens.forEach((item, i) => {
            if (!item.cena) return;
            item.cena.final(item.tela);
            vistos.add(i);
        });
        delete secao.dataset.js;
    }

    C.modos.registrar('carrossel', {
        midia: '(max-width: 959px) and (prefers-reduced-motion: no-preference)',
        montar,
        desmontar
    });
})();
