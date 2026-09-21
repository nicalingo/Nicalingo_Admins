import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Helper visual Coco Ups Modal
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

document.addEventListener('DOMContentLoaded', () => {
    const bookForm = document.getElementById('bookForm');
    const btnLogout = document.getElementById('btnLogout');

    const bookTitleInput = document.getElementById('bookTitle');
    const bookTagSelect = document.getElementById('bookTag');
    const bookDescInput = document.getElementById('bookDesc');
    const bookContentInput = document.getElementById('bookContent');
    const bookTitleTransInput = document.getElementById('bookTitleTranslation');
    const bookDescTransInput = document.getElementById('bookDescTranslation');
    const bookContentTransInput = document.getElementById('bookContentTranslation');

    const prevBookTitle = document.getElementById('prevBookTitle');
    const prevBookDesc = document.getElementById('prevBookDesc');
    const prevBookContent = document.getElementById('prevBookContent');
    const prevBookTitleTrans = document.getElementById('prevBookTitleTrans');
    const prevBookDescTrans = document.getElementById('prevBookDescTrans');
    const prevBookContentTrans = document.getElementById('prevBookContentTrans');

    // Detectar si estamos en modo edición mediante el parámetro ?id= en la URL
    const urlParams = new URLSearchParams(window.location.search);
    const editBookId = urlParams.get('id');

    // Si hay un ID en la URL, cargamos los datos del libro para editarlos
    if (editBookId) {
        loadBookDataForEdit(editBookId);
    }

    async function loadBookDataForEdit(id) {
        try {
            const { data: book, error } = await supabase
                .from('library_stories')
                .select('*')
                .eq('id', id)
                .single();

            if (error || !book) throw new Error('No se encontró el libro solicitado.');

            // Rellenar campos del formulario con los datos existentes
            if (bookTitleInput) { bookTitleInput.value = book.title || ''; prevBookTitle.textContent = book.title || 'Título de la historia'; }
            if (bookTitleTransInput) { bookTitleTransInput.value = book.title_translation || ''; prevBookTitleTrans.textContent = book.title_translation || 'Traducción del título...'; }
            if (bookTagSelect) { bookTagSelect.value = book.tag || 'none'; }
            if (bookDescInput) { bookDescInput.value = book.description || ''; prevBookDesc.textContent = book.description || 'Resumen de la lectura...'; }
            if (bookDescTransInput) { bookDescTransInput.value = book.description_translation || ''; prevBookDescTrans.textContent = book.description_translation || 'Traducción de la descripción...'; }
            if (bookContentInput) { bookContentInput.value = book.content || ''; prevBookContent.textContent = book.content || 'Contenido de la lectura...'; }
            if (bookContentTransInput) { bookContentTransInput.value = book.content_translation || ''; prevBookContentTrans.textContent = book.content_translation || 'Traducción del contenido...'; }

            // Cambiar texto del botón principal para indicar actualización
            const submitBtn = bookForm.querySelector('.btn-guardar-main');
            if (submitBtn) {
                submitBtn.textContent = 'Actualizar Libro';
            }

        } catch (err) {
            console.error('Error al cargar libro para editar:', err);
            showCocoUpsModal('Hubo un error al cargar los datos del libro: ' + err.message);
        }
    }

    // Vistas previas en tiempo real
    if (bookTitleInput && prevBookTitle) {
        bookTitleInput.addEventListener('input', (e) => {
            prevBookTitle.textContent = e.target.value.trim() || 'Título de la historia';
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

    if (bookTitleTransInput && prevBookTitleTrans) {
        bookTitleTransInput.addEventListener('input', (e) => {
            prevBookTitleTrans.textContent = e.target.value.trim() || 'Traducción del título...';
        });
    }

    if (bookDescTransInput && prevBookDescTrans) {
        bookDescTransInput.addEventListener('input', (e) => {
            prevBookDescTrans.textContent = e.target.value.trim() || 'Traducción de la descripción...';
        });
    }

    if (bookContentTransInput && prevBookContentTrans) {
        bookContentTransInput.addEventListener('input', (e) => {
            prevBookContentTrans.textContent = e.target.value.trim() || 'Traducción del contenido...';
        });
    }

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    if (bookForm) {
        bookForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = bookForm.querySelector('.btn-guardar-main');
            const originalBtnText = submitBtn.textContent;
            submitBtn.textContent = editBookId ? 'Actualizando...' : 'Guardando...';
            submitBtn.disabled = true;

            try {
                // 1. Obtener el usuario autenticado actual
                const { data: { user }, error: userError } = await supabase.auth.getUser();
                if (userError || !user) {
                    throw new Error('No hay una sesión activa. Inicia sesión nuevamente.');
                }

                // 2. Consultar el apodo (nickname) en la tabla 'profiles'
                const { data: profileData, error: profileError } = await supabase
                    .from('profiles')
                    .select('nickname')
                    .eq('id', user.id)
                    .single();

                const authorNickname = (profileData && profileData.nickname) ? profileData.nickname : (user.email || 'Administrador');

                const title = document.getElementById('bookTitle').value.trim();
                const titleTranslation = document.getElementById('bookTitleTranslation').value.trim();
                const tag = document.getElementById('bookTag').value;
                const description = document.getElementById('bookDesc').value.trim();
                const descriptionTranslation = document.getElementById('bookDescTranslation').value.trim();
                const content = document.getElementById('bookContent').value.trim();
                const contentTranslation = document.getElementById('bookContentTranslation').value.trim();

                const imageFile = document.getElementById('imageAssetFile')?.files[0];
                const contentImageFile = document.getElementById('contentImageAssetFile')?.files[0];

                let imageAssetUrl = undefined;
                let contentImageAssetUrl = undefined;

                if (imageFile) {
                    const fileExt = imageFile.name.split('.').pop();
                    const fileName = `cover_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
                    
                    const { error: uploadError } = await supabase.storage
                        .from('library_assets')
                        .upload(fileName, imageFile);

                    if (uploadError) throw new Error('Error al subir portada: ' + uploadError.message);

                    const { data: publicUrlData } = supabase.storage
                        .from('library_assets')
                        .getPublicUrl(fileName);

                    imageAssetUrl = publicUrlData.publicUrl;
                }

                if (contentImageFile) {
                    const fileExt = contentImageFile.name.split('.').pop();
                    const fileName = `content_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;

                    const { error: uploadError } = await supabase.storage
                        .from('library_assets')
                        .upload(fileName, contentImageFile);

                    if (uploadError) throw new Error('Error al subir imagen interna: ' + uploadError.message);

                    const { data: publicUrlData } = supabase.storage
                        .from('library_assets')
                        .getPublicUrl(fileName);

                    contentImageAssetUrl = publicUrlData.publicUrl;
                }

                const bookPayload = {
                    title: title,
                    title_translation: titleTranslation || null,
                    tag: tag,
                    description: description,
                    description_translation: descriptionTranslation || null,
                    content: content,
                    content_translation: contentTranslation || null,
                    author: authorNickname
                };

                // Solo agregar las imágenes al payload si se subieron nuevas
                if (imageAssetUrl !== undefined) bookPayload.image_asset = imageAssetUrl;
                if (contentImageAssetUrl !== undefined) bookPayload.content_image_asset = contentImageAssetUrl;

                if (editBookId) {
                    // MODO ACTUALIZACIÓN
                    const { error: updateError } = await supabase
                        .from('library_stories')
                        .update(bookPayload)
                        .eq('id', editBookId);

                    if (updateError) throw updateError;

                    alert('¡Libro / Historia actualizado exitosamente!');
                    window.location.href = 'edit_book.html';
                } else {
                    // MODO INSERCIÓN NUEVA
                    const { error: insertError } = await supabase
                        .from('library_stories')
                        .insert([bookPayload]);

                    if (insertError) throw insertError;

                    alert('¡Libro / Historia guardada exitosamente en la biblioteca!');
                    bookForm.reset();

                    if (prevBookTitle) prevBookTitle.textContent = 'Título de la historia';
                    if (prevBookDesc) prevBookDesc.textContent = 'Resumen de la lectura...';
                    if (prevBookContent) prevBookContent.textContent = 'Contenido de la lectura...';
                    if (prevBookTitleTrans) prevBookTitleTrans.textContent = 'Traducción del título...';
                    if (prevBookDescTrans) prevBookDescTrans.textContent = 'Traducción de la descripción...';
                    if (prevBookContentTrans) prevBookContentTrans.textContent = 'Traducción del contenido...';
                }

            } catch (error) {
                console.error('Error al guardar el libro:', error);
                showCocoUpsModal('Hubo un error al guardar el libro: ' + error.message);
            } finally {
                submitBtn.textContent = originalBtnText;
                submitBtn.disabled = false;
            }
        });
    }
});