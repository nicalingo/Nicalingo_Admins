import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    const searchInput = document.getElementById('searchBook');
    const filterTagSelect = document.getElementById('filterTag');
    const loadingMessage = document.getElementById('loadingMessage');

    // Creamos o seleccionamos el contenedor de tarjetas en el DOM
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

            const { data, error } = await supabase
                .from('library_stories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allBooks = data || [];
            filterBooks(); // Renderizar aplicando filtros iniciales

        } catch (err) {
            console.error('Error al cargar libros:', err);
            if (loadingMessage) {
                loadingMessage.innerHTML = '<span style="color: #ef4444;"><i class="fa-solid fa-triangle-exclamation"></i> Error al conectar con la base de datos.</span>';
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

            const authorName = book.author || book.autor || 'Autor desconocido';

            return `
                <div class="book-card" data-id="${book.id}">
                    <div>
                        <div class="book-card-header">
                            ${coverImg}
                            <div class="book-card-info">
                                <h3 class="book-card-title" title="${book.title || 'Sin título'}">${book.title || 'Sin título'}</h3>
                                <div class="sub-text" style="font-size: 12px; color: #64748b; font-style: italic; margin-bottom: 4px;">${book.title_translation || ''}</div>
                                <div class="book-card-author"><i class="fa-solid fa-pen-nib" style="margin-right: 4px;"></i> ${authorName}</div>
                                <span class="book-card-tag">${book.tag || 'none'}</span>
                            </div>
                        </div>
                        <p class="book-card-desc">${book.description ? book.description : 'Sin descripción'}</p>
                    </div>
                    <div class="book-card-actions">
                        <button class="btn-action btn-edit" data-id="${book.id}" title="Editar" style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-action btn-delete" data-id="${book.id}" title="Eliminar" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            `;
        }).join('');

        // Eventos para eliminar y editar
        document.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.currentTarget.dataset.id;
                if (confirm('¿Estás seguro de que deseas eliminar este libro de la historia?')) {
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
            alert('Hubo al eliminar el libro: ' + err.message);
        }
    }

    // Función unificada de filtrado (Texto y Etiqueta)
    function filterBooks() {
        const term = searchInput ? searchInput.value.toLowerCase() : '';
        const selectedTag = filterTagSelect ? filterTagSelect.value.toLowerCase() : '';

        const filtered = allBooks.filter(book => {
            const matchesText = 
                (book.title && book.title.toLowerCase().includes(term)) ||
                (book.title_translation && book.title_translation.toLowerCase().includes(term)) ||
                ((book.author || book.autor) && (book.author || book.autor).toLowerCase().includes(term));
            
            const matchesTag = selectedTag === '' || (book.tag && book.tag.toLowerCase() === selectedTag);

            return matchesText && matchesTag;
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