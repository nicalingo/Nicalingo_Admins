import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Credenciales oficiales de Supabase[cite: 18]
const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISH_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISH_KEY)

// --- HELPER VISUAL: MODAL COCO UPS ---
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
                <img src="assets/imagenes/coco/coco ups.png" alt="Coco Ups" style="width: 90px; height: auto; margin-bottom: 15px; animation: cocoBounce 1s infinite alternate ease-in-out;">
                <h3 style="margin: 0 0 10px 0; color: #dc2626; font-size: 20px; font-weight: 700;">¡Ups! Acceso denegado</h3>
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

// --- LÓGICA DE LA INTERFAZ DE LOGIN ---

// 1. Mostrar / Ocultar contraseña[cite: 18]
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type)
        togglePassword.classList.toggle('fa-eye-slash')
    })
}

// 2. Manejar el evento submit del formulario de inicio de sesión[cite: 18]
const loginForm = document.getElementById('loginForm')

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const email = document.getElementById('email').value.trim()
        const password = passwordInput.value.trim()

        try {
            // Intentar autenticar con Supabase Auth[cite: 18]
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            })

            if (authError) {
                if (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found')) {
                    showCocoUpsModal('El correo no se encuentra registrado o la contraseña es incorrecta.')
                } else {
                    showCocoUpsModal('Error al iniciar sesión: ' + authError.message)
                }
                return
            }

            const userId = authData.user.id

            // Consultar el rol del usuario usando la función RPC[cite: 18]
            const { data: userRole, error: profileError } = await supabase
                .rpc('get_user_role', { user_id: userId })

            if (profileError || !userRole) {
                console.error('Error al obtener rol:', profileError)
                showCocoUpsModal('No se encontró el perfil de usuario registrado en la base de datos.')
                return
            }

            // Validar si tiene permisos para acceder al panel web (solo admin o editor)[cite: 18]
            if (userRole !== 'admin' && userRole !== 'editor') {
                showCocoUpsModal('Permiso denegado. Tu cuenta no cuenta con autorización para acceder a este panel de administración.')
                await supabase.auth.signOut()
                return
            }

            // Redirección directa a add_leccion.html[cite: 18]
            window.location.href = 'screens/add_leccion.html'

        } catch (error) {
            console.error('Error inesperado en el login:', error.message)
            showCocoUpsModal('Ocurrió un error inesperado al conectar con el servidor. Inténtalo de nuevo.')
        }
    })
}