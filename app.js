/**
 * APP.JS - Lógica principal y formateadores globales para la gestión de gastos.
 */

// ==================== FORMATEADORES Y UTILIDADES GLOBALES ====================

/**
 * Formatea un número al estándar de moneda de Argentina ($ X.XXX,XX).
 * @param {number} num 
 * @returns {string}
 */
window.formatMoneda = function(num) {
    const val = parseFloat(num) || 0;
    return "$ " + val.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Formatea un string de fecha (YYYY-MM-DD) a formato corto (DD/MM).
 * @param {string} fechaStr 
 * @returns {string}
 */
window.formatFechaVencimientoSimple = function(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length === 3) {
        return `${partes[2]}/${partes[1]}`;
    }
    return fechaStr;
};

/**
 * Formatea una clave de mes (YYYY-MM) a texto legible (Ej: "Octubre 2026").
 * @param {string} monthKey 
 * @returns {string}
 */
window.formatMonthDisplay = function(monthKey) {
    if (!monthKey) return '';
    const [year, month] = monthKey.split('-').map(Number);
    const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];
    return `${monthNames[month - 1]} ${year}`;
};

/**
 * Suma un mes exacto a una fecha en formato YYYY-MM-DD.
 * @param {string} fechaStr 
 * @returns {string}
 */
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

// ==================== CÁLCULOS Y PROCESAMIENTO DE DATOS ====================

/**
 * Obtiene el sueldo registrado para un mes dado.
 * @param {string} monthKey 
 * @returns {number}
 */
window.getSueldoForMonth = function(monthKey) {
    return parseFloat(window.appState.sueldos?.[monthKey]) || 0;
};

/**
 * Calcula y unifica todos los datos de gastos, tarjetas e ítems fijos para un mes específico.
 * @param {string} monthKey 
 * @returns {object}
 */
window.getCalculatedDataForMonth = function(monthKey) {
    const sueldoActual = window.getSueldoForMonth(monthKey);
    const catList = window.appState.categorias || [];
    let items = [];
    let totalFijos = 0;
    let totalTarjetas = 0;
    let totalesPorCat = {};

    catList.forEach(c => totalesPorCat[c.nombre] = 0);

    (window.appState.gastos || []).forEach(g => {
        // Verificar si fue eliminado para este mes o meses posteriores
        const limiteEliminacion = window.appState.excepcionesEliminacion?.[g.id];
        if (limiteEliminacion && monthKey >= limiteEliminacion) return;

        // Verificar mes de inicio
        if (g.startMonth && monthKey < g.startMonth) return;

        // Calcular cuotas
        const cuotasTotales = parseInt(g.cuotas) || 1;
        if (cuotasTotales > 1 && g.startMonth) {
            const [startY, startM] = g.startMonth.split('-').map(Number);
            const [currY, currM] = monthKey.split('-').map(Number);
            const diffMeses = (currY - startY) * 12 + (currM - startM);
            if (diffMeses < 0 || diffMeses >= cuotasTotales) return;
        }

        const gridKey = `${g.id}_${monthKey}`;
        
        // Obtener monto con posibles excepciones
        const montoBase = window.appState.excepcionesMonto?.[gridKey] !== undefined 
            ? window.appState.excepcionesMonto[gridKey] 
            : g.monto;
        
        let monto = parseFloat(montoBase) || 0;
        if (cuotasTotales > 1 && window.appState.excepcionesMonto?.[gridKey] === undefined) {
            monto = monto / cuotasTotales;
        }

        // Categoria y Vencimiento con excepciones
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

        const itemObj = {
            id: g.id,
            concepto: g.concepto,
            monto,
            categoria,
            vencimiento,
            estado,
            isRecurrente: !!g.isRecurrente,
            tipo: tipoLabel,
            esTarjeta
        };

        items.push(itemObj);

        if (esTarjeta) {
            totalTarjetas += monto;
        } else {
            totalFijos += monto;
        }

        if (totalesPorCat[categoria] !== undefined) {
            totalesPorCat[categoria] += monto;
        } else {
            totalesPorCat[categoria] = monto;
        }
    });

    return {
        sueldoActual,
        items,
        totalFijos,
        totalTarjetas,
        totalesPorCat
    };
};

// ==================== PERSISTENCIA EN NUBE / FIRESTORE ====================

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
