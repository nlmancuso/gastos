/**
 * NOTIFICADOR.JS - Lógica de envío de correos y notificaciones de vencimientos.
 */

/**
 * Normaliza una fecha a formato YYYY-MM-DD sin problemas de zona horaria.
 * @param {string} fechaStr 
 * @returns {string}
 */
function normalizarFecha(fechaStr) {
    if (!fechaStr) return '';
    // Soporta formato DD/MM/YYYY o YYYY-MM-DD
    if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
            return `${partes[2]}-${partes[1].padStart(2, '0')}-${partes[0].padStart(2, '0')}`;
        }
    }
    return fechaStr.slice(0, 10);
}

/**
 * Obtiene la fecha actual en formato YYYY-MM-DD (zona horaria local o UTC ajustada).
 * @returns {string}
 */
function obtenerFechaHoy() {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, '0');
    const dd = String(hoy.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Obtiene la fecha de mañana en formato YYYY-MM-DD.
 * @returns {string}
 */
function obtenerFechaManana() {
    const manana = new Date();
    manana.setDate(manana.getDate() + 1);
    const yyyy = manana.getFullYear();
    const mm = String(manana.getMonth() + 1).padStart(2, '0');
    const dd = String(manana.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

/**
 * Valida los gastos cuyo vencimiento sea hoy o mañana y arma el reporte para notificación por correo.
 * @param {object} appState 
 * @returns {object} Objeto con los gastos agrupados listos para enviar
 */
window.procesarGastosParaNotificacion = function(appState) {
    const hoyStr = obtenerFechaHoy();
    const mananaStr = obtenerFechaManana();
    const currentMonth = hoyStr.slice(0, 7);

    // Obtener los datos calculados del mes en curso
    const calcData = window.getCalculatedDataForMonth ? window.getCalculatedDataForMonth(currentMonth) : null;
    if (!calcData || !calcData.items) return { totalVenceHoyOMañana: 0, grupos: {} };

    let gruposNotificacion = {};
    let totalVenceHoyOMañana = 0;

    calcData.items.forEach(item => {
        const fechaVenc = normalizarFecha(item.vencimiento);
        
        // Filtrar solo los que vencen hoy o mañana y que no estén pagados
        if ((fechaVenc === hoyStr || fechaVenc === mananaStr) && item.estado !== 'PAGADO') {
            const categoria = item.categoria || 'General';
            
            if (!gruposNotificacion[categoria]) {
                gruposNotificacion[categoria] = {
                    fechaVencimiento: fechaVenc,
                    sumaTotal: 0,
                    items: []
                };
            }

            gruposNotificacion[categoria].sumaTotal += item.monto;
            gruposNotificacion[categoria].items.push({
                concepto: item.concepto,
                monto: item.monto,
                fecha: fechaVenc
            });

            totalVenceHoyOMañana += item.monto;
        }
    });

    return {
        fechaEjecucion: hoyStr,
        totalVenceHoyOMañana,
        grupos: gruposNotificacion
    };
};
