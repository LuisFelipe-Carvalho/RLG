/* =========================================================
   Explicação: o céu vivo, na tela toda (WebGL, sem biblioteca).

   O mesmo motor da onda da home (scripts/home-fundo.js), com
   outra matéria: um céu do alto ao pé e uma névoa larga que
   corre devagar de lado. As cores vêm dos tokens --ceu-*-1..3
   (estilos/style.css) e seguem a fase do céu, a variável
   --ceu-fase da seção (0 noite, 1 madrugada, 2 amanhecer,
   3 dia, 4 fim), que a rolagem (scripts/explicacao-gsap.js)
   ou o passo à vista (data-hora) movem.

   Nas trocas em que a tinta do texto vira (amanhecer para
   dia e dia para fim), a cor passa rápido pelo meio, para o
   texto não ficar sobre um céu de contraste ruim.

   Meia resolução; pausa fora da tela ou com a aba escondida.
   Com "reduzir movimento" desenha um quadro parado e só
   redesenha quando a hora muda. Sem WebGL ou sem JS ficam as
   camadas de CSS, com as mesmas cores.
   ========================================================= */
(() => {
    const secao = document.querySelector('#explicacao');
    const ceu = secao && secao.querySelector('.exp-ceu');
    const canvas = ceu && ceu.querySelector('canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Converte qualquer cor do CSS (oklch, hex...) para RGB de 0 a 1
    const tinta = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    const cor = (nome) => {
        const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
        tinta.clearRect(0, 0, 1, 1);
        tinta.fillStyle = valor;
        tinta.fillRect(0, 0, 1, 1);
        const [r, g, b] = tinta.getImageData(0, 0, 1, 1).data;
        return [r / 255, g / 255, b / 255];
    };

    // Uma paleta por fase: [alto, pé, névoa]
    const HORAS = ['noite', 'madrugada', 'amanhecer', 'dia', 'fim'];
    const paletas = HORAS.map(h => [1, 2, 3].map(k => cor(`--ceu-${h}-${k}`)));

    const vertice = `
        attribute vec2 p;
        void main() { gl_Position = vec4(p, 0.0, 1.0); }
    `;

    const fragmento = `
        precision mediump float;
        uniform vec2 res;
        uniform float t;
        uniform vec3 c1, c2, c3;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        float ruido(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 4; i++) { v += a * ruido(p); p *= 2.03; a *= 0.5; }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / res;
            vec2 p = uv * vec2(res.x / res.y, 1.0);
            float tt = t * 0.03;

            // O céu: do alto (c1) ao pé (c2)
            vec3 cor = mix(c2, c1, smoothstep(0.0, 1.0, uv.y));

            // A névoa: faixas largas, achatadas, que correm de lado e se desfazem
            vec2 q = vec2(p.x * 0.55 + tt, p.y * 1.7);
            float n = fbm(q + vec2(fbm(q * 0.8 - vec2(tt * 0.6, 0.0)) * 1.5, tt * 0.2));
            float nevoa = smoothstep(0.45, 0.82, n) * (0.4 + 0.6 * (1.0 - uv.y));
            cor = mix(cor, c3, nevoa * 0.85);

            gl_FragColor = vec4(cor, 1.0);
        }
    `;

    const compilar = (tipo, fonte) => {
        const s = gl.createShader(tipo);
        gl.shaderSource(s, fonte);
        gl.compileShader(s);
        return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };

    const vs = compilar(gl.VERTEX_SHADER, vertice);
    const fs = compilar(gl.FRAGMENT_SHADER, fragmento);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    // Um triângulo que cobre a tela toda
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const atributo = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(atributo);
    gl.vertexAttribPointer(atributo, 2, gl.FLOAT, false, 0, 0);

    const u = (nome) => gl.getUniformLocation(prog, nome);
    const uRes = u('res');
    const uT = u('t');
    const uCores = ['c1', 'c2', 'c3'].map(u);

    /* ---------- A fase vira cor ---------- */

    const mistura = (a, b, k) => a.map((v, i) => v + (b[i] - v) * k);

    // Passagem macia entre fases; nas que viram a tinta, rápida no meio
    const macia = (k) => k * k * (3 - 2 * k);
    const rapidaNoMeio = (k) => (k < 0.5 ? 16 * k ** 5 : 1 - (-2 * k + 2) ** 5 / 2);

    let faseDesenhada = -1;

    const aplicarFase = () => {
        const f = Math.min(4, Math.max(0, parseFloat(getComputedStyle(secao).getPropertyValue('--ceu-fase')) || 0));
        if (f === faseDesenhada) return false;
        faseDesenhada = f;
        const i = Math.min(3, Math.floor(f));
        const k = f - i;
        const curva = i >= 2 ? rapidaNoMeio(k) : macia(k);
        paletas[i].forEach((c, j) => gl.uniform3fv(uCores[j], mistura(c, paletas[i + 1][j], curva)));
        return true;
    };

    // Meia resolução: o céu é macio, não precisa de mais
    const ESCALA = 0.5;
    const ajustar = () => {
        const w = Math.max(1, Math.round(ceu.clientWidth * ESCALA));
        const h = Math.max(1, Math.round(ceu.clientHeight * ESCALA));
        if (canvas.width === w && canvas.height === h) return;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
    };

    // Começa num ponto já bonito da névoa
    let tempo = 30;
    let ultimo = 0;
    let quadro = 0;
    let rodando = false;

    const desenhar = () => {
        ajustar();
        aplicarFase();
        gl.uniform1f(uT, tempo);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const passo = (agora) => {
        if (!rodando) return;
        if (ultimo) tempo += Math.min(agora - ultimo, 50) / 1000;
        ultimo = agora;
        desenhar();
        quadro = requestAnimationFrame(passo);
    };

    const iniciar = () => {
        if (rodando || movimentoReduzido.matches) return;
        rodando = true;
        ultimo = 0;
        quadro = requestAnimationFrame(passo);
    };

    const pausar = () => {
        rodando = false;
        cancelAnimationFrame(quadro);
    };

    desenhar();
    ceu.dataset.pronto = '';

    let naTela = false;
    const atualizar = () => (naTela && !document.hidden ? iniciar() : pausar());

    new IntersectionObserver((entradas) => {
        naTela = entradas[0].isIntersecting;
        atualizar();
    }).observe(secao); // o céu é fixo na tela: quem entra e sai é a seção

    document.addEventListener('visibilitychange', atualizar);
    new ResizeObserver(() => { if (!rodando) desenhar(); }).observe(ceu);

    // Parado (movimento reduzido ou fora da tela), a troca de hora ainda redesenha
    let pedido = 0;
    new MutationObserver(() => {
        if (rodando || pedido) return;
        pedido = requestAnimationFrame(() => {
            pedido = 0;
            desenhar();
        });
    }).observe(secao, { attributes: true, attributeFilter: ['data-hora', 'style'] });

    movimentoReduzido.addEventListener('change', () => {
        if (movimentoReduzido.matches) { pausar(); desenhar(); } else atualizar();
    });
})();
