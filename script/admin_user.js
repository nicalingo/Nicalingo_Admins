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
    }

    // Función para cargar los usuarios con roles especiales (admin y editor)
    async function loadPrivilegedUsers() {
        if (!loadingUsersMsg) return;

        // Mostrar Coco feliz animado mientras carga
        loadingUsersMsg.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; gap: 12px;">
                <img src="../assets/imagenes/coco/coco_feliz.png" alt="Coco feliz" style="width: 75px; height: 75px; object-fit: contain; animation: floatMascot 2s ease-in-out infinite;">
                <span style="color: #1c3d98; font-weight: 600; font-size: 14px;">
                    <i class="fa-solid fa-spinner fa-spin" style="margin-right: 6px;"></i> ¡Coco está buscando a los usuarios con permisos...
                </span>
            </div>
        `;

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
                
                // Mostrar solo los usuarios que sean 'admin' o 'editor' en la tabla de privilegios
                if (role === 'admin' || role === 'editor') {
                    countValid++;
                    const tr = document.createElement('tr');
                    
                    const avatarUrl = user.avatar_url || user.avatar || '../assets/imagenes/coco/mascota.png';
                    const nickname = user.nickname || 'Sin apodo';
                    const email = user.email || 'Correo no disponible';

                    let badgeClass = role === 'admin' ? 'admin' : 'editor';

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
            // Mostrar Coco ups si ocurre un error al cargar (ruta corregida con espacio)
            loadingUsersMsg.innerHTML = `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; gap: 12px;">
                    <img src="../assets/imagenes/coco/coco ups.png" alt="Coco ups" style="width: 75px; height: 75px; object-fit: contain; animation: floatMascot 2s ease-in-out infinite;">
                    <span style="color: #e53e3e; font-weight: 600; font-size: 14px;">
                        <i class="fa-solid fa-triangle-exclamation" style="margin-right: 6px;"></i> ¡Ups! Algo salió mal al cargar los usuarios.
                    </span>
                </div>
            `;
        }
    }

    if (roleForm) {
        roleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('userEmail').value.trim();
            const role = document.getElementById('newRole').value;

            try {
                // Llamada a la función RPC segura creada en Supabase
                const { error: rpcError } = await supabase
                    .rpc('update_user_role_by_email', { 
                        target_email: email, 
                        new_role: role 
                    });

                if (rpcError) throw rpcError;

                alert('¡Rol actualizado exitosamente para el usuario!');
                roleForm.reset();
                loadPrivilegedUsers(); // Recargar la tabla inferior automáticamente
            } catch (err) {
                console.error('Error al actualizar rol:', err);
                alert('Hubo un error al actualizar el rol: ' + err.message);
            }
        });
    }
});