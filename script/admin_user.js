import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', async () => {
    const btnLogout = document.getElementById('btnLogout');
    const adminSection = document.getElementById('adminSection');
    const unauthorizedSection = document.getElementById('unauthorizedSection');
    const roleForm = document.getElementById('roleForm');
    const loadingUsersMsg = document.getElementById('loadingUsersMsg');
    const privilegedUsersTable = document.getElementById('privilegedUsersTable');
    const privilegedUsersBody = document.getElementById('privilegedUsersBody');

    const loadingLanguagesMsg = document.getElementById('loadingLanguagesMsg');
    const languagesTable = document.getElementById('languagesTable');
    const languagesBody = document.getElementById('languagesBody');

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        alert('Inicia sesión primero.');
        window.location.href = '../index.html';
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

    async function loadPrivilegedUsers() {
        if (!loadingUsersMsg) return;

        try {
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*');

            if (error) throw error;

            if (!profiles || profiles.length === 0) {
                loadingUsersMsg.innerHTML = '<p style="color: #64748b;">No se encontraron usuarios registrados.</p>';
                return;
            }

            privilegedUsersBody.innerHTML = '';
            let countValid = 0;

            profiles.forEach(user => {
                const role = (user.role || '').toLowerCase().trim();
                
                if (role === 'admin' || role === 'editor') {
                    countValid++;
                    const tr = document.createElement('tr');
                    
                    const avatarUrl = user.avatar_url || user.avatar || '../assets/imagenes/coco/mascota.png';
                    const nickname = user.nickname || 'Sin apodo';
                    const email = user.email || 'Correo no disponible';
                    const badgeClass = role === 'admin' ? 'admin' : 'editor';

                    tr.innerHTML = `
                        <td><img src="${avatarUrl}" alt="Avatar" class="user-avatar-cell" onerror="this.src='../assets/imagenes/coco/mascota.png'"></td>
                        <td><strong>${nickname}</strong></td>
                        <td>${email}</td>
                        <td><span class="role-badge ${badgeClass}">${role}</span></td>
                    `;
                    privilegedUsersBody.appendChild(tr);
                }
            });

            if (countValid === 0) {
                loadingUsersMsg.innerHTML = '<p style="color: #64748b;">No hay usuarios con permisos especiales asignados actualmente.</p>';
                privilegedUsersTable.style.display = 'none';
            } else {
                loadingUsersMsg.style.display = 'none';
                privilegedUsersTable.style.display = 'table';
            }

        } catch (err) {
            console.error('Error al cargar usuarios:', err);
            loadingUsersMsg.innerHTML = '<p style="color: #e53e3e;">¡Ups! Algo salió mal al cargar los usuarios.</p>';
        }
    }

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
            alert('No se pudo actualizar el estado del idioma: ' + err.message);
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
                alert('Hubo un error al actualizar el rol: ' + err.message);
            }
        });
    }
});