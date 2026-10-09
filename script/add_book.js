import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

// Inicialización correcta únicamente con Publishable Key
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    }
})

// Modal de alerta Coco Ups
function showCocoUpsModal(errorMessage) {
    let modal = document.getElementById('cocoUpsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cocoUpsModal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
            background: rgba(0, 0, 0, 0.6); display: flex; justify-content: center;
            align-items: center; z-index: 99999; backdrop-filter: blur(4px);
        `;
        modal.innerHTML = `
            <div style="background: #ffffff; padding: 25px 30px; border-radius: 16px; max-width: 420px; width: 90%; text-align: center; box-shadow: 0 20px 30px rgba(0,0,0,0.25); border: 2px solid #fee2e2;">
                <img src="../assets/imagenes/coco/coco ups.png" alt="Coco Ups" class="coco-bounce">
                <h3 style="margin: 10px 0; color: #dc2626; font-size: 18px; font-weight: 700;">¡Ups! Ha ocurrido un error</h3>
                <p id="cocoUpsMsgText" style="font-size: 14px; color: #526360; line-height: 1.5; margin-bottom: 20px; word-break: break-word;"></p>
                <button type="button" id="btnCocoUpsClose" class="btn-guardar-main" style="padding: 10px 24px; font-size: 14px;">Entendido</button>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('btnCocoUpsClose').addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    document.getElementById('cocoUpsMsgText').textContent = errorMessage;
    modal.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', async () => {
    const bookForm = document.getElementById('bookForm');
    const btnLogout = document.getElementById('btnLogout');

    // Inputs de la obra en español
    const bookTitleInput = document.getElementById('bookTitle');
    const bookTagSelect = document.getElementById('bookTag');
    const bookDescInput = document.getElementById('bookDesc');
    const bookContentInput = document.getElementById('bookContent');

    // Previews español
    const prevBookTitle = document.getElementById('prevBookTitle');
    const prevBookTag = document.getElementById('prevBookTag');
    const prevBookDesc = document.getElementById('prevBookDesc');
    const prevBookContent = document.getElementById('prevBookContent');

    // Pestañas y campos de traducción
    const languagesTabMenu = document.getElementById('languagesTabMenu');
    const currentLangLabel = document.getElementById('currentLangLabel');
    const transTitleInput = document.getElementById('transTitle');
    const transDescInput = document.getElementById('transDesc');
    const transContentInput = document.getElementById('transContent');

    // Previews traducción
    const previewTransTitleBar = document.getElementById('previewTransTitleBar');
    const prevBookTitleTrans = document.getElementById('prevBookTitleTrans');
    const prevBookDescTrans = document.getElementById('prevBookDescTrans');
    const prevBookContentTrans = document.getElementById('prevBookContentTrans');

    // Contenedores para imágenes preexistentes
    const currentCoverBox = document.getElementById('currentCoverBox');
    const currentCoverImg = document.getElementById('currentCoverImg');
    const currentContentImageBox = document.getElementById('currentContentImageBox');
    const currentContentImg = document.getElementById('currentContentImg');

    let availableLanguages = [];
    let selectedLanguageId = null;
    const translationsData = {};

    const urlParams = new URLSearchParams(window.location.search);
    const editBookId = urlParams.get('id');

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    // 1. Cargar idiomas desde Supabase
    async function loadLanguages() {
        try {
            const { data, error } = await supabase
                .from('languages')
                .select('id, name')
                .order('id');

            if (error) throw error;
            availableLanguages = data || [];

            renderLanguageTabs();

            if (availableLanguages.length > 0 && !selectedLanguageId) {
                switchLanguage(availableLanguages[0].id);
            }
        } catch (err) {
            console.error('Error al cargar idiomas:', err);
            showCocoUpsModal('No se pudieron cargar los idiomas disponibles: ' + err.message);
        }
    }

    // 2. Renderizar menú de pestañas
    function renderLanguageTabs() {
        if (!languagesTabMenu) return;
        languagesTabMenu.innerHTML = '';

        availableLanguages.forEach(lang => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = `tab-btn ${lang.id === selectedLanguageId ? 'active' : ''}`;
            btn.dataset.langId = lang.id;

            const hasData = translationsData[lang.id] && (
                translationsData[lang.id].title || translationsData[lang.id].content
            );

            btn.innerHTML = `
                <i class="fa-solid fa-language"></i>
                <span>${lang.name}</span>
                <span class="lang-badge-status ${hasData ? 'has-content' : ''}"></span>
            `;

            btn.addEventListener('click', () => {
                saveCurrentTabToMemory();
                switchLanguage(lang.id);
            });

            languagesTabMenu.appendChild(btn);
        });
    }

    function saveCurrentTabToMemory() {
        if (!selectedLanguageId) return;

        translationsData[selectedLanguageId] = {
            title: transTitleInput.value.trim(),
            description: transDescInput.value.trim(),
            content: transContentInput.value.trim()
        };
    }

    function switchLanguage(langId) {
        selectedLanguageId = langId;
        const currentLang = availableLanguages.find(l => l.id === langId);
        const langName = currentLang ? currentLang.name : 'Lengua Originaria';

        if (currentLangLabel) currentLangLabel.textContent = langName;
        if (previewTransTitleBar) previewTransTitleBar.textContent = `Vista Previa - ${langName}`;

        const langData = translationsData[langId] || { title: '', description: '', content: '' };
        transTitleInput.value = langData.title || '';
        transDescInput.value = langData.description || '';
        transContentInput.value = langData.content || '';

        updateTranslationPreview();
        renderLanguageTabs();
    }

    function updateTranslationPreview() {
        const title = transTitleInput.value.trim();
        const desc = transDescInput.value.trim();
        const content = transContentInput.value.trim();

        if (prevBookTitleTrans) prevBookTitleTrans.textContent = title || 'Sin traducción';
        if (prevBookDescTrans) prevBookDescTrans.textContent = desc || 'Sin traducción...';
        if (prevBookContentTrans) prevBookContentTrans.textContent = content || 'Sin traducción...';
    }

    // Escuchas en vivo para traducciones
    [transTitleInput, transDescInput, transContentInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                saveCurrentTabToMemory();
                updateTranslationPreview();
            });
        }
    });

    // Escuchas en vivo para el libro original (Español)
    if (bookTitleInput && prevBookTitle) {
        bookTitleInput.addEventListener('input', (e) => {
            prevBookTitle.textContent = e.target.value.trim() || 'Título de la historia';
        });
    }
    if (bookTagSelect && prevBookTag) {
        bookTagSelect.addEventListener('change', (e) => {
            prevBookTag.textContent = e.target.value;
        });
    }
    if (bookDescInput && prevBookDesc) {
        bookDescInput.addEventListener('input', (e) => {
            prevBookDesc.textContent = e.target.value.trim() || 'Resumen de la lectura...';
        });
    }
    if (bookContentInput && prevBookContent) {
        bookContentInput.addEventListener('input', (e) => {
            prevBookContent.textContent = e.target.value.trim() || 'Contenido de la lectura...';
        });
    }

    // 3. Modo Edición (?id=X)
    if (editBookId) {
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) pageTitle.textContent = 'EDITAR HISTORIA / LIBRO';
        const submitBtn = bookForm.querySelector('.btn-guardar-main');
        if (submitBtn) submitBtn.textContent = 'Actualizar Libro y Traducciones';
        loadBookDataForEdit(editBookId);
    } else {
        loadLanguages();
    }

    async function loadBookDataForEdit(id) {
        try {
            await loadLanguages();

            const { data: book, error } = await supabase
                .from('library_stories')
                .select(`
                    id,
                    title,
                    tag,
                    description,
                    content,
                    image_asset,
                    content_image_asset,
                    library_story_translations (
                        id,
                        language_id,
                        title,
                        description,
                        content
                    )
                `)
                .eq('id', id)
                .single();

            if (error || !book) throw new Error('No se encontró el libro solicitado.');

            // Llenar campos base en español
            if (bookTitleInput) { bookTitleInput.value = book.title || ''; prevBookTitle.textContent = book.title || 'Título de la historia'; }
            if (bookTagSelect) { bookTagSelect.value = book.tag || 'none'; prevBookTag.textContent = book.tag || 'none'; }
            if (bookDescInput) { bookDescInput.value = book.description || ''; prevBookDesc.textContent = book.description || 'Resumen de la lectura...'; }
            if (bookContentInput) { bookContentInput.value = book.content || ''; prevBookContent.textContent = book.content || 'Contenido de la lectura...'; }

            // Mostrar miniaturas de las imágenes guardadas
            if (book.image_asset && currentCoverBox && currentCoverImg) {
                currentCoverImg.src = book.image_asset;
                currentCoverBox.style.display = 'block';
            }
            if (book.content_image_asset && currentContentImageBox && currentContentImg) {
                currentContentImg.src = book.content_image_asset;
                currentContentImageBox.style.display = 'block';
            }

            // Precargar traducciones en memoria
            if (book.library_story_translations && Array.isArray(book.library_story_translations)) {
                book.library_story_translations.forEach(t => {
                    translationsData[t.language_id] = {
                        title: t.title || '',
                        description: t.description || '',
                        content: t.content || ''
                    };
                });
            }

            if (availableLanguages.length > 0) {
                switchLanguage(availableLanguages[0].id);
            }

        } catch (err) {
            console.error('Error al cargar datos:', err);
            showCocoUpsModal('Hubo un error al cargar el libro: ' + err.message);
        }
    }

    // 4. Envío del formulario
    if (bookForm) {
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            saveCurrentTabToMemory();

            const submitBtn = bookForm.querySelector('.btn-guardar-main');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = editBookId ? 'Actualizando...' : 'Guardando...';
            submitBtn.disabled = true;

            try {
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) throw new Error('No hay una sesión activa.');

                const { data: profileData } = await supabase
                    .from('profiles')
                    .select('nickname')
                    .eq('id', user.id)
                    .single();

                const authorNickname = (profileData && profileData.nickname) ? profileData.nickname : (user.email || 'Administrador');

                // Manejo de nuevas imágenes subidas
                const imageFile = document.getElementById('imageAssetFile')?.files[0];
                const contentImageFile = document.getElementById('contentImageAssetFile')?.files[0];

                let imageAssetUrl = undefined;
                let contentImageAssetUrl = undefined;

                if (imageFile) {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const { error: uploadErr } = await supabase.storage.from('library_assets').upload(fileName, imageFile);
                    if (uploadErr) throw new Error('Error al subir portada: ' + uploadErr.message);

                    const { data: pubData } = supabase.storage.from('library_assets').getPublicUrl(fileName);
                    imageAssetUrl = pubData.publicUrl;
                }

                if (contentImageFile) {
                    const fileExt = contentImageFile.name.split('.').pop();
                    const fileName = `content_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                    const { error: uploadErr } = await supabase.storage.from('library_assets').upload(fileName, contentImageFile);
                    if (uploadErr) throw new Error('Error al subir imagen interna: ' + uploadErr.message);

                    const { data: pubData } = supabase.storage.from('library_assets').getPublicUrl(fileName);
                    contentImageAssetUrl = pubData.publicUrl;
                }

                const bookPayload = {
                    title: bookTitleInput.value.trim(),
                    tag: bookTagSelect.value,
                    description: bookDescInput.value.trim(),
                    content: bookContentInput.value.trim(),
                    author: authorNickname
                };

                // Preserva imágenes si no se subió un archivo nuevo
                if (imageAssetUrl !== undefined) bookPayload.image_asset = imageAssetUrl;
                if (contentImageAssetUrl !== undefined) bookPayload.content_image_asset = contentImageAssetUrl;

                let storyId = editBookId;

                if (editBookId) {
                    const { error: updateErr } = await supabase
                        .from('library_stories')
                        .update(bookPayload)
                        .eq('id', editBookId);
                    if (updateErr) throw updateErr;
                } else {
                    const { data: insertedBook, error: insertErr } = await supabase
                        .from('library_stories')
                        .insert([bookPayload])
                        .select('id')
                        .single();

                    if (insertErr) throw insertErr;
                    storyId = insertedBook.id;
                }

                // Upsert de traducciones con contenido
                const translationsToUpsert = [];
                for (const [langId, tData] of Object.entries(translationsData)) {
                    if (tData.title && tData.content) {
                        translationsToUpsert.push({
                            story_id: storyId,
                            language_id: parseInt(langId),
                            title: tData.title,
                            description: tData.description || null,
                            content: tData.content,
                            updated_at: new Date().toISOString()
                        });
                    }
                }

                if (translationsToUpsert.length > 0) {
                    const { error: transError } = await supabase
                        .from('library_story_translations')
                        .upsert(translationsToUpsert, { onConflict: 'story_id, language_id' });

                    if (transError) throw new Error('Error al guardar traducciones: ' + transError.message);
                }

                alert(editBookId ? '¡Libro y traducciones actualizados con éxito!' : '¡Libro y traducciones registrados con éxito!');
                window.location.href = 'edit_book.html';

            } catch (err) {
                console.error('Error general al guardar:', err);
                showCocoUpsModal('Hubo un problema al procesar el libro: ' + err.message);
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});