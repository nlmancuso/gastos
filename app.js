import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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

const categoriasDefault = [
    { nombre: "Gastos Fijo", color: "#10b981", esTarjeta: false, vencimientoUnicoEnBloque: false },
    { nombre: "Servicios", color: "#f97316", esTarjeta: false, vencimientoUnicoEnBloque: false },
    { nombre: "Santander Visa", color: "#ef4444", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Ciudad Visa", color: "#3b82f6", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Mercado Pago", color: "#f59e0b", esTarjeta: true, vencimientoUnicoEnBloque: true },
    { nombre: "Santander Amex", color: "#f97316", esTarjeta: true, vencimientoUnicoEnBloque: true }
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

if (auth.currentUser) {
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.classList.add('hidden');
}

window.appState = window.appState || {
    currentMonth: defaultLocalMonth,
    gastos: [],
    excepcionesMonto: {},
    excepcionesCategoria: {},
    excepcionesVencimiento: {},
    excepcionesVencimientoGrid: {},
    excepcionesEstado: {},
    excepcionesEliminacion: {},
    sueldos: {},
    cuentasBancarias: [],
    categorias: JSON.parse(JSON.stringify(categoriasDefault)),
    recurrentesPreferidos: [],
    sortColumn: 'concepto',
    sortAscending: true
};

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

window.guardarNuevoOrdenItems = function(categoria, nuevosIdsOrdenados) {
    if (!window.appState.ordenItemsCategoria) window.appState.ordenItemsCategoria = {};
    window.appState.ordenItemsCategoria[categoria] = nuevosIdsOrdenados;
    window.saveDataToCloud();
};

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

window.cerrarSesion = function() {
    window.showLogin();
    signOut(auth);
};

onAuthStateChanged(auth, async (user) => {
    if (user) {
        window.showLoading();
        const dLocal = new Date();
        const currentLocalMonthStr = `${dLocal.getFullYear()}-${String(dLocal.getMonth() + 1).padStart(2, '0')}`;
        
        let grupoId = "grupo_mancusososa";
        if (user.email === "nicolaslmancuso@gmail.com") grupoId = "grupo_mancusososa";

        const docRef = doc(db, "app_data", grupoId);
        window.docRef = docRef;
        window.currentGrupo = grupoId;
        window.docHormigaRef = doc(db, "app_data_hormiga", user.uid);

        const userName = user.email ? user.email.split('@')[0] : 'Usuario';
        const grupoDisplay = document.getElementById('grupoStatus');
        if (grupoDisplay) grupoDisplay.innerHTML = `👤 ${userName} (${grupoId})`;

        if (unsubscribeSnapshot) unsubscribeSnapshot();
        if (unsubscribeHormiga) unsubscribeHormiga();

        unsubscribeSnapshot = onSnapshot(docRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.appState) {
                    window.appState = { ...window.appState, ...data.appState };
                    if (!window.appState.currentMonth) window.appState.currentMonth = currentLocalMonthStr;
                }
            } else {
                window.saveDataToCloud();
            }
            triggerPageRenders();
            window.showApp();
        });

        unsubscribeHormiga = onSnapshot(window.docHormigaRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.hormigaState) window.hormigaState = { ...window.hormigaState, ...data.hormigaState };
            } else {
                window.saveHormigaDataToCloud();
            }
            triggerPageRenders();
        });
    } else {
        window.showLogin();
        if (unsubscribeSnapshot) { unsubscribeSnapshot(); unsubscribeSnapshot = null; }
        if (unsubscribeHormiga) { unsubscribeHormiga(); unsubscribeHormiga = null; }
    }
});

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
    } catch (e) { console.error(e); }
};

function triggerPageRenders() {
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

window.getCalculatedDataForMonth = function(targetMonth) {
    const sueldoActual = window.getSueldoForMonth(targetMonth);
    let items = [];
    let totalFijos = 0, totalTarjetas = 0;
    let totalesPorCat = {};
    (window.appState.categorias || categoriasDefault).forEach(cat => totalesPorCat[cat.nombre] = 0);
    const hoyStr = new Date().toISOString().slice(0, 10);

    (window.appState.gastos || []).forEach(gasto => {
        const mesEliminacion = window.appState.excepcionesEliminacion?.[gasto.id];
        if (mesEliminacion && targetMonth >= mesEliminacion) {
            return;
        }

        const excepcionCatKey = `${gasto.id}_${targetMonth}`;
        const categoriaAplicar = window.appState.excepcionesCategoria?.[excepcionCatKey] ?? gasto.categoria;
        const startYM = gasto.startMonth || targetMonth;
        
        let montoAplicar = undefined;
        if (window.appState.excepcionesMonto?.[excepcionCatKey] !== undefined) {
            montoAplicar = parseFloat(window.appState.excepcionesMonto[excepcionCatKey]);
        } else {
            let [tY, tM] = targetMonth.split('-').map(Number);
            let foundMonto = null;
            for (let i = 0; i < 36; i++) {
                let checkYM = `${tY}-${String(tM).padStart(2, '0')}`;
                if (window.appState.excepcionesMonto?.[`${gasto.id}_${checkYM}`] !== undefined) {
                    foundMonto = parseFloat(window.appState.excepcionesMonto[`${gasto.id}_${checkYM}`]);
                    break;
                }
                tM--; if (tM < 1) { tM = 12; tY--; }
            }
            montoAplicar = foundMonto !== null ? foundMonto : parseFloat(gasto.monto);
        }
        
        const totalCuotas = parseInt(gasto.cuotas) || 1;
        const catObjConfig = (window.appState.categorias || categoriasDefault).find(c => c.nombre === categoriaAplicar);
        const baseEsFijo = (gasto.categoria || '').toLowerCase().includes('fijo') || (gasto.categoria || '').toLowerCase().includes('servicio');
        const catEsFijo = categoriaAplicar.toLowerCase().includes('fijo') || categoriaAplicar.toLowerCase().includes('servicio');
        const isRecurrente = gasto.isRecurrente || baseEsFijo || catEsFijo;

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

                    generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: `Cuota ${i + 1}/${totalCuotas}`, monto: montoCuota, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: false });
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
                generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: tipoStr, monto: montoAplicar, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: true });
            }
        } else {
            if (targetMonth === startYM) {
                const gridKey = `${gasto.id}_${targetMonth}`;
                const vencimientoAplicar = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined ? window.appState.excepcionesVencimientoGrid[gridKey] : (window.appState.excepcionesVencimiento?.[gridKey] !== undefined ? window.appState.excepcionesVencimiento[gridKey] : (gasto.vencimiento ?? ''));

                const estadoKey = `${gasto.id}_${targetMonth}`;
                const estadoGuardado = window.appState.excepcionesEstado?.[estadoKey];
                let estadoAplicar = estadoGuardado || (vencimientoAplicar && vencimientoAplicar !== 'dd/mm/aaaa' && hoyStr > vencimientoAplicar ? 'VENCIDO' : 'PENDIENTE');

                generatedItems.push({ id: gasto.id, concepto: gasto.concepto, categoria: categoriaAplicar, tipo: 'Débito', monto: montoAplicar, vencimiento: vencimientoAplicar, estado: estadoAplicar, isRecurrente: false });
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
