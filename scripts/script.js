// 1. Seleciona todas as seções e os links do menu
const sections = document.querySelectorAll("section");
const navLinks = document.querySelectorAll("nav ul li a");

// 2. Adiciona um "escutador" para o evento de scroll na janela
window.addEventListener("scroll", () => {
    let current = ""; // Variável para guardar o ID da seção atual
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop; // Distância da seção até o topo
        const sectionHeight = section.clientHeight; // Altura da seção
        
        // Verifica se a rolagem da tela já chegou (ou passou) da seção
        // O "- 60" é para compensar a altura da sua barra de navegação
        if (window.scrollY >= (sectionTop - 60)) {
            current = section.getAttribute("id");
        }
    });

    // 3. Remove a classe 'ativo' de todos os links e adiciona só no link atual
    navLinks.forEach(link => {
        link.classList.remove("ativo");
        
        // Se o href do link for igual a "#" + o ID da seção atual
        if (link.getAttribute("href") === `#${current}`) {
            link.classList.add("ativo");
        }
    });
});

/* MENU HAMBURGUER! */
// Capturando o botão e a lista do HTML
const btnMenu = document.getElementById("btn-menu");
const menuLinksMobile = document.getElementById("menu-links");

// Adicionando o evento de clique no botão hambúrguer
btnMenu.addEventListener("click", () => {
    menuLinksMobile.classList.toggle("ativo-mobile");
    btnMenu.classList.toggle("ativo-mobile");
});

// UX Extra: Fechar o menu automaticamente ao clicar em um link (útil no celular)
const todosOsLinks = document.querySelectorAll("nav ul li a");
todosOsLinks.forEach(link => {
    link.addEventListener("click", () => {
        menuLinksMobile.classList.remove("ativo-mobile");
        btnMenu.classList.remove("ativo-mobile");
    });
});

/* --- PREVENÇÃO DE BUG NO REDIMENSIONAMENTO DA TELA --- */
window.addEventListener("resize", () => {
    // Se a largura da tela for maior ou igual a 768px (Desktop)
    if (window.innerWidth >= 768) {
        // Remove a classe de menu aberto, forçando ele a fechar
        menuLinksMobile.classList.remove("ativo-mobile");
        btnMenu.classList.remove("ativo-mobile");
    }
});