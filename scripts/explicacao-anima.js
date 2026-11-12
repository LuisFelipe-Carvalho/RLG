/* =========================================================
   Explicação: a linha entra quando aparece na tela e a peça
   dela toca uma cena própria, cada uma com outro movimento:

   01 mapa      o relógio corre a noite toda, o último momento
                é riscado e o "Gargalo" salta
   02 base      a ficha é digitada campo a campo, o agente
                "digita" e responde
   03 conexoes  a chave liga o agente e cada canal passa de
                "Conectando" para "Conectado"
   04 revisao   o gráfico cresce, o sábado aparece vazando e
                depois sobe com o ajuste

   O HTML já é o estado final. Sem JS, ou com "reduzir
   movimento", nada roda e tudo aparece pronto. A cena
   recomeça se a linha sair inteira da tela e voltar.
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    if (!secao) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!('IntersectionObserver' in window)) return;

    const PARADA = Symbol('parada');

    // Espera ms; se a cena foi parada nesse meio-tempo, interrompe
    const pausa = (exec, ms) => new Promise((ok, falha) => {
        setTimeout(() => (exec.ativa ? ok() : falha(PARADA)), ms);
    });

    const mostrar = el => el && el.classList.add('visivel');

    const passos = peca => [...peca.querySelectorAll('[data-passo]')];

    /* ---------- 01 · Atendimento hoje ---------- */

    function relogioTexto(minutos) {
        const h = Math.floor(minutos / 60) % 24;
        const m = minutos % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }

    const mapa = {
        preparar(peca) {
            passos(peca).forEach(el => el.classList.remove('visivel'));
            peca.querySelector('.mapa-perdido').classList.remove('riscado');
            peca.querySelector('.mapa-relogio').textContent = '22:47';
        },
        async tocar(peca, exec) {
            const [pergunta, noite, resposta, perdido] = peca.querySelectorAll('.mapa li');
            const relogio = peca.querySelector('.mapa-relogio');

            mostrar(pergunta);
            await pausa(exec, 700);

            // A noite passa: o relógio corre de 22:47 até 09:15
            mostrar(noite);
            const inicio = 22 * 60 + 47;
            const fim = (24 + 9) * 60 + 15;
            const QUADROS = 36;
            for (let q = 1; q <= QUADROS; q++) {
                relogio.textContent = relogioTexto(Math.round(inicio + (fim - inicio) * (q / QUADROS)));
                await pausa(exec, 40);
            }

            mostrar(resposta);
            await pausa(exec, 700);

            relogio.textContent = '09:16';
            mostrar(perdido);
            await pausa(exec, 350);
            perdido.classList.add('riscado');
            await pausa(exec, 600);

            mostrar(peca.querySelector('.peca-tag'));
            await pausa(exec, 500);
            mostrar(peca.querySelector('.peca-rodape'));
        }
    };

    /* ---------- 02 · Base da sua clínica ---------- */

    const base = {
        preparar(peca) {
            passos(peca).forEach(el => el.classList.remove('visivel'));
            peca.querySelectorAll('[data-digita]').forEach(dd => {
                if (dd.dataset.texto === undefined) dd.dataset.texto = dd.textContent;
                dd.textContent = '';
                dd.classList.remove('cursor');
            });
        },
        async tocar(peca, exec) {
            // Cada campo é digitado letra a letra
            for (const dd of peca.querySelectorAll('[data-digita]')) {
                dd.classList.add('cursor');
                const texto = dd.dataset.texto;
                for (let i = 1; i <= texto.length; i++) {
                    dd.textContent = texto.slice(0, i);
                    await pausa(exec, 28);
                }
                await pausa(exec, 180);
                dd.classList.remove('cursor');
            }

            await pausa(exec, 250);
            mostrar(peca.querySelector('.peca-legenda'));
            await pausa(exec, 300);

            // O agente "digita" e responde
            const digitando = peca.querySelector('.peca-digitando');
            mostrar(digitando);
            await pausa(exec, 1200);
            digitando.classList.remove('visivel');
            mostrar(peca.querySelector('.peca-balao'));
        }
    };

    /* ---------- 03 · Agente ligado ---------- */

    const conexoes = {
        preparar(peca) {
            passos(peca).forEach(el => el.classList.remove('visivel'));
            peca.dataset.chave = 'desligada';
            peca.querySelector('.chave-rotulo').textContent = 'Desligado';
            peca.querySelectorAll('.conexoes li').forEach(li => {
                li.dataset.estado = 'espera';
                li.querySelector('.conexao-rotulo').textContent = '';
            });
        },
        async tocar(peca, exec) {
            await pausa(exec, 500);

            // A chave liga
            peca.dataset.chave = 'ligada';
            peca.querySelector('.chave-rotulo').textContent = 'Ligado';
            await pausa(exec, 500);

            // Cada canal conecta, um por vez
            for (const li of peca.querySelectorAll('.conexoes li')) {
                const rotulo = li.querySelector('.conexao-rotulo');
                li.dataset.estado = 'conectando';
                rotulo.textContent = 'Conectando';
                await pausa(exec, 700);
                li.dataset.estado = 'ok';
                rotulo.textContent = 'Conectado';
                await pausa(exec, 150);
            }

            await pausa(exec, 300);
            mostrar(peca.querySelector('.peca-rodape'));
        }
    };

    /* ---------- 04 · Revisão do mês ---------- */

    const revisao = {
        preparar(peca) {
            passos(peca).forEach(el => el.classList.remove('visivel'));
            peca.dataset.fase = 'zero';
            peca.querySelector('.grafico-tag').textContent = 'Sábado vaza';
        },
        async tocar(peca, exec) {
            const [vazava, ajuste, proxima] = peca.querySelectorAll('.peca-campos > div');
            const tag = peca.querySelector('.grafico-tag');

            await pausa(exec, 200);

            // As barras crescem; o sábado fica baixo e vermelho
            peca.dataset.fase = 'vaza';
            await pausa(exec, 1300);
            mostrar(vazava);
            await pausa(exec, 1000);

            // O ajuste: o sábado sobe e fica roxo
            mostrar(ajuste);
            await pausa(exec, 500);
            peca.dataset.fase = 'ajustado';
            tag.textContent = 'Sábado ajustado';
            await pausa(exec, 1000);
            mostrar(proxima);
        }
    };

    /* ---------- Motor: entra na tela, toca; sai inteira, prepara de novo ---------- */

    const CENAS = { mapa, base, conexoes, revisao };
    const ATRASO_CENA = 600; // espera a peça terminar de entrar

    const linhas = [...secao.querySelectorAll('.exp-linha')].map(linha => {
        const peca = linha.querySelector('[data-cena]');
        return { linha, peca, cena: peca && CENAS[peca.dataset.cena], exec: null, tocando: false };
    });

    function preparar(item) {
        if (item.exec) item.exec.ativa = false;
        item.exec = null;
        item.tocando = false;
        if (item.cena) item.cena.preparar(item.peca);
    }

    async function tocar(item) {
        if (!item.cena || item.tocando) return;
        item.tocando = true;
        const exec = { ativa: true };
        item.exec = exec;
        try {
            await pausa(exec, ATRASO_CENA);
            await item.cena.tocar(item.peca, exec);
        } catch (erro) {
            if (erro !== PARADA) throw erro;
        }
    }

    const observador = new IntersectionObserver(entradas => {
        entradas.forEach(entrada => {
            const item = linhas.find(l => l.linha === entrada.target);
            if (!item) return;

            if (entrada.isIntersecting && entrada.intersectionRatio >= 0.35) {
                item.linha.classList.add('revelado');
                tocar(item);
            } else if (!entrada.isIntersecting && item.tocando) {
                // Saiu inteira da tela: deixa pronta para tocar de novo
                preparar(item);
            }
        });
    }, { threshold: [0, 0.35] });

    secao.dataset.js = 'cenas';
    linhas.forEach(item => {
        preparar(item);
        observador.observe(item.linha);
    });
})();
