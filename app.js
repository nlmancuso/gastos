/**
 * APP.JS - Lógica principal, Firebase y formateadores globales.
 */

// ==================== FORMATEADORES Y UTILIDADES GLOBALES ====================

window.formatMoneda = function(num) {
    const val = parseFloat(num) || 0;
    return "$ " + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

window.formatFechaVencimientoSimple = function(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}`;
    }
    return fechaStr;
};

window.formatMonthDisplay = function(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${monthNames[month - 1]} ${year}`;
};

window.sumarUnMesAFecha = function(fechaStr) {
    if (!fechaStr) return '';
    let [y, m, d] = fechaStr.split('-').map(Number);
    m++;
    if (m > 12) {
        m = 1;
        y++;
    }
    const maxDias = new Date(y, m, 0).getDate();
    if (d > maxDias) d = maxDias;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
};

// ==================== ESTADO GLOBAL DE LA APLICACIÓN ====================

window.appState = {
    currentMonth: new Date().toISOString().slice(0, 7),
    sueldos: {},
    categorias: [
        { nombre: "Tarjeta Visa", color: "#3b82f6", esTarjeta: true, vencimientoUnicoEnBloque: true },
        { nombre: "Tarjeta Master", color: "#ec4899", esTarjeta: true, vencimientoUnicoEnBloque: true },
        { nombre: "Gastos Fijos", color: "#10b981", esTarjeta: false, vencimientoUnicoEnBloque: false },
        { nombre: "Servicios", color: "#f59e0b", esTarjeta: false, vencimientoUnicoEnBloque: false }
    ],
    gastos: [],
    excepcionesMonto: {},
    excepcionesVencimiento: {},
    excepcionesCategoria: {},
    excepcionesEliminacion: {},
    excepcionesVencimientoGrid: {},
    excepcionesEstado: {},
    cuentasBancarias: [],
    ordenItemsCategoria: {},
    recurrentesPreferidos: []
};

window.hormigaState = {
    gastos: [],
    categorias: [],
    filtrosCategorias: [],
    sortColumn: 'fecha',
    sortAscending: false
};

window.categoriasAbiertasMap = {};
window.filtrosTemporales = [];
window.filtrosRecurrentesGrid = [];
window.filtrosGraficoTotales = [];
window.filtrosGraficoEvolCat = [];
window.filtrosGraficoBalance = [];

// ==================== CAMBIO DE MES ====================

window.changeMonth = function(direction) {
    let [year, month] = (window.appState.currentMonth || '2026-10').split('-').map(Number);
    month += direction;
    if (month > 12) {
        month = 1;
        year++;
    } else if (month < 1) {
        month = 12;
        year--;
    }
    window.appState.currentMonth = `${year}-${String(month).padStart(2, '0')}`;
    if (typeof renderApp === 'function') renderApp();
};

// ==================== CÁLCULOS Y PROCESAMIENTO DE DATOS ====================

window.getSueldoForMonth = function(monthKey) {
    return parseFloat(window.appState.sueldos?.[monthKey]) || 0;
};

window.getCalculatedDataForMonth = function(monthKey) {
    const sueldoActual = window.getSueldoForMonth(monthKey);
    const catList = window.appState.categorias || [];
    let items = [];
    let totalFijos = 0;
    let totalTarjetas = 0;
    let totalesPorCat = {};

    catList.forEach(c => totalesPorCat[c.nombre] = 0);

    (window.appState.gastos || []).forEach(g => {
        const limiteEliminacion = window.appState.excepcionesEliminacion?.[g.id];
        if (limiteEliminacion && monthKey >= limiteEliminacion) return;

        if (g.startMonth && monthKey < g.startMonth) return;

        const cuotasTotales = parseInt(g.cuotas) || 1;
        if (cuotasTotales > 1 && g.startMonth) {
            const [startY, startM] = g.startMonth.split('-').map(Number);
            const [currY, currM] = monthKey.split('-').map(Number);
            const diffMeses = (currY - startY) * 12 + (currM - startM);
            if (diffMeses < 0 || diffMeses >= cuotasTotales) return;
        }

        const gridKey = `${g.id}_${monthKey}`;
        const montoBase = window.appState.excepcionesMonto?.[gridKey] !== undefined 
            ? window.appState.excepcionesMonto[gridKey] 
            : g.monto;
        
        let monto = parseFloat(montoBase) || 0;
        if (cuotasTotales > 1 && window.appState.excepcionesMonto?.[gridKey] === undefined) {
            monto = monto / cuotasTotales;
        }

        const categoria = window.appState.excepcionesCategoria?.[gridKey] !== undefined 
            ? window.appState.excepcionesCategoria[gridKey] 
            : g.categoria;

        const vencimiento = window.appState.excepcionesVencimientoGrid?.[gridKey] !== undefined 
            ? window.appState.excepcionesVencimientoGrid[gridKey] 
            : (window.appState.excepcionesVencimiento?.[gridKey] !== undefined 
                ? window.appState.excepcionesVencimiento[gridKey] 
                : (g.vencimiento || ''));

        const estado = window.appState.excepcionesEstado?.[gridKey] || 'PENDIENTE';

        const catObj = catList.find(c => c.nombre === categoria);
        const esTarjeta = catObj ? catObj.esTarjeta : true;
        const tipoLabel = cuotasTotales > 1 ? `Cuotas (${cuotasTotales})` : (g.isRecurrente ? 'Débito / Recurrente' : 'Fijo / Directo');

        items.push({
            id: g.id,
            concepto: g.concepto,
            monto,
            categoria,
            vencimiento,
            estado,
            isRecurrente: !!g.isRecurrente,
            tipo: tipoLabel,
            esTarjeta
        });

        if (esTarjeta) totalTarjetas += monto;
        else totalFijos += monto;

        if (totalesPorCat[categoria] !== undefined) totalesPorCat[categoria] += monto;
        else totalesPorCat[categoria] = monto;
    });

    return { sueldoActual, items, totalFijos, totalTarjetas, totalesPorCat };
};

// ==================== PERSISTENCIA ====================

window.saveDataToCloud = function() {
    if (typeof window.syncAppStateToFirebase === 'function') {
        window.syncAppStateToFirebase(window.appState);
    }
};

window.saveHormigaDataToCloud = function() {
    if (typeof window.syncHormigaStateToFirebase === 'function') {
        window.syncHormigaStateToFirebase(window.hormigaState);
    }
};
