import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

document.addEventListener('DOMContentLoaded', () => {
    const btnLogout = document.getElementById('btnLogout');
    const searchInput = document.getElementById('searchBook');
    const booksTable = document.getElementById('booksTable');
    const booksTableBody = document.getElementById('booksTableBody');
    const loadingMessage = document.getElementById('loadingMessage');

    let allBooks = [];

    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    async function fetchBooks() {
        try {
            loadingMessage.style.display = 'block';
            booksTable.style.display = 'none';

            const { data, error } = await supabase
                .from('library_stories')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            allBooks = data || [];
            renderBooks(allBooks);

            loadingMessage.style.display = 'none';
            booksTable.style.display = allBooks.length > 0 ? 'table' : 'none';
        } catch (err) {
            console.error('Error al cargar libros:', err);
            loadingMessage.textContent = 'Error al conectar con la base de datos.';
        }
    }

    function renderBooks(books) {
        const tableContainer = document.querySelector('.table-container');
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

        booksTableBody.innerHTML = '';

        if (books.length === 0) {
            booksTable.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        booksTable.style.display = 'table';

        books.forEach(book => {
            const tr = document.createElement('tr');

            const coverImg = book.image_asset 
                ? `<img src="${book.image_asset}" alt="Portada" style="width: 40px; height: 50px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">` 
                : '<span style="color: #999; font-size: 11px; font-style: italic;">Sin imagen</span>';

            tr.innerHTML = `
                <td>${coverImg}</td>
                <td>
                    <strong style="color: #1c3d98;">${book.title || 'Sin título'}</strong><br>
                    <span class="sub-text" style="font-size: 12px; color: #64748b; font-style: italic;">${book.title_translation || 'Sin traducción'}</span>
                </td>
                <td><span class="xp-badge" style="background: #eef2f7; color: #1c3d98; padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">${book.tag || 'none'}</span></td>
                <td style="color: #444;">${book.description ? book.description.substring(0, 60) + '...' : 'Sin descripción'}</td>
                <td>
                    <div class="action-buttons" style="display: flex; gap: 6px;">
                        <button class="btn-action btn-edit" data-id="${book.id}" title="Editar" style="background: #2563eb; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-pen"></i></button>
                        <button class="btn-action btn-delete" data-id="${book.id}" title="Eliminar" style="background: #dc2626; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </td>
            `;

            booksTableBody.appendChild(tr);
        });

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
            alert('Hubo un error al eliminar el libro: ' + err.message);
        }
    }

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allBooks.filter(book => 
                (book.title && book.title.toLowerCase().includes(term)) ||
                (book.title_translation && book.title_translation.toLowerCase().includes(term))
            );
            renderBooks(filtered);
        });
    }

    fetchBooks();
});