import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISH_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISH_KEY)

let currentUserSession = null
let currentUserRole = null

// Helper visual Coco Ups Modal (cuando no sea solo el bloque interno)
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

// 1. Validar sesión, permisos y almacenar rol y sesión actual
async function checkAuthAndRole() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        showCocoUpsModal('Acceso no autorizado. Inicia sesión primero.')
        setTimeout(() => { window.location.href = '../index.html' }, 1800)
        return false
    }

    currentUserSession = session

    const { data: userRole, error } = await supabase
        .rpc('get_user_role', { user_id: session.user.id })

    if (error || !userRole || (userRole !== 'editor' && userRole !== 'admin')) {
        showCocoUpsModal('Permiso denegado. No eres editor ni administrador.')
        await supabase.auth.signOut()
        setTimeout(() => { window.location.href = '../index.html' }, 1800)
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
        showCocoUpsModal('Hubo un error al eliminar la lección: ' + err.message)
    }
}

// 3. Cargar los idiomas desde Supabase para el select
async function loadLanguages() {
    try {
        const { data: languages, error } = await supabase.from('languages').select('id, name');
        if (error) throw error;

        const langSelect = document.getElementById('filterLanguage');
        languages.forEach(lang => {
            const option = document.createElement('option');
            option.value = lang.id;
            option.textContent = lang.name;
            langSelect.appendChild(option);
        });

        const savedLang = localStorage.getItem('selectedLanguage');
        if (savedLang) {
            langSelect.value = savedLang;
        }
    } catch (err) {
        console.error('Error al cargar idiomas:', err.message);
        showCocoUpsModal('Error al cargar el catálogo de idiomas: ' + err.message);
    }
}

// 4. Cargar las lecciones con filtros dinámicos y resolución de apodos
async function loadLessonHistory() {
    const isAuthorized = await checkAuthAndRole()
    if (!isAuthorized) return

    const loadingMsg = document.getElementById('loadingMessage')
    const historyTable = document.getElementById('historyTable')
    const tableBody = document.getElementById('historyTableBody')
    
    // Elementos del estado vacío/error (Coco Ups)
    const emptyState = document.getElementById('emptyState')
    const emptyStateText = document.getElementById('emptyStateText')

    loadingMsg.style.display = 'block'
    historyTable.style.display = 'none'
    emptyState.style.display = 'none'

    try {
        const filterLevel = document.getElementById('filterLevel')?.value
        const filterLessonNum = document.getElementById('filterLessonNum')?.value
        const filterLanguage = document.getElementById('filterLanguage')?.value
        const filterCreator = document.getElementById('filterCreator')?.value

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
                    language_id,
                    languages!levels_language_id_fkey (
                        name
                    )
                )
            `)

        if (currentUserRole === 'editor') {
            query = query.eq('created_by', currentUserSession.user.id)
        }

        if (filterLevel) query = query.eq('levels.level_number', filterLevel)
        if (filterLessonNum) query = query.eq('lesson_number', filterLessonNum)
        if (filterLanguage) query = query.eq('levels.language_id', filterLanguage)

        const { data: lessons, error } = await query.order('id', { ascending: false })

        if (error) throw error

        loadingMsg.style.display = 'none'

        if (!lessons || lessons.length === 0) {
            emptyStateText.textContent = 'Ups... No se encontraron lecciones con los filtros seleccionados.'
            emptyState.style.display = 'block'
            return
        }

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

        let filteredLessons = lessons;
        if (filterCreator && filterCreator.trim() !== '') {
            filteredLessons = lessons.filter(lesson => {
                const authorId = lesson.created_by || '';
                const authorNickname = profilesMap[authorId] || authorId;
                const searchTerm = filterCreator.toLowerCase().trim();
                
                return authorNickname.toLowerCase().includes(searchTerm) || 
                       authorId.toLowerCase().includes(searchTerm);
            });
        }

        if (filteredLessons.length === 0) {
            emptyStateText.textContent = 'Ups... No se encontraron lecciones para este creador.'
            emptyState.style.display = 'block'
            return;
        }

        tableBody.innerHTML = ''
        filteredLessons.forEach(lesson => {
            const tr = document.createElement('tr')
            const levelNum = lesson.levels ? lesson.levels.level_number : 'N/A'
            const langName = lesson.levels && lesson.levels.languages ? lesson.levels.languages.name : 'Idioma general'
            
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
        loadingMsg.style.display = 'none'
        emptyStateText.textContent = '¡Ups! Ocurrió un error al cargar los datos: ' + err.message
        emptyState.style.display = 'block'
        showCocoUpsModal('Fallo al obtener historial de lecciones: ' + err.message)
    }
}

// 5. Escuchar eventos de los inputs de texto (Número y Creador)
['filterLessonNum', 'filterCreator'].forEach(id => {
    const element = document.getElementById(id)
    if (element) {
        element.addEventListener('input', loadLessonHistory)
        element.addEventListener('change', loadLessonHistory)
    }
})

// 6. Filtros estáticos: Escuchar evento del IDIOMA y guardar en LocalStorage
const filterLanguage = document.getElementById('filterLanguage');
if (filterLanguage) {
    filterLanguage.addEventListener('change', (e) => {
        localStorage.setItem('selectedLanguage', e.target.value); 
        loadLessonHistory();
    });
}

// NUEVO: Filtros estáticos: Escuchar evento del NIVEL y guardar en LocalStorage
const filterLevel = document.getElementById('filterLevel');
if (filterLevel) {
    filterLevel.addEventListener('change', (e) => {
        localStorage.setItem('selectedLevel', e.target.value); 
        loadLessonHistory();
    });
}

// 7. Cargar inicial (Restaurar nivel estático, cargar idiomas y luego historial)
(async () => {
    if (filterLevel) {
        const savedLevel = localStorage.getItem('selectedLevel');
        if (savedLevel) {
            filterLevel.value = savedLevel;
        }
    }

    await loadLanguages();
    await loadLessonHistory();
})();

// 8. Botón de Cerrar Sesión
document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '../index.html'
})