import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

// Inicialización explícita para Publishable Key
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
        persistSession: true,
        autoRefreshToken: true
    },
    global: {
        headers: {
            apikey: SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`
        }
    }
})

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

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    const searchInput = document.getElementById('searchBook');
    const filterTagSelect = document.getElementById('filterTag');
    const loadingMessage = document.getElementById('loadingMessage');

    const tableContainer = document.querySelector('.table-container');
    let booksContainer = document.getElementById('booksContainer');
    
    if (!booksContainer) {
        booksContainer = document.createElement('div');
        booksContainer.id = 'booksContainer';
        booksContainer.className = 'books-grid';
        tableContainer.appendChild(booksContainer);
    }

    let allBooks = [];

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    async function fetchBooks() {
        try {
            if (loadingMessage) loadingMessage.style.display = 'block';
            booksContainer.style.display = 'none';

            // Consulta relacional con library_story_translations y languages
            const { data, error } = await supabase
                .from('library_stories')
                .select(`
                    id,
                    title,
                    description,
                    content,
                    image_asset,
                    content_image_asset,
                    tag,
                    author,
                    created_at,
                    library_story_translations (
                        id,
                        language_id,
                        title,
                        description,
                        languages (
                            id,
                            name
                        )
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;

            allBooks = data || [];
            filterBooks();

        } catch (err) {
            console.error('Error al cargar libros:', err);
            if (loadingMessage) {
                loadingMessage.innerHTML = `<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error al conectar con la base de datos: ${err.message || 'Error'}</span>`;
                loadingMessage.style.display = 'block';
            }
            showCocoUpsModal('No se pudieron obtener las historias de la biblioteca: ' + err.message);
        } finally {
            if (allBooks.length > 0 && loadingMessage) {
                loadingMessage.style.display = 'none';
            }
        }
    }

    function renderBooks(books) {
        if (loadingMessage) loadingMessage.style.display = 'none';

        let emptyState = document.getElementById('emptyStateBox');
        if (!emptyState) {
            emptyState = document.createElement('div');
            emptyState.id = 'emptyStateBox';
            emptyState.className = 'empty-library-state';
            emptyState.innerHTML = `
                <img src="../assets/imagenes/coco/mascota.png" alt="Mascota NicaLingo">
                <h3>¡La biblioteca está esperando su primera gran historia!</h3>
                <p>Todavía no hay libros registrados en el sistema. Anímate a crear el primero para que cobre vida.</p>
                <a href="add_book.html" class="btn-create-first"><i class="fa-solid fa-book-medical"></i> Crear mi primer libro</a>
            `;
            tableContainer.appendChild(emptyState);
        }

        if (books.length === 0) {
            booksContainer.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        booksContainer.style.display = 'grid';

        booksContainer.innerHTML = books.map(book => {
            const coverImg = book.image_asset 
                ? `<img src="${book.image_asset}" alt="Portada" class="book-card-cover">` 
                : `<div class="book-card-cover" style="display: flex; align-items: center; justify-content: center; color: #999; font-size: 10px; text-align: center;">Sin imagen</div>`;

            const authorName = book.author || 'Autor desconocido';
            const translations = book.library_story_translations || [];

            // Badges con las lenguas disponibles
            const languagesBadges = translations.length > 0
                ? translations.map(t => `<span class="badge-pill"><i class="fa-solid fa-language"></i> ${t.languages?.name || 'Idioma'}</span>`).join('')
                : `<span class="badge-pill">Sin traducciones</span>`;

            // Subtítulos traducidos
            const translationSubtitles = translations.map(t => t.title).filter(Boolean).join(' / ');

            return `
                <div class="book-card" data-id="${book.id}">
                    <div>
                        <div class="book-card-header">
                            ${coverImg}
                            <div class="book-card-info">
                                <h3 class="book-card-title" title="${book.title || 'Sin título'}">${book.title || 'Sin título'}</h3>
                                <div class="sub-text" style="font-size: 12px; color: var(--text-secondary); font-style: italic; margin-bottom: 4px;">
                                    ${translationSubtitles || 'Original en español'}
                                </div>
                                <div class="book-card-author"><i class="fa-solid fa-pen-nib" style="margin-right: 4px;"></i> ${authorName}</div>
                                <div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center; margin-top: 6px;">
                                    <span class="book-card-tag">${book.tag || 'none'}</span>
                                    ${languagesBadges}
                                </div>
                            </div>
                        </div>
                        <p class="book-card-desc">${book.description ? book.description : 'Sin descripción'}</p>
                    </div>
                    <div class="book-card-actions">
                        <button class="btn-action btn-edit" data-id="${book.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-action btn-delete" data-id="${book.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de que deseas eliminar este libro? Se eliminarán también todas sus traducciones asociadas.')) {
                    await deleteBook(id);
                }
            });
        });

        document.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                window.location.href = `add_book.html?id=${id}`;
            });
        });
    }

    async function deleteBook(id) {
        try {
            const { error } = await supabase
                .from('library_stories')
                .delete()
                .eq('id', id);

            if (error) throw error;

            alert('¡Libro eliminado exitosamente!');
            fetchBooks();
        } catch (err) {
            console.error('Error al eliminar:', err);
            showCocoUpsModal('Hubo un error al eliminar el libro: ' + err.message);
        }
    }

    function filterBooks() {
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedTag = filterTagSelect ? filterTagSelect.value.toLowerCase() : '';

        const filtered = allBooks.filter(book => {
            const matchesBase = 
                (book.title && book.title.toLowerCase().includes(term)) ||
                (book.author && book.author.toLowerCase().includes(term));

            const translations = book.library_story_translations || [];
            const matchesTranslations = translations.some(t => 
                (t.title && t.title.toLowerCase().includes(term)) ||
                (t.languages?.name && t.languages.name.toLowerCase().includes(term))
            );

            const matchesTag = selectedTag === '' || (book.tag && book.tag.toLowerCase() === selectedTag);

            return (matchesBase || matchesTranslations) && matchesTag;
        });

        renderBooks(filtered);
    }

    if (searchInput) {
        searchInput.addEventListener('input', filterBooks);
    }

    if (filterTagSelect) {
        filterTagSelect.addEventListener('change', filterBooks);
    }

    fetchBooks();
});