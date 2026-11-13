const FORMATO_MES = /^\d{4}-(0[1-9]|1[0-2])$/;

export function obtenerConfiguracionAhorro(ahorros = {}, mesObjetivo) {
    if (!FORMATO_MES.test(mesObjetivo || '')) return null;

    const mesesConfigurados = Object.keys(ahorros)
        .filter(mes => FORMATO_MES.test(mes) && mes <= mesObjetivo)
        .sort();
    const mesConfigurado = mesesConfigurados[mesesConfigurados.length - 1];
    const configuracion = mesConfigurado ? ahorros[mesConfigurado] : null;
    if (!configuracion || !['importe', 'porcentaje'].includes(configuracion.tipo)) return null;

    const valor = Number(configuracion.valor);
    if (!Number.isFinite(valor) || valor < 0) return null;

    return { tipo: configuracion.tipo, valor };
}

export function calcularAhorroParaMes(ahorros, mesObjetivo, obtenerSueldo) {
    const configuracion = obtenerConfiguracionAhorro(ahorros, mesObjetivo);
    if (!configuracion) return 0;

    const monto = configuracion.tipo === 'porcentaje'
        ? (Number(obtenerSueldo(mesObjetivo)) || 0) * configuracion.valor / 100
        : configuracion.valor;

    return Math.round(monto * 100) / 100;
}

export function calcularRetirosAhorroParaMes(retiros, mesObjetivo) {
    const total = (Array.isArray(retiros) ? retiros : [])
        .filter(retiro => retiro?.mes === mesObjetivo)
        .reduce((suma, retiro) => {
            const monto = Number(retiro?.monto);
            return suma + (Number.isFinite(monto) && monto > 0 ? monto : 0);
        }, 0);
    return Math.round(total * 100) / 100;
}

export function calcularAhorroNetoParaMes(ahorros, retiros, mesObjetivo, obtenerSueldo) {
    return Math.round(
        (calcularAhorroParaMes(ahorros, mesObjetivo, obtenerSueldo) -
            calcularRetirosAhorroParaMes(retiros, mesObjetivo)) * 100
    ) / 100;
}

export function calcularAhorroAcumuladoParaMes(ahorros, retiros, mesObjetivo, obtenerSueldo) {
    if (!FORMATO_MES.test(mesObjetivo || '')) return 0;

    const mesesConfigurados = Object.keys(ahorros || {})
        .filter(mes => FORMATO_MES.test(mes))
        .concat(
            (Array.isArray(retiros) ? retiros : [])
                .map(retiro => retiro?.mes)
                .filter(mes => FORMATO_MES.test(mes || ''))
        )
        .sort();
    const primerMes = mesesConfigurados[0];
    if (!primerMes || primerMes > mesObjetivo) return 0;

    let [año, mes] = primerMes.split('-').map(Number);
    let mesActual = primerMes;
    let totalAcumulado = 0;

    while (mesActual <= mesObjetivo) {
        totalAcumulado += calcularAhorroNetoParaMes(ahorros, retiros, mesActual, obtenerSueldo);
        mes += 1;
        if (mes > 12) {
            mes = 1;
            año += 1;
        }
        mesActual = `${año}-${String(mes).padStart(2, '0')}`;
    }

    return Math.round(totalAcumulado * 100) / 100;
}
