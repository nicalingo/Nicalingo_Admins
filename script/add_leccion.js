import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Variable global para almacenar la sesión actual
let currentUserSession = null

// 1. Proteger la ruta usando la función RPC segura y obtener la sesión
async function checkAuthAndRole() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        alert('Acceso no autorizado. Inicia sesión primero.')
        window.location.href = '../index.html'
        return
    }

    currentUserSession = session // Guardamos la sesión para usar el user.id después

    const { data: userRole, error } = await supabase
        .rpc('get_user_role', { user_id: session.user.id })

    if (error || !userRole || (userRole !== 'editor' && userRole !== 'admin')) {
        alert('Permiso denegado. No eres editor ni administrador.')
        await supabase.auth.signOut()
        window.location.href = '../index.html'
    }
}

checkAuthAndRole()

// 2. Cargar los idiomas disponibles en el <select> con diagnóstico
async function loadLanguages() {
    const select = document.getElementById('languageSelect')
    console.log("🔄 Consultando la tabla 'languages' en Supabase...")
    
    const { data: languages, error } = await supabase.from('languages').select('id, name')

    if (error) {
        console.error('❌ Error de Supabase al cargar idiomas:', error.message)
        select.innerHTML = '<option value="">Error al cargar idiomas</option>'
        return
    }

    console.log("✅ Idiomas recibidos desde Supabase:", languages)
    select.innerHTML = '<option value="">Selecciona un idioma</option>'
    
    if (languages && languages.length > 0) {
        languages.forEach(lang => {
            const option = document.createElement('option')
            option.value = lang.id
            option.textContent = lang.name
            select.appendChild(option)
        })
    } else {
        console.warn('⚠️ La tabla "languages" está vacía.')
        select.innerHTML = '<option value="">No hay idiomas registrados</option>'
    }
}

loadLanguages()

// Reordenar los números visuales (1, 2, 3...)
function reindexOrderRows() {
    const rows = document.querySelectorAll('#optionsContainer .dynamic-row')
    rows.forEach((row, idx) => {
        const span = row.querySelector('span')
        const input = row.querySelector('input.opt-text')
        if (span) span.textContent = `${idx + 1}.`
        if (input) input.placeholder = `Palabra ${idx + 1}`
    })
}

// Añadir fila de palabra para "Ordenar la frase"
function addOrderOptionRow() {
    const container = document.getElementById('optionsContainer')
    const rowCount = container.children.length + 1

    const row = document.createElement('div')
    row.className = 'dynamic-row'
    row.innerHTML = `
        <span>${rowCount}.</span>
        <input type="text" placeholder="Palabra ${rowCount}" class="opt-text" required>
        <button type="button" class="btn-remove-row"><i class="fa-solid fa-trash"></i></button>
    `

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.children.length > 2) {
            row.remove()
            reindexOrderRows()
        } else {
            alert('Debes tener al menos 2 bloques para ordenar.')
        }
    })

    container.appendChild(row)
}

// Renderizar las opciones según el tipo de pregunta
function renderOptionsInputs() {
    const questionType = document.getElementById('questionType').value
    const container = document.getElementById('optionsContainer')
    const label = document.getElementById('optionsLabel')
    const btnAdd = document.getElementById('btnAddOption')

    container.innerHTML = ''

    if (questionType === 'order_phrase') {
        label.textContent = 'Palabras o Bloques en el orden correcto (1, 2, 3... n)'
        btnAdd.style.display = 'inline-flex'
        
        for (let i = 0; i < 3; i++) {
            addOrderOptionRow()
        }
    } else {
        label.textContent = 'Opciones de Respuesta (Marca la casilla de la correcta)'
        btnAdd.style.display = 'none'

        for (let i = 0; i < 3; i++) {
            const row = document.createElement('div')
            row.className = 'dynamic-row'
            row.innerHTML = `
                <input type="text" placeholder="Opción ${i + 1}" class="opt-text" required>
                <label>
                    <input type="radio" name="correctOption" value="${i}" ${i === 0 ? 'checked' : ''}> Correcta
                </label>
            `
            container.appendChild(row)
        }
    }
}

document.getElementById('btnAddOption').addEventListener('click', () => {
    addOrderOptionRow()
})

document.getElementById('questionType').addEventListener('change', (e) => {
    const audioGroup = document.getElementById('audioUrlGroup')
    if (e.target.value === 'audio_choice') {
        audioGroup.style.display = 'block'
    } else {
        audioGroup.style.display = 'none'
        document.getElementById('audioFile').value = ''
    }
    renderOptionsInputs()
})

renderOptionsInputs()

// 3. Manejar el envío del formulario completo
const lessonForm = document.getElementById('lessonForm')
lessonForm.addEventListener('submit', async (e) => {
    e.preventDefault()

    if (!currentUserSession) {
        alert('No hay una sesión activa detectada. Vuelve a iniciar sesión.')
        return
    }

    const languageId = document.getElementById('languageSelect').value
    const levelNum = parseInt(document.getElementById('levelNumber').value)
    const lessonNum = parseInt(document.getElementById('lessonNumber').value)
    const title = document.getElementById('lessonTitle').value.trim()
    const description = document.getElementById('lessonDesc').value.trim()
    const xpReward = parseInt(document.getElementById('xpReward').value)

    const questionType = document.getElementById('questionType').value
    const questionText = document.getElementById('questionText').value.trim()
    const audioFileInput = document.getElementById('audioFile')

    const optionInputs = document.querySelectorAll('.opt-text')
    const userId = currentUserSession.user.id

    try {
        let finalAudioUrl = null;

        if (questionType === 'audio_choice' && audioFileInput.files.length > 0) {
            const audioFile = audioFileInput.files[0];
            const fileExt = audioFile.name.split('.').pop();
            const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

            const { error: uploadError } = await supabase.storage
                .from('lessons-media')
                .upload(fileName, audioFile);

            if (uploadError) throw new Error('Error al subir el audio: ' + uploadError.message);

            const { data: publicUrlData } = supabase.storage
                .from('lessons-media')
                .getPublicUrl(fileName);

            finalAudioUrl = publicUrlData.publicUrl;
        }

        // A. Buscar o crear el Nivel automáticamente (con created_by si se requiere, o solo por idioma y número)
        let { data: levelData, error: levelError } = await supabase
            .from('levels')
            .select('id')
            .eq('language_id', languageId)
            .eq('level_number', levelNum)
            .single()

        let levelId;
        if (levelError || !levelData) {
            const { data: newLevel, error: createLevelError } = await supabase
                .from('levels')
                .insert([{ 
                    language_id: languageId, 
                    level_number: levelNum, 
                    title: `Nivel ${levelNum}`,
                    created_by: userId 
                }])
                .select('id')
                .single()

            if (createLevelError) throw createLevelError
            levelId = newLevel.id
        } else {
            levelId = levelData.id
        }

        // B. Insertar la Lección incluyendo el created_by
        const { data: newLesson, error: insertLessonError } = await supabase
            .from('lessons')
            .insert([{
                level_id: levelId,
                lesson_number: lessonNum,
                title: title,
                description: description,
                xp_reward: xpReward,
                created_by: userId // <--- Agregado aquí
            }])
            .select('id')
            .single()

        if (insertLessonError) throw insertLessonError
        const lessonId = newLesson.id

        // C. Insertar la Pregunta
        const { data: newQuestion, error: insertQuestionError } = await supabase
            .from('questions')
            .insert([{
                lesson_id: lessonId,
                question_text: questionText,
                question_type: questionType,
                audio_url: finalAudioUrl,
                order_number: 1
            }])
            .select('id')
            .single()

        if (insertQuestionError) throw insertQuestionError
        const questionId = newQuestion.id

        // D. Insertar las Opciones de respuesta
        const optionsData = []
        
        if (questionType === 'order_phrase') {
            optionInputs.forEach((input) => {
                if (input.value.trim() !== '') {
                    optionsData.push({
                        question_id: questionId,
                        option_text: input.value.trim(),
                        is_correct: true
                    })
                }
            })
        } else {
            const correctRadioIndex = parseInt(document.querySelector('input[name="correctOption"]:checked').value)
            optionInputs.forEach((input, index) => {
                if (input.value.trim() !== '') {
                    optionsData.push({
                        question_id: questionId,
                        option_text: input.value.trim(),
                        is_correct: (index === correctRadioIndex)
                    })
                }
            })
        }

        const { error: insertOptionsError } = await supabase
            .from('question_options')
            .insert(optionsData)

        if (insertOptionsError) throw insertOptionsError

        alert('¡Lección y ejercicio guardados con éxito!')
        lessonForm.reset()
        loadLanguages()
        renderOptionsInputs()
        document.getElementById('audioUrlGroup').style.display = 'none'

    } catch (err) {
        console.error('Error al guardar:', err.message)
        alert('Hubo un error al guardar: ' + err.message)
    }
})

// 4. Botón de Cerrar Sesión
document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut()
    window.location.href = '../index.html'
})