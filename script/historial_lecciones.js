import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISH_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISH_KEY)

let currentUserSession = null
let currentUserRole = null

// 1. Validar sesión, permisos y almacenar rol y sesión actual
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

    currentUserRole = userRole
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
        loadLessonHistory()
    } catch (err) {
        console.error('Error al eliminar:', err.message)
        alert('Hubo un error al eliminar la lección: ' + err.message)
    }
}

// 3. Cargar las lecciones con filtros dinámicos y resolución de apodos de perfiles
async function loadLessonHistory() {
    const isAuthorized = await checkAuthAndRole()
    if (!isAuthorized) return

    const loadingMsg = document.getElementById('loadingMessage')
    const historyTable = document.getElementById('historyTable')
    const tableBody = document.getElementById('historyTableBody')

    loadingMsg.style.display = 'block'
    historyTable.style.display = 'none'

    try {
        const filterLevel = document.getElementById('filterLevel')?.value
        const filterLessonNum = document.getElementById('filterLessonNum')?.value

        let query = supabase
            .from('lessons')
            .select(`
                id,
                lesson_number,
                title,
                description,
                xp_reward,
                created_by,
                levels!inner (
                    id,
                    level_number,
                    title,
                    languages (
                        name
                    )
                )
            `)

        if (currentUserRole === 'editor') {
            query = query.eq('created_by', currentUserSession.user.id)
        }

        if (filterLevel) {
            query = query.eq('levels.level_number', filterLevel)
        }

        if (filterLessonNum) {
            query = query.eq('lesson_number', filterLessonNum)
        }

        const { data: lessons, error } = await query.order('id', { ascending: false })

        if (error) throw error

        loadingMsg.style.display = 'none'

        if (!lessons || lessons.length === 0) {
            loadingMsg.textContent = 'No se encontraron lecciones con los filtros seleccionados.'
            loadingMsg.style.display = 'block'
            return
        }

        // Obtener de forma única todos los IDs de creadores para buscar sus nicknames en la tabla profiles
        const creatorIds = [...new Set(lessons.map(l => l.created_by).filter(Boolean))]
        let profilesMap = {}

        if (creatorIds.length > 0) {
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, nickname')
                .in('id', creatorIds)

            if (!profilesError && profilesData) {
                profilesData.forEach(p => {
                    profilesMap[p.id] = p.nickname
                })
            }
        }

        tableBody.innerHTML = ''
        lessons.forEach(lesson => {
            const tr = document.createElement('tr')
            const levelNum = lesson.levels ? lesson.levels.level_number : 'N/A'
            const langName = lesson.levels && lesson.levels.languages ? lesson.levels.languages.name : 'Idioma general'
            
            // Buscar el apodo en el mapa de perfiles; si no existe o está vacío, mostrar el ID (o un trozo de él)
            const authorId = lesson.created_by || 'Desconocido'
            const authorNickname = (profilesMap[authorId] && profilesMap[authorId].trim() !== '') 
                ? profilesMap[authorId] 
                : authorId

            tr.innerHTML = `
                <td>Nivel ${levelNum} <br><small class="sub-text">(${langName})</small></td>
                <td>Lección ${lesson.lesson_number}</td>
                <td><strong>${lesson.title}</strong></td>
                <td>${lesson.description || 'Sin descripción'}</td>
                <td><small class="creator-email" title="${authorId}">${authorNickname}</small></td>
                <td><span class="xp-badge">+${lesson.xp_reward} XP</span></td>
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

// 4. Escuchar eventos de cambio en los filtros para recargar automáticamente
['filterLevel', 'filterLessonNum', 'filterCreator'].forEach(id => {
    const element = document.getElementById(id)
    if (element) {
        element.addEventListener('input', loadLessonHistory)
        element.addEventListener('change', loadLessonHistory)
    }
})

// Cargar al iniciar la página
loadLessonHistory()

// 5. Botón de Cerrar Sesión
document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '../index.html'
})