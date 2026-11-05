import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, onSnapshot, collection, addDoc, query, where, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

let unsubscribeSnapshot = null;
let unsubscribeHormiga = null;
let unsubscribeInvitaciones = null;

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
    
    if (user.email === "nicolaslmancuso@gmail.com") {
        return true;
    }

    const grupoInfo = window.appState?.grupoInfo;
    
    if (!window.currentGrupo || window.currentGrupo === `personal_${user.uid}`) {
        return true;
    }

    if (!grupoInfo) return false;

    if (grupoInfo.adminUid === user.uid) return true;

    const miembros = grupoInfo.miembros || {};
    const emailActual = user.email.toLowerCase();
    
    let rolMiembro = null;
    if (miembros[user.uid]) {
        rolMiembro = miembros[user.uid].rol;
    } else {
        const miembroEncontrado = Object.values(miembros).find(m => (m.email || "").toLowerCase() === emailActual);
        if (miembroEncontrado) {
            rolMiembro = miembroEncontrado.rol;
        }
    }

    if (rolMiembro === 'lector') {
        return false;
    }

    return rolMiembro !== 'lector';
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
            #appContent select:not(#selectorVista), 
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

        const docIdPersonal = `personal_${user.uid}`;

        if (typeof db !== 'undefined') {
            if (window.appState?.grupoInfo?.miembros?.[uidMiembro]) {
                window.appState.grupoInfo.miembros[uidMiembro].rol = nuevoRol;
            }
            
            await updateDoc(doc(db, "app_data", docIdPersonal), {
                [`appState.grupoInfo.miembros.${uidMiembro}.rol`]: nuevoRol
            });

            console.log(`Rol actualizado en Firebase para ${uidMiembro} -> ${nuevoRol}`);
            
            if (typeof window.showToast === 'function') {
                window.showToast(`Rol actualizado a ${nuevoRol.toUpperCase()} correctamente`, 'success');
            } else {
                window.mostrarNotificacion("¡Éxito!", `Rol actualizado a ${nuevoRol.toUpperCase()} correctamente.`, "exito");
            }

            if (typeof window.renderModalGrupo === 'function') {
                window.renderModalGrupo();
            } else if (typeof window.renderApp === 'function') {
                window.renderApp();
            }
        }
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

const dInit = new Date();
const defaultLocalMonth = `${dInit.getFullYear()}-${String(dInit.getMonth() + 1).padStart(2, '0')}`;

const appStateLimpioBase = {
    currentMonth: defaultLocalMonth,
    gastos: [],
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

if (auth.currentUser) {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.add('hidden');
}

window.appState = window.appState || JSON.parse(JSON.stringify(appStateLimpioBase));

window.hormigaState = window.hormigaState || {
    gastos: [],
    categorias: JSON.parse(JSON.stringify(categoriasHormigaDefault)),
    sortColumn: 'fecha',
    sortAscending: false,
    filtrosCategorias: [],
    filtrosHormigaCatGrafico: []
};

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
};

window.showApp = function() {
    const login = document.getElementById('loginOverlay');
    const loading = document.getElementById('loadingOverlay');
    const appContent = document.getElementById('appContent');
    if (login) login.classList.add('hidden');
    if (loading) loading.classList.add('hidden');
    if (appContent) appContent.classList.remove('hidden');
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
        const emailActual = user.email.toLowerCase();

        const qAceptados = query(
            collection(db, "invitaciones"),
            where("destinatarioEmail", "==", emailActual),
            where("estado", "==", "ACEPTADO")
        );
        const snapAceptados = await getDocs(qAceptados);
        
        const mapaInvitantes = {};
        snapAceptados.forEach(d => {
            const data = d.data();
            if (data.grupoId) {
                mapaInvitantes[data.grupoId] = data.remitenteEmail;
            }
        });

        const gruposPermitidosIds = new Set(Object.keys(mapaInvitantes));

        const querySnapshot = await getDocs(collection(db, "app_data"));
        const mapaCreadores = {};

        querySnapshot.forEach((docSnap) => {
            if (docSnap.id.startsWith("personal_")) return;

            const docData = docSnap.data();
            const grupoInfo = docData.appState?.grupoInfo;

            if (grupoInfo) {
                const miembros = grupoInfo.miembros || {};
                const esMiembroUID = miembros[user.uid] !== undefined;
                const esMiembroEmail = Object.values(miembros).some(m => (m.email || "").toLowerCase() === emailActual);

                if (esMiembroUID || esMiembroEmail || gruposPermitidosIds.has(docSnap.id)) {
                    gruposPermitidosIds.add(docSnap.id);
                    if (grupoInfo.adminUid && miembros[grupoInfo.adminUid]) {
                        mapaCreadores[docSnap.id] = miembros[grupoInfo.adminUid].email;
                    }
                }
            }
        });

        selector.innerHTML = '';

        const optPersonal = document.createElement('option');
        optPersonal.value = "personal";
        optPersonal.textContent = "🏠 Mi Espacio Personal";
        selector.appendChild(optPersonal);

        for (const grupoId of gruposPermitidosIds) {
            const grupoRef = doc(db, "app_data", grupoId);
            const grupoSnap = await getDoc(grupoRef);

            if (grupoSnap.exists()) {
                const docData = grupoSnap.data();
                const grupoInfo = docData.appState?.grupoInfo;

                let hostEmail = mapaInvitantes[grupoId] || mapaCreadores[grupoId] || '';
                let usuarioTag = hostEmail ? ` (${hostEmail.split('@')[0]})` : '';

                const optGrupo = document.createElement('option');
                optGrupo.value = grupoId;
                optGrupo.textContent = `👥 ${grupoInfo?.nombreGrupo || 'Grupo Control de Gastos'}${usuarioTag}`;
                selector.appendChild(optGrupo);
            }
        }

        const existeOpcion = Array.from(selector.options).some(opt => opt.value === valorGuardadoPrevio);
        selector.value = existeOpcion ? valorGuardadoPrevio : "personal";

    } catch (e) {
        console.error("Error al poblar los grupos en el selector:", e);
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
    const emailEl = document.getElementById('registerEmail');
    const passEl = document.getElementById('registerPassword');
    const loginError = document.getElementById('loginError');

    if (!emailEl || !passEl) return;
    const email = emailEl.value.trim().toLowerCase();
    const pass = passEl.value;

    if (loginError) loginError.classList.add('hidden');
    window.showLoading();

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        const linkVerificacion = `https://nlmancuso.github.io/gastos/?verified=true&uid=${user.uid}`;

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send('service_hib3aln', 'template_j01kfcn', {
                    to_email: email,
                    to_name: email.split('@')[0],
                    link_verificacion: linkVerificacion
                });
            }
        } catch (emailErr) {
            console.error("Error al enviar email mediante EmailJS:", emailErr);
        }

        const personalDocId = `personal_${user.uid}`;
        const personalDocRef = doc(db, "app_data", personalDocId);

        localStorage.setItem("ultima_vista_id", "personal");

        await setDoc(personalDocRef, {
            appState: JSON.parse(JSON.stringify(appStateLimpioBase)),
            creadoEl: new Date().toISOString(),
            emailVerificado: true
        });

        window.showApp();
        window.mostrarNotificacion(
            "¡Cuenta creada con éxito!",
            "Tu cuenta ha sido registrada y verificada automáticamente para el entorno de pruebas.",
            "exito"
        );
    } catch (error) {
        console.error("Error al registrar usuario:", error);
        window.showLogin();
        window.mostrarTabAuth('register');
        if (loginError) {
            let msg = "No se pudo crear la cuenta.";
            if (error.code === 'auth/email-already-in-use') msg = "El correo ya se encuentra registrado.";
            if (error.code === 'auth/weak-password') msg = "La contraseña debe tener al menos 6 caracteres.";
            loginError.innerText = msg;
            loginError.classList.remove('hidden');
        }
    }
};

window.cerrarSesion = function() {
    window.showLogin();
    signOut(auth);
};

async function verificarDesdeURL() {
    const urlParams = new URLSearchParams(window.location.search);
    const isVerified = urlParams.get('verified') === 'true';
    const uid = urlParams.get('uid');

    if (isVerified && uid) {
        try {
            const personalDocRef = doc(db, "app_data", `personal_${uid}`);
            await setDoc(personalDocRef, { emailVerificado: true }, { merge: true });

            window.mostrarNotificacion(
                "¡Cuenta verificada con éxito!",
                "Tu correo ha sido confirmado con éxito. Ya podés iniciar sesión.",
                "exito",
                () => { window.location.replace(window.location.pathname); }
            );
        } catch (e) {
            console.error("Error al actualizar verificación en base de datos:", e);
        }
    }
}

verificarDesdeURL();

window.cambiarVistaSeleccionada = async function(vistaId) {
    if (!vistaId) return;
    
    localStorage.setItem("ultima_vista_id", vistaId);
    window.showLoading();

    let targetDocId = (vistaId === "personal") ? `personal_${auth.currentUser.uid}` : vistaId;

    window.currentGrupo = targetDocId;
    window.docRef = doc(db, "app_data", targetDocId);

    if (unsubscribeSnapshot) unsubscribeSnapshot();

    unsubscribeSnapshot = onSnapshot(window.docRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.appState) {
                window.appState = { ...window.appState, ...data.appState };
            }
        } else {
            if (targetDocId.startsWith("personal_")) {
                window.appState = JSON.parse(JSON.stringify(appStateLimpioBase));
                await setDoc(window.docRef, { 
                    appState: window.appState, 
                    creadoEl: new Date().toISOString() 
                });
            } else {
                window.saveDataToCloud();
            }
        }
        triggerPageRenders();
        window.showApp();
    });
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.showLoading();

        const esAdminPrincipal = user.email === "nicolaslmancuso@gmail.com";
        let estaVerificado = esAdminPrincipal;

        if (!esAdminPrincipal) {
            try {
                const docRef = doc(db, "app_data", `personal_${user.uid}`);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    estaVerificado = docSnap.data().emailVerificado === true;
                }
            } catch (e) {
                console.error("Error al verificar estado en Firestore:", e);
            }
        }

        if (!estaVerificado) {
            await signOut(auth);
            window.showLogin();
            window.mostrarNotificacion(
                "Cuenta pendiente de activación",
                "Tu cuenta aún no ha sido verificada. Por favor hacé clic en el botón del correo que te enviamos para poder ingresar.",
                "info"
            );
            return;
        }

        const dLocal = new Date();
        const currentLocalMonthStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}`;
        
        let vistaGuardada = localStorage.getItem("ultima_vista_id") || "personal";
        await window.poblarSelectorVistas(vistaGuardada);

        let targetDocId = (vistaGuardada === "personal") ? `personal_${user.uid}` : vistaGuardada;
        const docRef = doc(db, "app_data", targetDocId);
        window.docRef = docRef;
        window.currentGrupo = targetDocId;
        window.docHormigaRef = doc(db, "app_data_hormiga", user.uid);

        if (unsubscribeSnapshot) unsubscribeSnapshot();
        if (unsubscribeHormiga) unsubscribeHormiga();

        unsubscribeSnapshot = onSnapshot(docRef, async (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.appState) {
                    window.appState = { ...window.appState, ...data.appState };
                    if (!window.appState.subcategorias) window.appState.subcategorias = JSON.parse(JSON.stringify(subcategoriasDefault));
                    if (!window.appState.aumentosIndividuales) window.appState.aumentosIndividuales = {};
                    if (!window.appState.excepcionesEliminacionSoloMes) window.appState.excepcionesEliminacionSoloMes = {};
                    if (!window.appState.currentMonth) window.appState.currentMonth = currentLocalMonthStr;
                }
            } else {
                if (targetDocId.startsWith("personal_")) {
                    window.appState = JSON.parse(JSON.stringify(appStateLimpioBase));
                    await setDoc(docRef, { 
                        appState: window.appState, 
                        creadoEl: new Date().toISOString() 
                    });
                } else {
                    window.saveDataToCloud();
                }
            }
            triggerPageRenders();
            window.showApp();
        });

        unsubscribeHormiga = onSnapshot(window.docHormigaRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.hormigaState) {
                    window.hormigaState = { ...window.hormigaState, ...data.hormigaState };
                } else {
                    window.hormigaState = {
                        gastos: [],
                        categorias: JSON.parse(JSON.stringify(categoriasHormigaDefault)),
                        sortColumn: 'fecha',
                        sortAscending: false,
                        filtrosCategorias: [],
                        filtrosHormigaCatGrafico: []
                    };
                }
            } else {
                window.hormigaState = {
                    gastos: [],
                    categorias: JSON.parse(JSON.stringify(categoriasHormigaDefault)),
                    sortColumn: 'fecha',
                    sortAscending: false,
                    filtrosCategorias: [],
                    filtrosHormigaCatGrafico: []
                };
                window.saveHormigaDataToCloud();
            }
            triggerPageRenders();
        });

        escucharInvitacionesUsuario(user.email);

        const userName = user.email ? user.email.split('@')[0] : 'Usuario';
        const grupoDisplay = document.getElementById('grupoStatus');
        if (grupoDisplay) grupoDisplay.innerHTML = `👤 ${userName}`;
    } else {
        window.showLogin();
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        if (unsubscribeHormiga) { unsubscribeHormiga(); unsubscribeHormiga = null; }
        if (unsubscribeInvitaciones) { unsubscribeInvitaciones(); unsubscribeInvitaciones = null; }
    }
});

function escucharInvitacionesUsuario(userEmail) {
    if (unsubscribeInvitaciones) unsubscribeInvitaciones();

    const q = query(collection(db, "invitaciones"));

    unsubscribeInvitaciones = onSnapshot(q, (snapshot) => {
        const invitaciones = [];
        const emailActual = userEmail.trim().toLowerCase();

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const destino = (data.destinatarioEmail || "").trim().toLowerCase();

            if (destino === emailActual) {
                if (data.estado === "PENDIENTE" || data.estado === "ACEPTADO") {
                    invitaciones.push({ id: docSnap.id, ...data });
                }
            }
        });
        window.renderBandejaNotificaciones(invitaciones);
    });
}

window.toggleBandejaNotificaciones = function() {
    const drop = document.getElementById('dropdownNotificaciones');
    if (drop) drop.classList.toggle('hidden');
};

window.renderBandejaNotificaciones = function(invitaciones) {
    const badge = document.getElementById('badgeNotificaciones');
    const lista = document.getElementById('listaNotificaciones');
    if (!badge || !lista) return;

    const pendientes = invitaciones.filter(i => i.estado === "PENDIENTE");

    if (pendientes.length > 0) {
        badge.innerText = pendientes.length;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }

    if (invitaciones.length > 0) {
        lista.innerHTML = '';
        invitaciones.forEach(inv => {
            if (inv.estado === "PENDIENTE") {
                lista.innerHTML += `
                    <div class="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
                        <p class="text-slate-300">
                            <strong class="text-amber-400">${inv.remitenteEmail}</strong> te invitó a unirte a <strong>${inv.grupoNombre}</strong> (${inv.rol}).
                        </p>
                        <div class="flex gap-2 justify-end">
                            <button onclick="responderInvitacion('${inv.id}', '${inv.grupoId}', '${inv.rol}', 'RECHAZADO')" class="px-2.5 py-1 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-lg font-semibold text-[11px]">
                                Rechazar
                            </button>
                            <button onclick="responderInvitacion('${inv.id}', '${inv.grupoId}', '${inv.rol}', 'ACEPTADO')" class="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg font-bold text-[11px]">
                                Aceptar
                            </button>
                        </div>
                    </div>
                `;
            } else if (inv.estado === "ACEPTADO") {
                lista.innerHTML += `
                    <div class="p-3 bg-slate-950/60 rounded-xl border border-slate-800/60 text-xs space-y-2">
                        <div class="flex items-center justify-between">
                            <span class="text-emerald-400 font-bold text-[10px] uppercase tracking-wider">✓ Pertenece al grupo</span>
                            <span class="text-slate-500 text-[10px]">${inv.rol}</span>
                        </div>
                        <p class="text-slate-300 text-[11px]">
                            <strong>${inv.grupoNombre}</strong> (Invitado por ${inv.remitenteEmail})
                        </p>
                        <div class="flex justify-end">
                            <button onclick="salirDelGrupoConId('${inv.id}', '${inv.grupoId}')" class="px-2 py-0.5 bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 rounded-lg font-medium text-[10px] transition-colors">
                                Salir del grupo
                            </button>
                        </div>
                    </div>
                `;
            }
        });
    } else {
        lista.innerHTML = `<p class="text-xs text-slate-500 text-center py-2">No tenés notificaciones pendientes.</p>`;
    }
};

window.responderInvitacion = async function(invitacionId, grupoId, rol, nuevoEstado) {
    try {
        const user = auth.currentUser;
        const invRef = doc(db, "invitaciones", invitacionId);
        await updateDoc(invRef, { estado: nuevoEstado });

        const grupoRef = doc(db, "app_data", grupoId);
        const grupoSnap = await getDoc(grupoRef);

        if (grupoSnap.exists()) {
            const data = grupoSnap.data();
            const appState = data.appState || {};
            const grupoInfo = appState.grupoInfo || { miembros: {}, invitacionesPendientes: [] };
            
            if (!grupoInfo.miembros) grupoInfo.miembros = {};
            
            if (grupoInfo.invitacionesPendientes) {
                grupoInfo.invitacionesPendientes = grupoInfo.invitacionesPendientes.filter(
                    inv => inv.email.toLowerCase() !== user.email.toLowerCase()
                );
            }

            if (nuevoEstado === 'ACEPTADO') {
                grupoInfo.miembros[user.uid] = { email: user.email, rol: rol };
            }

            await updateDoc(grupoRef, { "appState.grupoInfo": grupoInfo });
        }

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
    }
};

window.salirDelGrupoConId = async function(invitacionId, grupoId) {
    window.mostrarNotificacion(
        "Confirmar salida",
        "¿Deseás salir de este grupo? Ya no tendrás acceso a sus datos.",
        "error",
        async () => {
            try {
                const user = auth.currentUser;

                if (invitacionId) {
                    const invRef = doc(db, "invitaciones", invitacionId);
                    await updateDoc(invRef, { estado: "RECHAZADO" });
                }

                const grupoRef = doc(db, "app_data", grupoId);
                const grupoSnap = await getDoc(grupoRef);

                if (grupoSnap.exists()) {
                    const data = grupoSnap.data();
                    const miembros = data.appState.grupoInfo?.miembros || {};
                    delete miembros[user.uid];
                    await updateDoc(grupoRef, { "appState.grupoInfo.miembros": miembros });
                }

                await window.poblarSelectorVistas("personal");
                window.cambiarVistaSeleccionada("personal");
            } catch (e) {
                console.error("Error al salir del grupo:", e);
            }
        }
    );
};

window.salirDelGrupoActual = async function() {
    window.salirDelGrupoConId("", window.currentGrupo);
};

window.saveDataToCloud = async function() {
    try {
        if (!window.docRef) return;
        await setDoc(window.docRef, { appState: JSON.parse(JSON.stringify(window.appState)) });
    } catch (e) { console.error(e); }
};

window.saveHormigaDataToCloud = async function() {
    try {
        if (!window.docHormigaRef) return;
        await setDoc(window.docHormigaRef, { hormigaState: JSON.parse(JSON.stringify(window.hormigaState)) });
    } catch (e) { console.error("Error guardando hormiga:", e); }
};

function actualizarVisibilidadBotonesAdmin() {
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const userUid = user ? user.uid : null;

    if (window.appState && !window.appState.grupoInfo && userUid) {
        window.appState.grupoInfo = {
            adminUid: userUid,
            miembros: {
                [userUid]: { email: userEmail, rol: 'admin' }
            },
            invitacionesPendientes: []
        };
    }

    const grupoInfo = window.appState ? window.appState.grupoInfo : null;
    const esAdmin = userEmail === "nicolaslmancuso@gmail.com" || !grupoInfo || (grupoInfo && grupoInfo.adminUid === userUid);

    const btnConfigCat = document.getElementById('btnConfigCat');
    const btnGestionGrupo = document.getElementById('btnGestionGrupo');

    if (esAdmin) {
        if (btnConfigCat) { btnConfigCat.classList.remove('hidden'); btnConfigCat.style.display = 'inline-flex'; }
        if (btnGestionGrupo) { btnGestionGrupo.classList.remove('hidden'); btnGestionGrupo.style.display = 'inline-flex'; }
    } else {
        if (btnConfigCat) { btnConfigCat.classList.add('hidden'); btnConfigCat.style.display = 'none'; }
        if (btnGestionGrupo) { btnGestionGrupo.classList.add('hidden'); btnGestionGrupo.style.display = 'none'; }
    }
}

function triggerPageRenders() {
    actualizarVisibilidadBotonesAdmin();
    if (typeof renderApp === 'function') renderApp();
    if (typeof renderCharts === 'function') renderCharts();
    if (typeof renderSaldosApp === 'function') renderSaldosApp();
    if (typeof renderHormigaApp === 'function') renderHormigaApp();
}

window.navigateMonth = function(direction) {
    let [year, month] = (window.appState.currentMonth || defaultLocalMonth).split('-').map(Number);
    month += direction;
    if (month > 12) { month = 1; year++; } if (month < 1) { month = 12; year--; }
    window.appState.currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    triggerPageRenders();
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
        txtDetalle.innerHTML = `¿Realmente deseás eliminar el gasto <strong class="text-white">"${gasto ? gasto.concepto : ''}"</strong> de forma <strong class="text-amber-400">${textoModalidad}</strong>?`;
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
    renderMiembrosGrupo();
    const modal = document.getElementById('modalGestionGrupo');
    if (modal) modal.classList.remove('hidden');
};

function renderMiembrosGrupo() {
    const container = document.getElementById('listaMiembrosGrupo');
    const containerPendientes = document.getElementById('containerInvitacionesPendientes');
    const listaPendientes = document.getElementById('listaInvitacionesPendientes');
    const badgeCant = document.getElementById('badgeCantMiembros');
    if (!container) return;

    container.innerHTML = '';
    
    const userEmail = auth.currentUser ? auth.currentUser.email : 'usuario@ejemplo.com';
    const userUid = auth.currentUser ? auth.currentUser.uid : 'uid_actual';

    if (!window.appState.grupoInfo) {
        window.appState.grupoInfo = {
            adminUid: userUid,
            miembros: {
                [userUid]: { email: userEmail, rol: 'admin' }
            },
            invitacionesPendientes: []
        };
    }

    const grupoInfo = window.appState.grupoInfo;
    const esAdmin = userEmail === "nicolaslmancuso@gmail.com" || grupoInfo.adminUid === userUid;

    const formInvitar = document.getElementById('containerFormInvitar');
    if (formInvitar) {
        if (esAdmin) formInvitar.classList.remove('hidden');
        else formInvitar.classList.add('hidden');
    }

    const miembrosArr = Object.entries(grupoInfo.miembros || {});
    if (badgeCant) badgeCant.innerText = `${miembrosArr.length} activo(s)`;

    miembrosArr.forEach(([uid, info]) => {
        const esElAdmin = uid === grupoInfo.adminUid || info.email === "nicolaslmancuso@gmail.com";
        const esYoMismo = uid === userUid;

        container.innerHTML += `
            <div class="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <div class="flex items-center gap-2.5">
                    <div class="w-7 h-7 rounded-lg ${esElAdmin ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60' : 'bg-slate-900 text-slate-400'} flex items-center justify-center font-bold text-[11px]">
                        <i class="fa-solid ${esElAdmin ? 'fa-crown' : 'fa-user'}"></i>
                    </div>
                    <div>
                        <span class="font-bold text-white block">${info.email} ${esYoMismo ? '<span class="text-[10px] text-emerald-400 font-normal">(Tú)</span>' : ''}</span>
                        <span class="text-[10px] text-slate-500 uppercase font-semibold">${esElAdmin ? 'admin' : (info.rol || 'miembro')}</span>
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
            </div>
        `;
    });

    const pendientes = grupoInfo.invitacionesPendientes || [];
    if (pendientes.length > 0 && listaPendientes && containerPendientes) {
        containerPendientes.classList.remove('hidden');
        listaPendientes.innerHTML = '';
        pendientes.forEach((inv, idx) => {
            listaPendientes.innerHTML += `
                <div class="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs">
                    <span class="text-slate-400">${inv.email} <span class="text-[10px] text-amber-400">(${inv.rol})</span></span>
                    ${esAdmin ? `<button onclick="cancelarInvitacion(${idx})" class="text-rose-400 hover:text-rose-300 p-1"><i class="fa-solid fa-xmark"></i></button>` : ''}
                </div>
            `;
        });
    } else if (containerPendientes) {
        containerPendientes.classList.add('hidden');
    }
}

window.handleInvitarMiembro = async function(e) {
    if (e) e.preventDefault();
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso denegado", "Tu cuenta tiene permisos de solo lectura.", "error");
        return;
    }
    const emailInput = document.getElementById('inputInvitarEmail');
    const rolSelect = document.getElementById('selectInvitarRol');
    if (!emailInput) return;

    const email = emailInput.value.trim().toLowerCase();
    const rol = rolSelect ? rolSelect.value : 'editor';
    if (!email) return;

    if (!window.appState.grupoInfo) {
        window.appState.grupoInfo = { adminUid: auth.currentUser.uid, miembros: {}, invitacionesPendientes: [] };
    }
    if (!window.appState.grupoInfo.invitacionesPendientes) {
        window.appState.grupoInfo.invitacionesPendientes = [];
    }

    const yaEsMiembro = Object.values(window.appState.grupoInfo.miembros || {}).some(m => m.email === email);
    if (yaEsMiembro) {
        window.mostrarNotificacion("Aviso", "Ese usuario ya pertenece al grupo.", "info");
        return;
    }

    try {
        await addDoc(collection(db, "invitaciones"), {
            grupoId: window.currentGrupo,
            grupoNombre: "Grupo Control de Gastos",
            remitenteEmail: auth.currentUser.email,
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
                remitente: auth.currentUser.email
            });
        }

        window.appState.grupoInfo.invitacionesPendientes.push({ email, rol, fecha: new Date().toISOString() });
        emailInput.value = '';

        window.saveDataToCloud();
        renderMiembrosGrupo();
        window.mostrarNotificacion("¡Invitación enviada!", `Se envió con éxito la invitación a ${email}.`, "exito");
    } catch (err) {
        console.error("Error al enviar invitación:", err);
    }
};

window.removerMiembroGrupo = function(uid) {
    if (!window.esUsuarioEditor()) {
        window.mostrarNotificacion("Acceso denegado", "Tu cuenta tiene permisos de solo lectura.", "error");
        return;
    }
    window.mostrarNotificacion(
        "Quitar integrante",
        "¿Seguro que deseás remover a este integrante del grupo?",
        "error",
        async () => {
            try {
                if (window.appState.grupoInfo && window.appState.grupoInfo.miembros) {
                    const miembroRemovido = window.appState.grupoInfo.miembros[uid];
                    const emailRemovido = miembroRemovido ? miembroRemovido.email : null;

                    delete window.appState.grupoInfo.miembros[uid];
                    await window.saveDataToCloud();

                    if (emailRemovido) {
                        const qInv = query(
                            collection(db, "invitaciones"),
                            where("grupoId", "==", window.currentGrupo),
                            where("destinatarioEmail", "==", emailRemovido.toLowerCase())
                        );
                        const snapInv = await getDocs(qInv);
                        snapInv.forEach(async (invDoc) => {
                            await updateDoc(doc(db, "invitaciones", invDoc.id), { estado: "RECHAZADO" });
                        });
                    }

                    renderMiembrosGrupo();
                    window.mostrarNotificacion("Integrante removido", "El usuario ya no forma parte del grupo.", "exito");
                }
            } catch (e) {
                console.error("Error al remover miembro:", e);
            }
        }
    );
};

window.cancelarInvitacion = function(index) {
    if (!window.esUsuarioEditor()) return;
    if (window.appState.grupoInfo?.invitacionesPendientes) {
        window.appState.grupoInfo.invitacionesPendientes.splice(index, 1);
        window.saveDataToCloud();
        renderMiembrosGrupo();
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
        const totalCat = gastosCat.reduce((acc, g) => acc + g.monto, 0);
        const isAbierto = window.categoriasAbiertasMap[categoria] === true;
        const esBloque = catObj ? catObj.vencimientoUnicoEnBloque : false;

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
                }

                return `
                    <tr draggable="true" ondragstart="dragStart(event)" ondragover="dragOver(event)" ondrop="dropItem(event, '${categoria}')" data-id="${g.id}" class="hover:bg-slate-900/40 transition-colors border-b border-slate-800/40 text-xs cursor-default">
                        <td class="px-4 py-3 text-white font-bold flex items-center gap-2">
                            <span class="text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing p-1"><i class="fa-solid fa-grip-vertical"></i></span>
                            ${g.concepto}
                        </td>
                        <td class="px-4 py-3 text-slate-400">${g.tipo}</td>
                        <td class="px-4 py-3 text-slate-300 font-medium">${subcatNombre}</td>
                        ${vencimientoCellHtml}
                        <td class="px-4 py-3 font-mono text-amber-300 font-bold">${pctDisplay}</td>
                        <td class="px-4 py-3 text-right font-extrabold text-white">${fmt(g.monto)}</td>
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
                <div class="flex items-center gap-2" onclick="event.stopPropagation()">
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
                    <span class="text-sm font-extrabold text-emerald-400 shrink-0">TOTAL: ${fmt(totalCat)}</span>
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

window.verificarLeonelaDirecto = async function() {
    await setDoc(doc(db, "app_data", "personal_Ax3bwHzylYbXjCOGy5Y85e0Iu8R2"), { emailVerificado: true }, { merge: true });
    console.log("¡Cuenta de Leonela verificada con éxito!");
    alert("¡Cuenta verificada con éxito! Ya puede iniciar sesión.");
};

window.limpiarEspacioLeonela = async function() {
    try {
        const uidLeonela = "Ax3bwHzylYbXjCOGy5Y85e0Iu8R2";
        
        const dInit = new Date();
        const mesActualStr = `${dInit.getFullYear()}-${String(dInit.getMonth() + 1).padStart(2, '0')}`;

        const appStateLimpioTotal = {
            currentMonth: mesActualStr,
            gastos: [],
            excepcionesMonto: {},
            excepcionesCategoria: {},
            excepcionesVencimiento: {},
            excepcionesVencimientoGrid: {},
            excepcionesEstado: {},
            excepcionesEliminacion: {},
            excepcionesEliminacionSoloMes: {},
            aumentosIndividuales: {},
            subcategorias: [
                { id: "sub_alquiler", nombre: "Alquiler / Expensas", porcentajeAumento: 0 },
                { id: "sub_servicios_basicos", nombre: "Servicios Básicos (Luz/Gas/Agua)", porcentajeAumento: 0 },
                { id: "sub_conectividad", nombre: "Internet / Cable / Telefonía", porcentajeAumento: 0 },
                { id: "sub_suscripciones", nombre: "Streaming y Suscripciones", porcentajeAumento: 0 }
            ],
            sueldos: {},
            cuentasBancarias: [],
            categorias: [
                { nombre: "Gastos Fijo", color: "#10b981", esTarjeta: false, vencimientoUnicoEnBloque: false },
                { nombre: "Servicios", color: "#f97316", esTarjeta: false, vencimientoUnicoEnBloque: false },
                { nombre: "Santander Visa", color: "#ef4444", esTarjeta: true, vencimientoUnicoEnBloque: true },
                { nombre: "Ciudad Visa", color: "#3b82f6", esTarjeta: true, vencimientoUnicoEnBloque: true },
                { nombre: "Mercado Pago", color: "#f59e0b", esTarjeta: true, vencimientoUnicoEnBloque: true },
                { nombre: "Santander Amex", color: "#f97316", esTarjeta: true, vencimientoUnicoEnBloque: true }
            ],
            recurrentesPreferidos: [],
            sortColumn: 'concepto',
            sortAscending: true,
            grupoInfo: {
                adminUid: uidLeonela,
                miembros: {
                    [uidLeonela]: { email: "sosaleonela2024@gmail.com", rol: "admin" }
                },
                invitacionesPendientes: []
            }
        };

        await setDoc(doc(db, "app_data", `personal_${uidLeonela}`), {
            appState: appStateLimpioTotal,
            emailVerificado: true
        }, { merge: false });

        console.log("¡Espacio personal de Leonela limpiado por completo!");
        alert("Espacio personal de Leonela blanqueado en todos los meses con éxito.");
    } catch (e) {
        console.error("Error al limpiar espacio personal:", e);
    }
};

window.forzarVerificacionEmail = async function(emailObjetivo = "sosaleonela2024@gmail.com") {
    try {
        const querySnapshot = await getDocs(collection(db, "app_data"));
        let encontrado = false;

        querySnapshot.forEach(async (docSnap) => {
            const data = docSnap.data();
            const grupoInfo = data.appState?.grupoInfo;
            
            // Buscar si el UID pertenece al email en los miembros de su espacio personal
            if (docSnap.id.startsWith("personal_")) {
                const uidDoc = docSnap.id.replace("personal_", "");
                // Verificamos si este documento coincide o si lo buscamos por email en auth/firestore
                // O de forma directa si conoces el UID (ej: Ax3bwHzylYbXjCOGy5Y85e0Iu8R2)
                await setDoc(doc(db, "app_data", docSnap.id), { emailVerificado: true }, { merge: true });
                console.log(`Verificado documento: ${docSnap.id}`);
                encontrado = true;
            }
        });

        // Alternativa directa por el UID conocido de Leonela si ya lo tenés identificado:
        const uidLeonela = "Ax3bwHzylYbXjCOGy5Y85e0Iu8R2";
        await setDoc(doc(db, "app_data", `personal_${uidLeonela}`), { emailVerificado: true }, { merge: true });
        
        console.log(`¡Cuenta de ${emailObjetivo} forzada a VERIFICADA con éxito!`);
        alert(`¡Cuenta de ${emailObjetivo} verificada correctamente! Ya puede iniciar sesión.`);
    } catch (e) {
        console.error("Error al forzar la verificación:", e);
        alert("Hubo un error al intentar verificar la cuenta.");
    }
};
