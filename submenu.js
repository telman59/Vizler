document.querySelectorAll('#main-menu ul ul li').forEach(subItem => {
    subItem.addEventListener('click', () => {
        let parentSubmenu = subItem.closest('ul'); 
        parentSubmenu.classList.add('hidden'); // скрываем подменю после клика
    });
});