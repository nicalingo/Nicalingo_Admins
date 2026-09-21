// script/sidebar.js
document.addEventListener('DOMContentLoaded', () => {
    const sidebar = document.getElementById('sidebar');
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const brandRoleText = document.getElementById('brandRoleText');

    // =======================================================
    // 1. GESTIÓN DE ROLES (Admin vs Editor)
    // =======================================================
    // Lee el rol de sesión o almacenamiento local (default: 'admin')
    const userRole = (localStorage.getItem('userRole') || sessionStorage.getItem('userRole') || 'admin').toLowerCase();

    function aplicarPermisosRol(rol) {
        const elementosAdmin = document.querySelectorAll('[data-role="admin-only"]');

        if (rol === 'editor') {
            if (brandRoleText) {
                brandRoleText.textContent = 'NicaLingo Editor';
            }
            // Oculta Colegio y Administración para editores
            elementosAdmin.forEach(el => el.classList.add('hidden-role'));
        } else {
            if (brandRoleText) {
                brandRoleText.textContent = 'NicaLingo Admin';
            }
            elementosAdmin.forEach(el => el.classList.remove('hidden-role'));
        }
    }

    aplicarPermisosRol(userRole);

    // =======================================================
    // 2. SUBMENÚS Y CONTROL AL RETIRAR EL CURSOR
    // =======================================================
    document.querySelectorAll('.submenu-toggle').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const parent = this.parentElement;

            // Modo acordeón: cerrar otros abiertos
            document.querySelectorAll('.has-submenu').forEach(item => {
                if (item !== parent) {
                    item.classList.remove('show');
                }
            });

            parent.classList.toggle('show');
        });
    });

    // Cierra submenús automáticamente al quitar el ratón del sidebar
    if (sidebar) {
        sidebar.addEventListener('mouseleave', () => {
            if (!sidebar.classList.contains('mobile-open')) {
                document.querySelectorAll('.has-submenu.show').forEach(item => {
                    item.classList.remove('show');
                });
            }
        });
    }

    // =======================================================
    // 3. DETECCIÓN AUTOMÁTICA DEL APARTADO ACTIVO (LIQUID GLASS)
    // =======================================================
    const currentPath = window.location.pathname;
    const links = document.querySelectorAll('.sidebar-menu a');

    links.forEach(link => {
        const href = link.getAttribute('href');
        if (href && href !== '#' && href !== 'javascript:void(0);' && currentPath.includes(href)) {
            document.querySelectorAll('.sidebar-menu li.active').forEach(li => li.classList.remove('active'));

            const li = link.closest('li');
            if (li) {
                li.classList.add('active');
                const parentSubmenu = link.closest('.has-submenu');
                if (parentSubmenu) {
                    parentSubmenu.classList.add('show');
                }
            }
        }
    });

    // =======================================================
    // 4. MÓVIL (Hamburguesa)
    // =======================================================
    if (mobileBtn && sidebar) {
        mobileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('mobile-open');
        });

        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                sidebar.classList.contains('mobile-open') && 
                !sidebar.contains(e.target) && 
                e.target !== mobileBtn) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
});