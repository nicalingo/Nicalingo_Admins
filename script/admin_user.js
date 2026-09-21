import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper visual Coco Ups Modal
function showCocoUpsModal(errorMessage) {
    let modal = document.getElementById('cocoUpsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cocoUpsModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center;
            align-items: center; z-index: 99999; backdrop-filter: blur(4px);
            animation: fadeInModal 0.2s ease-out forwards;
        `;
        modal.innerHTML = `
            <div style="background: #ffffff; padding: 25px 30px; border-radius: 16px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 20px 30px rgba(0,0,0,0.25); border: 2px solid #fee2e2;">
                <img src="../assets/imagenes/coco/coco ups.png" alt="Coco Ups" style="width: 100px; height: auto; margin-bottom: 15px; animation: cocoBounce 1s infinite alternate ease-in-out;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 20px; font-weight: 700;">¡Ups! Ha ocurrido un error</h3>
                <p id="cocoUpsMsgText" style="font-size: 14px; color: #475569; line-height: 1.5; margin: 0 0 20px 0; word-break: break-word;"></p>
                <button type="button" id="btnCocoUpsClose" style="background: #dc2626; color: white; border: none; padding: 10px 24px; border-radius: 8px; font-size: 14px; font-weight: bold; cursor: pointer; transition: 0.2s;">Entendido</button>
            </div>
            <style>
                @keyframes fadeInModal { from { opacity: 0; } to { opacity: 1; } }
                @keyframes cocoBounce { 0% { transform: translateY(0); } 100% { transform: translateY(-8px); } }
            </style>
        `;
        document.body.appendChild(modal);
        document.getElementById('btnCocoUpsClose').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    document.getElementById('cocoUpsMsgText').textContent = errorMessage;
    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async () => {
    const btnLogout = document.getElementById('btnLogout');
    const adminSection = document.getElementById('adminSection');
    const unauthorizedSection = document.getElementById('unauthorizedSection');
    const roleForm = document.getElementById('roleForm');
    
    // Elementos de la tabla de usuarios
    const loadingUsersMsg = document.getElementById('loadingUsersMsg');
    const privilegedUsersTable = document.getElementById('privilegedUsersTable');
    const privilegedUsersBody = document.getElementById('privilegedUsersBody');
    const searchAdminUser = document.getElementById('searchAdminUser');
    const filterAdminRole = document.getElementById('filterAdminRole');

    const loadingLanguagesMsg = document.getElementById('loadingLanguagesMsg');
    const languagesTable = document.getElementById('languagesTable');
    const languagesBody = document.getElementById('languagesBody');

    let allPrivilegedUsers = []; 

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        showCocoUpsModal('Inicia sesión primero para acceder al módulo administrativo.');
        setTimeout(() => { window.location.href = '../index.html'; }, 1800);
        return;
    }

    const { data: userRole, error } = await supabase
        .rpc('get_user_role', { user_id: session.user.id });

    if (error || userRole !== 'admin') {
        if (adminSection) adminSection.style.display = 'none';
        if (unauthorizedSection) unauthorizedSection.style.display = 'block';
        return; 
    } else {
        if (adminSection) adminSection.style.display = 'block';
        if (unauthorizedSection) unauthorizedSection.style.display = 'none';
        
        loadPrivilegedUsers();
        loadLanguagesCatalog();
    }

    // Carga de usuarios privilegiados
    async function loadPrivilegedUsers() {
        if (!loadingUsersMsg) return;

        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            allPrivilegedUsers = (profiles || []).filter(u => {
                const role = (u.role || '').toLowerCase().trim();
                return role === 'admin' || role === 'editor';
            });

            renderPrivilegedUsers(allPrivilegedUsers);

        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            loadingUsersMsg.innerHTML = '<p style="color: #e53e3e;">¡Ups! Algo salió mal al cargar los usuarios.</p>';
            showCocoUpsModal('No se pudieron obtener los usuarios autorizados: ' + err.message);
        }
    }

    function renderPrivilegedUsers(usersToRender) {
        privilegedUsersBody.innerHTML = '';

        if (!usersToRender || usersToRender.length === 0) {
            loadingUsersMsg.style.display = 'block';
            loadingUsersMsg.innerHTML = '<p style="color: #64748b;">No se encontraron usuarios con los filtros actuales.</p>';
            privilegedUsersTable.style.display = 'none';
            return;
        }

        usersToRender.forEach(user => {
            const role = (user.role || '').toLowerCase().trim();
            const avatarUrl = user.avatar_url || user.avatar || '../assets/imagenes/coco/mascota.png';
            const nickname = user.nickname || 'Sin apodo';
            const email = user.email || 'Correo no disponible';
            const badgeClass = role === 'admin' ? 'admin' : 'editor';

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><img src="${avatarUrl}" alt="Avatar" class="user-avatar-cell" onerror="this.src='../assets/imagenes/coco/mascota.png'"></td>
                <td><strong>${nickname}</strong></td>
                <td>${email}</td>
                <td><span class="role-badge ${badgeClass}">${role}</span></td>
            `;
            privilegedUsersBody.appendChild(tr);
        });

        loadingUsersMsg.style.display = 'none';
        privilegedUsersTable.style.display = 'table';
    }

    function filterUsers() {
        const searchTerm = searchAdminUser ? searchAdminUser.value.toLowerCase().trim() : '';
        const roleTerm = filterAdminRole ? filterAdminRole.value.toLowerCase() : '';

        const filtered = allPrivilegedUsers.filter(user => {
            const nickname = (user.nickname || '').toLowerCase();
            const email = (user.email || '').toLowerCase();
            const role = (user.role || '').toLowerCase();

            const matchesSearch = nickname.includes(searchTerm) || email.includes(searchTerm);
            const matchesRole = roleTerm === '' || role === roleTerm;

            return matchesSearch && matchesRole;
        });

        renderPrivilegedUsers(filtered);
    }

    if (searchAdminUser) searchAdminUser.addEventListener('input', filterUsers);
    if (filterAdminRole) filterAdminRole.addEventListener('change', filterUsers);

    async function loadLanguagesCatalog() {
        if (!loadingLanguagesMsg) return;

        try {
            const { data: languages, error } = await supabase
                .from('languages')
                .select('id, name, is_active')
                .order('id', { ascending: true });

            if (error) throw error;
            languagesBody.innerHTML = '';

            languages.forEach(lang => {
                const isActive = lang.is_active === true;
                const tr = document.createElement('tr');

                tr.innerHTML = `
                    <td><strong>#${lang.id}</strong></td>
                    <td>${lang.name}</td>
                    <td>
                        <span id="status-text-${lang.id}" class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            ${isActive ? 'Activo' : 'En desarrollo'}
                        </span>
                    </td>
                    <td style="text-align: right;">
                        <label class="switch">
                            <input type="checkbox" id="lang-switch-${lang.id}" ${isActive ? 'checked' : ''}>
                            <span class="slider"></span>
                        </label>
                    </td>
                `;

                languagesBody.appendChild(tr);

                const switchInput = tr.querySelector(`#lang-switch-${lang.id}`);
                switchInput.addEventListener('change', async (e) => {
                    await toggleLanguageStatus(lang.id, e.target.checked);
                });
            });

            loadingLanguagesMsg.style.display = 'none';
            languagesTable.style.display = 'table';

        } catch (err) {
            console.error('Error al cargar catálogo de idiomas:', err);
            loadingLanguagesMsg.innerHTML = '<p style="color: #e53e3e;">Error al cargar idiomas.</p>';
            showCocoUpsModal('Fallo al cargar el catálogo de idiomas: ' + err.message);
        }
    }

    async function toggleLanguageStatus(languageId, newStatus) {
        const statusText = document.getElementById(`status-text-${languageId}`);
        const switchInput = document.getElementById(`lang-switch-${languageId}`);

        try {
            const { error } = await supabase
                .from('languages')
                .update({ is_active: newStatus })
                .eq('id', languageId);

            if (error) throw error;

            if (statusText) {
                statusText.textContent = newStatus ? 'Activo' : 'En desarrollo';
                statusText.className = `status-badge ${newStatus ? 'status-active' : 'status-inactive'}`;
            }
        } catch (err) {
            console.error('Error al actualizar idioma:', err);
            showCocoUpsModal('No se pudo actualizar el estado del idioma: ' + err.message);
            if (switchInput) switchInput.checked = !newStatus;
        }
    }

    if (roleForm) {
        roleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('userEmail').value.trim();
            const role = document.getElementById('newRole').value;

            try {
                const { error: rpcError } = await supabase
                    .rpc('update_user_role_by_email', { 
                        target_email: email, 
                        new_role: role 
                    });

                if (rpcError) throw rpcError;

                alert('¡Rol actualizado exitosamente para el usuario!');
                roleForm.reset();
                loadPrivilegedUsers();
            } catch (err) {
                console.error('Error al actualizar rol:', err);
                showCocoUpsModal('Hubo un error al actualizar el rol: ' + err.message);
            }
        });
    }
});