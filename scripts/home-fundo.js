/* =========================================================
   Onda da home: gradiente vivo nos tons do roxo da marca,
   desenhado com WebGL (sem biblioteca).

   As cores vêm dos tokens --onda-1..4 (estilos/style.css).
   O canvas roda em meia resolução e pausa fora da tela ou com
   a aba escondida. Com "reduzir movimento" desenha um quadro
   só, parado. Sem WebGL ou sem JS fica o gradiente do CSS.
   ========================================================= */
(() => {
    const onda = document.querySelector('#home .home-onda');
    const canvas = onda && onda.querySelector('canvas');
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return;

    const movimentoReduzido = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Converte qualquer cor do CSS (oklch, hex...) para RGB de 0 a 1
    const tinta = document.createElement('canvas').getContext('2d');
    const cor = (nome) => {
        const valor = getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
        tinta.clearRect(0, 0, 1, 1);
        tinta.fillStyle = valor;
        tinta.fillRect(0, 0, 1, 1);
        const [r, g, b] = tinta.getImageData(0, 0, 1, 1).data;
        return [r / 255, g / 255, b / 255];
    };

    const vertice = `
        attribute vec2 p;
        void main() { gl_Position = vec4(p, 0.0, 1.0); }
    `;

    const fragmento = `
        precision mediump float;
        uniform vec2 res;
        uniform float t;
        uniform vec3 c1, c2, c3, c4;

        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

        float ruido(vec2 p) {
            vec2 i = floor(p), f = fract(p);
            vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
                       mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
        }

        float fbm(vec2 p) {
            float v = 0.0, a = 0.5;
            for (int i = 0; i < 4; i++) { v += a * ruido(p); p *= 2.02; a *= 0.5; }
            return v;
        }

        void main() {
            vec2 uv = gl_FragCoord.xy / res;
            vec2 p = uv * vec2(res.x / res.y, 1.0);
            float tt = t * 0.045;

            // Ruído dobrado sobre si mesmo: as manchas escorrem devagar
            vec2 q = vec2(fbm(p * 0.9 + vec2(0.0, tt)), fbm(p * 0.9 + vec2(5.2, 1.3) - tt));
            float n = fbm(p * 1.1 + q * 1.7 + vec2(tt * 0.6, -tt * 0.4));

            // Dobras diagonais, como faixas de seda: estreitas e bem marcadas
            float dobra = sin(p.x * 2.0 - p.y * 2.8 + n * 3.6 + t * 0.12) * 0.5 + 0.5;
            float faixa = smoothstep(0.55, 0.97, dobra);
            float v = clamp(n * 0.5 + faixa * 0.85 - 0.02, 0.0, 1.0);

            vec3 cor = mix(c1, c2, smoothstep(0.05, 0.45, v));
            cor = mix(cor, c3, smoothstep(0.42, 0.82, v));
            cor = mix(cor, c4, smoothstep(0.84, 1.0, v) * 0.7);

            // Mais escuro à esquerda, onde fica o texto
            cor = mix(cor, c1, (1.0 - smoothstep(0.0, 0.65, uv.x)) * 0.45);

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
    ['c1', 'c2', 'c3', 'c4'].forEach((nome, i) => gl.uniform3fv(u(nome), cor(`--onda-${i + 1}`)));

    // Meia resolução: a onda é macia, não precisa de mais
    const ESCALA = 0.5;
    const ajustar = () => {
        const w = Math.max(1, Math.round(onda.clientWidth * ESCALA));
        const h = Math.max(1, Math.round(onda.clientHeight * ESCALA));
        if (canvas.width === w && canvas.height === h) return;
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uRes, w, h);
    };

    // Começa num ponto já bonito da animação
    const INICIO = 40;
    let tempo = INICIO;
    let ultimo = 0;
    let quadro = 0;
    let rodando = false;

    const desenhar = () => {
        ajustar();
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
    onda.dataset.pronto = '';

    let naTela = true;
    const atualizar = () => (naTela && !document.hidden ? iniciar() : pausar());

    new IntersectionObserver((entradas) => {
        naTela = entradas[0].isIntersecting;
        atualizar();
    }).observe(onda);

    document.addEventListener('visibilitychange', atualizar);
    new ResizeObserver(() => { if (!rodando) desenhar(); }).observe(onda);

    movimentoReduzido.addEventListener('change', () => {
        if (movimentoReduzido.matches) { pausar(); desenhar(); } else atualizar();
    });
})();
