import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', async () => {
    const btnLogout = document.getElementById('btnLogout');
    const adminSection = document.getElementById('adminSection');
    const unauthorizedSection = document.getElementById('unauthorizedSection');
    const roleForm = document.getElementById('roleForm');

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
    } else {
        if (adminSection) adminSection.style.display = 'block';
        if (unauthorizedSection) unauthorizedSection.style.display = 'none';
    }

    if (roleForm) {
        roleForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('userEmail').value.trim();
            const role = document.getElementById('newRole').value;

            try {
                const { data, error: rpcError } = await supabase
                    .rpc('set_user_role_by_email', { target_email: email, new_role: role });

                if (rpcError) throw rpcError;

                alert('Rol actualizado exitosamente para el usuario.');
                roleForm.reset();
            } catch (err) {
                console.error('Error al actualizar rol:', err);
                alert('Hubo un error al actualizar el rol: ' + err.message);
            }
        });
    }
});