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

    itensPasso.forEach(item => {
        
        item.addEventListener('mouseenter', () => {

            const novaImagem = item.getAttribute('data-imagem');

            if (novaImagem) {
                imagemDinamica.style.opacity = 0;

                setTimeout(() => {
                    imagemDinamica.src = novaImagem;
                    imagemDinamica.style.opacity = 1;
                }, 200);
            }
        });
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