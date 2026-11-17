/* =========================================================
   Como funciona: mapa de conexões.

   O agente fica no centro, ligado ao WhatsApp e ao Instagram
   (entrada) e aos quatro destinos (saída). Os destinos viram
   abas: clicar em um acende o caminho entrada -> agente ->
   destino, um pulso de luz percorre esse caminho uma vez e o
   painel do destino aparece embaixo.

   As linhas são desenhadas a partir da posição real de cada
   nó, então ficam certas em qualquer largura (no celular o
   mapa fica na vertical e as curvas descem).

   Sem JS: sem linhas, os destinos são links para os painéis
   e os quatro painéis ficam abertos. Com "reduzir movimento"
   o caminho acende sem desenho nem pulso.
   ========================================================= */
(() => {
    const mapa = document.querySelector('#como-funciona .rede');
    if (!mapa) return;

    const svg = mapa.querySelector('.rede-linhas');
    const agente = mapa.querySelector('.rede-agente');
    const entradas = [...mapa.querySelectorAll('.rede-entrada')];
    const abas = [...mapa.querySelectorAll('.rede-destino')];
    const lista = mapa.querySelector('.rede-destinos');
    const paineis = abas.map(aba => document.getElementById(aba.hash.slice(1)));
    if (!svg || !agente || !abas.length || paineis.includes(null)) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');
    const NS = 'http://www.w3.org/2000/svg';

    // Tempo (ms) que o pulso leva para cruzar a entrada antes de seguir para o destino
    const ATRASO_DESTINO = 450;

    /* ---------- Abas (acessíveis) ---------- */

    lista.setAttribute('role', 'tablist');
    abas.forEach((aba, i) => {
        aba.setAttribute('role', 'tab');
        aba.setAttribute('aria-controls', paineis[i].id);
        paineis[i].setAttribute('role', 'tabpanel');
        paineis[i].setAttribute('aria-labelledby', aba.id);
        paineis[i].tabIndex = 0;
    });

    /* ---------- Linhas ---------- */

    // Cada caminho tem três camadas: a trilha apagada, a linha acesa e o pulso
    const criarCaminho = () => {
        const g = document.createElementNS(NS, 'g');
        const camadas = ['linha-trilha', 'linha-acesa', 'linha-pulso'].map(classe => {
            const p = document.createElementNS(NS, 'path');
            p.setAttribute('class', classe);
            g.appendChild(p);
            return p;
        });
        svg.appendChild(g);
        return { g, camadas };
    };

    const caminhosEntrada = entradas.map(criarCaminho);
    const caminhosDestino = abas.map(criarCaminho);

    // Curva de um nó a outro. Na horizontal sai pela direita e entra pela
    // esquerda; na vertical (celular) sai por baixo e entra por cima.
    const curva = (de, para, base, horizontal) => {
        const a = de.getBoundingClientRect();
        const b = para.getBoundingClientRect();
        let x1, y1, x2, y2;
        if (horizontal) {
            x1 = a.right; y1 = a.top + a.height / 2;
            x2 = b.left;  y2 = b.top + b.height / 2;
        } else {
            x1 = a.left + a.width / 2; y1 = a.bottom;
            x2 = b.left + b.width / 2; y2 = b.top;
        }
        x1 -= base.left; x2 -= base.left; y1 -= base.top; y2 -= base.top;
        if (horizontal) {
            const meio = (x2 - x1) / 2;
            return `M${x1},${y1} C${x1 + meio},${y1} ${x2 - meio},${y2} ${x2},${y2}`;
        }
        const meio = (y2 - y1) / 2;
        return `M${x1},${y1} C${x1},${y1 + meio} ${x2},${y2 - meio} ${x2},${y2}`;
    };

    const desenharLinhas = () => {
        const base = mapa.getBoundingClientRect();
        svg.setAttribute('viewBox', `0 0 ${base.width} ${base.height}`);

        // Horizontal quando o agente está à direita das entradas
        const horizontal = agente.getBoundingClientRect().left > entradas[0].getBoundingClientRect().right;

        const aplicar = ({ camadas }, d) => {
            camadas.forEach(p => p.setAttribute('d', d));
            const comprimento = Math.ceil(camadas[0].getTotalLength());
            camadas.forEach(p => p.style.setProperty('--comp', `${comprimento}px`));
        };

        caminhosEntrada.forEach((c, i) => aplicar(c, curva(entradas[i], agente, base, horizontal)));
        caminhosDestino.forEach((c, i) => aplicar(c, curva(agente, abas[i], base, horizontal)));
    };

    // Reinicia a animação do pulso (tirar e pôr a classe no mesmo quadro não basta)
    const pulsar = (pulso, atraso) => {
        pulso.classList.remove('pulsando');
        void pulso.getBoundingClientRect();
        pulso.style.setProperty('--atraso', `${atraso}ms`);
        pulso.classList.add('pulsando');
    };

    /* ---------- Escolher um destino ---------- */

    let atual = -1;

    const escolher = (indice, { focar = false, animar = true } = {}) => {
        if (indice === atual) return;
        atual = indice;

        abas.forEach((aba, i) => {
            const ativa = i === indice;
            aba.setAttribute('aria-selected', String(ativa));
            aba.tabIndex = ativa ? 0 : -1;
            paineis[i].hidden = !ativa;
            caminhosDestino[i].g.classList.toggle('aceso', ativa);
        });
        caminhosEntrada.forEach(c => c.g.classList.add('aceso'));
        agente.classList.add('aceso');

        if (focar) abas[indice].focus();

        if (animar && !movimentoReduzido.matches) {
            caminhosEntrada.forEach(c => pulsar(c.camadas[2], 0));
            pulsar(caminhosDestino[indice].camadas[2], ATRASO_DESTINO);
        }
    };

    abas.forEach((aba, i) => {
        aba.addEventListener('click', evento => {
            evento.preventDefault();
            escolher(i);
        });
    });

    // Setas, Home e End trocam de aba (padrão de abas do WAI-ARIA)
    lista.addEventListener('keydown', evento => {
        const teclas = {
            ArrowRight: atual + 1, ArrowDown: atual + 1,
            ArrowLeft: atual - 1, ArrowUp: atual - 1,
            Home: 0, End: abas.length - 1
        };
        if (!(evento.key in teclas)) return;
        evento.preventDefault();
        const total = abas.length;
        escolher((teclas[evento.key] + total) % total, { focar: true });
    });

    /* ---------- Ligar ---------- */

    mapa.dataset.js = 'rede';
    desenharLinhas();
    escolher(0, { animar: false });

    new ResizeObserver(desenharLinhas).observe(mapa);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(desenharLinhas);

})();
