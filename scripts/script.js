/* Nav Bar */
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav ul li a");

window.addEventListener("scroll", () => {
    let current = "";

    // Linha de gatilho a 40% da altura da tela: a seção fica "ativa"
    // quando entra na porção central do viewport, e não só ao topo.
    const linhaGatilho = window.scrollY + window.innerHeight * 0.4;

    sections.forEach(section => {
        const sectionTop = section.offsetTop;

        if (linhaGatilho >= sectionTop) {
            current = section.getAttribute("id");
        }
    });

    navLinks.forEach(link => {
        link.classList.remove("ativo");

        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("ativo");
        }
    });
});

/* MENU HAMBURGUER! */
const btnMenu = document.getElementById("btn-menu");
const menuLinksMobile = document.getElementById("menu-links");

btnMenu.addEventListener("click", () => {
    menuLinksMobile.classList.toggle("ativo-mobile");
    btnMenu.classList.toggle("ativo-mobile");
});

const todosOsLinks = document.querySelectorAll("nav ul li a");
todosOsLinks.forEach(link => {
    link.addEventListener("click", () => {
        menuLinksMobile.classList.remove("ativo-mobile");
        btnMenu.classList.remove("ativo-mobile");
    });
});

/* Fecha o menu ao clicar fora dele */
document.addEventListener("click", (evento) => {
    const menuAberto = menuLinksMobile.classList.contains("ativo-mobile");

    // Ignora cliques no proprio menu ou no botao (o botao ja tem seu toggle).
    const clicouDentro = menuLinksMobile.contains(evento.target) || btnMenu.contains(evento.target);

    if (menuAberto && !clicouDentro) {
        menuLinksMobile.classList.remove("ativo-mobile");
        btnMenu.classList.remove("ativo-mobile");
    }
});

/* --- PREVENÇÃO DE BUG NO REDIMENSIONAMENTO DA TELA --- */
window.addEventListener("resize", () => {

    if (window.innerWidth >= 768) {
        menuLinksMobile.classList.remove("ativo-mobile");
        btnMenu.classList.remove("ativo-mobile");
    }
});

/* Mudando a imagem na parte do Como Funciona */
document.addEventListener('DOMContentLoaded', () => {
    const itensPasso = document.querySelectorAll('.item-passo');
    const imagemDinamica = document.getElementById('imagem-dinamica');

    const trocarImagem = (item) => {
        const novaImagem = item.getAttribute('data-imagem');

        // Evita re-animar se a imagem clicada já é a que está sendo exibida.
        if (!novaImagem || imagemDinamica.dataset.atual === novaImagem) {
            return;
        }

        imagemDinamica.dataset.atual = novaImagem;
        imagemDinamica.style.opacity = 0;

        setTimeout(() => {
            imagemDinamica.src = novaImagem;
            imagemDinamica.style.opacity = 1;
        }, 200);
    };

    itensPasso.forEach(item => {
        // mouseenter cobre o hover no desktop; click cobre o toque no celular.
        item.addEventListener('mouseenter', () => trocarImagem(item));
        item.addEventListener('click', () => trocarImagem(item));
    });
});

/* Animação de revelar os cards ao scrollar (Explicação) */
document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.card-explicacao');

    const observador = new IntersectionObserver((entradas) => {
        entradas.forEach(entrada => {
            if (entrada.isIntersecting) {
                entrada.target.classList.add('revelado');
                observador.unobserve(entrada.target);
            }
        });
    }, {
        threshold: 0.2
    });

    cards.forEach(card => observador.observe(card));
});

/* Envio do formulário de contato para a AWS (API Gateway -> Lambda -> DynamoDB) */
document.addEventListener('DOMContentLoaded', () => {
    // Invoke URL do API Gateway (rota /enviar).
    const urlDaAPI = 'https://khwjhz2sid.execute-api.us-east-2.amazonaws.com/enviar';

    const formulario = document.getElementById('formulario-call');

    formulario.addEventListener('submit', (evento) => {
        // Impede a página de recarregar ao enviar.
        evento.preventDefault();

        const botao = formulario.querySelector('button[type="submit"]');
        const textoOriginal = botao.innerText;
        botao.innerText = 'Enviando...';
        botao.disabled = true;

        const dados = {
            nome: document.getElementById('nome').value,
            email: document.getElementById('email').value,
            telefone: document.getElementById('telefone').value,
            motivo: document.getElementById('motivo').value
        };

        fetch(urlDaAPI, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dados)
        })
            .then(resposta => {
                if (resposta.ok) {
                    alert('Recebemos seus dados! Em breve entramos em contato.');
                    formulario.reset();
                    return;
                }

                // A Lambda devolve o motivo da recusa em {"error": "..."}.
                // Sem isso o visitante não sabe qual campo corrigir.
                return resposta.json()
                    .then(corpo => {
                        alert(corpo.error || 'Erro ao enviar. Tente novamente.');
                    })
                    .catch(() => {
                        alert('Erro ao enviar. Tente novamente.');
                    });
            })
            .catch(erro => {
                console.error('Erro:', erro);
                alert('Falha na conexão com o servidor.');
            })
            .finally(() => {
                botao.innerText = textoOriginal;
                botao.disabled = false;
            });
    });
});