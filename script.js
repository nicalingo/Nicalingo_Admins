import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Tus credenciales oficiales de Supabase
const SUPABASE_URL = 'https://lughfwqpcskesetjfviv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_paJlhlK-qkdKXkMrmXfE3w_6GjVsbe5'

// Inicializar el cliente de Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// --- LÓGICA DE LA INTERFAZ DE LOGIN ---

// 1. Mostrar / Ocultar contraseña con el ícono del ojo
const togglePassword = document.getElementById('togglePassword')
const passwordInput = document.getElementById('password')

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password'
        passwordInput.setAttribute('type', type)
        togglePassword.classList.toggle('fa-eye-slash')
    })
}

// 2. Manejar el evento submit del formulario de inicio de sesión con alertas personalizadas
const loginForm = document.getElementById('loginForm')

if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        const email = document.getElementById('email').value.trim()
        const password = passwordInput.value.trim()

        try {
            // Intentar autenticar con Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            })

            // Manejo específico si el correo no está registrado o la contraseña falla
            if (authError) {
                if (authError.message.includes('Invalid login credentials') || authError.message.includes('User not found')) {
                    alert('Correo no registrado o contraseña incorrecta.')
                } else {
                    alert('Error al iniciar sesión: ' + authError.message)
                }
                return
            }

            const userId = authData.user.id

            // Consultar el rol del usuario en la tabla 'profiles'
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', userId)
                .single()

            if (profileError || !profileData) {
                alert('No se encontró el perfil de usuario en la base de datos.')
                return
            }

            const userRole = profileData.role

            // Validar si tiene permisos para acceder al panel web (solo admin o editor)
            if (userRole !== 'admin' && userRole !== 'editor') {
                alert('Permiso denegado. No tienes autorización para acceder a este panel.')
                // Opcional: cerrar la sesión automáticamente si intentó entrar sin permisos
                await supabase.auth.signOut()
                return
            }

            alert(`¡Bienvenido! Has iniciado sesión como: ${userRole}`)

            // Redirección basada estrictamente en el rol autorizado
            if (userRole === 'admin') {
                window.location.href = 'screens/admin_user.html'
            } else if (userRole === 'editor') {
                window.location.href = 'screens/add_leccion.html'
            }

        } catch (error) {
            console.error('Error inesperado en el login:', error.message)
            alert('Ocurrió un error inesperado. Inténtalo de nuevo.')
        }
    })
}