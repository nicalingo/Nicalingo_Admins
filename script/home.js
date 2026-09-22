import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://xrisuvdfdnpzudbaqzbv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_zgaMHL76OEA5COJD3QleYg_s799Azre';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let conversaciones = {};
let perfilesUsuarios = {};
let usuarioSeleccionadoId = null;
let currentSessionUser = null;
let currentStaffRole = 'editor';

// Elementos del DOM
const inboxList = document.getElementById('inboxUsersList');
const chatMessages = document.getElementById('chatMessages');
const activeChatUser = document.getElementById('activeChatUser');
const activeChatEmail = document.getElementById('activeChatEmail');
const activeChatId = document.getElementById('activeChatId');
const deleteChatBtn = document.getElementById('deleteChatBtn');
const replyForm = document.getElementById('replyForm');
const replyMessageInput = document.getElementById('replyMessageInput');
const searchUserInput = document.getElementById('searchUserInput');
const chatFilterSelect = document.getElementById('chatFilterSelect');
const categoryFilterSelect = document.getElementById('categoryFilterSelect');

// 1. Cargar datos
async function cargarConversaciones() {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            inboxList.innerHTML = `
                <li class="inbox-loading" style="color: var(--danger-color, #dc2626);">
                    <i class="fa-solid fa-triangle-exclamation"></i><br>
                    Debes iniciar sesión con tu cuenta de Admin/Editor.
                </li>`;
            return;
        }

        currentSessionUser = session.user;

        const { data: myProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentSessionUser.id)
            .single();

        if (myProfile?.role) {
            currentStaffRole = myProfile.role.toLowerCase();
        }

        const { data: mensajes, error } = await supabase
            .from('mensajes_soporte')
            .select('*')
            .order('created_at', { ascending: true });

        if (error) {
            console.error("Error al obtener mensajes:", error);
            inboxList.innerHTML = `<li class="inbox-loading" style="color: red;">Error: ${error.message}</li>`;
            return;
        }

        if (!mensajes || mensajes.length === 0) {
            inboxList.innerHTML = `<li class="inbox-loading">No hay mensajes recibidos aún.</li>`;
            conversaciones = {};
            return;
        }

        conversaciones = {};
        const setIds = new Set();
        mensajes.forEach(msg => {
            if (!conversaciones[msg.user_id]) {
                conversaciones[msg.user_id] = [];
            }
            conversaciones[msg.user_id].push(msg);
            setIds.add(msg.user_id);
            if (msg.admin_responder_id) {
                setIds.add(msg.admin_responder_id);
            }
        });

        const listaIds = Array.from(setIds);
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, nickname, email, role, avatar_url')
            .in('id', listaIds);

        if (profiles) {
            perfilesUsuarios = {};
            profiles.forEach(p => {
                perfilesUsuarios[p.id] = p;
            });
        }

        aplicarFiltros();

        if (usuarioSeleccionadoId && conversaciones[usuarioSeleccionadoId]) {
            mostrarConversacion(usuarioSeleccionadoId);
        } else if (usuarioSeleccionadoId && !conversaciones[usuarioSeleccionadoId]) {
            resetearVistaChat();
        }

    } catch (err) {
        console.error("Fallo inesperado:", err);
        inboxList.innerHTML = `<li class="inbox-loading" style="color: red;">Error al sincronizar.</li>`;
    }
}

// 2. Función auxiliar para obtener la categoría de una conversación
function obtenerCategoriaChat(msgs) {
    // Busca si algún mensaje del usuario trajo categoría explícita
    for (let i = msgs.length - 1; i >= 0; i--) {
        if (!msgs[i].es_respuesta_admin && msgs[i].categoria) {
            return msgs[i].categoria.toLowerCase();
        }
    }
    // Detección automática de respaldo por palabras clave si no se especificó
    const textoCompleto = msgs.map(m => m.mensaje.toLowerCase()).join(' ');
    if (textoCompleto.includes('embajador') || textoCompleto.includes('representar') || textoCompleto.includes('cargo')) return 'embajador';
    if (textoCompleto.includes('error') || textoCompleto.includes('fallo') || textoCompleto.includes('bug') || textoCompleto.includes('no funciona')) return 'error';
    if (textoCompleto.includes('sugiero') || textoCompleto.includes('sugerencia') || textoCompleto.includes('idea') || textoCompleto.includes('podrían agregar')) return 'sugerencia';
    return 'duda';
}

function formatearEtiquetaCategoria(cat) {
    switch (cat) {
        case 'error': return '<span style="background:#fee2e2; color:#991b1b; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">🐛 Error</span>';
        case 'sugerencia': return '<span style="background:#fef3c7; color:#92400e; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">💡 Sugerencia</span>';
        case 'embajador': return '<span style="background:#ede9fe; color:#5b21b6; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">🎖️ Embajador</span>';
        default: return '<span style="background:#e0f2fe; color:#075985; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:bold;">❓ Duda</span>';
    }
}

// 3. Filtros combinados (Texto + Estado + Categoría)
function aplicarFiltros() {
    const texto = searchUserInput ? searchUserInput.value.trim().toLowerCase() : '';
    const tipoEstado = chatFilterSelect ? chatFilterSelect.value : 'todos';
    const tipoCategoria = categoryFilterSelect ? categoryFilterSelect.value : 'todas';

    const userIds = Object.keys(conversaciones);
    inboxList.innerHTML = '';

    const filtrados = userIds.filter(userId => {
        const perfil = perfilesUsuarios[userId] || {};
        const nombre = (perfil.nickname || '').toLowerCase();
        const correo = (perfil.email || '').toLowerCase();
        const msgs = conversaciones[userId] || [];
        const ultimoMsg = msgs[msgs.length - 1];
        const categoriaChat = obtenerCategoriaChat(msgs);

        // Filtro por texto
        const coincideTexto = !texto || 
            userId.toLowerCase().includes(texto) || 
            nombre.includes(texto) || 
            correo.includes(texto) || 
            (ultimoMsg?.mensaje || '').toLowerCase().includes(texto);

        if (!coincideTexto) return false;

        // Filtro por estado
        if (tipoEstado === 'pendientes' && (!ultimoMsg || ultimoMsg.es_respuesta_admin !== false)) return false;
        if (tipoEstado === 'respondidos' && (!ultimoMsg || ultimoMsg.es_respuesta_admin !== true)) return false;
        if (tipoEstado === 'con_imagenes' && !msgs.some(m => !!m.imagen_url)) return false;

        // Filtro por categoría
        if (tipoCategoria !== 'todas' && categoriaChat !== tipoCategoria) return false;

        return true;
    });

    if (filtrados.length === 0) {
        inboxList.innerHTML = `<li class="inbox-loading">No hay chats que coincidan con estos filtros.</li>`;
        return;
    }

    filtrados.reverse().forEach(userId => {
        const msgs = conversaciones[userId];
        const ultimoMsg = msgs[msgs.length - 1];
        const perfil = perfilesUsuarios[userId] || {};
        const categoriaChat = obtenerCategoriaChat(msgs);

        const nombre = perfil.nickname || `Usuario ${userId.substring(0, 8)}...`;
        const email = perfil.email || 'Sin correo registrado';
        const iniciales = nombre.substring(0, 2).toUpperCase();

        const li = document.createElement('li');
        li.className = `inbox-item ${usuarioSeleccionadoId === userId ? 'active' : ''}`;
        li.innerHTML = `
            <div class="inbox-avatar">${iniciales}</div>
            <div class="inbox-item-info">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span class="inbox-name">${nombre}</span>
                    ${formatearEtiquetaCategoria(categoriaChat)}
                </div>
                <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 2px;">${email}</div>
                <div class="inbox-snippet">${ultimoMsg.es_respuesta_admin ? 'Soporte: ' : ''}${ultimoMsg.mensaje}</div>
            </div>
        `;

        li.addEventListener('click', () => {
            document.querySelectorAll('.inbox-item').forEach(el => el.classList.remove('active'));
            li.classList.add('active');
            mostrarConversacion(userId);
        });

        inboxList.appendChild(li);
    });
}

// 4. Mostrar conversación activa
function mostrarConversacion(userId) {
    usuarioSeleccionadoId = userId;
    const perfil = perfilesUsuarios[userId] || {};
    const msgs = conversaciones[userId] || [];
    const categoriaChat = obtenerCategoriaChat(msgs);

    const nombre = perfil.nickname || `Usuario ${userId.substring(0, 8)}...`;
    const email = perfil.email || 'Sin correo asociado';

    activeChatUser.innerHTML = `<i class="fa-regular fa-user"></i> ${nombre} ${formatearEtiquetaCategoria(categoriaChat)}`;
    activeChatEmail.innerHTML = `<i class="fa-regular fa-envelope"></i> ${email}`;
    activeChatId.innerHTML = `<i class="fa-solid fa-fingerprint"></i> ID: ${userId}`;
    
    replyForm.style.display = 'flex';
    deleteChatBtn.style.display = 'inline-flex';

    chatMessages.innerHTML = '';
    const esAdminObservador = (currentStaffRole === 'admin');

    msgs.forEach(msg => {
        const bubble = document.createElement('div');
        bubble.className = `chat-bubble ${msg.es_respuesta_admin ? 'bubble-admin' : 'bubble-user'}`;
        
        let htmlContent = `<div>${msg.mensaje}</div>`;
        if (msg.imagen_url) {
            htmlContent += `
                <a href="${msg.imagen_url}" target="_blank" title="Clic para ampliar captura">
                    <img src="${msg.imagen_url}" class="bubble-img" alt="Captura adjunta">
                </a>`;
        }

        if (msg.es_respuesta_admin) {
            if (msg.admin_responder_id) {
                const staff = perfilesUsuarios[msg.admin_responder_id] || {};
                const staffNombre = staff.nickname || 'Miembro del equipo';
                const staffRole = (staff.role || 'Staff').toUpperCase();
                const staffEmail = staff.email || 'Sin correo';
                const staffId = msg.admin_responder_id;

                if (esAdminObservador) {
                    htmlContent += `
                        <div class="msg-signature-card">
                            <span class="badge-role">${staffRole}</span>
                            <span class="sig-name"><i class="fa-regular fa-user"></i> ${staffNombre}</span>
                            <span class="sig-detail"><i class="fa-regular fa-envelope"></i> ${staffEmail}</span>
                            <span class="sig-detail"><i class="fa-solid fa-fingerprint"></i> ${staffId}</span>
                        </div>`;
                } else {
                    htmlContent += `
                        <div class="msg-signature-card">
                            <span class="badge-role">${staffRole}</span>
                            <span class="sig-name"><i class="fa-regular fa-user"></i> Respondido por: ${staffNombre}</span>
                        </div>`;
                }
            } else {
                htmlContent += `
                    <div class="msg-signature-card">
                        <span class="badge-bot">BOT</span>
                        <span class="sig-name"><i class="fa-solid fa-robot"></i> Sistema Automático</span>
                    </div>`;
            }
        }

        bubble.innerHTML = htmlContent;
        chatMessages.appendChild(bubble);
    });

    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function resetearVistaChat() {
    usuarioSeleccionadoId = null;
    activeChatUser.textContent = 'Selecciona una conversación';
    activeChatEmail.textContent = '';
    activeChatId.textContent = '';
    replyForm.style.display = 'none';
    deleteChatBtn.style.display = 'none';
    chatMessages.innerHTML = `
        <div class="chat-empty-state">
            <i class="fa-regular fa-comments"></i>
            <p>Selecciona un usuario a la izquierda para revisar sus dudas, ver capturas y responder.</p>
        </div>`;
}

// 5. Responder
replyForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const texto = replyMessageInput.value.trim();
    if (!texto || !usuarioSeleccionadoId || !currentSessionUser) return;

    replyMessageInput.value = '';

    const { error } = await supabase.from('mensajes_soporte').insert({
        user_id: usuarioSeleccionadoId,
        mensaje: texto,
        es_respuesta_admin: true,
        admin_responder_id: currentSessionUser.id
    });

    if (error) {
        alert('Error al responder: ' + error.message);
    } else {
        cargarConversaciones();
    }
});

// 6. Eliminar chat
deleteChatBtn.addEventListener('click', async () => {
    if (!usuarioSeleccionadoId) return;

    const perfil = perfilesUsuarios[usuarioSeleccionadoId] || {};
    const usuarioNombre = perfil.nickname || usuarioSeleccionadoId;

    if (!confirm(`¿Eliminar todos los mensajes con "${usuarioNombre}"?`)) return;

    deleteChatBtn.disabled = true;
    deleteChatBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...`;

    const { error } = await supabase
        .from('mensajes_soporte')
        .delete()
        .eq('user_id', usuarioSeleccionadoId);

    deleteChatBtn.disabled = false;
    deleteChatBtn.innerHTML = `<i class="fa-solid fa-trash-can"></i> Eliminar Chat`;

    if (error) {
        alert('Error al eliminar chat: ' + error.message);
    } else {
        delete conversaciones[usuarioSeleccionadoId];
        resetearVistaChat();
        aplicarFiltros();
    }
});

// 7. Event listeners
searchUserInput?.addEventListener('input', aplicarFiltros);
chatFilterSelect?.addEventListener('change', aplicarFiltros);
categoryFilterSelect?.addEventListener('change', aplicarFiltros);

// 8. Realtime
supabase
    .channel('public:mensajes_soporte_web')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensajes_soporte' }, () => {
        cargarConversaciones();
    })
    .subscribe();

cargarConversaciones();