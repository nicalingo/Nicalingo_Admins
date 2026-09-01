import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tus credenciales oficiales de Supabase
const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISH_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

// Inicializar el cliente de Supabase[cite: 1]
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISH_KEY)

// --- LÓGICA DE LA INTERFAZ DE LOGIN ---

// 1. Mostrar / Ocultar contraseña con el ícono del ojo[cite: 1]
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type)
        togglePassword.classList.toggle('fa-eye-slash')
    })
}

// 2. Manejar el evento submit del formulario de inicio de sesión[cite: 1]
const loginForm = document.getElementById('loginForm')

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const email = document.getElementById('email').value.trim()
        const password = passwordInput.value.trim()

        try {
            // Intentar autenticar con Supabase Auth[cite: 1]
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            })

            if (authError) {
                if (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found')) {
                    alert('Correo no registrado o contraseña incorrecta.')
                } else {
                    alert('Error al iniciar sesión: ' + authError.message)
                }
                return
            }

            const userId = authData.user.id

            // Consultar el rol del usuario usando la función RPC corregida[cite: 1]
            const { data: userRole, error: profileError } = await supabase
                .rpc('get_user_role', { user_id: userId })

            if (profileError || !userRole) {
                console.error('Error al obtener rol:', profileError)
                alert('No se encontró el perfil de usuario en la base de datos.')
                return
            }

            // Validar si tiene permisos para acceder al panel web (solo admin o editor)[cite: 1]
            if (userRole !== 'admin' && userRole !== 'editor') {
                alert('Permiso denegado. No tienes autorización para acceder a este panel.')
                await supabase.auth.signOut()
                return
            }

            alert(`¡Bienvenido! Has iniciado sesión como: ${userRole}`)

            // Redirección directa a add_leccion.html[cite: 1]
            window.location.href = 'screens/add_leccion.html'

        } catch (error) {
            console.error('Error inesperado en el login:', error.message)
            alert('Ocurrió un error inesperado. Inténtalo de nuevo.')
        }
    })
}