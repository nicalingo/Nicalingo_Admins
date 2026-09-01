import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUserSession = null

// 1. Validar sesión, permisos y almacenar la sesión actual
async function checkAuthAndRole() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        alert('Acceso no autorizado. Inicia sesión primero.')
        window.location.href = '../index.html'
        return false
    }

    currentUserSession = session

    const { data: userRole, error } = await supabase
        .rpc('get_user_role', { user_id: session.user.id })

    if (error || !userRole || (userRole !== 'editor' && userRole !== 'admin')) {
        alert('Permiso denegado. No eres editor ni administrador.')
        await supabase.auth.signOut()
        window.location.href = '../index.html'
        return false
    }

    return true
}

// 2. Eliminar una lección de Supabase
async function deleteLesson(lessonId) {
    if (!confirm('¿Estás seguro de que deseas eliminar esta lección? Se borrarán sus preguntas y opciones asociadas.')) {
        return
    }

    try {
        const { error } = await supabase
            .from('lessons')
            .delete()
            .eq('id', lessonId)

        if (error) throw error

        alert('Lección eliminada correctamente.')
        loadLessonHistory() // Recargar la tabla
    } catch (err) {
        console.error('Error al eliminar:', err.message)
        alert('Hubo un error al eliminar la lección: ' + err.message)
    }
}

// 3. Cargar las lecciones creadas desde Supabase filtrando por el usuario logueado
async function loadLessonHistory() {
    const isAuthorized = await checkAuthAndRole()
    if (!isAuthorized) return

    const loadingMsg = document.getElementById('loadingMessage')
    const historyTable = document.getElementById('historyTable')
    const tableBody = document.getElementById('historyTableBody')

    loadingMsg.style.display = 'block'
    historyTable.style.display = 'none'

    try {
        // Obtenemos el ID del usuario actual de la sesión ya validada
        const currentUserId = currentUserSession.user.id

        const { data: lessons, error } = await supabase
            .from('lessons')
            .select(`
                id,
                lesson_number,
                title,
                description,
                xp_reward,
                levels (
                    level_number,
                    title,
                    languages (
                        name
                    )
                )
            `)
            .eq('created_by', currentUserId) // <--- Filtro estricto para mostrar solo las del usuario logueado
            .order('id', { ascending: false })

        if (error) throw error

        loadingMsg.style.display = 'none'

        if (!lessons || lessons.length === 0) {
            loadingMsg.textContent = 'No hay lecciones registradas por ti todavía.'
            loadingMsg.style.display = 'block'
            return
        }

        tableBody.innerHTML = ''
        lessons.forEach(lesson => {
            const tr = document.createElement('tr')
            const levelNum = lesson.levels ? lesson.levels.level_number : 'N/A'
            const langName = lesson.levels && lesson.levels.languages ? lesson.levels.languages.name : 'Idioma general'

            tr.innerHTML = `
                <td>Nivel ${levelNum} <br><small style="color:#666;">(${langName})</small></td>
                <td>Lección ${lesson.lesson_number}</td>
                <td><strong>${lesson.title}</strong></td>
                <td>${lesson.description || 'Sin descripción'}</td>
                <td><span style="background: #e1ecf4; color: #39739d; padding: 3px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">+${lesson.xp_reward} XP</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-action btn-edit" title="Editar lección" data-id="${lesson.id}">
                            <i class="fa-solid fa-pen-to-square"></i>
                        </button>
                        <button class="btn-action btn-delete" title="Eliminar lección" data-id="${lesson.id}">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </td>
            `

            // Asignar eventos a los botones de la fila
            tr.querySelector('.btn-delete').addEventListener('click', () => {
                deleteLesson(lesson.id)
            })

            tr.querySelector('.btn-edit').addEventListener('click', () => {
                window.location.href = `add_leccion.html?edit=${lesson.id}`
            })

            tableBody.appendChild(tr)
        })

        historyTable.style.display = 'table'

    } catch (err) {
        console.error('Error al cargar el historial:', err.message)
        loadingMsg.textContent = 'Hubo un error al cargar el historial de lecciones.'
    }
}

loadLessonHistory()

// 4. Botón de Cerrar Sesión
document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '../index.html'
})