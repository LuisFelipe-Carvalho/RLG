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
   Ajudantes, estados das telas e o controle de modo (só um
   modo montado por vez): scripts/explicacao-cenas.js
   O movimento preso à rolagem (GSAP) fica em
   scripts/explicacao-gsap.js e ouve 'exp:montou' e
   'exp:desmontou', que este arquivo dispara.
   No celular: o carrossel de scripts/explicacao-celular.js.
   Sem JS, com "reduzir movimento" ou entre 960 e 1120px:
   cada passo mostra a sua tela no estado final.
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

    // Ajudantes e estados das telas: scripts/explicacao-cenas.js
    const C = window.RLGExplicacao;
    if (!C) return;
    const { PARADA, pausa, mostrar, esconder, digitaEMostra, relogioTexto } = C;

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
    const app = secao.querySelector('.app');
    const conversa = secao.querySelector('.app-conversa');
    const contato = secao.querySelector('.app-contato');
    const avatar = secao.querySelector('.app-avatar');
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
        contato.classList.toggle('foi', n === 1); // no fim do 01 a Ana já foi embora
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
        // despencam, uma atrás da outra, girando
        els.forEach((el, i) => el.animate(
            [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: `translateY(48px) rotate(${i % 2 ? 7 : -7}deg) scale(0.8)` }],
            { duration: 420, delay: i * 90, easing: 'cubic-bezier(0.5, 0, 0.75, 0)', fill: 'forwards' }
        ));
        await pausa(exec, 420 + els.length * 90);
        els.forEach(el => {
            el.getAnimations().forEach(a => a.cancel());
            el.classList.remove('no-fio', 'chega');
        });
    }

    /* ---------- Efeitos: o exagero que conta a história ----------
       Uma camada por cima do palco (a janela corta o que passa da borda; a
       camada, não). Tudo o que um efeito cria ou anima fica guardado no exec
       da cena e é desfeito no parar(), então voltar ou repetir nunca deixa
       resto na tela. */

    const NS = 'http://www.w3.org/2000/svg';
    const camada = document.createElement('div');
    camada.className = 'exp-efeitos';
    camada.setAttribute('aria-hidden', 'true');

    // Caixa de um elemento em relação ao palco (com as transformações de agora)
    function caixa(el) {
        const a = el.getBoundingClientRect();
        const b = palcoFixo.getBoundingClientRect();
        return { x: a.left - b.left, y: a.top - b.top, w: a.width, h: a.height };
    }

    function guarda(exec, no) {
        (exec.nos || (exec.nos = [])).push(no);
        return no;
    }

    function cria(exec, classe, sobre) {
        const no = document.createElement('div');
        no.className = classe;
        camada.appendChild(no);
        if (sobre) poe(no, sobre);
        return guarda(exec, no);
    }

    function poe(no, r) {
        no.style.left = `${r.x}px`;
        no.style.top = `${r.y}px`;
        if (r.w !== undefined) no.style.width = `${r.w}px`;
        if (r.h !== undefined) no.style.height = `${r.h}px`;
    }

    // Uma animação que a cena espera: se a cena parar, interrompe
    function anima(exec, el, quadros, opcoes) {
        const a = el.animate(quadros, { fill: 'both', ...opcoes });
        (exec.anims || (exec.anims = [])).push(a);
        return a.finished.then(
            () => { if (!exec.ativa) throw PARADA; return a; },
            () => { throw PARADA; }
        );
    }

    // Uma animação solta, que a cena não espera
    const solta = (exec, el, quadros, opcoes) => anima(exec, el, quadros, { fill: 'none', ...opcoes }).catch(() => {});

    // Cresce de grande para o tamanho certo, com um tranco
    const bate = (exec, el, de = 1.8) => solta(exec, el, [
        { transform: `scale(${de})`, opacity: 0 },
        { transform: 'scale(0.9)', opacity: 1, offset: 0.6 },
        { transform: 'none', opacity: 1 }
    ], { duration: 520, easing: 'ease-out' });

    // Treme (somado ao que o GSAP já faz na janela)
    const treme = (exec, el, forca = 10) => solta(exec, el, [
        { transform: 'translate(0, 0)' },
        { transform: `translate(${-forca}px, 2px) rotate(-0.6deg)` },
        { transform: `translate(${forca * 0.9}px, -2px) rotate(0.5deg)` },
        { transform: `translate(${-forca * 0.6}px, 1px)` },
        { transform: `translate(${forca * 0.35}px, 0)` },
        { transform: 'translate(0, 0)' }
    ], { duration: 460, easing: 'ease-out', composite: 'add' });

    // Uma onda de choque que sai do elemento, na forma dele (redonda no que é
    // redondo, cartão no que é cartão) e cresce o mesmo tanto para todos os lados
    function onda(exec, el, perigo = false) {
        const r = caixa(el);
        const folga = 4;
        const no = cria(exec, perigo ? 'efeito-onda efeito-onda-perigo' : 'efeito-onda',
            { x: r.x - folga, y: r.y - folga, w: r.w + folga * 2, h: r.h + folga * 2 });
        const raio = parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0;
        no.style.borderRadius = raio * 2 >= Math.min(r.w, r.h) ? '999px' : `${raio + folga}px`;
        const cresce = 36;
        const sx = 1 + (cresce * 2) / (r.w + folga * 2);
        const sy = 1 + (cresce * 2) / (r.h + folga * 2);
        anima(exec, no, [
            { transform: 'scale(1)', opacity: 1 },
            { transform: `scale(${sx}, ${sy})`, opacity: 0 }
        ], { duration: 700, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' }).catch(() => {}).finally(() => no.remove());
    }

    // Uma linha que se desenha de um elemento (borda esquerda) a outro (borda direita)
    async function liga(exec, de, ate) {
        const a = caixa(de);
        const b = caixa(ate);
        const x1 = a.x;
        const y1 = a.y + a.h / 2;
        const x2 = b.x + b.w;
        const y2 = b.y + b.h / 2;
        const svg = guarda(exec, document.createElementNS(NS, 'svg'));
        svg.setAttribute('class', 'efeito-ligacao');
        svg.setAttribute('width', palcoFixo.clientWidth);
        svg.setAttribute('height', palcoFixo.clientHeight);
        const caminho = document.createElementNS(NS, 'path');
        caminho.setAttribute('d', `M ${x1} ${y1} C ${x1 - 90} ${y1}, ${x2 + 90} ${y2}, ${x2} ${y2}`);
        const pontas = [[x1, y1], [x2, y2]].map(([x, y]) => {
            const c = document.createElementNS(NS, 'circle');
            c.setAttribute('cx', x);
            c.setAttribute('cy', y);
            c.setAttribute('r', 5);
            c.style.transformOrigin = `${x}px ${y}px`;
            return c;
        });
        svg.append(caminho, ...pontas);
        camada.appendChild(svg);
        const comprimento = caminho.getTotalLength();
        caminho.style.strokeDasharray = comprimento;
        await anima(exec, pontas[0], [{ transform: 'scale(0)' }, { transform: 'scale(1)' }], { duration: 200, easing: 'ease-out' });
        await anima(exec, caminho, [{ strokeDashoffset: comprimento }, { strokeDashoffset: 0 }], { duration: 650, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
        await anima(exec, pontas[1], [{ transform: 'scale(0)' }, { transform: 'scale(1.6)', offset: 0.6 }, { transform: 'scale(1)' }], { duration: 300 });
        return svg;
    }

    async function some(exec, no, ms = 300) {
        await anima(exec, no, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in' });
        no.remove();
    }

    /* ---------- 01 · O problema: a noite em que ninguém respondeu ---------- */

    const mapa = {
        async tocar(tela, exec) {
            entra('pergunta');
            await pausa(exec, 500);
            const marca = tela.querySelector('.regua-ana');
            mostrar(marca);
            onda(exec, marca, true);
            await pausa(exec, 600);

            // A noite: a janela escurece e um relógio enorme corre até a manhã
            entra('noite');
            const noite = cria(exec, 'efeito-noite', caixa(app));
            const hora = document.createElement('span');
            hora.className = 'efeito-noite-hora';
            hora.textContent = '22:47';
            const espera = document.createElement('span');
            espera.className = 'efeito-noite-espera';
            espera.textContent = 'Ana esperando resposta';
            noite.append(hora, espera);
            await anima(exec, noite, [{ opacity: 0 }, { opacity: 1 }], { duration: 450, easing: 'ease-out' });

            const inicio = 22 * 60 + 47;
            const fim = (24 + 9) * 60 + 15;
            const QUADROS = 64;
            for (let q = 1; q <= QUADROS; q++) {
                const agora = Math.round(inicio + (fim - inicio) * (q / QUADROS));
                const passou = agora - inicio;
                relogioApp.textContent = relogioTexto(agora);
                hora.textContent = relogioTexto(agora);
                espera.textContent = `Ana esperando há ${Math.floor(passou / 60)}h${String(passou % 60).padStart(2, '0')}`;
                if (q % 8 === 0) solta(exec, hora, [{ transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 220, easing: 'ease-out' });
                await pausa(exec, 38);
            }
            treme(exec, espera, 6);
            await pausa(exec, 900);
            await some(exec, noite, 400);

            // A recepção responde, tarde demais
            entra('tarde');
            await pausa(exec, 900);

            // A Ana vai embora: o contato sai voando da janela
            const r = caixa(avatar);
            const voo = cria(exec, 'app-avatar', r);
            voo.textContent = avatar.textContent;
            contato.classList.add('foi');
            relogioApp.textContent = '09:16';
            const perdida = entra('perdida');
            await anima(exec, voo, [
                { transform: 'none', opacity: 1 },
                { transform: 'translate(10px, -36px) rotate(-18deg) scale(1.35)', opacity: 1, offset: 0.3 },
                { transform: `translate(${-(r.x + 120)}px, -180px) rotate(-200deg) scale(0.5)`, opacity: 0 }
            ], { duration: 950, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
            voo.remove();
            perdida.classList.add('riscado');

            // O carimbo bate e a janela treme
            const col = caixa(conversa);
            const carimbo = cria(exec, 'efeito-carimbo', { x: col.x + col.w / 2, y: col.y + col.h * 0.62 });
            carimbo.textContent = 'Paciente perdida';
            await anima(exec, carimbo, [
                { transform: 'translate(-50%, -50%) rotate(-16deg) scale(3)', opacity: 0 },
                { transform: 'translate(-50%, -50%) rotate(-8deg) scale(1)', opacity: 1 }
            ], { duration: 280, easing: 'cubic-bezier(0.5, 0, 0.75, 0)' });
            treme(exec, app, 12);
            await pausa(exec, 1300);
            await some(exec, carimbo);

            // O diagnóstico: o gargalo aparece no painel
            const achado = tela.querySelector('.tela-achado');
            mostrar(achado);
            bate(exec, achado, 1.4);
            await pausa(exec, 350);
            treme(exec, achado, 6);
        }
    };

    /* ---------- 02 · O agente aprende a clínica e responde a Ana ---------- */

    const base = {
        async tocar(tela, exec) {
            // A manhã perdida despenca: fica só a pergunta das 22:47, e a Ana volta
            await saem(exec, ['noite', 'tarde', 'perdida']);
            contato.classList.remove('foi');
            bate(exec, avatar, 2.2);
            relogioApp.textContent = '22:47';
            bate(exec, relogioApp, 1.5);
            await pausa(exec, 400);

            // A ficha da clínica é preenchida, campo a campo
            for (const dd of tela.querySelectorAll('[data-digita]')) {
                solta(exec, dd.parentElement, [
                    { transform: 'translateX(32px)', opacity: 0 },
                    { transform: 'none', opacity: 1 }
                ], { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
                dd.classList.add('cursor');
                const texto = dd.dataset.texto;
                for (let i = 1; i <= texto.length; i++) {
                    dd.textContent = texto.slice(0, i);
                    await pausa(exec, 14);
                }
                await pausa(exec, 80);
                dd.classList.remove('cursor');
            }

            // O agente usa a ficha para responder a pergunta da Ana
            await pausa(exec, 300);
            marcarEnviada(false);
            const vez = entra('agente');
            await digitaEMostra(exec, vez, 1000);
            await pausa(exec, 250);

            // A ligação: a resposta saiu dos horários da ficha
            const horarios = tela.querySelector('[data-campo="horarios"]');
            horarios.classList.add('em-uso');
            const linha = await liga(exec, horarios, vez.querySelector('.balao'));
            onda(exec, vez.querySelector('.balao'));
            await pausa(exec, 1400);
            await some(exec, linha, 400);

            const pilula = tela.querySelector('.tela-pilula');
            pilula.textContent = 'Pronto';
            bate(exec, pilula, 2);
        }
    };

    /* ---------- 03 · A solução: o agente ligado responde na hora ---------- */

    const conexoes = {
        async tocar(tela, exec) {
            await pausa(exec, 250);

            // A chave liga o agente, com um estalo
            tela.dataset.chave = 'ligada';
            tela.querySelector('.chave-rotulo').textContent = 'Ligado';
            const chave = tela.querySelector('.chave');
            onda(exec, chave);
            bate(exec, chave, 1.6);
            await pausa(exec, 450);

            // Cada canal entra e conecta, um por vez
            for (const li of tela.querySelectorAll('.canais li')) {
                solta(exec, li, [
                    { transform: 'translateX(40px) scale(0.9)', opacity: 0 },
                    { transform: 'none', opacity: 1 }
                ], { duration: 420, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' });
                li.dataset.estado = 'conectando';
                await pausa(exec, 300);
                li.dataset.estado = 'ok';
                bate(exec, li.querySelector('.icone-ok'), 2.4);
                await pausa(exec, 80);
            }

            // A virada: a resposta sai às 22:47, na hora
            await pausa(exec, 300);
            marcarEnviada(true);
            bate(exec, tagEnvio, 2.6);
            onda(exec, tagEnvio);
            await pausa(exec, 600);

            // O placar cobre o painel: a espera de 10h28 vira resposta na hora
            const placar = cria(exec, 'efeito-placar', caixa(painel));
            const linha = (classe, rotulo, valor, nota) => {
                const l = document.createElement('div');
                l.className = `efeito-placar-linha ${classe}`;
                const [a, b, c] = ['efeito-placar-rotulo', 'efeito-placar-valor', 'efeito-placar-nota'].map(k => {
                    const e = document.createElement('span');
                    e.className = k;
                    return e;
                });
                a.textContent = rotulo;
                b.textContent = valor;
                c.textContent = nota;
                l.append(a, b, c);
                return l;
            };
            const antes = linha('efeito-placar-antes', 'Antes', '10h28', 'sem resposta, e a Ana foi embora');
            const agora = linha('efeito-placar-agora', 'Agora', 'Na hora', 'resposta às 22:47, de madrugada ou não');
            const risca = document.createElement('i');
            risca.className = 'efeito-placar-risca';
            antes.querySelector('.efeito-placar-valor').append(risca);
            agora.style.opacity = '0';
            placar.append(antes, agora);
            await anima(exec, placar, [
                { opacity: 0, transform: 'translateX(40px) rotateY(-20deg)' },
                { opacity: 1, transform: 'none' }
            ], { duration: 500, easing: 'cubic-bezier(0.34, 1.4, 0.64, 1)' });
            await pausa(exec, 500);
            await anima(exec, risca, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 380, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
            treme(exec, antes, 6);
            await pausa(exec, 300);
            agora.style.opacity = '';
            const valorAgora = agora.querySelector('.efeito-placar-valor');
            solta(exec, agora, [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: 400, easing: 'ease-out' });
            bate(exec, valorAgora, 2.4);
            await pausa(exec, 250);
            onda(exec, valorAgora);
            await pausa(exec, 1700);
            await some(exec, placar, 350);

            // A Ana escolhe e o agente marca
            await digitaEMostra(exec, entra('escolha'), 800);
            relogioApp.textContent = '22:48';
            await pausa(exec, 350);
            await digitaEMostra(exec, entra('marcado'), 800);
            await pausa(exec, 350);

            // A consulta cai na conversa
            const consulta = entra('consulta');
            consulta.classList.remove('chega');
            await anima(exec, consulta, [
                { transform: 'perspective(600px) translateY(-70px) rotateX(80deg) scale(0.8)', opacity: 0 },
                { transform: 'none', opacity: 1 }
            ], { duration: 700, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)', fill: 'none' });
            onda(exec, consulta);
            onda(exec, avatar);
        }
    };

    /* ---------- 04 · Revisão do mês: da consulta da Ana ao mês inteiro ---------- */

    const revisao = {
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
            await digitaEMostra(exec, entra('lembrete'), 800);
            await pausa(exec, 450);
            relogioApp.textContent = '18:02';
            await digitaEMostra(exec, entra('confirma'), 700);
            await pausa(exec, 300);
            troca.textContent = troca.dataset.depois;
            bate(exec, troca.parentElement, 2.2);
            onda(exec, consulta);
            await pausa(exec, 800);

            // O mês inteiro: as barras crescem com mola, o sábado fica baixo
            mostrar(tela.querySelector('.grafico-legenda'));
            mostrar(tela.querySelector('.barras'));
            await pausa(exec, 200);
            tela.dataset.fase = 'vaza';
            await pausa(exec, 1100);
            const sabado = tela.querySelector('.barra-sab .barra-area');
            onda(exec, sabado, true);
            treme(exec, sabado, 5);
            mostrar(vazava);
            bate(exec, vazava, 1.3);
            await pausa(exec, 1000);

            // O ajuste voa até o sábado, e o sábado sobe
            mostrar(ajuste);
            await pausa(exec, 450);
            const origem = caixa(ajuste.querySelector('dd'));
            const chip = cria(exec, 'efeito-chip', { x: origem.x, y: origem.y });
            chip.textContent = ajuste.querySelector('dd').textContent;
            const alvo = caixa(sabado);
            const dx = alvo.x + alvo.w / 2 - origem.x - chip.offsetWidth / 2;
            const dy = alvo.y - origem.y;
            await anima(exec, chip, [
                { transform: 'translate(0, 0) scale(1)', opacity: 1 },
                { transform: `translate(${dx * 0.5}px, ${Math.min(dy, 0) - 70}px) scale(1.1) rotate(-6deg)`, opacity: 1, offset: 0.5 },
                { transform: `translate(${dx}px, ${dy}px) scale(0.3)`, opacity: 0.2 }
            ], { duration: 850, easing: 'cubic-bezier(0.65, 0, 0.35, 1)' });
            chip.remove();
            tela.dataset.fase = 'ajustado';
            onda(exec, sabado);
            await pausa(exec, 1000);
            mostrar(proxima);
        }
    };

    /* ---------- Motor da demo ---------- */

    const CENAS = C.cenas({
        mapa: mapa.tocar,
        base: base.tocar,
        conexoes: conexoes.tocar,
        revisao: revisao.tocar
    });

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
        const ym = Math.min(a.y, b.y) - 120;
        const anim = v.animate([
            { transform: em(a.x, a.y, 1) },
            { transform: `${em(a.x, a.y + 10, 0.92)} rotate(2deg)`, offset: 0.12 },
            { transform: `${em(xm, ym, 1.18)} rotate(-8deg)`, offset: 0.55 },
            { transform: `${em(b.x, b.y, 1)} rotate(0deg)` }
        ], { duration: 1150, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' });
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
        onda(meu, destino);
        treme(meu, destino, 5);
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
            (exec.anims || []).forEach(a => a.cancel());
            (exec.nos || []).forEach(no => no.remove());
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
        secao.dataset.hora = String(n); // o céu da seção (estilos/explicacao.css)
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
        palcoFixo.appendChild(camada);
        itens.forEach(item => painel.appendChild(item.tela));

        // Antes do primeiro passo chegar, a janela espera pronta para começar
        atual = 0;
        secao.dataset.hora = '1';
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

        // O movimento preso à rolagem (GSAP) monta depois que a demo existe
        secao.dispatchEvent(new CustomEvent('exp:montou'));
    }

    function desmontar() {
        secao.dispatchEvent(new CustomEvent('exp:desmontou'));
        parar();
        if (observador) observador.disconnect();
        observador = null;
        itens.forEach(item => {
            item.palco.appendChild(item.tela);
            item.tela.classList.remove('ativa');
            item.passo.classList.remove('ativo', 'feito');
            item.cena.final(item.tela);
        });
        camada.remove();
        fixo.hidden = true;
        delete secao.dataset.js;
        delete secao.dataset.hora;
        atual = 0;
    }

    if (repetir) {
        repetir.addEventListener('click', () => tocar(Math.max(atual, 1), 150));
    }

    if (!('IntersectionObserver' in window)) return;

    // A janela em duas colunas precisa de largura: abaixo disso, outro modo (ou nenhum)
    C.modos.registrar('demo', {
        midia: '(min-width: 1120px) and (prefers-reduced-motion: no-preference)',
        montar,
        desmontar
    });
})();
