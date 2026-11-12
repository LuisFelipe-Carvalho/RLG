/* =========================================================
   Explicação: o que a demo do computador e o carrossel do
   celular têm em comum. Carregado antes dos dois:
     scripts/explicacao-cenas.js    (este)
     scripts/explicacao-anima.js    demo do computador
     scripts/explicacao-celular.js  carrossel do celular

   - ajudantes das cenas (pausa, mostrar, digitando...);
   - preparar() e final() de cada uma das 4 telas: o estado
     antes da cena tocar e o estado pronto. Cada modo escreve
     só o seu tocar(), porque a demo usa a conversa da janela
     e o celular usa os balões de dentro de cada tela;
   - um controle único de modo: só um modo fica montado por
     vez, e o anterior é sempre desmontado antes do próximo
     montar (os dois mexem nas mesmas telas).
   ========================================================= */
window.RLGExplicacao = (() => {
    const PARADA = Symbol('parada');

    // Espera ms; se a cena foi parada nesse meio-tempo, interrompe
    const pausa = (exec, ms) => new Promise((ok, falha) => {
        setTimeout(() => (exec.ativa ? ok() : falha(PARADA)), ms);
    });

    const mostrar = el => el && el.classList.add('visivel');
    const esconder = el => el && el.classList.remove('visivel');
    const surgem = tela => [...tela.querySelectorAll('[data-surge]')];

    // Estado final: tudo à mostra, menos as bolinhas de "digitando"
    function tudoVisivel(tela) {
        surgem(tela).forEach(el => el.classList.toggle('visivel', !el.classList.contains('digitando')));
    }

    // "Digitando..." e depois a mensagem, no mesmo lugar
    async function digitaEMostra(exec, vez, ms) {
        const bolinhas = vez.querySelector('.digitando');
        const balao = vez.querySelector('.balao');
        mostrar(bolinhas);
        await pausa(exec, ms);
        esconder(bolinhas);
        if (vez.closest('.app-fio')) balao.classList.add('chega');
        mostrar(balao);
    }

    const relogioTexto = minutos => {
        const h = Math.floor(minutos / 60) % 24;
        const m = minutos % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    };

    /* ---------- Estados das 4 telas (iguais nos dois modos) ---------- */

    const estados = {
        // 01 · Atendimento hoje
        mapa: {
            preparar(tela) {
                surgem(tela).forEach(esconder);
                tela.querySelector('.mapa-perdido').classList.remove('riscado');
                tela.querySelector('.tela-relogio').textContent = '22:47';
            },
            final(tela) {
                tudoVisivel(tela);
                tela.querySelector('.mapa-perdido').classList.add('riscado');
                tela.querySelector('.tela-relogio').textContent = '09:16';
            }
        },
        // 02 · Base da clínica
        base: {
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
            }
        },
        // 03 · Agente ligado
        conexoes: {
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
            }
        },
        // 04 · Revisão do mês
        revisao: {
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
            }
        }
    };

    // Junta o preparar/final comum com o tocar() de um modo
    const cenas = tocares => Object.fromEntries(
        Object.entries(estados).map(([nome, estado]) => [nome, { ...estado, tocar: tocares[nome] }])
    );

    /* ---------- Controle único de modo ----------
       Cada modo se registra com a sua media query. Quando qualquer uma muda,
       o modo atual é desmontado ANTES de o novo montar, então os dois nunca
       mexem nas telas ao mesmo tempo. Sem modo (tela média, reduzir movimento,
       sem IntersectionObserver): as telas ficam no estado final do HTML. */

    const modos = (() => {
        const lista = [];
        let atual = null;
        let agendado = false;

        function decidir() {
            agendado = false;
            const quer = lista.find(m => m.mql.matches) || null;
            if (quer === atual) return;
            if (atual) atual.desmontar();
            atual = quer;
            if (atual) atual.montar();
        }

        function agendar() {
            if (agendado) return;
            agendado = true;
            queueMicrotask(decidir);
        }

        return {
            registrar(nome, { midia, montar, desmontar }) {
                const mql = window.matchMedia(midia);
                lista.push({ nome, mql, montar, desmontar });
                mql.addEventListener('change', agendar);
                agendar();
            },
            get atual() {
                return atual ? atual.nome : null;
            }
        };
    })();

    return {
        PARADA,
        pausa,
        mostrar,
        esconder,
        surgem,
        tudoVisivel,
        digitaEMostra,
        relogioTexto,
        cenas,
        modos
    };
})();
