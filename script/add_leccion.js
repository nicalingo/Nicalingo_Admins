import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

let currentUserSession = null
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB en bytes

let cachedMediaUrl = null;
let cachedMediaType = null;

// --- AUTENTICACIÓN Y ROLES ---
async function checkAuthAndRole() {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
        alert('Acceso no autorizado. Inicia sesión primero.')
        window.location.href = '../index.html'
        return
    }

    currentUserSession = session

    const { data: userRole, error } = await supabase
        .rpc('get_user_role', { user_id: session.user.id })

    if (error || !userRole || (userRole !== 'editor' && userRole !== 'admin')) {
        alert('Permiso denegado. No eres editor ni administrador.')
        await supabase.auth.signOut()
        window.location.href = '../index.html'
    }
}

checkAuthAndRole()

// --- CARGAR IDIOMAS ---
async function loadLanguages() {
    const select = document.getElementById('languageSelect')
    const { data: languages, error } = await supabase.from('languages').select('id, name')

    if (error) {
        console.error('Error al cargar idiomas:', error.message)
        select.innerHTML = '<option value="">Error al cargar idiomas</option>'
        return
    }

    select.innerHTML = '<option value="">Selecciona un idioma</option>'
    if (languages && languages.length > 0) {
        languages.forEach(lang => {
            const option = document.createElement('option')
            option.value = lang.id
            option.textContent = lang.name
            select.appendChild(option)
        })
    }
}

loadLanguages()

// --- GESTIÓN DE OPCIONES DINÁMICAS ---
function reindexOrderRows() {
    const rows = document.querySelectorAll('#optionsContainer .correct-row')
    rows.forEach((row, idx) => {
        const span = row.querySelector('span')
        const input = row.querySelector('input.opt-text')
        if (span) span.textContent = `${idx + 1}.`
        if (input) input.placeholder = `Palabra correcta ${idx + 1}`
    })
}

function addOrderOptionRow(value = '') {
    const container = document.getElementById('optionsContainer')
    const rowCount = container.querySelectorAll('.correct-row').length + 1

    const row = document.createElement('div')
    row.className = 'dynamic-row correct-row'
    row.innerHTML = `
        <span>${rowCount}.</span>
        <input type="text" placeholder="Palabra correcta ${rowCount}" class="opt-text correct-val" value="${value}" required>
        <button type="button" class="btn-remove-row"><i class="fa-solid fa-trash"></i></button>
    `

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.correct-row').length > 2) {
            row.remove()
            reindexOrderRows()
            updatePreviewExercise()
        } else {
            alert('Debes tener al menos 2 bloques correctos.')
        }
    })

    container.appendChild(row)
    updatePreviewExercise()
}

function addDistractorRow(value = '') {
    const container = document.getElementById('optionsContainer')
    const row = document.createElement('div')
    row.className = 'dynamic-row distractor-row'
    row.innerHTML = `
        <span style="color: #e53e3e; font-size: 11px; font-weight: bold;">Trampa:</span>
        <input type="text" placeholder="Palabra distractor (comodín)" class="opt-text distractor-val" value="${value}" required>
        <button type="button" class="btn-remove-row"><i class="fa-solid fa-trash"></i></button>
    `

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        row.remove()
        updatePreviewExercise()
    })

    container.appendChild(row)
    updatePreviewExercise()
}

function addMultipleChoiceRow(value = '', isChecked = false) {
    const container = document.getElementById('optionsContainer')
    const index = container.querySelectorAll('.dynamic-choice-row').length

    const row = document.createElement('div')
    row.className = 'dynamic-row dynamic-choice-row'
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;'
    row.innerHTML = `
        <input type="text" placeholder="Opción ${index + 1}" class="opt-text" value="${value}" required style="flex: 1;">
        <label style="display: flex; align-items: center; gap: 5px; font-size: 12px; white-space: nowrap;">
            <input type="radio" name="correctOption" value="${index}" ${isChecked ? 'checked' : ''}> Correcta
        </label>
        <button type="button" class="btn-remove-row" style="background: #e53e3e; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
    `

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.dynamic-choice-row').length > 2) {
            row.remove()
            reindexMultipleChoiceRows()
            updatePreviewExercise()
        } else {
            alert('Debes tener al menos 2 opciones de respuesta.')
        }
    })

    container.appendChild(row)
    updatePreviewExercise()
}

function addIntroductionRow(word = '', translation = '') {
    const container = document.getElementById('optionsContainer')

    const row = document.createElement('div')
    row.className = 'dynamic-row intro-row'
    row.style.cssText = 'display: flex; align-items: center; gap: 8px; margin-bottom: 8px;'
    row.innerHTML = `
        <input type="text" placeholder="Palabra (Ej. Guacal)" class="opt-text intro-word" value="${word}" required style="flex: 1;">
        <input type="text" placeholder="Traducción (Ej. Jícara)" class="opt-text intro-translation" value="${translation}" required style="flex: 1;">
        <button type="button" class="btn-remove-row" style="background: #e53e3e; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
    `

    row.querySelector('.btn-remove-row').addEventListener('click', () => {
        if (container.querySelectorAll('.intro-row').length > 1) {
            row.remove()
            updatePreviewExercise()
        } else {
            alert('Debes tener al menos un par de vocabulario.')
        }
    })

    container.appendChild(row)
    updatePreviewExercise()
}

function reindexMultipleChoiceRows() {
    const rows = document.querySelectorAll('#optionsContainer .dynamic-choice-row')
    rows.forEach((row, idx) => {
        const input = row.querySelector('input.opt-text')
        const radio = row.querySelector('input[type="radio"]')
        if (input) input.placeholder = `Opción ${idx + 1}`
        if (radio) radio.value = idx
    })
}

function renderOptionsInputs() {
    const questionType = document.getElementById('questionType').value
    const container = document.getElementById('optionsContainer')
    const label = document.getElementById('optionsLabel')
    const btnAdd = document.getElementById('btnAddOption')

    if (!container) return
    container.innerHTML = ''

    const oldBtnDistractor = document.getElementById('btnAddDistractor')
    if (oldBtnDistractor) oldBtnDistractor.remove()

    if (questionType === 'order_phrase') {
        if (label) label.textContent = 'Frase Correcta y Comodines (Palabras trampa)'
        
        if (btnAdd) {
            btnAdd.style.display = 'inline-flex'
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Añadir Palabra'
        }

        for (let i = 0; i < 3; i++) {
            addOrderOptionRow()
        }

        const btnDistractor = document.createElement('button')
        btnDistractor.type = 'button'
        btnDistractor.id = 'btnAddDistractor'
        btnDistractor.style.cssText = 'background: #e53e3e; color: white; border: none; padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; margin-left: 5px;'
        btnDistractor.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Añadir Trampa'
        btnDistractor.addEventListener('click', () => addDistractorRow())
        
        if (btnAdd && btnAdd.parentNode) {
            btnAdd.parentNode.appendChild(btnDistractor)
        }

    } else if (questionType === 'introduction') {
        if (label) label.textContent = 'Listado de Vocabulario (Palabra y Traducción)'
        
        if (btnAdd) {
            btnAdd.style.display = 'inline-flex'
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Añadir Par'
        }

        addIntroductionRow()
        addIntroductionRow()

    } else {
        if (label) label.textContent = 'Opciones de Respuesta (Marca la casilla de la correcta)'
        
        if (btnAdd) {
            btnAdd.style.display = 'inline-flex'
            btnAdd.innerHTML = '<i class="fa-solid fa-plus"></i> Añadir Opción'
        }

        for (let i = 0; i < 3; i++) {
            addMultipleChoiceRow('', i === 0)
        }
    }
    updatePreviewExercise()
}

const btnAddOpt = document.getElementById('btnAddOption')
if (btnAddOpt) {
    btnAddOpt.addEventListener('click', () => {
        const questionType = document.getElementById('questionType').value
        if (questionType === 'order_phrase') {
            addOrderOptionRow()
        } else if (questionType === 'introduction') {
            addIntroductionRow()
        } else {
            addMultipleChoiceRow()
        }
    })
}

// --- VISTA PREVIA Y PESTAÑAS ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'))
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'))
        
        btn.classList.add('active')
        const targetTab = document.getElementById(btn.dataset.tab)
        if (targetTab) targetTab.classList.add('active')
    })
})

const titleInput = document.getElementById('lessonTitle')
const descInput = document.getElementById('lessonDesc')
const levelInput = document.getElementById('levelNumber')
const lessonNumInput = document.getElementById('lessonNumber')

if (titleInput) {
    titleInput.addEventListener('input', (e) => {
        document.getElementById('prevTitle').textContent = e.target.value || 'Saludos básicos'
    })
}
if (descInput) {
    descInput.addEventListener('input', (e) => {
        document.getElementById('prevDesc').textContent = e.target.value || 'Descripción de la lección...'
    })
}
if (levelInput) {
    levelInput.addEventListener('input', (e) => {
        document.getElementById('prevLevelBadge').textContent = `Nivel ${e.target.value || 1}`
    })
}
if (lessonNumInput) {
    lessonNumInput.addEventListener('input', (e) => {
        document.getElementById('prevLessonBadge').textContent = `Lección ${e.target.value || 1}`
    })
}

const questionTypeSelect = document.getElementById('questionType')
const previewContainer = document.getElementById('previewQuestionContainer')
const generalFileInput = document.getElementById('generalFile')
const btnRemoveFile = document.getElementById('btnRemoveFile')

// --- GESTIÓN DE ARCHIVO GENERAL Y BOTÓN ELIMINAR ---
if (generalFileInput) {
    generalFileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > MAX_FILE_SIZE) {
                alert('El archivo supera el límite máximo de 5 MB.');
                generalFileInput.value = ''; 
                cachedMediaUrl = null;
                cachedMediaType = null;
                if (btnRemoveFile) btnRemoveFile.style.display = 'none';
                updatePreviewExercise();
                return;
            }

            cachedMediaUrl = URL.createObjectURL(file);
            if (file.type.startsWith('audio/')) {
                cachedMediaType = 'audio';
            } else if (file.type.startsWith('image/')) {
                cachedMediaType = 'image';
            } else {
                cachedMediaType = 'file';
            }

            if (btnRemoveFile) btnRemoveFile.style.display = 'inline-flex';
        } else {
            cachedMediaUrl = null;
            cachedMediaType = null;
            if (btnRemoveFile) btnRemoveFile.style.display = 'none';
        }
        updatePreviewExercise();
    });
}

if (btnRemoveFile) {
    btnRemoveFile.addEventListener('click', () => {
        if (generalFileInput) generalFileInput.value = '';
        cachedMediaUrl = null;
        cachedMediaType = null;
        btnRemoveFile.style.display = 'none';
        updatePreviewExercise();
    });
}

function updatePreviewExercise() {
    if (!previewContainer || !questionTypeSelect) return

    const type = questionTypeSelect.value
    const questionTextEl = document.getElementById('questionText')
    const currentQuestionText = questionTextEl && questionTextEl.value.trim() !== '' 
        ? questionTextEl.value 
        : 'Escribe el enunciado del ejercicio...'

    let mediaHtml = ''

    if (cachedMediaUrl && cachedMediaType) {
        if (cachedMediaType === 'audio') {
            mediaHtml = `
                <div style="margin-bottom: 10px; background: #eef2f7; padding: 8px; border-radius: 6px;">
                    <span style="font-size: 11px; font-weight: bold; color: #1c3d98; display: block; margin-bottom: 4px;"><i class="fa-solid fa-headphones"></i> Audio detectado</span>
                    <audio controls style="width: 100%; height: 32px;">
                        <source src="${cachedMediaUrl}">
                        Tu navegador no soporta audio.
                    </audio>
                </div>
            `;
        } else if (cachedMediaType === 'image') {
            mediaHtml = `
                <div style="margin-bottom: 10px; text-align: center; background: #fdfdfd; padding: 6px; border: 1px solid #ddd; border-radius: 6px;">
                    <span style="font-size: 11px; font-weight: bold; color: #2b6cb0; display: block; margin-bottom: 4px;"><i class="fa-solid fa-image"></i> Imagen detectada</span>
                    <img src="${cachedMediaUrl}" alt="Visualización" style="max-width: 100%; max-height: 130px; border-radius: 4px; object-fit: contain;">
                </div>
            `;
        } else {
            mediaHtml = `
                <div style="margin-bottom: 10px; background: #fff3cd; padding: 8px; border-radius: 6px; font-size: 11px; color: #856404;">
                    <i class="fa-solid fa-file"></i> Archivo multimedia adjunto
                </div>
            `;
        }
    }

    if (type === 'order_phrase') {
        const correctInputs = document.querySelectorAll('.correct-val')
        const distractorInputs = document.querySelectorAll('.distractor-val')
        
        let allWords = []
        correctInputs.forEach((input, index) => {
            const val = input.value.trim() !== '' ? input.value : `Palabra ${index + 1}`
            allWords.push({ text: val, isCorrect: true })
        })
        distractorInputs.forEach((input) => {
            if (input.value.trim() !== '') {
                allWords.push({ text: input.value.trim(), isCorrect: false })
            }
        })

        const shuffledWords = [...allWords].sort(() => Math.random() - 0.5)

        let spansHtml = ''
        shuffledWords.forEach((word) => {
            spansHtml += `<span style="background: ${word.isCorrect ? '#1c3d98' : '#718096'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; cursor: pointer;">${word.text}</span>`
        })

        previewContainer.innerHTML = `
            ${mediaHtml}
            <p><b>1.</b> ${currentQuestionText}</p>
            <p style="font-size: 10px; color: #666; margin-bottom: 6px;">(Palabras mezcladas)</p>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 12px;">
                ${spansHtml}
            </div>
            <button type="button" class="btn-prev-action">Comprobar Orden</button>
        `
    } else if (type === 'introduction') {
        const wordInputs = document.querySelectorAll('.intro-word')
        const translationInputs = document.querySelectorAll('.intro-translation')
        
        let listHtml = ''
        wordInputs.forEach((input, index) => {
            const w = input.value.trim() !== '' ? input.value : `Palabra ${index + 1}`
            const t = translationInputs[index] && translationInputs[index].value.trim() !== '' ? translationInputs[index].value : `Traducción ${index + 1}`
            
            listHtml += `
                <div style="display: flex; justify-content: space-between; background: #f8fafc; padding: 6px 10px; border-radius: 4px; margin-bottom: 4px; font-size: 12px; border: 1px solid #e2e8f0;">
                    <span><b>${w}</b></span>
                    <span style="color: #4a5568;">${t}</span>
                </div>
            `
        })

        previewContainer.innerHTML = `
            ${mediaHtml}
            <p><b>1.</b> ${currentQuestionText}</p>
            <div style="max-height: 140px; overflow-y: auto; margin-bottom: 10px;">
                ${listHtml}
            </div>
            <button type="button" class="btn-prev-action">Continuar</button>
        `
    } else {
        const optionInputs = document.querySelectorAll('.opt-text')
        let optionsHtml = ''
        optionInputs.forEach((input, index) => {
            const val = input.value.trim() !== '' ? input.value : `Opción ${index + 1}`
            const radioReal = document.querySelectorAll(`input[name="correctOption"]`)[index]
            const isChecked = radioReal && radioReal.checked ? 'checked' : ''

            optionsHtml += `
                <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 6px; color: #444;">
                    <input type="radio" disabled ${isChecked}> ${val}
                </label>
            `
        })

        previewContainer.innerHTML = `
            ${mediaHtml}
            <p><b>1.</b> ${currentQuestionText}</p>
            ${optionsHtml}
            <button type="button" class="btn-prev-action">Ver Respuesta</button>
        `
    }
}

document.addEventListener('input', (e) => {
    if (e.target.classList.contains('opt-text') || e.target.id === 'questionText') {
        updatePreviewExercise()
    }
})

document.addEventListener('change', (e) => {
    if (e.target.name === 'correctOption') {
        updatePreviewExercise()
    }
})

if (questionTypeSelect) {
    questionTypeSelect.addEventListener('change', (e) => {
        renderOptionsInputs()
        updatePreviewExercise()
    })
}

renderOptionsInputs()

// --- GUARDAR LECCIÓN ---
const lessonForm = document.getElementById('lessonForm')
if (lessonForm) {
    lessonForm.addEventListener('submit', async (e) => {
        e.preventDefault()

        if (!currentUserSession) {
            alert('No hay una sesión activa detectada.')
            return
        }

        const questionType = document.getElementById('questionType').value

        if (questionType === 'multimedia') {
            if (!generalFileInput || generalFileInput.files.length === 0) {
                alert('Has seleccionado el tipo "Multimedia". Debes subir obligatoriamente un archivo (audio o imagen).');
                return;
            }
        }

        const languageId = document.getElementById('languageSelect').value
        const levelNum = parseInt(document.getElementById('levelNumber').value)
        const lessonNum = parseInt(document.getElementById('lessonNumber').value)
        const title = document.getElementById('lessonTitle').value.trim()
        const description = document.getElementById('lessonDesc').value.trim()
        const xpReward = parseInt(document.getElementById('xpReward').value)

        const questionTextEl = document.getElementById('questionText')
        const questionText = questionTextEl ? questionTextEl.value.trim() : ''
        const userId = currentUserSession.user.id

        try {
            let finalAudioUrl = null;
            let finalImageUrl = null;

            if (generalFileInput && generalFileInput.files.length > 0) {
                const file = generalFileInput.files[0];
                const fileExt = file.name.split('.').pop();
                const fileName = `media_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage.from('lessons-media').upload(fileName, file);
                if (uploadError) throw new Error('Error al subir archivo: ' + uploadError.message);

                const { data: publicUrlData } = supabase.storage.from('lessons-media').getPublicUrl(fileName);
                
                if (file.type.startsWith('audio/')) {
                    finalAudioUrl = publicUrlData.publicUrl;
                } else if (file.type.startsWith('image/')) {
                    finalImageUrl = publicUrlData.publicUrl;
                } else {
                    finalImageUrl = publicUrlData.publicUrl;
                }
            }

            let { data: levelData, error: levelError } = await supabase
                .from('levels').select('id').eq('language_id', languageId).eq('level_number', levelNum).single()

            let levelId;
            if (levelError || !levelData) {
                const { data: newLevel, error: createLevelError } = await supabase
                    .from('levels').insert([{ language_id: languageId, level_number: levelNum, title: `Nivel ${levelNum}`, created_by: userId }]).select('id').single()
                if (createLevelError) throw createLevelError
                levelId = newLevel.id
            } else {
                levelId = levelData.id
            }

            const { data: newLesson, error: insertLessonError } = await supabase
                .from('lessons').insert([{ 
                    level_id: levelId, 
                    lesson_number: lessonNum, 
                    title, 
                    description, 
                    xp_reward: xpReward, 
                    created_by: userId,
                    lesson_type: questionType 
                }]).select('id').single()
            
            if (insertLessonError) throw insertLessonError
            const lessonId = newLesson.id

            const { data: newQuestion, error: insertQuestionError } = await supabase
                .from('questions').insert([{ 
                    lesson_id: lessonId, 
                    question_text: questionText, 
                    question_type: questionType, 
                    audio_url: finalAudioUrl, 
                    image_url: finalImageUrl, 
                    order_number: 1 
                }]).select('id').single()
            
            if (insertQuestionError) throw insertQuestionError
            const questionId = newQuestion.id

            const optionsData = []
            
            if (questionType === 'order_phrase') {
                const correctInputs = document.querySelectorAll('.correct-val')
                const distractorInputs = document.querySelectorAll('.distractor-val')

                correctInputs.forEach(input => {
                    if (input.value.trim() !== '') {
                        optionsData.push({ question_id: questionId, option_text: input.value.trim(), is_correct: true })
                    }
                })
                distractorInputs.forEach(input => {
                    if (input.value.trim() !== '') {
                        optionsData.push({ question_id: questionId, option_text: input.value.trim(), is_correct: false })
                    }
                })
            } else if (questionType === 'introduction') {
                const wordInputs = document.querySelectorAll('.intro-word')
                const translationInputs = document.querySelectorAll('.intro-translation')

                wordInputs.forEach((input, index) => {
                    const w = input.value.trim()
                    const t = translationInputs[index] ? translationInputs[index].value.trim() : ''
                    if (w !== '') {
                        optionsData.push({ 
                            question_id: questionId, 
                            option_text: `${w} : ${t}`, 
                            is_correct: true 
                        })
                    }
                })
            } else {
                const checkedRadio = document.querySelector('input[name="correctOption"]:checked')
                const correctRadioIndex = checkedRadio ? parseInt(checkedRadio.value) : 0
                const optionInputs = document.querySelectorAll('.opt-text')
                
                optionInputs.forEach((input, index) => {
                    if (input.value.trim() !== '') {
                        optionsData.push({ question_id: questionId, option_text: input.value.trim(), is_correct: (index === correctRadioIndex) })
                    }
                })
            }

            if (optionsData.length > 0) {
                const { error: optErr } = await supabase.from('question_options').insert(optionsData)
                if (optErr) throw optErr
            }

            alert('¡Lección y ejercicio guardados con éxito!')
            lessonForm.reset()
            cachedMediaUrl = null
            cachedMediaType = null
            if (btnRemoveFile) btnRemoveFile.style.display = 'none';
            loadLanguages()
            renderOptionsInputs()
            updatePreviewExercise()
        } catch (err) {
            console.error('Error al guardar:', err.message)
            alert('Hubo un error al guardar: ' + err.message)
        }
    })
}

// --- CERRAR SESIÓN ---
const btnLogout = document.getElementById('btnLogout')
if (btnLogout) {
    btnLogout.addEventListener('click', async () => {
        await supabase.auth.signOut()
        window.location.href = '../index.html'
    })
}