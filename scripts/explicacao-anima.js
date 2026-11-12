/* =========================================================
   Explicação: uma janela do produto que se transforma,
   sobre um céu que vai da noite ao dia.

   No computador (1120px ou mais, sem "reduzir movimento"),
   as telas dos passos vão para o painel de uma janela fixa
   à direita. A janela é uma só, do começo ao fim:

   - à esquerda, a conversa da Ana, que vai se somando;
   - à direita, o painel do passo (as telas dos passos);
   - atrás, o céu: noite (01), madrugada (02), amanhecer (03)
     e dia (04).

   01 mapa      a Ana pergunta às 22:47, ninguém responde,
                ela marca em outra clínica: o gargalo
   02 base      a ficha da clínica é preenchida e o agente
                responde a mesma pergunta da Ana (prévia)
   03 conexoes  o agente é ligado, os canais conectam, a
                resposta é enviada e a consulta é marcada
   04 revisao   a consulta passa da conversa para a revisão,
                o lembrete da véspera confirma, e o mês
                mostra e corrige o sábado

   Indo para a frente, a cena toca. Voltando, a janela
   aparece já pronta. "Repetir" toca a cena do passo de novo.
   No celular, sem JS ou com "reduzir movimento", nada disso
   roda: cada passo mostra a sua tela no estado final.
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    if (!secao) return;

    const passos = [...secao.querySelectorAll('.exp-passo')];
    const fixo = secao.querySelector('.exp-fixo');
    const palcoFixo = secao.querySelector('.exp-fixo-palco');
    const painel = secao.querySelector('.app-painel');
    const fio = secao.querySelector('.app-fio');
    const relogioApp = secao.querySelector('.app-relogio');
    const repetir = secao.querySelector('.exp-repetir');
    if (!passos.length || !fixo || !palcoFixo || !painel || !fio || !relogioApp) return;

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

    /* ---------- A conversa da Ana (coluna da esquerda da janela) ----------
       O que está na conversa ao fim de cada passo. Cada cena começa do
       estado do passo anterior e acrescenta (ou recolhe) mensagens. */

    const FIO = {
        0: [],
        1: ['pergunta', 'noite', 'tarde', 'perdida'],
        2: ['pergunta', 'agente'],
        3: ['pergunta', 'agente', 'escolha', 'marcado', 'consulta'],
        4: ['pergunta', 'agente', 'escolha', 'marcado', 'lembrete', 'confirma']
    };
    const RELOGIO = { 0: '22:47', 1: '09:16', 2: '22:47', 3: '22:48', 4: '18:02' };

    const noFio = nome => fio.querySelector(`[data-fio="${nome}"]`);
    const tagEnvio = fio.querySelector('.app-tag-envio');

    function marcarEnviada(enviada) {
        tagEnvio.textContent = enviada ? 'Enviada 22:47' : 'Prévia';
        tagEnvio.classList.toggle('tela-tag-ok', enviada);
    }

    function fioEm(n) {
        fio.querySelectorAll('[data-fio]').forEach(el => {
            el.classList.toggle('no-fio', FIO[n].includes(el.dataset.fio));
            el.classList.remove('chega');
            el.querySelectorAll('.balao').forEach(b => { b.classList.remove('chega'); mostrar(b); });
            el.querySelectorAll('.digitando').forEach(esconder);
        });
        noFio('perdida').classList.toggle('riscado', n === 1);
        marcarEnviada(n >= 3);
        relogioApp.textContent = RELOGIO[n];
    }

    // Uma mensagem chega à conversa (as que têm "digitando" chegam vazias)
    function entra(nome) {
        const el = noFio(nome);
        el.querySelectorAll('.balao').forEach(esconder);
        el.classList.add('no-fio', 'chega');
        return el;
    }

    // Mensagens saem da conversa (a conversa da manhã recolhe)
    async function saem(exec, nomes) {
        const els = nomes.map(noFio).filter(el => el.classList.contains('no-fio'));
        els.forEach(el => el.animate(
            [{ opacity: 1 }, { opacity: 0, transform: 'translateY(-6px)' }],
            { duration: 220, easing: 'ease-in', fill: 'forwards' }
        ));
        await pausa(exec, 240);
        els.forEach(el => {
            el.getAnimations().forEach(a => a.cancel());
            el.classList.remove('no-fio', 'chega');
        });
    }

    /* ---------- 01 · Atendimento hoje: o gargalo ---------- */

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
            entra('pergunta');
            await pausa(exec, 300);
            mostrar(tela.querySelector('.regua-ana'));
            await pausa(exec, 600);

            // A noite passa: o relógio corre de 22:47 até 09:15
            entra('noite');
            const inicio = 22 * 60 + 47;
            const fim = (24 + 9) * 60 + 15;
            const QUADROS = 36;
            for (let q = 1; q <= QUADROS; q++) {
                relogioApp.textContent = relogioTexto(Math.round(inicio + (fim - inicio) * (q / QUADROS)));
                await pausa(exec, 35);
            }

            entra('tarde');
            await pausa(exec, 700);
            relogioApp.textContent = '09:16';
            const perdida = entra('perdida');
            await pausa(exec, 350);
            perdida.classList.add('riscado');
            await pausa(exec, 600);
            mostrar(tela.querySelector('.tela-achado'));
        }
    };

    /* ---------- 02 · Base da clínica: o agente aprende e responde a Ana ---------- */

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
            // A manhã perdida recolhe: fica só a pergunta das 22:47
            await saem(exec, ['noite', 'tarde', 'perdida']);
            relogioApp.textContent = '22:47';
            await pausa(exec, 200);

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

            // O agente usa a ficha para responder a pergunta da Ana
            await pausa(exec, 300);
            marcarEnviada(false);
            await digitaEMostra(exec, entra('agente'), 1100);
            tela.querySelector('[data-campo="horarios"]').classList.add('em-uso');
            await pausa(exec, 500);
            tela.querySelector('.tela-pilula').textContent = 'Pronto';
        }
    };

    /* ---------- 03 · Agente ligado: a resposta vai e a consulta é marcada ---------- */

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
            await pausa(exec, 200);

            // A chave liga o agente
            tela.dataset.chave = 'ligada';
            tela.querySelector('.chave-rotulo').textContent = 'Ligado';
            await pausa(exec, 400);

            // Cada canal conecta, um por vez
            for (const li of tela.querySelectorAll('.canais li')) {
                li.dataset.estado = 'conectando';
                await pausa(exec, 350);
                li.dataset.estado = 'ok';
                await pausa(exec, 100);
            }

            // A prévia vira resposta enviada às 22:47
            await pausa(exec, 300);
            marcarEnviada(true);
            await pausa(exec, 700);

            // A Ana escolhe e o agente marca
            await digitaEMostra(exec, entra('escolha'), 900);
            relogioApp.textContent = '22:48';
            await pausa(exec, 400);
            await digitaEMostra(exec, entra('marcado'), 900);
            await pausa(exec, 400);

            // A consulta entra na agenda
            entra('consulta');
        }
    };

    /* ---------- 04 · Revisão do mês: da consulta da Ana ao mês inteiro ---------- */

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

            // A consulta da Ana já está na revisão (veio da conversa ou aparece agora)
            const consulta = tela.querySelector('.consulta');
            if (!consulta.classList.contains('visivel')) {
                noFio('consulta').classList.remove('no-fio', 'chega');
                mostrar(consulta);
                await pausa(exec, 500);
            }

            // Na véspera, o lembrete sai e a Ana confirma
            relogioApp.textContent = '18:00';
            await digitaEMostra(exec, entra('lembrete'), 900);
            await pausa(exec, 500);
            relogioApp.textContent = '18:02';
            await digitaEMostra(exec, entra('confirma'), 800);
            await pausa(exec, 300);
            troca.textContent = troca.dataset.depois;
            await pausa(exec, 700);

            // O mês inteiro: as barras crescem, o sábado fica baixo
            mostrar(tela.querySelector('.grafico-legenda'));
            mostrar(tela.querySelector('.barras'));
            await pausa(exec, 200);
            tela.dataset.fase = 'vaza';
            await pausa(exec, 1200);
            mostrar(vazava);
            await pausa(exec, 900);

            // O ajuste: o sábado sobe
            mostrar(ajuste);
            await pausa(exec, 500);
            tela.dataset.fase = 'ajustado';
            await pausa(exec, 900);
            mostrar(proxima);
        }
    };

    /* ---------- Motor da demo ---------- */

    const CENAS = { mapa, base, conexoes, revisao };

    const itens = passos.map(passo => {
        const tela = passo.querySelector('.tela');
        return {
            passo,
            tela,
            texto: passo.querySelector('.exp-passo-texto'),
            palco: passo.querySelector('.exp-palco'),
            cena: CENAS[tela.dataset.cena]
        };
    });

    // Posição dentro do palco fixo, ignorando transform (a tela que entra ainda está deslocada)
    function posicao(el) {
        let x = 0;
        let y = 0;
        let no = el;
        while (no && no !== palcoFixo) {
            x += no.offsetLeft;
            y += no.offsetTop;
            no = no.offsetParent;
        }
        return { x, y, w: el.offsetWidth, h: el.offsetHeight };
    }

    /* 3 → 4: o próprio cartão da consulta sai da conversa e pousa na revisão do mês */
    async function levarConsulta(telaRevisao, meu) {
        const origem = noFio('consulta');
        const destino = telaRevisao.querySelector('.consulta');
        const a = posicao(origem);

        const v = origem.cloneNode(true);
        v.removeAttribute('data-fio');
        v.classList.remove('no-fio', 'chega');
        v.classList.add('viajante-copia');
        v.style.width = `${a.w}px`;
        v.setAttribute('aria-hidden', 'true');
        palcoFixo.appendChild(v);
        meu.viajante = v;

        // o cartão sai da conversa e a revisão entra por baixo enquanto ele voa
        origem.classList.remove('no-fio', 'chega');
        trocarTela(telaRevisao);

        const b = posicao(destino);
        const em = (x, y, s) => `translate(${x}px, ${y}px) scale(${s})`;
        const xm = (a.x + b.x) / 2;
        const ym = Math.min(a.y, b.y) - 40;
        const anim = v.animate([
            { transform: em(a.x, a.y, 1) },
            { transform: em(a.x, a.y, 1.03), offset: 0.15 },
            { transform: em(xm, ym, 1.03), offset: 0.55 },
            { transform: em(b.x, b.y, 1) }
        ], { duration: 1000, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
        meu.anim = anim;

        try {
            await anim.finished;
        } catch {
            throw PARADA;
        }
        if (!meu.ativa) throw PARADA;

        // chegou: o destino aparece no lugar exato (sem transição) e confirma a entrega uma vez
        destino.style.transition = 'none';
        mostrar(destino);
        void destino.offsetWidth;
        destino.style.transition = '';
        destino.classList.add('recebe');
        setTimeout(() => destino.classList.remove('recebe'), 600);
        v.remove();
        meu.viajante = null;
        meu.anim = null;
    }

    let atual = 0;
    let exec = null;
    let observador = null;

    function parar() {
        if (exec) {
            exec.ativa = false;
            if (exec.anim) exec.anim.cancel();
            if (exec.viajante) exec.viajante.remove();
        }
        exec = null;
    }

    function trocarTela(tela) {
        itens.forEach(item => item.tela.classList.toggle('ativa', item.tela === tela));
    }

    // Toca a cena do passo n a partir do estado em que o passo anterior terminou
    async function tocar(n, atraso, { daConversa = false } = {}) {
        parar();
        const meu = { ativa: true };
        exec = meu;
        const item = itens[n - 1];
        item.cena.preparar(item.tela);
        fioEm(n - 1);
        try {
            if (daConversa) await levarConsulta(item.tela, meu);
            else trocarTela(item.tela);
            await pausa(meu, atraso);
            await item.cena.tocar(item.tela, meu);
        } catch (erro) {
            if (erro !== PARADA) throw erro;
        }
    }

    function ativar(n) {
        if (n === atual) return;
        const anterior = atual;
        parar();

        itens.forEach((item, i) => {
            item.passo.classList.toggle('ativo', i + 1 === n);
            item.passo.classList.toggle('feito', i + 1 < n);
        });
        palcoFixo.dataset.hora = String(n);
        atual = n;

        const item = itens[n - 1];
        if (n > anterior) {
            // indo para a frente: a cena toca (de 3 para 4, a consulta voa até a revisão)
            tocar(n, 350, { daConversa: n === 4 && anterior === 3 });
        } else {
            // voltando: a janela aparece já pronta
            trocarTela(item.tela);
            item.cena.final(item.tela);
            fioEm(n);
        }
    }

    function montar() {
        secao.dataset.js = 'demo';
        fixo.hidden = false;
        itens.forEach(item => painel.appendChild(item.tela));

        // Antes do primeiro passo chegar, a janela espera pronta para começar
        atual = 0;
        palcoFixo.dataset.hora = '1';
        itens[0].tela.classList.add('ativa');
        itens[0].cena.preparar(itens[0].tela);
        fioEm(0);

        // Uma faixa fina a 25% da altura da janela decide o passo ativo: o texto
        // que a cruza é o que está travado no lugar (o anterior já subiu)
        observador = new IntersectionObserver(entradas => {
            entradas.forEach(entrada => {
                if (entrada.isIntersecting) ativar(itens.findIndex(i => i.texto === entrada.target) + 1);
            });
        }, { rootMargin: '-25% 0px -74% 0px' });
        itens.forEach(item => observador.observe(item.texto));
    }

    function desmontar() {
        parar();
        if (observador) observador.disconnect();
        observador = null;
        itens.forEach(item => {
            item.palco.appendChild(item.tela);
            item.tela.classList.remove('ativa');
            item.passo.classList.remove('ativo', 'feito');
            item.cena.final(item.tela);
        });
        fixo.hidden = true;
        if (secao.dataset.js === 'demo') delete secao.dataset.js;
        atual = 0;
    }

    if (repetir) {
        repetir.addEventListener('click', () => tocar(Math.max(atual, 1), 150));
    }

    if (!('IntersectionObserver' in window)) return;

    // A janela em duas colunas precisa de largura: abaixo disso, cada passo com a sua tela
    const telaGrande = window.matchMedia('(min-width: 1120px) and (prefers-reduced-motion: no-preference)');
    const decidir = () => {
        const ligada = secao.dataset.js === 'demo';
        if (telaGrande.matches && !ligada) montar();
        else if (!telaGrande.matches && ligada) desmontar();
    };
    telaGrande.addEventListener('change', decidir);
    decidir();
})();
