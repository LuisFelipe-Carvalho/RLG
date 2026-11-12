/* =========================================================
   Explicação no celular: os 4 passos num carrossel.

   Abaixo de 960px os passos ficam lado a lado e a pessoa
   arrasta para o lado (scroll-snap, só CSS). Este script:
   - cria os pontinhos embaixo (tocar leva ao passo);
   - toca a cena de cada passo na primeira vez que ele
     aparece; voltando a um passo já visto, ele está pronto.

   01 mapa      a Ana pergunta às 22:47, a noite passa, ela
                marca em outra clínica: o gargalo
   02 base      a ficha é preenchida e o agente responde
   03 conexoes  o agente é ligado e a consulta é marcada
   04 revisao   a consulta é confirmada e o sábado sobe

   Com "reduzir movimento" o carrossel continua, mas tudo
   aparece pronto. Sem JS, arrasta e mostra tudo pronto.
   A demo do computador fica em scripts/explicacao-anima.js.
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    if (!secao) return;

    const trilho = secao.querySelector('.exp-passos');
    const passos = [...secao.querySelectorAll('.exp-passo')];
    if (!trilho || !passos.length || !('IntersectionObserver' in window)) return;

    const celular = window.matchMedia('(max-width: 959px)');
    const comMovimento = window.matchMedia('(prefers-reduced-motion: no-preference)');

    const PARADA = Symbol('parada');

    const pausa = (exec, ms) => new Promise((ok, falha) => {
        setTimeout(() => (exec.ativa ? ok() : falha(PARADA)), ms);
    });

    const mostrar = el => el && el.classList.add('visivel');
    const esconder = el => el && el.classList.remove('visivel');
    const surgem = tela => [...tela.querySelectorAll('[data-surge]')];

    function tudoVisivel(tela) {
        surgem(tela).forEach(el => el.classList.toggle('visivel', !el.classList.contains('digitando')));
    }

    async function digitaEMostra(exec, vez, ms) {
        const bolinhas = vez.querySelector('.digitando');
        const balao = vez.querySelector('.balao');
        mostrar(bolinhas);
        await pausa(exec, ms);
        esconder(bolinhas);
        mostrar(balao);
    }

    const relogioTexto = minutos => {
        const h = Math.floor(minutos / 60) % 24;
        const m = minutos % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    /* ---------- As cenas, cada uma dentro do seu cartão ---------- */

    const mapa = {
        preparar(tela) {
            surgem(tela).forEach(esconder);
            tela.querySelector('.mapa-perdido').classList.remove('riscado');
            tela.querySelector('.tela-relogio').textContent = '22:47';
        },
        final(tela) {
            tudoVisivel(tela);
            tela.querySelector('.mapa-perdido').classList.add('riscado');
            tela.querySelector('.tela-relogio').textContent = '09:16';
        },
        async tocar(tela, exec) {
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
        }
    };

    const base = {
        preparar(tela) {
            surgem(tela).forEach(esconder);
            tela.querySelectorAll('[data-digita]').forEach(dd => {
                if (dd.dataset.texto === undefined) dd.dataset.texto = dd.textContent;
                dd.textContent = '';
                dd.classList.remove('cursor');
            });
            tela.querySelector('[data-campo="horarios"]').classList.remove('em-uso');
            tela.querySelector('.tela-pilula').textContent = 'Treinando';
        },
        final(tela) {
            tudoVisivel(tela);
            tela.querySelectorAll('[data-digita]').forEach(dd => {
                if (dd.dataset.texto !== undefined) dd.textContent = dd.dataset.texto;
                dd.classList.remove('cursor');
            });
            tela.querySelector('[data-campo="horarios"]').classList.add('em-uso');
            tela.querySelector('.tela-pilula').textContent = 'Pronto';
        },
        async tocar(tela, exec) {
            mostrar(tela.querySelector('.balao-paciente'));
            await pausa(exec, 600);

            // A ficha da clínica é preenchida, campo a campo
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

            // O agente usa a ficha para responder a Ana
            await pausa(exec, 300);
            await digitaEMostra(exec, tela.querySelector('.vez'), 1100);
            tela.querySelector('[data-campo="horarios"]').classList.add('em-uso');
            await pausa(exec, 500);
            tela.querySelector('.tela-pilula').textContent = 'Pronto';
        }
    };

    const conexoes = {
        preparar(tela) {
            surgem(tela).forEach(esconder);
            tela.dataset.chave = 'desligada';
            tela.querySelector('.chave-rotulo').textContent = 'Desligado';
            tela.querySelectorAll('.canais li').forEach(li => { li.dataset.estado = 'espera'; });
        },
        final(tela) {
            tudoVisivel(tela);
            tela.dataset.chave = 'ligada';
            tela.querySelector('.chave-rotulo').textContent = 'Ligado';
            tela.querySelectorAll('.canais li').forEach(li => { li.dataset.estado = 'ok'; });
        },
        async tocar(tela, exec) {
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

            // A Ana escolhe e o agente marca
            const [vezAna, vezAgente] = tela.querySelectorAll('.vez');
            await digitaEMostra(exec, vezAna, 900);
            await pausa(exec, 400);
            await digitaEMostra(exec, vezAgente, 900);
            await pausa(exec, 400);

            const consulta = tela.querySelector('.consulta');
            mostrar(consulta);
            await pausa(exec, 450);
            mostrar(consulta.querySelector('.tela-tag'));
        }
    };

    const revisao = {
        preparar(tela) {
            surgem(tela).forEach(esconder);
            tela.dataset.fase = 'zero';
            const troca = tela.querySelector('.troca');
            if (troca.dataset.depois === undefined) troca.dataset.depois = troca.textContent;
            troca.textContent = troca.dataset.antes;
        },
        final(tela) {
            tudoVisivel(tela);
            tela.dataset.fase = 'ajustado';
            const troca = tela.querySelector('.troca');
            if (troca.dataset.depois !== undefined) troca.textContent = troca.dataset.depois;
        },
        async tocar(tela, exec) {
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
    };

    const CENAS = { mapa, base, conexoes, revisao };

    const itens = passos.map(passo => {
        const tela = passo.querySelector('.tela');
        return { passo, tela, cena: tela && CENAS[tela.dataset.cena] };
    });

    /* ---------- Pontinhos ---------- */

    const pontos = document.createElement('div');
    pontos.className = 'exp-pontos';
    pontos.setAttribute('aria-label', 'Passos da explicação');
    const botoes = itens.map((item, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'exp-ponto';
        b.setAttribute('aria-label', `Passo ${i + 1}: ${item.passo.querySelector('h3').textContent}`);
        b.append(document.createElement('span'));
        b.addEventListener('click', () => irPara(i));
        pontos.append(b);
        return b;
    });
    trilho.after(pontos);

    function irPara(i) {
        const esquerda = itens[i].passo.offsetLeft - itens[0].passo.offsetLeft;
        trilho.scrollTo({ left: esquerda, behavior: comMovimento.matches ? 'smooth' : 'auto' });
    }

    /* ---------- Motor ----------
       Cada cartão toca a sua cena uma vez, quando fica pelo menos metade
       visível na tela (no tablet aparecem dois ao mesmo tempo, e os dois
       tocam). Os pontinhos seguem a posição do scroll. */

    let montado = false;
    const vistos = new Set();
    const execs = new Map();

    async function tocar(i) {
        const item = itens[i];
        if (!montado || !item.cena || vistos.has(i)) return;
        vistos.add(i);
        const meu = { ativa: true };
        execs.set(i, meu);
        try {
            await pausa(meu, 250);
            await item.cena.tocar(item.tela, meu);
        } catch (erro) {
            if (erro !== PARADA) throw erro;
        }
        execs.delete(i);
    }

    function pararTudo() {
        execs.forEach(exec => { exec.ativa = false; });
        execs.clear();
    }

    // A raiz é a janela: o recorte do carrossel conta, então "visível" é visível de verdade
    const observaPassos = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) tocar(itens.findIndex(it => it.passo === entrada.target));
        });
    }, { threshold: 0.5 });

    function marcarPonto() {
        const passo = itens.length > 1 ? itens[1].passo.offsetLeft - itens[0].passo.offsetLeft : 1;
        const fim = trilho.scrollLeft >= trilho.scrollWidth - trilho.clientWidth - 2;
        const i = fim ? itens.length - 1 : Math.round(trilho.scrollLeft / passo);
        botoes.forEach((b, j) => {
            if (j === i) b.setAttribute('aria-current', 'step');
            else b.removeAttribute('aria-current');
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

    function montar() {
        montado = true;
        secao.dataset.js = 'carrossel';
        itens.forEach((item, i) => {
            if (!item.cena) return;
            if (vistos.has(i)) item.cena.final(item.tela);
            else item.cena.preparar(item.tela);
        });
        itens.forEach(item => observaPassos.observe(item.passo));
    }

    function desmontar() {
        montado = false;
        pararTudo();
        observaPassos.disconnect();
        itens.forEach((item, i) => {
            if (!item.cena) return;
            item.cena.final(item.tela);
            vistos.add(i);
        });
        if (secao.dataset.js === 'carrossel') delete secao.dataset.js;
    }

    const decidir = () => {
        const deveMontar = celular.matches && comMovimento.matches;
        if (deveMontar && !montado) montar();
        else if (!deveMontar && montado) desmontar();
    };

    marcarPonto();
    celular.addEventListener('change', decidir);
    comMovimento.addEventListener('change', decidir);
    decidir();
})();
