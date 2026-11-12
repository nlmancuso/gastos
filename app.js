import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc as firestoreSetDoc, getDoc as firestoreGetDoc, getDocs as firestoreGetDocs, onSnapshot, collection, addDoc as firestoreAddDoc, query, where, updateDoc as firestoreUpdateDoc, arrayRemove, arrayUnion, runTransaction as firestoreRunTransaction } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, sendEmailVerification, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { renderActiveView } from "./view-renderer.mjs";

let pendingDatabaseOperations = 0;
let databaseActivityTimer = null;
let databaseActivityIndicator = null;

function updateDatabaseActivityIndicator() {
    if (pendingDatabaseOperations === 0) {
        if (databaseActivityTimer) {
            clearTimeout(databaseActivityTimer);
            databaseActivityTimer = null;
        }
        databaseActivityIndicator?.remove();
        databaseActivityIndicator = null;
        return;
    }

    if (!databaseActivityIndicator && !databaseActivityTimer) {
        databaseActivityTimer = setTimeout(() => {
            databaseActivityTimer = null;
            if (pendingDatabaseOperations === 0) return;
            databaseActivityIndicator = document.createElement('div');
            databaseActivityIndicator.id = 'databaseActivityIndicator';
            databaseActivityIndicator.className = 'fixed top-3 right-3 z-[100] flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900/95 px-3 py-2 text-xs font-semibold text-slate-200 shadow-xl';
            databaseActivityIndicator.setAttribute('role', 'status');
            databaseActivityIndicator.setAttribute('aria-live', 'polite');
            databaseActivityIndicator.innerHTML = '<span class="h-4 w-4 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"></span><span>Consultando o guardando...</span>';
            document.body.appendChild(databaseActivityIndicator);
        }, 150);
    }
}

async function trackDatabaseOperation(operation) {
    pendingDatabaseOperations += 1;
    updateDatabaseActivityIndicator();
    try {
        return await operation();
    } finally {
        pendingDatabaseOperations -= 1;
        updateDatabaseActivityIndicator();
    }
}

const setDoc = (...args) => trackDatabaseOperation(() => firestoreSetDoc(...args));
const getDoc = (...args) => trackDatabaseOperation(() => firestoreGetDoc(...args));
const getDocs = (...args) => trackDatabaseOperation(() => firestoreGetDocs(...args));
const addDoc = (...args) => trackDatabaseOperation(() => firestoreAddDoc(...args));
const updateDoc = (...args) => trackDatabaseOperation(() => firestoreUpdateDoc(...args));
const runTransaction = (...args) => trackDatabaseOperation(() => firestoreRunTransaction(...args));

const firebaseConfig = {
    apiKey: "AIzaSyDwRTcVpwoHJfTZ-eUr5ileTks5LN-npOE",
    authDomain: "gastos-334ff.firebaseapp.com",
    projectId: "gastos-334ff",
    storageBucket: "gastos-334ff.firebasestorage.app",
    messagingSenderId: "140017165186",
    appId: "1:140017165186:web:2b6d7d57896696bef3a59b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

window.db = db;
window.auth = auth;
window.renderActiveView = renderActiveView;

let unsubscribeSnapshot = null;
let unsubscribeHormiga = null;
let unsubscribeInvitacionesRecibidas = null;
let unsubscribeInvitacionesEnviadas = null;
let unsubscribeNotificacionesOcultas = null;
let invitacionesUsuario = [];
let invitacionesOcultas = new Set();
let invitacionesSeleccionadas = new Set();
let emailUsuarioInvitaciones = '';
let perfilUsuario = { nombre: '', apellido: '' };
let flujoVerificacionEnCurso = false;

function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}
window.escapeHtml = escapeHtml;

function parseInvitationDate(value) {
    const date = value ? new Date(value) : null;
    return date && !Number.isNaN(date.getTime()) ? date : null;
}

// Helpers globales para Modales Estéticos
window.mostrarNotificacion = function(titulo, mensaje, tipo = 'info', callback = null) {
    const modal = document.getElementById('modalNotificacion');
    const elTitulo = document.getElementById('modalNotiTitulo');
    const elMensaje = document.getElementById('modalNotiMensaje');
    const elIcono = document.getElementById('modalNotiIcono');
    const elBoton = document.getElementById('modalNotiBoton');

    if (!modal) {
        if (callback) callback();
        return;
    }

    elTitulo.innerText = titulo;
    elMensaje.innerText = mensaje;
    window._notificaciónCallback = callback;

    if (tipo === 'exito') {
        elIcono.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
        elIcono.innerHTML = '<i class="fa-solid fa-circle-check"></i>';
        elBoton.className = 'w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-lg shadow-emerald-500/10';
    } else if (tipo === 'error') {
        elIcono.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl bg-rose-500/10 text-rose-400 border border-rose-500/20';
        elIcono.innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
        elBoton.className = 'w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-rose-500 hover:bg-rose-400 text-white transition-colors shadow-lg shadow-rose-500/10';
    } else {
        elIcono.className = 'w-12 h-12 rounded-full flex items-center justify-center mx-auto text-xl bg-amber-500/10 text-amber-400 border border-amber-500/20';
        elIcono.innerHTML = '<i class="fa-solid fa-circle-info"></i>';
        elBoton.className = 'w-full py-2.5 px-4 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-lg shadow-amber-500/10';
    }

    modal.classList.remove('hidden');
};

window.cerrarModalNotificacion = function() {
    const modal = document.getElementById('modalNotificacion');
    if (modal) modal.classList.add('hidden');
    if (typeof window._notificaciónCallback === 'function') {
        const cb = window._notificaciónCallback;
        window._notificaciónCallback = null;
        cb();
    }
};

window.mostrarMensajeApp = function(titulo, mensaje, tipo = 'info') {
    if (typeof window.mostrarNotificacion === 'function') {
        window.mostrarNotificacion(titulo, mensaje, tipo);
    } else if (typeof window.mostrarModalAlert === 'function') {
        window.mostrarModalAlert(titulo, mensaje);
    } else if (typeof window.showToast === 'function') {
        window.showToast(mensaje, 'warning');
    }
};

// ==========================================
// CONTROL DE PERMISOS Y ROLES (LECTOR / EDITOR)
// ==========================================

window.esUsuarioEditor = function() {
    const user = auth.currentUser;
    if (!user) return false;

    if (!window.currentGrupo || window.currentGrupo === `personal_${user.uid}`) {
        return true;
    }

    const grupoInfo = window.appState?.grupoInfo;
    if (!grupoInfo) return false;
    if (grupoInfo.adminUid === user.uid) return true;

    const miembros = grupoInfo.miembros || {};
    const rolMiembro = miembros[user.uid]?.rol;
    return rolMiembro === 'admin' || rolMiembro === 'editor';
};

// ==========================================
// APLICACIÓN DE ESTILOS Y RESTRICCIONES VISUALES
// ==========================================

function aplicarRestriccionesInterfaz() {
    const esEditor = window.esUsuarioEditor();

    let styleTag = document.getElementById('estilos-modo-lector');
    if (!styleTag) {
        styleTag = document.createElement('style');
        styleTag.id = 'estilos-modo-lector';
        document.head.appendChild(styleTag);
    }

    if (!esEditor) {
        styleTag.innerHTML = `
            /* Ocultar botones de editar, eliminar, crear en la app principal (excluyendo login) */
            #appContent button[onclick*="edit"], 
            #appContent button[onclick*="delete"], 
            #appContent button[onclick*="openModal"],
            #appContent button[onclick*="NuevaCuenta"],
            #appContent button[onclick*="Gasto"],
            #appContent .btn-editar, #appContent .btn-eliminar, #appContent .btn-nuevo,
            #appContent button i.fa-pen, #appContent button i.fa-trash-can, #appContent button i.fa-trash {
                display: none !important;
            }
            /* Deshabilitar selects (excepto selector de vistas), inputs, textareas y BLOQUEAR ORDENAMIENTO Y ARRASTRE DE FILAS */
            #appContent select:not(#selectorVista):not(#tipoGastoUnificado),
            #appContent input, 
            #appContent textarea, 
            #appContent [onclick*="sort"], 
            #appContent [onclick*="ordenar"], 
            #appContent th.cursor-pointer,
            #appContent th[onclick],
            #appContent thead th,
            #appContent input[type="date"], 
            #appContent .fecha-vencimiento,
            #appContent [draggable],
            #appContent .drag-handle,
            #appContent .handle,
            #appContent tr[draggable],
            #appContent td:has(i.fa-grip-vertical),
            #appContent i.fa-grip-vertical {
                pointer-events: none !important;
                opacity: 0.9;
                cursor: default !important;
            }
        `;
    } else {
        styleTag.innerHTML = '';
    }

    const appContent = document.getElementById('appContent');
    if (appContent) {
        const botones = appContent.querySelectorAll('button');
        botones.forEach(btn => {
            const txt = btn.textContent.toLowerCase();
            if (txt.includes('nuevo gasto') || txt.includes('nueva cuenta') || txt.includes('agregar')) {
                btn.style.display = esEditor ? 'flex' : 'none';
            }
        });
    }
}

const originalRenderApp = window.renderApp || function(){};
window.renderApp = function() {
    if (typeof originalRenderApp === 'function') {
        originalRenderApp();
    }
    setTimeout(aplicarRestriccionesInterfaz, 100);
};

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(aplicarRestriccionesInterfaz, 500);
});

const observer = new MutationObserver(() => {
    if (!window.esUsuarioEditor()) {
        aplicarRestriccionesInterfaz();
    }
});
observer.observe(document.body, { childList: true, subtree: true });

// ==========================================
// INTERCEPTAR FUNCIONES DE ESCRITURA
// ==========================================

const verificarEscritura = () => {
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso Restringido", "Modo Lector: No tienes permisos para realizar modificaciones en este grupo.", "error");
        return false;
    }
    return true;
};

if (typeof window.saveCuenta === 'function') {
    const orig = window.saveCuenta;
    window.saveCuenta = function(...args) { if (!verificarEscritura()) return; return orig.apply(this, args); };
}
if (typeof window.deleteCuenta === 'function') {
    const orig = window.deleteCuenta;
    window.deleteCuenta = function(...args) { if (!verificarEscritura()) return; return orig.apply(this, args); };
}
if (typeof window.saveGasto === 'function') {
    const orig = window.saveGasto;
    window.saveGasto = function(...args) { if (!verificarEscritura()) return; return orig.apply(this, args); };
}
if (typeof window.deleteGasto === 'function') {
    const orig = window.deleteGasto;
    window.deleteGasto = function(...args) { if (!verificarEscritura()) return; return orig.apply(this, args); };
}

// ==========================================
// PERSISTENCIA DE CAMBIO DE ROL DIRECTA CON SPINNER
// ==========================================

window.cambiarRolMiembro = async function(uidMiembro, nuevoRol) {
    let loaderDiv = document.getElementById('loader-cambio-rol');
    if (!loaderDiv) {
        loaderDiv = document.createElement('div');
        loaderDiv.id = 'loader-cambio-rol';
        loaderDiv.style.cssText = "position:fixed; top:20px; right:20px; background:#1e293b; color:#fff; padding:12px 20px; border-radius:8px; z-index:99999; box-shadow:0 4px 12px rgba(0,0,0,0.3); display:flex; align-items:center; gap:10px; font-family:sans-serif; font-size:14px;";
        loaderDiv.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="color:#38bdf8; font-size:16px;"></i> Guardando cambios...`;
        document.body.appendChild(loaderDiv);
    } else {
        loaderDiv.style.display = 'flex';
    }

    try {
        const user = auth.currentUser;
        if (!user) {
            if (loaderDiv) loaderDiv.style.display = 'none';
            return;
        }

        if (!['editor', 'lector'].includes(nuevoRol) || !window.currentGrupo) {
            throw new Error("El rol o el grupo seleccionado no es válido.");
        }

        if (window.appState?.grupoInfo?.adminUid !== user.uid) {
            throw new Error("Solo el administrador del grupo puede cambiar roles.");
        }

        await updateDoc(doc(db, "app_data", window.currentGrupo), {
            [`appState.grupoInfo.miembros.${uidMiembro}.rol`]: nuevoRol
        });
        if (window.appState?.grupoInfo?.miembros?.[uidMiembro]) {
            window.appState.grupoInfo.miembros[uidMiembro].rol = nuevoRol;
        }
        window.mostrarNotificacion("¡Éxito!", `Rol actualizado a ${nuevoRol.toUpperCase()} correctamente.`, "exito");
        window.renderMiembrosGrupoSettings?.();
    } catch (error) {
        console.error("Error al actualizar el rol en Firebase:", error);
        window.mostrarNotificacion("Error", "Hubo un problema al guardar el cambio de rol en la base de datos.", "error");
    } finally {
        if (loaderDiv) {
            loaderDiv.style.display = 'none';
        }
    }
};

const categoriasDefault = [
    { nombre: "Gastos Fijo", color: "#10b981", esTarjeta: false, vencimientoUnicoEnBloque: false },
    { nombre: "Servicios", color: "#f97316", esTarjeta: false, vencimientoUnicoEnBloque: false },
    { nombre: "Santander Visa", color: "#ef4444", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Ciudad Visa", color: "#3b82f6", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Mercado Pago", color: "#f59e0b", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Santander Amex", color: "#f97316", esTarjeta: true, vencimientoUnicoEnBloque: true }
];

const subcategoriasDefault = [
    { id: "sub_alquiler", nombre: "Alquiler / Expensas", porcentajeAumento: 0 },
    { id: "sub_servicios_basicos", nombre: "Servicios Básicos (Luz/Gas/Agua)", porcentajeAumento: 0 },
    { id: "sub_conectividad", nombre: "Internet / Cable / Telefonía", porcentajeAumento: 0 },
    { id: "sub_suscripciones", nombre: "Streaming y Suscripciones", porcentajeAumento: 0 }
];

const categoriasHormigaDefault = [
    { nombre: "Kiosco", color: "#f59e0b" },
    { nombre: "Panadería", color: "#d97706" },
    { nombre: "Ferretería", color: "#78716c" },
    { nombre: "Cafetería", color: "#b45309" },
    { nombre: "Supermercado Rápido", color: "#10b981" },
    { nombre: "Transporte / Peaje", color: "#3b82f6" },
    { nombre: "Propinas", color: "#ec4899" },
    { nombre: "Varios", color: "#64748b" }
];

function crearEstadoHormigaInicial() {
    return {
        gastos: [],
        categorias: JSON.parse(JSON.stringify(categoriasHormigaDefault)),
        sortColumn: 'fecha',
        sortAscending: false,
        filtrosCategorias: [],
        filtrosHormigaCatGrafico: []
    };
}

const dInit = new Date();
const defaultLocalMonth = `${dInit.getFullYear()}-${String(dInit.getMonth() + 1).padStart(2, '0')}`;

const appStateLimpioBase = {
    currentMonth: defaultLocalMonth,
    gastos: [],
    gastosMensuales: [],
    excepcionesMonto: {},
    excepcionesCategoria: {},
    excepcionesVencimiento: {},
    excepcionesVencimientoGrid: {},
    excepcionesEstado: {},
    excepcionesEliminacion: {},
    excepcionesEliminacionSoloMes: {},
    aumentosIndividuales: {},
    subcategorias: JSON.parse(JSON.stringify(subcategoriasDefault)),
    sueldos: {},
    cuentasBancarias: [],
    categorias: JSON.parse(JSON.stringify(categoriasDefault)),
    recurrentesPreferidos: [],
    sortColumn: 'concepto',
    sortAscending: true,
    grupoInfo: null
};

function crearEstadoPersonal(user) {
    const estado = JSON.parse(JSON.stringify(appStateLimpioBase));
    estado.grupoInfo = {
        adminUid: user.uid,
        miembros: {
            [user.uid]: { email: user.email || '', rol: 'admin' }
        },
        invitacionesPendientes: []
    };
    return estado;
}

if (auth.currentUser) {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.add('hidden');
}

window.appState = window.appState || JSON.parse(JSON.stringify(appStateLimpioBase));
window.hormigaState = window.hormigaState || crearEstadoHormigaInicial();

window.filtrosTemporales = [];
window.categoriasAbiertasMap = {};
window.filtrosGraficoTotales = [];
window.filtrosGraficoEvolCat = [];
window.filtrosGraficoBalance = [];
window.filtrosRecurrentesGrid = [];

const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

window.showLoading = function() {
    const login = document.getElementById('loginOverlay');
    const loading = document.getElementById('loadingOverlay');
    const appContent = document.getElementById('appContent');
    if (login) login.classList.add('hidden');
    if (loading) loading.classList.remove('hidden');
    if (appContent) appContent.classList.add('hidden');
};

window.showLogin = function() {
    const login = document.getElementById('loginOverlay');
    const loading = document.getElementById('loadingOverlay');
    const appContent = document.getElementById('appContent');
    if (login) login.classList.remove('hidden');
    if (loading) loading.classList.add('hidden');
    if (appContent) appContent.classList.add('hidden');
    window.actualizarVisibilidadDemoLocal?.();
};

window.showApp = function() {
    const login = document.getElementById('loginOverlay');
    const loading = document.getElementById('loadingOverlay');
    const appContent = document.getElementById('appContent');
    if (login) login.classList.add('hidden');
    if (loading) loading.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');
    window.actualizarVisibilidadDemoLocal?.();
};

window.poblarSelectorVistas = async function(vistaSeleccionadaActual) {
    const selector = document.getElementById('selectorVista');
    if (!selector) return;

    const user = auth.currentUser;
    if (!user) return;

    const valorGuardadoPrevio = vistaSeleccionadaActual || localStorage.getItem("ultima_vista_id") || "personal";
    
    if (selector.options.length === 0) {
        const optDefault = document.createElement('option');
        optDefault.value = "personal";
        optDefault.textContent = "🏠 Mi Espacio Personal";
        selector.appendChild(optDefault);
        selector.value = "personal";
    }

    try {
        const qInvitacionesRecibidas = query(
            collection(db, "invitaciones"),
            where("destinatarioEmail", "==", user.email)
        );
        const snapInvitaciones = await getDocs(qInvitacionesRecibidas);
        const gruposPermitidos = new Map();
        snapInvitaciones.forEach(invitation => {
            const data = invitation.data();
            if (data.estado === "ACEPTADO" && typeof data.grupoId === "string") {
                gruposPermitidos.set(data.grupoId, data.remitenteEmail || '');
            }
        });

        selector.innerHTML = '';

        const optPersonal = document.createElement('option');
        optPersonal.value = "personal";
        optPersonal.textContent = "🏠 Mi Espacio Personal";
        selector.appendChild(optPersonal);

        for (const [grupoId, remitenteEmail] of gruposPermitidos) {
            const grupoRef = doc(db, "app_data", grupoId);
            let grupoSnap;
            try {
                grupoSnap = await getDoc(grupoRef);
            } catch (error) {
                if (error.code === 'permission-denied' || error.code === 'not-found') continue;
                throw error;
            }

            if (!grupoSnap.exists()) continue;
            const docData = grupoSnap.data();
            const grupoInfo = docData.appState?.grupoInfo;
            if (!grupoInfo?.miembros?.[user.uid]) continue;

            const hostEmail = grupoInfo.miembros[grupoInfo.adminUid]?.email || remitenteEmail;
            const usuarioTag = hostEmail ? ` (${hostEmail.split('@')[0]})` : '';
            const optGrupo = document.createElement('option');
            optGrupo.value = grupoId;
            optGrupo.textContent = `👥 ${grupoInfo.nombreGrupo || 'Grupo Control de Gastos'}${usuarioTag}`;
            selector.appendChild(optGrupo);
        }

        const existeOpcion = Array.from(selector.options).some(opt => opt.value === valorGuardadoPrevio);
        selector.value = existeOpcion ? valorGuardadoPrevio : "personal";

    } catch (e) {
        console.error("Error al poblar los grupos en el selector:", e);
        window.mostrarNotificacion("No se pudieron cargar tus grupos", "Revisá tu conexión e intentá nuevamente.", "error");
        selector.value = "personal";
    }
};

window.mostrarTabAuth = function(tab) {
    const formLogin = document.getElementById('formLogin');
    const formRegister = document.getElementById('formRegister');
    const btnLogin = document.getElementById('btnTabLogin');
    const btnRegister = document.getElementById('btnTabRegister');
    const loginError = document.getElementById('loginError');

    if (loginError) loginError.classList.add('hidden');

    if (tab === 'login') {
        formLogin.classList.remove('hidden');
        formRegister.classList.add('hidden');
        btnLogin.className = "flex-1 pb-3 text-sm font-bold text-amber-500 border-b-2 border-amber-500";
        btnRegister.className = "flex-1 pb-3 text-sm font-bold text-slate-400 hover:text-slate-200";
    } else {
        formLogin.classList.add('hidden');
        formRegister.classList.remove('hidden');
        btnRegister.className = "flex-1 pb-3 text-sm font-bold text-emerald-400 border-b-2 border-emerald-400";
        btnLogin.className = "flex-1 pb-3 text-sm font-bold text-slate-400 hover:text-slate-200";
    }
};

window.handleLogin = async function(e) {
    if (e) e.preventDefault();
    const emailEl = document.getElementById('loginEmail');
    const passEl = document.getElementById('loginPassword');
    const loginError = document.getElementById('loginError');

    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim();
    const pass = passEl.value;

    if (loginError) loginError.classList.add('hidden');
    window.showLoading();

    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
        console.error("Error al iniciar sesión:", error);
        window.showLogin();
        if (loginError) {
            loginError.innerText = "Correo o contraseña incorrectos.";
            loginError.classList.remove('hidden');
        }
    }
};

window.handleRegister = async function(e) {
    if (e) e.preventDefault();
    const nombreEl = document.getElementById('registerNombre');
    const apellidoEl = document.getElementById('registerApellido');
    const emailEl = document.getElementById('registerEmail');
    const passEl = document.getElementById('registerPassword');
    const confirmacionEl = document.getElementById('registerPasswordConfirmacion');
    const loginError = document.getElementById('loginError');

    if (!nombreEl || !apellidoEl || !emailEl || !passEl || !confirmacionEl) return;
    const nombre = nombreEl.value.trim();
    const apellido = apellidoEl.value.trim();
    const email = emailEl.value.trim().toLowerCase();
    const pass = passEl.value;
    const confirmacion = confirmacionEl.value;

    if (loginError) loginError.classList.add('hidden');
    if (!nombre || !apellido) {
        if (loginError) {
            loginError.innerText = "Ingresá tu nombre y apellido.";
            loginError.classList.remove('hidden');
        }
        return;
    }
    if (pass !== confirmacion) {
        if (loginError) {
            loginError.innerText = "Las contraseñas no coinciden. Revisalas e intentá nuevamente.";
            loginError.classList.remove('hidden');
        }
        confirmacionEl.focus();
        return;
    }

    window.showLoading();

    let cuentaCreada = false;
    let perfilGuardado = false;
    let verificacionEnviada = false;
    try {
        flujoVerificacionEnCurso = true;
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;
        cuentaCreada = true;

        try {
            await setDoc(doc(db, "notificaciones_usuario", user.uid), {
                perfil: { nombre, apellido }
            }, { merge: true });
            perfilGuardado = true;
        } catch (error) {
            console.error("No se pudo guardar el perfil durante el registro:", error);
        }

        await sendEmailVerification(user, {
            url: 'https://nlmancuso.github.io/gastos/'
        });
        verificacionEnviada = true;
        await signOut(auth);
        window.showLogin();
        window.mostrarNotificacion(
            perfilGuardado ? "Revisá tu correo" : "Cuenta creada con un detalle",
            perfilGuardado
                ? "Te enviamos un enlace de verificación de Firebase. Confirmá tu correo y después iniciá sesión para crear tu espacio personal."
                : "Te enviamos el enlace de verificación, pero no pudimos guardar tu nombre y apellido. Después de verificar tu correo, iniciá sesión y completalos en Ajustes → Perfil.",
            perfilGuardado ? "info" : "error"
        );
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        if (auth.currentUser) await signOut(auth);
        window.showLogin();
        window.mostrarTabAuth('register');
        if (loginError) {
            let msg = "No se pudo crear la cuenta.";
            if (cuentaCreada) {
                msg = verificacionEnviada
                    ? "La cuenta se creó y el correo de verificación se envió, pero no se pudo cerrar la sesión. Volvé a iniciar sesión."
                    : "La cuenta se creó, pero no se pudo enviar el correo de verificación. Ingresá tu correo y contraseña y usá la opción para reenviar el mensaje.";
                if (!perfilGuardado) {
                    msg += " También vas a tener que completar tu nombre y apellido en Ajustes → Perfil.";
                }
            } else if (error.code === 'auth/email-already-in-use') {
                msg = "El correo ya se encuentra registrado.";
            } else if (error.code === 'auth/weak-password') {
                msg = "La contraseña debe tener al menos 6 caracteres.";
            }
            loginError.innerText = msg;
            loginError.classList.remove('hidden');
        }
    } finally {
        flujoVerificacionEnCurso = false;
    }
};

window.reenviarVerificacion = async function() {
    const email = document.getElementById('loginEmail')?.value.trim();
    const password = document.getElementById('loginPassword')?.value;
    const loginError = document.getElementById('loginError');

    if (!email || !password) {
        if (loginError) {
            loginError.innerText = "Ingresá tu correo y contraseña para reenviar la verificación.";
            loginError.classList.remove('hidden');
        }
        return;
    }

    try {
        flujoVerificacionEnCurso = true;
        const credential = await signInWithEmailAndPassword(auth, email, password);
        if (credential.user.emailVerified) {
            await signOut(auth);
            window.mostrarNotificacion("Correo ya verificado", "Ya podés iniciar sesión normalmente.", "info");
            return;
        }
        await sendEmailVerification(credential.user, {
            url: 'https://nlmancuso.github.io/gastos/'
        });
        await signOut(auth);
        window.mostrarNotificacion("Correo enviado", "Te enviamos un nuevo enlace de verificación. Revisá también la carpeta de correo no deseado.", "exito");
    } catch (error) {
        console.error("Error al reenviar la verificación:", error);
        if (auth.currentUser) await signOut(auth);
        if (loginError) {
            const mensajesPorError = {
                'auth/invalid-credential': "El correo o la contraseña no son correctos. Verificá los datos e intentá nuevamente.",
                'auth/wrong-password': "La contraseña no es correcta. Revisala e intentá nuevamente.",
                'auth/user-not-found': "No encontramos una cuenta con ese correo.",
                'auth/user-disabled': "Esta cuenta está deshabilitada. Contactá al administrador.",
                'auth/too-many-requests': "Hubo demasiados intentos. Esperá un rato antes de volver a probar.",
                'auth/network-request-failed': "No se pudo conectar con Firebase. Revisá tu conexión e intentá nuevamente.",
                'auth/operation-not-allowed': "El acceso con correo y contraseña no está habilitado en Firebase.",
                'auth/unauthorized-continue-uri': "Firebase no autorizó el enlace de retorno. Revisá los dominios autorizados de Authentication.",
                'auth/invalid-continue-uri': "El enlace de retorno no es válido. Revisá la configuración de Authentication."
            };
            loginError.innerText = mensajesPorError[error.code]
                || "Firebase no pudo reenviar el correo. Esperá un momento y volvé a intentar.";
            loginError.classList.remove('hidden');
        }
    } finally {
        flujoVerificacionEnCurso = false;
    }
};

window.cerrarSesion = function() {
    window.showLogin();
    signOut(auth);
};

window.cambiarVistaSeleccionada = async function(vistaId) {
    if (!vistaId || window.demoModeActive) return;
    
    localStorage.setItem("ultima_vista_id", vistaId);
    window.showLoading();

    let targetDocId = (vistaId === "personal") ? `personal_${auth.currentUser.uid}` : vistaId;

    window.currentGrupo = targetDocId;
    window.docRef = doc(db, "app_data", targetDocId);
    const claveMesLocal = `currentMonth_${targetDocId}`;

    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = onSnapshot(window.docRef, async (docSnap) => {
        if (window.demoModeActive) return;
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.appState) {
                const mesGuardadoLocal = localStorage.getItem(claveMesLocal);
                window.appState = {
                    ...window.appState,
                    ...data.appState,
                    currentMonth: mesGuardadoLocal || data.appState.currentMonth || defaultLocalMonth
                };
                localStorage.setItem(claveMesLocal, window.appState.currentMonth);
            }
        } else {
            if (targetDocId.startsWith("personal_")) {
                window.appState = crearEstadoPersonal(auth.currentUser);
                try {
                    await setDoc(window.docRef, {
                        appState: window.appState,
                        creadoEl: new Date().toISOString()
                    });
                } catch (error) {
                    console.error("Error al crear el espacio personal:", error);
                    window.mostrarNotificacion("No se pudo crear tu espacio", "Revisá que tu correo esté verificado e intentá nuevamente.", "error");
                }
            } else {
                window.mostrarNotificacion("Grupo no disponible", "Ya no tenés acceso a este grupo. Volvé a tu espacio personal.", "error", () => {
                    window.cambiarVistaSeleccionada("personal");
                });
                return;
            }
        }
        triggerPageRenders();
        window.showApp();
    }, (error) => {
        console.error("Error al escuchar los datos del grupo:", error);
        if (error.code === 'permission-denied' && targetDocId !== `personal_${auth.currentUser?.uid}`) {
            window.mostrarNotificacion("Acceso al grupo finalizado", "Volverás a tu espacio personal.", "info", () => {
                window.cambiarVistaSeleccionada("personal");
            });
        } else {
            window.mostrarNotificacion("No se pudieron cargar los datos", "Revisá tu conexión e intentá nuevamente.", "error");
        }
    });
};

onAuthStateChanged(auth, async (user) => {
    window.actualizarVisibilidadDemoLocal?.();
    if (user) {
        if (flujoVerificacionEnCurso) return;
        window.showLoading();

        try {
            await user.reload();
            await user.getIdToken(true);
        } catch (error) {
            console.error("No se pudo actualizar el estado de autenticación:", error);
            await signOut(auth);
            window.showLogin();
            window.mostrarNotificacion("No se pudo validar la sesión", "Revisá tu conexión e intentá iniciar sesión nuevamente.", "error");
            return;
        }

        if (!user.emailVerified) {
            await signOut(auth);
            window.showLogin();
            window.mostrarNotificacion(
                "Correo pendiente de verificación",
                "Verificá tu correo con el enlace de Firebase. Si no lo encontrás, ingresá tu correo y contraseña y usá la opción para reenviar el mensaje.",
                "info"
            );
            return;
        }

        const dLocal = new Date();
        const currentLocalMonthStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}`;
        
        let vistaGuardada = localStorage.getItem("ultima_vista_id") || "personal";
        await window.poblarSelectorVistas(vistaGuardada);
        vistaGuardada = document.getElementById('selectorVista')?.value || "personal";

        let targetDocId = (vistaGuardada === "personal") ? `personal_${user.uid}` : vistaGuardada;
        const docRef = doc(db, "app_data", targetDocId);
        window.docRef = docRef;
        window.currentGrupo = targetDocId;
        window.docHormigaRef = doc(db, "app_data_hormiga", user.uid);
        window.hormigaState = crearEstadoHormigaInicial();

        if (unsubscribeSnapshot) unsubscribeSnapshot();
        if (unsubscribeHormiga) unsubscribeHormiga();

        unsubscribeSnapshot = onSnapshot(docRef, async (docSnap) => {
            if (window.demoModeActive) return;
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.appState) {
                    const claveMesLocal = `currentMonth_${targetDocId}`;
                    const mesGuardadoLocal = localStorage.getItem(claveMesLocal);
                    window.appState = {
                        ...window.appState,
                        ...data.appState,
                        currentMonth: mesGuardadoLocal || data.appState.currentMonth || currentLocalMonthStr
                    };
                    localStorage.setItem(claveMesLocal, window.appState.currentMonth);
                    if (!window.appState.subcategorias) window.appState.subcategorias = JSON.parse(JSON.stringify(subcategoriasDefault));
                    if (!window.appState.aumentosIndividuales) window.appState.aumentosIndividuales = {};
                    if (!window.appState.excepcionesEliminacionSoloMes) window.appState.excepcionesEliminacionSoloMes = {};
                    if (!Array.isArray(window.appState.gastosMensuales)) window.appState.gastosMensuales = [];
                    if (!window.appState.currentMonth) window.appState.currentMonth = currentLocalMonthStr;
                }
            } else {
                if (targetDocId.startsWith("personal_")) {
                    window.appState = crearEstadoPersonal(user);
                    try {
                        await setDoc(docRef, {
                            appState: window.appState,
                            creadoEl: new Date().toISOString()
                        });
                    } catch (error) {
                        console.error("Error al crear el espacio personal:", error);
                        window.mostrarNotificacion("No se pudo crear tu espacio", "Revisá que tu correo esté verificado e intentá nuevamente.", "error");
                    }
                } else {
                    window.mostrarNotificacion("Grupo no disponible", "Ya no tenés acceso a este grupo. Volvé a tu espacio personal.", "error", () => {
                        window.cambiarVistaSeleccionada("personal");
                    });
                    return;
                }
            }
            triggerPageRenders();
            window.showApp();
        }, (error) => {
            console.error("Error al escuchar los datos del grupo:", error);
            if (error.code === 'permission-denied' && targetDocId !== `personal_${user.uid}`) {
                window.mostrarNotificacion("Acceso al grupo finalizado", "Volverás a tu espacio personal.", "info", () => {
                    window.cambiarVistaSeleccionada("personal");
                });
            } else {
                window.mostrarNotificacion("No se pudieron cargar los datos", "Revisá tu conexión e intentá nuevamente.", "error");
            }
        });

        unsubscribeHormiga = onSnapshot(window.docHormigaRef, async (docSnap) => {
            if (window.demoModeActive) return;
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.hormigaState) {
                    window.hormigaState = { ...crearEstadoHormigaInicial(), ...data.hormigaState };
                } else {
                    window.hormigaState = crearEstadoHormigaInicial();
                }
            } else {
                window.hormigaState = crearEstadoHormigaInicial();
                try {
                    await window.saveHormigaDataToCloud();
                } catch (error) {
                    console.error("Error inicializando los gastos hormiga:", error);
                    window.mostrarNotificacion("No se pudieron inicializar los gastos hormiga", "Revisá tu conexión e intentá nuevamente.", "error");
                }
            }
            triggerPageRenders();
        }, (error) => {
            console.error("Error al escuchar los gastos hormiga:", error);
            window.mostrarNotificacion("No se pudieron cargar tus gastos Hormiga", "Verificá que hayas iniciado sesión con el correo correcto y volvé a intentar.", "error");
        });

        escucharInvitacionesUsuario(user.email);
        escucharNotificacionesOcultas(user.uid);

        const userName = user.email ? user.email.split('@')[0] : 'Usuario';
        const grupoDisplay = document.getElementById('grupoStatus');
        if (grupoDisplay) grupoDisplay.innerHTML = `👤 ${userName}`;
        window.actualizarVisibilidadDemoLocal?.();
    } else {
        window.showLogin();
        window.actualizarVisibilidadDemoLocal?.();
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        if (unsubscribeHormiga) { unsubscribeHormiga(); unsubscribeHormiga = null; }
        if (unsubscribeInvitacionesRecibidas) { unsubscribeInvitacionesRecibidas(); unsubscribeInvitacionesRecibidas = null; }
        if (unsubscribeInvitacionesEnviadas) { unsubscribeInvitacionesEnviadas(); unsubscribeInvitacionesEnviadas = null; }
        if (unsubscribeNotificacionesOcultas) { unsubscribeNotificacionesOcultas(); unsubscribeNotificacionesOcultas = null; }
        window.docHormigaRef = null;
        window.hormigaState = crearEstadoHormigaInicial();
        invitacionesUsuario = [];
        invitacionesOcultas = new Set();
        invitacionesSeleccionadas = new Set();
        emailUsuarioInvitaciones = '';
        perfilUsuario = { nombre: '', apellido: '' };
        window.renderPerfil();
        window.renderBandejaNotificaciones([]);
        window.renderHistorialNotificaciones();
    }
});

function escucharNotificacionesOcultas(uid) {
    if (unsubscribeNotificacionesOcultas) unsubscribeNotificacionesOcultas();
    invitacionesOcultas = new Set();
    invitacionesSeleccionadas = new Set();

    const preferenciasRef = doc(db, "notificaciones_usuario", uid);
    unsubscribeNotificacionesOcultas = onSnapshot(preferenciasRef, (snapshot) => {
        const preferencias = snapshot.exists() ? snapshot.data() : {};
        const idsOcultos = preferencias.invitacionesOcultas;
        invitacionesOcultas = new Set(Array.isArray(idsOcultos) ? idsOcultos : []);
        const perfilGuardado = preferencias.perfil;
        perfilUsuario = {
            nombre: typeof perfilGuardado?.nombre === 'string' ? perfilGuardado.nombre : '',
            apellido: typeof perfilGuardado?.apellido === 'string' ? perfilGuardado.apellido : ''
        };
        invitacionesSeleccionadas = new Set(
            [...invitacionesSeleccionadas].filter(id =>
                !invitacionesOcultas.has(id) && invitacionesUsuario.some(inv => inv.id === id)
            )
        );
        window.renderPerfil();
        window.renderHistorialNotificaciones();
    }, (error) => {
        console.error("Error al cargar las notificaciones ocultas:", error);
        window.mostrarNotificacion("No se pudieron cargar tus preferencias", "Revisá tu conexión e intentá nuevamente.", "error");
    });
}

window.renderPerfil = function() {
    const user = auth.currentUser;
    const nombre = document.getElementById('perfilNombre');
    const apellido = document.getElementById('perfilApellido');
    const email = document.getElementById('perfilEmail');
    if (nombre) nombre.value = perfilUsuario.nombre;
    if (apellido) apellido.value = perfilUsuario.apellido;
    if (email) email.value = user?.email || '';
};

window.guardarPerfil = async function(event) {
    event.preventDefault();
    if (window.demoModeActive) return;
    const user = auth.currentUser;
    const nombre = document.getElementById('perfilNombre')?.value.trim();
    const apellido = document.getElementById('perfilApellido')?.value.trim();

    if (!user) {
        window.mostrarNotificacion("No se pudo guardar el perfil", "Iniciá sesión nuevamente e intentá otra vez.", "error");
        return;
    }
    if (!nombre || !apellido) {
        window.mostrarNotificacion("Faltan datos", "Completá nombre y apellido para guardar el perfil.", "error");
        return;
    }

    const boton = document.querySelector('#formPerfil button[type="submit"]');
    const textoOriginal = boton?.innerHTML;
    if (boton) {
        boton.disabled = true;
        boton.textContent = 'Guardando...';
    }

    try {
        await setDoc(doc(db, "notificaciones_usuario", user.uid), {
            perfil: { nombre, apellido }
        }, { merge: true });
        window.mostrarNotificacion("Perfil guardado", "Se actualizaron tus datos personales.", "exito");
    } catch (error) {
        console.error("Error al guardar el perfil:", error);
        window.mostrarNotificacion("No se pudo guardar el perfil", "Revisá la conexión e intentá nuevamente.", "error");
    } finally {
        if (boton) {
            boton.disabled = false;
            boton.innerHTML = textoOriginal;
        }
    }
};

function escucharInvitacionesUsuario(userEmail) {
    if (unsubscribeInvitacionesRecibidas) unsubscribeInvitacionesRecibidas();
    if (unsubscribeInvitacionesEnviadas) unsubscribeInvitacionesEnviadas();

    emailUsuarioInvitaciones = (userEmail || '').trim();
    const recibidas = new Map();
    const enviadas = new Map();
    const actualizarInvitaciones = () => {
        const unificadas = new Map();
        enviadas.forEach((invitation, id) => unificadas.set(id, invitation));
        recibidas.forEach((invitation, id) => unificadas.set(id, invitation));
        invitacionesUsuario = [...unificadas.values()];
        window.renderBandejaNotificaciones(invitacionesUsuario.filter(inv => inv.esRecibida));
        window.renderHistorialNotificaciones();
        window.renderMiembrosGrupoSettings?.();
    };
    const manejarError = (error) => {
        console.error("Error al escuchar las invitaciones:", error);
        window.mostrarNotificacion("No se pudieron cargar las invitaciones", "Revisá tu conexión e intentá nuevamente.", "error");
    };

    const qRecibidas = query(
        collection(db, "invitaciones"),
        where("destinatarioEmail", "==", emailUsuarioInvitaciones)
    );
    const qEnviadas = query(
        collection(db, "invitaciones"),
        where("remitenteEmail", "==", emailUsuarioInvitaciones)
    );

    unsubscribeInvitacionesRecibidas = onSnapshot(qRecibidas, snapshot => {
        recibidas.clear();
        snapshot.forEach(docSnap => recibidas.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data(),
            esRecibida: true
        }));
        actualizarInvitaciones();
    }, manejarError);

    unsubscribeInvitacionesEnviadas = onSnapshot(qEnviadas, snapshot => {
        enviadas.clear();
        snapshot.forEach(docSnap => enviadas.set(docSnap.id, {
            id: docSnap.id,
            ...docSnap.data(),
            esRecibida: false
        }));
        actualizarInvitaciones();
    }, manejarError);
}

window.toggleBandejaNotificaciones = function() {
    const drop = document.getElementById('dropdownNotificaciones');
    if (drop) drop.classList.toggle('hidden');
};

window.renderBandejaNotificaciones = function(invitaciones) {
    const badge = document.getElementById('badgeNotificaciones');
    const lista = document.getElementById('listaNotificaciones');
    if (!badge || !lista) return;

    const invitacionesRecibidas = invitaciones.filter(i => i.esRecibida !== false);
    const pendientes = invitacionesRecibidas.filter(i => i.estado === "PENDIENTE");

    if (pendientes.length > 0) {
        badge.innerText = pendientes.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (pendientes.length === 0) {
        lista.onclick = null;
        lista.innerHTML = `<p class="text-xs text-slate-500 text-center py-2">No tenés invitaciones nuevas.</p>`;
        return;
    }

    lista.innerHTML = pendientes.map(inv => {
        const remitente = escapeHtml(inv.remitenteEmail);
        const grupoNombre = escapeHtml(inv.grupoNombre);
        const rol = escapeHtml(inv.rol);
        const id = escapeHtml(inv.id);
        const grupoId = escapeHtml(inv.grupoId);

        return `
            <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                <p class="text-slate-300">
                    <strong class="text-amber-400">${remitente}</strong> te invitó a unirte a <strong>${grupoNombre}</strong> (${rol}).
                </p>
                <div class="flex gap-2 justify-end">
                    <button data-accion="responder" data-id="${id}" data-grupo-id="${grupoId}" data-rol="${rol}" data-estado="RECHAZADO" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg font-semibold text-[11px]">
                        Rechazar
                    </button>
                    <button data-accion="responder" data-id="${id}" data-grupo-id="${grupoId}" data-rol="${rol}" data-estado="ACEPTADO" class="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg font-bold text-[11px]">
                        Aceptar
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lista.onclick = (event) => {
        const button = event.target.closest('button[data-accion]');
        if (!button) return;

        if (button.dataset.accion === 'responder') {
            window.responderInvitacion(button.dataset.id, button.dataset.grupoId, button.dataset.estado);
        }
    };
};

window.renderHistorialNotificaciones = function() {
    const lista = document.getElementById('listaHistorialNotificaciones');
    if (!lista) return;

    const historial = invitacionesUsuario
        .filter(inv =>
            ['PENDIENTE', 'ACEPTADO', 'RECHAZADO'].includes(inv.estado) &&
            !invitacionesOcultas.has(inv.id)
        )
        .sort((a, b) => (parseInvitationDate(b.fecha)?.getTime() || 0) - (parseInvitationDate(a.fecha)?.getTime() || 0));

    if (historial.length === 0) {
        lista.innerHTML = '<p class="text-sm text-slate-500 text-center py-8">Todavía no hay invitaciones para mostrar.</p>';
        return;
    }

    const todasSeleccionadas = historial.every(inv => invitacionesSeleccionadas.has(inv.id));
    const algunaSeleccionada = historial.some(inv => invitacionesSeleccionadas.has(inv.id));
    const estados = {
        PENDIENTE: { texto: 'Pendiente', estilo: 'text-amber-400 bg-amber-500/10' },
        ACEPTADO: { texto: 'Aceptada', estilo: 'text-emerald-400 bg-emerald-500/10' },
        RECHAZADO: { texto: 'Rechazada', estilo: 'text-slate-400 bg-slate-800' }
    };

    lista.innerHTML = `
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
            <label class="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input type="checkbox" data-seleccionar-todas class="accent-emerald-500 h-4 w-4" ${todasSeleccionadas ? 'checked' : ''}>
                Seleccionar todas
            </label>
            <button type="button" data-accion="borrar-seleccionadas" ${algunaSeleccionada ? '' : 'disabled'}
                class="px-3 py-2 rounded-lg text-xs font-semibold ${algunaSeleccionada ? 'bg-rose-950/70 text-rose-300 hover:bg-rose-900' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}">
                <i class="fa-solid fa-trash-can mr-1"></i>Borrar seleccionadas
            </button>
        </div>
        <p class="text-xs text-slate-500">Las invitaciones pendientes que borres del historial pueden seguir apareciendo en la campana hasta que las respondas.</p>
        ${historial.map(inv => {
        const recibida = inv.esRecibida;
        const otraParte = escapeHtml(recibida ? inv.remitenteEmail : inv.destinatarioEmail);
        const grupoNombre = escapeHtml(inv.grupoNombre || 'Grupo');
        const rol = escapeHtml(inv.rol || 'sin rol');
        const id = escapeHtml(inv.id);
        const estado = estados[inv.estado];
        const fecha = parseInvitationDate(inv.fecha);
        const fechaTexto = fecha
            ? fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
            : 'Fecha no disponible';
        let descripcion;

        if (recibida) {
            descripcion = inv.estado === 'PENDIENTE'
                ? `Te invitaron a unirte a ${grupoNombre}`
                : `Invitación a ${grupoNombre}`;
        } else {
            descripcion = inv.estado === 'PENDIENTE'
                ? `Invitación enviada a ${otraParte} para ${grupoNombre}`
                : `${otraParte} respondió a la invitación para ${grupoNombre}`;
        }

        return `
            <article class="flex items-start gap-3 p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
                <input type="checkbox" data-seleccionar-id="${id}" class="accent-emerald-500 h-4 w-4 mt-0.5 shrink-0" aria-label="Seleccionar notificación" ${invitacionesSeleccionadas.has(inv.id) ? 'checked' : ''}>
                <div class="min-w-0 flex-1">
                    <p class="text-sm font-semibold text-slate-200">${descripcion}</p>
                    <p class="mt-1 text-xs text-slate-400">${recibida ? `De ${otraParte}` : 'Enviada por vos'} · Rol: ${rol}</p>
                    <time class="mt-1 block text-[11px] text-slate-500">${fechaTexto}</time>
                </div>
                <div class="flex shrink-0 flex-col items-end gap-3">
                    <span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${estado.estilo}">${estado.texto}</span>
                    <button type="button" data-accion="borrar-una" data-id="${id}" class="text-slate-500 hover:text-rose-400" title="Borrar del historial" aria-label="Borrar del historial">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                </div>
            </article>
        `;
    }).join('')}
    `;

    lista.onchange = (event) => {
        const checkbox = event.target;
        if (checkbox.matches('[data-seleccionar-todas]')) {
            if (checkbox.checked) historial.forEach(inv => invitacionesSeleccionadas.add(inv.id));
            else historial.forEach(inv => invitacionesSeleccionadas.delete(inv.id));
        } else if (checkbox.matches('[data-seleccionar-id]')) {
            if (checkbox.checked) invitacionesSeleccionadas.add(checkbox.dataset.seleccionarId);
            else invitacionesSeleccionadas.delete(checkbox.dataset.seleccionarId);
        } else {
            return;
        }
        window.renderHistorialNotificaciones();
    };

    lista.onclick = (event) => {
        const button = event.target.closest('button[data-accion]');
        if (!button || button.disabled) return;

        if (button.dataset.accion === 'borrar-una') {
            ocultarInvitacionesDelHistorial([button.dataset.id]);
        } else if (button.dataset.accion === 'borrar-seleccionadas') {
            ocultarInvitacionesDelHistorial([...invitacionesSeleccionadas]);
        }
    };
};

async function ocultarInvitacionesDelHistorial(ids) {
    const user = auth.currentUser;
    const idsValidos = [...new Set(ids)].filter(id =>
        invitacionesUsuario.some(inv => inv.id === id) && !invitacionesOcultas.has(id)
    );
    if (!user || idsValidos.length === 0) return;

    const ocultasAntes = new Set(invitacionesOcultas);
    idsValidos.forEach(id => {
        invitacionesOcultas.add(id);
        invitacionesSeleccionadas.delete(id);
    });
    window.renderHistorialNotificaciones();

    try {
        await setDoc(doc(db, "notificaciones_usuario", user.uid), {
            invitacionesOcultas: arrayUnion(...idsValidos)
        }, { merge: true });
    } catch (error) {
        console.error("Error al borrar notificaciones del historial:", error);
        invitacionesOcultas = ocultasAntes;
        idsValidos.forEach(id => invitacionesSeleccionadas.add(id));
        window.renderHistorialNotificaciones();
        window.mostrarNotificacion("No se pudieron borrar las notificaciones", "Revisá tu conexión e intentá nuevamente.", "error");
    }
}

window.responderInvitacion = async function(invitacionId, grupoId, nuevoEstado) {
    try {
        const user = auth.currentUser;
        if (!user || !['ACEPTADO', 'RECHAZADO'].includes(nuevoEstado)) {
            throw new Error("La invitación o el usuario no son válidos.");
        }
        const invRef = doc(db, "invitaciones", invitacionId);
        const grupoRef = doc(db, "app_data", grupoId);
        await runTransaction(db, async transaction => {
            const invitationSnap = await transaction.get(invRef);
            if (!invitationSnap.exists()) throw new Error("La invitación ya no existe.");
            const invitation = invitationSnap.data();
            if (
                invitation.estado !== 'PENDIENTE' ||
                invitation.grupoId !== grupoId ||
                invitation.destinatarioEmail !== user.email
            ) {
                throw new Error("La invitación ya fue respondida o no te pertenece.");
            }

            if (nuevoEstado === 'ACEPTADO') {
                transaction.update(invRef, {
                    estado: "ACEPTADO",
                    destinatarioUid: user.uid
                });
                transaction.update(grupoRef, {
                    [`appState.grupoInfo.miembros.${user.uid}`]: {
                        email: user.email,
                        rol: invitation.rol,
                        invitacionId
                    }
                });
            } else {
                transaction.update(invRef, { estado: "RECHAZADO" });
            }
        });

        if (nuevoEstado === 'ACEPTADO') {
            window.mostrarNotificacion("¡Unión exitosa!", "Te uniste al grupo con éxito.", "exito", async () => {
                await window.poblarSelectorVistas(grupoId);
                window.cambiarVistaSeleccionada(grupoId);
            });
        } else {
            window.mostrarNotificacion("Invitación rechazada", "Has rechazado la invitación.", "info");
        }
    } catch (e) {
        console.error("Error al responder invitación:", e);
        window.mostrarNotificacion("No se pudo responder la invitación", "Es posible que haya cambiado de estado. Actualizá e intentá nuevamente.", "error");
    }
};

window.salirDelGrupoConId = async function(grupoId) {
    window.mostrarNotificacion(
        "Confirmar salida",
        "¿Deseás salir de este grupo? Ya no tendrás acceso a sus datos.",
        "error",
        async () => {
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No hay una cuenta activa para salir del grupo.");
            const grupoRef = doc(db, "app_data", grupoId);
            await runTransaction(db, async transaction => {
                const groupSnap = await transaction.get(grupoRef);
                if (!groupSnap.exists()) throw new Error("No se encontró el grupo.");
                const groupInfo = groupSnap.data().appState?.grupoInfo;
                if (
                    !groupInfo?.miembros?.[user.uid] ||
                    groupInfo.miembros[user.uid].email !== user.email
                ) {
                    throw new Error("No tenés permiso para salir de este grupo.");
                }

                const miembros = { ...groupInfo.miembros };
                delete miembros[user.uid];
                transaction.update(grupoRef, {
                    "appState.grupoInfo": { ...groupInfo, miembros }
                });
                });

                await window.poblarSelectorVistas("personal");
                window.cambiarVistaSeleccionada("personal");
            } catch (e) {
                console.error("Error al salir del grupo:", e);
                window.mostrarNotificacion("No se pudo salir del grupo", "Revisá la conexión e intentá nuevamente.", "error");
            }
        }
    );
};

window.salirDelGrupoActual = async function() {
    window.salirDelGrupoConId(window.currentGrupo);
};

window.saveDataToCloud = async function() {
    if (window.demoModeActive) return;
    try {
        if (!window.docRef) return;
        const appStateToSave = JSON.parse(JSON.stringify(window.appState));
        delete appStateToSave.gastosMensuales;
        delete appStateToSave.excepcionesMontoPagado;
        delete appStateToSave.excepcionesMontoPagadoBloque;
        await setDoc(window.docRef, { appState: appStateToSave }, { merge: true });
    } catch (e) {
        console.error("Error guardando los datos:", e);
        window.mostrarNotificacion("No se pudieron guardar los cambios", "Revisá tu conexión e intentá nuevamente.", "error");
    }
};

window.guardarMontoPagadoPlanilla = async function(key, monto, esBloque) {
    if (window.demoModeActive) return;
    if (!window.docRef) throw new Error("No hay un grupo activo para guardar el monto pagado.");
    if (!window.esUsuarioEditor()) throw new Error("No tenés permiso para modificar los gastos.");
    const campo = esBloque ? "excepcionesMontoPagadoBloque" : "excepcionesMontoPagado";
    const mapaActualizado = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(window.docRef);
        if (!snapshot.exists()) throw new Error("No se encontró el grupo para guardar el monto pagado.");
        const estadoRemoto = snapshot.data().appState || {};
        const mapa = { ...(estadoRemoto[campo] || {}), [key]: monto };
        transaction.update(window.docRef, { [`appState.${campo}`]: mapa });
        return mapa;
    });
    window.appState[campo] = mapaActualizado;
};

window.agregarGastoMensualCompartido = async function(gasto) {
    if (window.demoModeActive) return;
    if (!window.docRef) throw new Error("No hay un grupo activo para guardar el gasto mensual.");
    await updateDoc(window.docRef, {
        "appState.gastosMensuales": arrayUnion(gasto)
    });
    const gastosActuales = window.appState.gastosMensuales || [];
    window.appState.gastosMensuales = [
        ...gastosActuales.filter(item => item.id !== gasto.id),
        gasto
    ];
};

window.eliminarGastoMensualCompartido = async function(gastoId) {
    if (window.demoModeActive) return;
    if (!window.docRef) throw new Error("No hay un grupo activo para eliminar el gasto mensual.");
    if (!window.esUsuarioEditor()) throw new Error("No tenés permiso para eliminar gastos mensuales.");
    const gasto = (window.appState.gastosMensuales || []).find(item => item.id === gastoId);
    if (!gasto) throw new Error("No se encontró el gasto mensual para eliminar.");
    await updateDoc(window.docRef, {
        "appState.gastosMensuales": arrayRemove(gasto)
    });
    window.appState.gastosMensuales = (window.appState.gastosMensuales || []).filter(item => item.id !== gastoId);
};

window.guardarCategoriasGastoMensual = async function(categorias, gastos) {
    if (window.demoModeActive) return;
    if (!window.docRef) throw new Error("No hay un grupo activo para guardar las categorías.");
    if (!window.esUsuarioEditor()) throw new Error("No tenés permiso para modificar las categorías.");
    const gastosAnteriores = window.appState.gastosMensuales || [];
    const renombres = new Map();
    gastos.forEach((gasto, index) => {
        const anterior = gastosAnteriores[index];
        if (anterior && anterior.categoria !== gasto.categoria) {
            renombres.set(anterior.categoria, gasto.categoria);
        }
    });
    const gastosActualizados = await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(window.docRef);
        if (!snapshot.exists()) throw new Error("No se encontró el grupo para guardar las categorías.");
        const appStateRemoto = snapshot.data().appState || {};
        const gastosRemotos = Array.isArray(appStateRemoto.gastosMensuales) ? appStateRemoto.gastosMensuales : [];
        const gastosRemapeados = gastosRemotos.map(gasto => (
            renombres.has(gasto.categoria)
                ? { ...gasto, categoria: renombres.get(gasto.categoria) }
                : gasto
        ));
        transaction.update(window.docRef, {
            "appState.categoriasGastosMensuales": categorias,
            "appState.gastosMensuales": gastosRemapeados
        });
        return gastosRemapeados;
    });
    window.appState.categoriasGastosMensuales = categorias;
    window.appState.gastosMensuales = gastosActualizados;
};

window.saveHormigaDataToCloud = async function() {
    if (window.demoModeActive) return;
    const user = auth.currentUser;
    if (!user) throw new Error("No hay una cuenta activa para guardar los gastos hormiga.");

    window.docHormigaRef = doc(db, "app_data_hormiga", user.uid);
    await setDoc(window.docHormigaRef, { hormigaState: JSON.parse(JSON.stringify(window.hormigaState)) });
};

function actualizarVisibilidadBotonesAdmin() {
    const user = auth.currentUser;
    const userUid = user?.uid || null;
    const esEspacioPersonal = Boolean(userUid && window.currentGrupo === `personal_${userUid}`);

    if (window.appState && !window.appState.grupoInfo && esEspacioPersonal) {
        window.appState.grupoInfo = {
            adminUid: userUid,
            miembros: {
                [userUid]: { email: user.email || '', rol: 'admin' }
            },
            invitacionesPendientes: []
        };
    }

    const grupoInfo = window.appState ? window.appState.grupoInfo : null;
    const esAdmin = Boolean(userUid && (esEspacioPersonal || grupoInfo?.adminUid === userUid));

    const btnConfigCat = document.getElementById('btnConfigCat');

    if (esAdmin) {
        if (btnConfigCat) { btnConfigCat.classList.remove('hidden'); btnConfigCat.style.display = 'inline-flex'; }
    } else {
        if (btnConfigCat) { btnConfigCat.classList.add('hidden'); btnConfigCat.style.display = 'none'; }
    }
}

function triggerPageRenders() {
    actualizarVisibilidadBotonesAdmin();
    if (typeof renderApp === 'function') renderApp();
}

window.navigateMonth = function(direction) {
    let [year, month] = (window.appState.currentMonth || defaultLocalMonth).split('-').map(Number);
    month += direction;
    if (month > 12) { month = 1; year++; } if (month < 1) { month = 12; year--; }
    window.appState.currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    if (window.currentGrupo && !window.demoModeActive) {
        localStorage.setItem(`currentMonth_${window.currentGrupo}`, window.appState.currentMonth);
    }
    triggerPageRenders();
};

window.persistCurrentMonthSelection = function(month) {
    if (!month) return;
    window.appState.currentMonth = month;
    if (window.currentGrupo && !window.demoModeActive) {
        localStorage.setItem(`currentMonth_${window.currentGrupo}`, month);
    }
};

window.formatMonthDisplay = function(ymStr) {
    if (!ymStr) return '';
    const [year, month] = ymStr.split('-').map(Number);
    return `${monthNames[month - 1]} ${year}`;
};

window.formatFechaVencimientoSimple = function(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : fechaStr;
};

window.sumarUnMesAFecha = function(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return '';
    let y = parseInt(partes[0]), m = parseInt(partes[1]), d = parseInt(partes[2]);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    const ultimoDiaMes = new Date(y, m, 0).getDate();
    if (d > ultimoDiaMes) d = ultimoDiaMes;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

window.getSueldoForMonth = function(targetMonth) {
    const sueldos = window.appState.sueldos || {};
    if (sueldos[targetMonth] !== undefined) return parseFloat(sueldos[targetMonth]) || 0;
    let keys = Object.keys(sueldos).sort();
    let sueldoAplicar = 0;
    for (let k of keys) { if (k <= targetMonth) sueldoAplicar = parseFloat(sueldos[k]) || 0; else break; }
    return sueldoAplicar;
};

window.getPorcentajeAumentoGasto = function(gasto) {
    if (window.appState.aumentosIndividuales?.[gasto.id] !== undefined && window.appState.aumentosIndividuales[gasto.id] !== '') {
        return parseFloat(window.appState.aumentosIndividuales[gasto.id]) || 0;
    }
    if (gasto.subcategoriaId) {
        const subcat = (window.appState.subcategorias || []).find(s => s.id === gasto.subcategoriaId);
        if (subcat && subcat.porcentajeAumento) {
            return parseFloat(subcat.porcentajeAumento) || 0;
        }
    }
    return 0;
};

window.getCalculatedDataForMonth = function(targetMonth) {
    const sueldoActual = window.getSueldoForMonth(targetMonth);
    let items = [];
    let totalFijos = 0, totalTarjetas = 0;
    let totalesPorCat = {};
    (window.appState.categorias || categoriasDefault).forEach(cat => totalesPorCat[cat.nombre] = 0);
    const hoyStr = new Date().toISOString().slice(0, 10);

    (window.appState.gastos || []).forEach(gasto => {
        const mesEliminacion = window.appState.excepcionesEliminacion?.[gasto.id];
        if (mesEliminacion && targetMonth >= mesEliminacion) return;

        const borradoPuntual = window.appState.excepcionesEliminacionSoloMes?.[`${gasto.id}_${targetMonth}`];
        if (borradoPuntual) return;

        const excepcionCatKey = `${gasto.id}_${targetMonth}`;
        const categoriaAplicar = window.appState.excepcionesCategoria?.[excepcionCatKey] ?? gasto.categoria;
        const startYM = gasto.startMonth || targetMonth;
        
        let montoAplicar = undefined;
        let baseMonthStr = startYM;

        if (window.appState.excepcionesMonto?.[excepcionCatKey] !== undefined) {
            montoAplicar = parseFloat(window.appState.excepcionesMonto[excepcionCatKey]);
            baseMonthStr = targetMonth;
        } else {
            let [tY, tM] = targetMonth.split('-').map(Number);
            let foundMonto = null;
            let foundMonthStr = null;

            for (let i = 0; i < 36; i++) {
                let checkYM = `${tY}-${String(tM).padStart(2, '0')}`;
                if (window.appState.excepcionesMonto?.[`${gasto.id}_${checkYM}`] !== undefined) {
                    foundMonto = parseFloat(window.appState.excepcionesMonto[`${gasto.id}_${checkYM}`]);
                    foundMonthStr = checkYM;
                    break;
                }
                tM--; if (tM < 1) { tM = 12; tY--; }
            }
            if (foundMonto !== null) {
                montoAplicar = foundMonto;
                baseMonthStr = foundMonthStr;
            } else {
                montoAplicar = parseFloat(gasto.monto);
                baseMonthStr = startYM;
            }
        }
        
        const totalCuotas = parseInt(gasto.cuotas) || 1;
        const baseEsFijo = (gasto.categoria || '').toLowerCase().includes('fijo') || (gasto.categoria || '').toLowerCase().includes('servicio');
        const catEsFijo = categoriaAplicar.toLowerCase().includes('fijo') || categoriaAplicar.toLowerCase().includes('servicio');
        const isRecurrente = gasto.isRecurrente || baseEsFijo || catEsFijo;

        const pctAumento = window.getPorcentajeAumentoGasto(gasto);
        if (isRecurrente && pctAumento > 0 && targetMonth > baseMonthStr) {
            const [bY, bM] = baseMonthStr.split('-').map(Number);
            const [tY, tM] = targetMonth.split('-').map(Number);
            const diffMeses = (tY - bY) * 12 + (tM - bM);

            if (diffMeses > 0) {
                let montoCalculado = montoAplicar;
                for (let m = 0; m < diffMeses; m++) {
                    montoCalculado = montoCalculado * (1 + (pctAumento / 100));
                }
                montoAplicar = Math.round(montoCalculado * 100) / 100;
            }
        }

        let generatedItems = [];
        if (totalCuotas > 1) {
            const montoCuota = montoAplicar / totalCuotas;
            const [sYear, sMonth] = startYM.split('-').map(Number);
            for (let i = 0; i < totalCuotas; i++) {
                let fYear = sYear, fMonth = sMonth + i;
                while (fMonth > 12) { fMonth -= 12; fYear++; }
                let mStr = `${fYear}-${String(fMonth).padStart(2, '0')}`;
                if (mStr === targetMonth) {
                    let vencFinal = gasto.vencimiento || '';
                    for (let step = 0; step < i; step++) vencFinal = window.sumarUnMesAFecha(vencFinal);
                    
                    const gridKey = `${gasto.id}_${targetMonth}`;
                    const vencimientoAplicar = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined
                        ? window.appState.excepcionesVencimientoGrid[gridKey]
                        : (window.appState.excepcionesVencimiento?.[gridKey] !== undefined ? window.appState.excepcionesVencimiento[gridKey] : vencFinal);

                    const estadoKey = `${gasto.id}_${targetMonth}`;
                    const estadoGuardado = window.appState.excepcionesEstado?.[estadoKey];
                    let estadoAplicar = estadoGuardado || (vencimientoAplicar && vencimientoAplicar !== 'dd/mm/aaaa' && hoyStr > vencimientoAplicar ? 'VENCIDO' : 'PENDIENTE');

                    generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: `Cuota ${i + 1}/${totalCuotas}`, monto: montoCuota, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: false, subcategoriaId: gasto.subcategoriaId });
                }
            }
        } else if (isRecurrente) {
            if (targetMonth >= startYM) {
                const [sY, sM] = startYM.split('-').map(Number);
                const [tY, tM] = targetMonth.split('-').map(Number);
                const diffMeses = (tY - sY) * 12 + (tM - sM);
                
                let vencCalculado = gasto.vencimiento || '';
                for (let step = 0; step < diffMeses; step++) vencCalculado = window.sumarUnMesAFecha(vencCalculado);

                const gridKey = `${gasto.id}_${targetMonth}`;
                let vencimientoAplicar = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined 
                    ? window.appState.excepcionesVencimientoGrid[gridKey] 
                    : (window.appState.excepcionesVencimiento?.[`${gasto.id}_${targetMonth}`] !== undefined 
                        ? window.appState.excepcionesVencimiento[`${gasto.id}_${targetMonth}`] 
                        : vencCalculado);

                const estadoKey = `${gasto.id}_${targetMonth}`;
                const estadoGuardado = window.appState.excepcionesEstado?.[estadoKey];
                let estadoAplicar = estadoGuardado || (vencimientoAplicar && vencimientoAplicar !== 'dd/mm/aaaa' && hoyStr > vencimientoAplicar ? 'VENCIDO' : 'PENDIENTE');

                const tipoStr = (baseEsFijo || catEsFijo) ? 'Recurrente' : 'Débito Automático';
                generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: tipoStr, monto: montoAplicar, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: true, subcategoriaId: gasto.subcategoriaId });
            }
        } else {
            if (targetMonth === startYM) {
                const gridKey = `${gasto.id}_${targetMonth}`;
                const vencimientoAplicar = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined ? window.appState.excepcionesVencimientoGrid[gridKey] : (window.appState.excepcionesVencimiento?.[gridKey] !== undefined ? window.appState.excepcionesVencimiento[gridKey] : (gasto.vencimiento ?? ''));

                const estadoKey = `${gasto.id}_${targetMonth}`;
                const estadoGuardado = window.appState.excepcionesEstado?.[estadoKey];
                let estadoAplicar = estadoGuardado || (vencimientoAplicar && vencimientoAplicar !== 'dd/mm/aaaa' && hoyStr > vencimientoAplicar ? 'VENCIDO' : 'PENDIENTE');

                generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: 'Débito', monto: montoAplicar, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: false, subcategoriaId: gasto.subcategoriaId });
            }
        }

        generatedItems.forEach(gi => {
            const catObj = (window.appState.categorias || categoriasDefault).find(c => c.nombre === gi.categoria);
            const esTarjetaCat = catObj ? catObj.esTarjeta : true;
            if (!esTarjetaCat) totalFijos += gi.monto;
            else totalTarjetas += gi.monto;
            if (totalesPorCat[gi.categoria] !== undefined) totalesPorCat[gi.categoria] += gi.monto;
            items.push(gi);
        });
    });
    return { sueldoActual, items, totalFijos, totalTarjetas, totalesPorCat };
};

let gastoAEliminarId = null;
let tipoEliminacionSeleccionado = null;

window.deleteGasto = function(id) {
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso denegado", "Tu cuenta tiene permisos de solo lectura.", "error");
        return;
    }
    const gasto = (window.appState.gastos || []).find(g => g.id === id);
    if (!gasto) return;

    gastoAEliminarId = id;
    tipoEliminacionSeleccionado = null;
    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const monthText = window.formatMonthDisplay ? window.formatMonthDisplay(currentMonth) : currentMonth;

    const elNombre = document.getElementById('eliminarGastoNombre');
    const elMesTexto = document.getElementById('eliminarGastoMesTexto');
    if (elNombre) elNombre.innerText = `"${gasto.concepto}"`;
    if (elMesTexto) elMesTexto.innerText = monthText;
    
    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.remove('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.add('hidden');

    document.querySelectorAll('.eliminarGastoMesRef').forEach(el => el.innerText = monthText);

    const modalEliminar = document.getElementById('modalEliminarGasto');
    if (modalEliminar) modalEliminar.classList.remove('hidden');
};

window.solicitarConfirmacionEliminacion = function(tipoEliminacion) {
    if (!gastoAEliminarId) return;

    tipoEliminacionSeleccionado = tipoEliminacion;
    const gasto = (window.appState.gastos || []).find(g => g.id === gastoAEliminarId);
    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const monthText = window.formatMonthDisplay ? window.formatMonthDisplay(currentMonth) : currentMonth;

    let textoModalidad = '';
    if (tipoEliminacion === 'solo_mes') {
        textoModalidad = `ÚNICAMENTE para el mes de ${monthText}`;
    } else if (tipoEliminacion === 'mes_y_futuros') {
        textoModalidad = `A PARTIR de ${monthText} y hacia todos los meses futuros`;
    } else if (tipoEliminacion === 'todo') {
        textoModalidad = `COMPLETAMENTE de la base de datos (todo el historial pasado, presente y futuro)`;
    }

    const txtDetalle = document.getElementById('eliminarConfirmacionDetalleText');
    if (txtDetalle) {
        txtDetalle.innerHTML = `¿Realmente deseás eliminar el gasto <strong class="text-white">"${escapeHtml(gasto?.concepto)}"</strong> de forma <strong class="text-amber-400">${escapeHtml(textoModalidad)}</strong>?`;
    }

    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.add('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.remove('hidden');
};

window.volverASeleccionEliminacion = function() {
    tipoEliminacionSeleccionado = null;
    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.remove('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.add('hidden');
};

window.ejecutarEliminacionGasto = function() {
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso denegado", "Tu cuenta tiene permisos de solo lectura.", "error");
        return;
    }
    if (!gastoAEliminarId || !tipoEliminacionSeleccionado) return;

    const id = gastoAEliminarId;
    const tipo = tipoEliminacionSeleccionado;
    const currentActiveMonth = window.appState.currentMonth || defaultLocalMonth;

    if (!window.appState.excepcionesEliminacion) window.appState.excepcionesEliminacion = {};
    if (!window.appState.excepcionesEliminacionSoloMes) window.appState.excepcionesEliminacionSoloMes = {};

    if (tipo === 'solo_mes') {
        window.appState.excepcionesEliminacionSoloMes[`${id}_${currentActiveMonth}`] = true;
    } else if (tipo === 'mes_y_futuros') {
        window.appState.excepcionesEliminacion[id] = currentActiveMonth;
    } else if (tipo === 'todo') {
        window.appState.gastos = (window.appState.gastos || []).filter(g => g.id !== id);
        delete window.appState.excepcionesEliminacion[id];
        if (window.appState.aumentosIndividuales) delete window.appState.aumentosIndividuales[id];
        
        Object.keys(window.appState.excepcionesEliminacionSoloMes || {}).forEach(k => {
            if (k.startsWith(`${id}_`)) delete window.appState.excepcionesEliminacionSoloMes[k];
        });
    }

    window.saveDataToCloud();
    if (typeof window.closeModal === 'function') window.closeModal('modalEliminarGasto');
    gastoAEliminarId = null;
    tipoEliminacionSeleccionado = null;
    triggerPageRenders();
};

window.openModalGestionGrupo = function() {
    window.openSettingsSection('grupo');
};

function renderMiembrosGrupo() {
    const container = document.getElementById('listaMiembrosGrupo');
    const containerPendientes = document.getElementById('containerInvitacionesPendientes');
    const listaPendientes = document.getElementById('listaInvitacionesPendientes');
    const badgeCant = document.getElementById('badgeCantMiembros');
    if (!container) return;

    container.innerHTML = '';
    
    const user = auth.currentUser;
    const userEmail = user?.email || '';
    const userUid = user?.uid || '';
    const esEspacioPersonal = window.currentGrupo === `personal_${userUid}`;
    const grupoInfo = window.appState.grupoInfo || {
        adminUid: esEspacioPersonal ? userUid : '',
        miembros: esEspacioPersonal ? { [userUid]: { email: userEmail, rol: 'admin' } } : {},
        invitacionesPendientes: []
    };
    const esAdmin = esEspacioPersonal || grupoInfo.adminUid === userUid;

    const formInvitar = document.getElementById('containerFormInvitar');
    if (formInvitar) {
        if (esAdmin) formInvitar.classList.remove('hidden');
        else formInvitar.classList.add('hidden');
    }

    const miembrosArr = Object.entries(grupoInfo.miembros || {});
    if (badgeCant) badgeCant.innerText = `${miembrosArr.length} activo(s)`;

    miembrosArr.forEach(([uid, info]) => {
        const esElAdmin = uid === grupoInfo.adminUid;
        const esYoMismo = uid === userUid;

        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg ${esElAdmin ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-slate-900 text-slate-400'} flex items-center justify-center font-bold text-[11px]">
                        <i class="fa-solid ${esElAdmin ? 'fa-crown' : 'fa-user'}"></i>
                    </div>
                    <div>
                        <span class="font-bold text-white block">${escapeHtml(info.email)} ${esYoMismo ? '<span class="text-[10px] text-emerald-400 font-normal">(Tú)</span>' : ''}</span>
                        <span class="text-[10px] text-slate-500 uppercase font-semibold">${esElAdmin ? 'admin' : escapeHtml(info.rol || 'miembro')}</span>
                    </div>
                </div>
                ${(esAdmin && !esYoMismo) ? `
                    <div class="flex items-center gap-1.5">
                        <select onchange="cambiarRolMiembro('${uid}', this.value)" data-uid-miembro="${uid}" class="select-rol-miembro bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-[11px] text-slate-300">
                            <option value="editor" ${info.rol === 'editor' ? 'selected' : ''}>Editor</option>
                            <option value="lector" ${info.rol === 'lector' ? 'selected' : ''}>Lector</option>
                        </select>
                        <button onclick="removerMiembroGrupo('${uid}')" class="text-rose-400 hover:text-rose-300 p-1.5" title="Quitar miembro"><i class="fa-solid fa-user-xmark"></i></button>
                    </div>
                ` : ''}
                ${!esEspacioPersonal && esYoMismo ? `
                    <button onclick="salirDelGrupoActual()" class="text-rose-400 hover:text-rose-300 px-2 py-1 rounded-lg text-[11px] font-semibold">
                        Salir del grupo
                    </button>
                ` : ''}
            </div>
        `;
    });

    const pendientes = invitacionesUsuario.filter(inv =>
        !inv.esRecibida &&
        inv.grupoId === window.currentGrupo &&
        inv.estado === 'PENDIENTE'
    );
    if (pendientes.length > 0 && listaPendientes && containerPendientes) {
        containerPendientes.classList.remove('hidden');
        listaPendientes.innerHTML = '';
        pendientes.forEach((inv, idx) => {
            listaPendientes.innerHTML += `
                <div class="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <span class="text-slate-400">${escapeHtml(inv.destinatarioEmail)} <span class="text-[10px] text-amber-400">(${escapeHtml(inv.rol)})</span></span>
                    ${esAdmin ? `<button onclick="cancelarInvitacion(${idx})" class="text-rose-400 hover:text-rose-300 p-1"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
            `;
        });
    } else if (containerPendientes) {
        containerPendientes.classList.add('hidden');
    }
}
window.renderMiembrosGrupoSettings = renderMiembrosGrupo;

window.handleInvitarMiembro = async function(e) {
    if (e) e.preventDefault();
    const user = auth.currentUser;
    if (!user || (window.currentGrupo !== `personal_${user.uid}` && window.appState.grupoInfo?.adminUid !== user.uid)) {
        window.mostrarNotificacion("Acceso denegado", "Solo el administrador del grupo puede enviar invitaciones.", "error");
        return;
    }
    const emailInput = document.getElementById('inputInvitarEmail');
    const rolSelect = document.getElementById('selectInvitarRol');
    if (!emailInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const rol = rolSelect ? rolSelect.value : 'editor';
    if (!email) return;

    if (!['editor', 'lector'].includes(rol)) {
        window.mostrarNotificacion("Rol inválido", "Elegí un rol válido para la invitación.", "error");
        return;
    }

    try {
        const grupoRef = doc(db, "app_data", window.currentGrupo);
        const grupoSnap = await getDoc(grupoRef);
        if (!grupoSnap.exists()) {
            throw new Error("No se encontró el grupo.");
        }
        let grupoInfo = grupoSnap.data().appState?.grupoInfo;
        if (!grupoInfo && window.currentGrupo === `personal_${user.uid}`) {
            grupoInfo = {
                adminUid: user.uid,
                miembros: { [user.uid]: { email: user.email || '', rol: 'admin' } },
                invitacionesPendientes: []
            };
            await updateDoc(grupoRef, { "appState.grupoInfo": grupoInfo });
        }
        if (!grupoInfo || grupoInfo.adminUid !== user.uid) {
            throw new Error("Solo el administrador del grupo puede enviar invitaciones.");
        }

        const yaEsMiembro = Object.values(grupoInfo.miembros || {}).some(m => (m.email || '').toLowerCase() === email);
        if (yaEsMiembro) {
            window.mostrarNotificacion("Aviso", "Ese usuario ya pertenece al grupo.", "info");
            return;
        }
        if (email === (user.email || '').toLowerCase()) {
            window.mostrarNotificacion("Aviso", "No podés invitar tu propio correo.", "info");
            return;
        }

        await addDoc(collection(db, "invitaciones"), {
            grupoId: window.currentGrupo,
            grupoNombre: grupoInfo.nombreGrupo || "Grupo Control de Gastos",
            remitenteEmail: user.email,
            destinatarioEmail: email,
            rol: rol,
            estado: "PENDIENTE",
            fecha: new Date().toISOString()
        });

        if (typeof emailjs !== 'undefined') {
            emailjs.send('service_hib3aln', 'template_9tbnrfg', {
                to_email: email,
                para_correo_electrónico: email,
                rol_invitado: rol.toUpperCase(),
                remitente: user.email
            });
        }

        emailInput.value = '';
        window.renderMiembrosGrupoSettings?.();
        renderMiembrosGrupo();
        window.mostrarNotificacion("¡Invitación enviada!", `Se envió con éxito la invitación a ${email}.`, "exito");
    } catch (err) {
        console.error("Error al enviar invitación:", err);
        window.mostrarNotificacion("No se pudo enviar la invitación", err.message || "Revisá los permisos del grupo y volvé a intentar.", "error");
    }
};

window.removerMiembroGrupo = function(uid) {
    const user = auth.currentUser;
    if (!user || window.appState.grupoInfo?.adminUid !== user.uid) {
        window.mostrarNotificacion("Acceso denegado", "Solo el administrador del grupo puede quitar integrantes.", "error");
        return;
    }
    window.mostrarNotificacion(
        "Quitar integrante",
        "¿Seguro que deseás remover a este integrante del grupo?",
        "error",
        async () => {
            try {
                const groupRef = doc(db, "app_data", window.currentGrupo);
                await runTransaction(db, async transaction => {
                    const groupSnap = await transaction.get(groupRef);
                    if (!groupSnap.exists()) throw new Error("No se encontró el grupo.");
                    const groupInfo = groupSnap.data().appState?.grupoInfo;
                    if (!groupInfo || groupInfo.adminUid !== user.uid || !groupInfo.miembros?.[uid]) {
                        throw new Error("No tenés permiso para quitar a este integrante.");
                    }

                    const miembroRemovido = groupInfo.miembros[uid];
                    const invitationRef = miembroRemovido.invitacionId
                        ? doc(db, "invitaciones", miembroRemovido.invitacionId)
                        : null;
                    const invitationSnap = invitationRef ? await transaction.get(invitationRef) : null;
                    const miembros = { ...groupInfo.miembros };
                    delete miembros[uid];

                    if (
                        invitationSnap?.exists() &&
                        invitationSnap.data().estado === 'ACEPTADO' &&
                        invitationSnap.data().destinatarioUid === uid
                    ) {
                        transaction.update(invitationRef, { estado: "RECHAZADO" });
                    }
                    transaction.update(groupRef, {
                        "appState.grupoInfo": { ...groupInfo, miembros }
                    });
                });
                renderMiembrosGrupo();
                window.mostrarNotificacion("Integrante removido", "El usuario ya no forma parte del grupo.", "exito");
            } catch (e) {
                console.error("Error al remover miembro:", e);
                window.mostrarNotificacion("No se pudo quitar al integrante", "Revisá los permisos del grupo e intentá nuevamente.", "error");
            }
        }
    );
};

window.cancelarInvitacion = async function(index) {
    const user = auth.currentUser;
    if (!user || window.appState.grupoInfo?.adminUid !== user.uid) return;
    const pendientes = invitacionesUsuario.filter(inv =>
        !inv.esRecibida &&
        inv.grupoId === window.currentGrupo &&
        inv.estado === 'PENDIENTE'
    );
    const invitacion = pendientes[index];
    if (!invitacion) return;

    try {
        await updateDoc(doc(db, "invitaciones", invitacion.id), { estado: "RECHAZADO" });
        renderMiembrosGrupo();
    } catch (error) {
        console.error("Error al cancelar la invitación:", error);
        window.mostrarNotificacion("No se pudo cancelar la invitación", "Revisá la conexión e intentá nuevamente.", "error");
    }
};

window.actualizarEstadoGasto = function(gastoId, monthStr, nuevoEstado) {
    if (!window.appState.excepcionesEstado) window.appState.excepcionesEstado = {};
    
    const gasto = (window.appState.gastos || []).find(g => g.id === gastoId);
    if (!gasto) return;

    const catObj = (window.appState.categorias || []).find(c => c.nombre === gasto.categoria);
    const esEnBloque = catObj ? catObj.vencimientoUnicoEnBloque : false;

    if (esEnBloque) {
        const datosCalculados = window.getCalculatedDataForMonth(monthStr);
        datosCalculados.items.forEach(item => {
            if (item.categoria === gasto.categoria) {
                window.appState.excepcionesEstado[`${item.id}_${monthStr}`] = nuevoEstado;
            }
        });
    } else {
        window.appState.excepcionesEstado[`${gastoId}_${monthStr}`] = nuevoEstado;
    }

    window.saveDataToCloud(); 
    renderApp();
};

window.actualizarEstadoGastoMasivo = function(gastoId, nuevoEstado) {
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso denegado", "Tu cuenta tiene permisos de solo lectura.", "error");
        return;
    }

    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const gasto = (window.appState.gastos || []).find(g => g.id === gastoId);
    if (!gasto) return;

    const catObj = (window.appState.categorias || categoriasDefault).find(c => c.nombre === gasto.categoria);
    const esEnBloque = catObj ? catObj.vencimientoUnicoEnBloque : false;

    if (!window.appState.excepcionesEstado) {
        window.appState.excepcionesEstado = {};
    }

    if (esEnBloque) {
        const datosCalculados = window.getCalculatedDataForMonth(currentMonth);
        datosCalculados.items.forEach(item => {
            if (item.categoria === gasto.categoria) {
                const estadoKey = `${item.id}_${currentMonth}`;
                window.appState.excepcionesEstado[estadoKey] = nuevoEstado;
            }
        });
    } else {
        const estadoKey = `${gastoId}_${currentMonth}`;
        window.appState.excepcionesEstado[estadoKey] = nuevoEstado;
    }

    window.saveDataToCloud();
    renderApp();
};

// ==========================================
// RENDERIZADO DE PLANILLA AGRUPADA (COLUMNAS DINÁMICAS SEGÚN MODO BLOQUE)
// ==========================================

window.renderPlanillaAgrupadaTabla = function(items) {
    const container = document.getElementById('containerPlanillaAgrupada');
    if (!container) return;
    container.innerHTML = '';

    const filtrosActivos = window.filtrosTemporales || [];
    let itemsFiltrados = items.filter(item => filtrosActivos.length === 0 || filtrosActivos.includes(item.categoria));

    if (itemsFiltrados.length === 0) {
        container.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-8">No hay gastos que coincidan con los filtros seleccionados.</p>';
        return;
    }

    let grupos = {};
    itemsFiltrados.forEach(item => {
        if (!grupos[item.categoria]) grupos[item.categoria] = [];
        grupos[item.categoria].push(item);
    });

    const ordenGuardado = window.appState.ordenItemsCategoria || {};
    Object.keys(grupos).forEach(cat => {
        if (ordenGuardado[cat]) {
            const idsOrden = ordenGuardado[cat];
            grupos[cat].sort((a, b) => {
                let idxA = idsOrden.indexOf(a.id);
                let idxB = idsOrden.indexOf(b.id);
                if (idxA === -1) idxA = 999;
                if (idxB === -1) idxB = 999;
                return idxA - idxB;
            });
        }
    });

    const catList = window.appState.categorias || categoriasDefault;
    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2 });

    Object.entries(grupos).forEach(([categoria, gastosCat]) => {
        const catObj = catList.find(c => c.nombre === categoria);
        const colorCat = catObj ? catObj.color : '#64748b';
        const totalCat = gastosCat.reduce((acc, g) => acc + g.monto, 0)
            + (gastosCat.find(g => g.saldoAnteriorBloque !== undefined)?.saldoAnteriorBloque || 0);
        const itemPagoBloque = gastosCat.find(g => g.montoDebidoBloque !== undefined);
        const totalDebidoBloque = itemPagoBloque?.montoDebidoBloque ?? totalCat;
        const totalPagadoBloque = itemPagoBloque?.montoPagadoBloque ?? totalDebidoBloque;
        const isAbierto = window.categoriasAbiertasMap[categoria] === true;
        const esBloque = catObj ? catObj.vencimientoUnicoEnBloque : false;
        const estadoPagoBloque = totalPagadoBloque >= totalDebidoBloque
            ? 'TOTAL'
            : totalPagadoBloque > 0 ? 'PAGO PARCIAL' : 'PENDIENTE';
        const colorEstadoPagoBloque = estadoPagoBloque === 'TOTAL'
            ? 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60'
            : estadoPagoBloque === 'PAGO PARCIAL'
                ? 'text-amber-400 bg-amber-950/50 border-amber-800/60'
                : 'text-rose-400 bg-rose-950/50 border-rose-800/60';

        let vencimientoGrupo = '';
        gastosCat.forEach(g => { if (g.vencimiento && !vencimientoGrupo) vencimientoGrupo = g.vencimiento; });
        const gridKeyFirst = `${gastosCat[0]?.id}_${currentMonth}`;
        const vencimientoValFirst = window.appState.excepcionesVencimientoGrid?.[gridKeyFirst] !== undefined ? window.appState.excepcionesVencimientoGrid[gridKeyFirst] : vencimientoGrupo;
        
        const estadoValFirst = gastosCat[0]?.estado || 'PENDIENTE';

        let rowsHtml = '';
        if (isAbierto) {
            rowsHtml = gastosCat.map(g => {
                const gridKey = `${g.id}_${currentMonth}`;
                const vencimientoVal = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined ? window.appState.excepcionesVencimientoGrid[gridKey] : (g.vencimiento || '');
                const estadoVal = g.estado || 'PENDIENTE';

                const subcatIdActual = window.appState.excepcionesSubcategoria?.[gridKey] !== undefined ? window.appState.excepcionesSubcategoria[gridKey] : g.subcategoriaId;
                const subcatObj = (window.appState.subcategorias || []).find(s => s.id === subcatIdActual);
                const subcatNombre = subcatObj ? subcatObj.nombre : '-';

                const pctIndiv = window.appState.aumentosIndividuales?.[g.id];
                let pctDisplay = '-';
                if (pctIndiv !== undefined && pctIndiv !== '') {
                    pctDisplay = `${pctIndiv}% <span class="text-[10px] text-amber-400" title="Individual">(Ind)</span>`;
                } else if (subcatObj && subcatObj.porcentajeAumento) {
                    pctDisplay = `${subcatObj.porcentajeAumento}% <span class="text-[10px] text-slate-500" title="Subcategoría">(Sub)</span>`;
                }

                let vencimientoCellHtml = '';
                let estadoCellHtml = '';
                let montoPagadoCellHtml = '';

                if (!esBloque) {
                    vencimientoCellHtml = `
                        <td class="px-4 py-3">
                            <input type="date" value="${vencimientoVal}" onchange="actualizarVencimientoGrid('${g.id}', '${currentMonth}', this.value, '${categoria}')" class="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs ${vencimientoVal ? 'text-amber-400 font-bold border-amber-800/60 bg-amber-950/60' : 'text-slate-300'} focus:outline-none">
                        </td>
                    `;
                    estadoCellHtml = `
                        <td class="px-4 py-3 text-center">
                            <select onchange="actualizarEstadoGasto('${g.id}', '${currentMonth}', this.value)" class="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[11px] font-bold ${estadoVal === 'PAGADO' ? 'text-emerald-400' : (estadoVal === 'VENCIDO' ? 'text-rose-400' : 'text-amber-500')} focus:outline-none cursor-pointer">
                                <option value="PENDIENTE" ${estadoVal === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                                <option value="PAGADO" ${estadoVal === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
                                <option value="VENCIDO" ${estadoVal === 'VENCIDO' ? 'selected' : ''}>VENCIDO</option>
                            </select>
                        </td>
                    `;
                    montoPagadoCellHtml = `
                        <td class="px-4 py-3 text-right">
                            <input type="number" min="0" max="${g.monto}" step="0.01" value="${g.montoPagado ?? g.monto}" data-id="${g.idPago || g.id}" onchange="actualizarMontoPagadoPlanilla(this, false)" ${window.esUsuarioEditor() ? '' : 'disabled'} class="w-28 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-right text-xs font-bold text-emerald-300 focus:outline-none focus:border-emerald-500 disabled:opacity-60" aria-label="Monto pagado de ${escapeHtml(g.concepto)}">
                        </td>
                    `;
                }

                return `
                    <tr draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropItem(event, '${categoria}')" data-id="${g.id}" class="hover:bg-slate-900/40 transition-colors border-b border-slate-800/40 text-xs cursor-default">
                        <td class="px-4 py-3 text-white font-bold flex items-center gap-2">
                            <span class="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1"><i class="fa-solid fa-grip-vertical"></i></span>
                            ${escapeHtml(g.concepto)}
                        </td>
                        <td class="px-4 py-3 text-slate-400">${g.tipo}</td>
                        <td class="px-4 py-3 text-slate-300 font-medium">${subcatNombre}</td>
                        ${vencimientoCellHtml}
                        <td class="px-4 py-3 font-mono text-amber-300 font-bold">${pctDisplay}</td>
                        <td class="px-4 py-3 text-right font-extrabold text-white">${fmt(g.monto)}</td>
                        ${montoPagadoCellHtml}
                        ${estadoCellHtml}
                        <td class="px-4 py-3 text-right">
                            <div class="flex items-center justify-end gap-2">
                                <button onclick="editGasto('${g.id}')" class="text-slate-400 hover:text-white p-1" title="Editar"><i class="fa-solid fa-pen text-xs"></i></button>
                                <button onclick="deleteGasto('${g.id}')" class="text-slate-400 hover:text-rose-400 p-1" title="Eliminar"><i class="fa-solid fa-trash-can text-xs"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        let controlesCabeceraHtml = '';
        if (esBloque) {
            controlesCabeceraHtml = `
                <div class="flex flex-wrap items-center gap-2" onclick="event.stopPropagation()">
                    <div class="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Venc:</span>
                        <input type="date" value="${vencimientoValFirst || ''}" onchange="actualizarVencimientoGrid('${gastosCat[0]?.id}', '${currentMonth}', this.value, '${categoria}')" class="bg-transparent text-amber-400 font-bold text-xs outline-none cursor-pointer">
                    </div>
                    <div class="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Estado:</span>
                        <select onchange="actualizarEstadoGastoMasivo('${gastosCat[0]?.id}', this.value)" class="bg-transparent text-xs font-bold ${estadoValFirst === 'PAGADO' ? 'text-emerald-400' : (estadoValFirst === 'VENCIDO' ? 'text-rose-400' : 'text-amber-500')} outline-none cursor-pointer">
                            <option value="PENDIENTE" ${estadoValFirst === 'PENDIENTE' ? 'selected' : ''}>PENDIENTE</option>
                            <option value="PAGADO" ${estadoValFirst === 'PAGADO' ? 'selected' : ''}>PAGADO</option>
                            <option value="VENCIDO" ${estadoValFirst === 'VENCIDO' ? 'selected' : ''}>VENCIDO</option>
                        </select>
                    </div>
                    <label class="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 rounded-lg px-2 py-1">
                        <span class="text-[10px] text-slate-400 font-bold uppercase">Pagado:</span>
                        <input type="number" min="0" max="${totalDebidoBloque}" step="0.01" value="${totalPagadoBloque}" data-categoria="${encodeURIComponent(categoria)}" onchange="actualizarMontoPagadoPlanilla(this, true)" ${window.esUsuarioEditor() ? '' : 'disabled'} class="w-24 bg-transparent text-emerald-300 font-bold text-xs outline-none disabled:opacity-60" aria-label="Monto pagado de ${categoria}">
                    </label>
                    <span class="text-[10px] font-bold border px-2 py-1 rounded-full ${colorEstadoPagoBloque}">${estadoPagoBloque}</span>
                </div>
            `;
        }

        container.innerHTML += `
            <div class="bg-slate-900/60 rounded-xl overflow-hidden border border-slate-800/80 mb-3">
                <div class="px-4 py-3 bg-slate-900/90 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 cursor-pointer select-none" onclick="toggleCategoriaAcordeon('${categoria}')">
                    <div class="flex items-center gap-3 flex-wrap">
                        <i class="fa-solid fa-chevron-${isAbierto ? 'down' : 'right'} text-xs text-slate-400"></i>
                        <span class="w-3 h-3 rounded-full" style="background-color: ${colorCat};"></span>
                        <span class="text-sm font-bold text-white">${categoria}</span>
                        <span class="text-[11px] bg-slate-800 text-slate-400 px-2.5 py-0.5 rounded-full font-semibold">${gastosCat.length} ítem${gastosCat.length === 1 ? '' : 's'}</span>
                        ${controlesCabeceraHtml}
                    </div>
                    <span class="text-sm font-extrabold text-emerald-400 shrink-0">TOTAL: ${fmt(esBloque ? totalDebidoBloque : totalCat)}</span>
                </div>
                ${isAbierto ? `
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="table-header text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                    <th class="px-4 py-3">CONCEPTO</th>
                                    <th class="px-4 py-3">TIPO / CUOTAS</th>
                                    <th class="px-4 py-3">SUB CATEGORIA</th>
                                    ${!esBloque ? '<th class="px-4 py-3">VENCIMIENTO</th>' : ''}
                                    <th class="px-4 py-3">% INFLACION</th>
                                    <th class="px-4 py-3 text-right">MONTO</th>
                                    ${!esBloque ? '<th class="px-4 py-3 text-right">MONTO PAGADO</th>' : ''}
                                    ${!esBloque ? '<th class="px-4 py-3 text-center">ESTADO</th>' : ''}
                                    <th class="px-4 py-3 text-right">ACCIONES</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-800/60 text-sm font-medium">
                                ${rowsHtml}
                            </tbody>
                        </table>
                    </div>
                ` : ''}
            </div>
        `;
    });
};
