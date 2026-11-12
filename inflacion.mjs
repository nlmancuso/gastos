const patronMes = /^\d{4}-(0[1-9]|1[0-2])$/;

export function mesSiguiente(mes) {
    if (!patronMes.test(mes || '')) return '';
    let [anio, numeroMes] = mes.split('-').map(Number);
    numeroMes++;
    if (numeroMes > 12) {
        numeroMes = 1;
        anio++;
    }
    return `${anio}-${String(numeroMes).padStart(2, '0')}`;
}

export function mesAnterior(mes) {
    if (!patronMes.test(mes || '')) return '';
    let [anio, numeroMes] = mes.split('-').map(Number);
    numeroMes--;
    if (numeroMes < 1) {
        numeroMes = 12;
        anio--;
    }
    return `${anio}-${String(numeroMes).padStart(2, '0')}`;
}

export function obtenerPorcentajeAumentoSubcategoria(subcategoria, mes) {
    if (!subcategoria) return 0;
    let porcentaje = Number.parseFloat(subcategoria.porcentajeAumento) || 0;
    if (!patronMes.test(mes || '') || !Array.isArray(subcategoria.historialAumentos)) return porcentaje;

    const cambios = subcategoria.historialAumentos
        .filter(cambio =>
            patronMes.test(cambio?.desdeMes || '') &&
            cambio.desdeMes <= mes &&
            Number.isFinite(Number.parseFloat(cambio.porcentajeAumento))
        )
        .sort((a, b) => a.desdeMes.localeCompare(b.desdeMes));

    if (cambios.length) {
        porcentaje = Number.parseFloat(cambios[cambios.length - 1].porcentajeAumento);
    }
    return porcentaje;
}

export function crearHistorialAumentos(historialActual, desdeMes, porcentajeAumento) {
    const cambiosPrevios = Array.isArray(historialActual)
        ? historialActual.filter(cambio =>
            patronMes.test(cambio?.desdeMes || '') &&
            cambio.desdeMes < desdeMes &&
            Number.isFinite(Number.parseFloat(cambio.porcentajeAumento))
        )
        : [];

    return [
        ...cambiosPrevios,
        { desdeMes, porcentajeAumento }
    ].sort((a, b) => a.desdeMes.localeCompare(b.desdeMes));
}

export function calcularMontoConInflacion(montoBase, mesBase, mesObjetivo, obtenerPorcentaje, mesInicioRedondeo = '') {
    let monto = Number.parseFloat(montoBase) || 0;
    if (!patronMes.test(mesBase || '') || !patronMes.test(mesObjetivo || '') || mesObjetivo <= mesBase) {
        return Math.round((monto + Number.EPSILON) * 100) / 100;
    }

    const redondearDesde = mesInicioRedondeo === true ? mesSiguiente(mesBase) : mesInicioRedondeo;
    let mes = mesBase;
    while (mes < mesObjetivo) {
        mes = mesSiguiente(mes);
        const porcentaje = Number.parseFloat(obtenerPorcentaje(mes)) || 0;
        monto *= 1 + (porcentaje / 100);
        if (redondearDesde && mes >= redondearDesde) {
            monto = Math.round((monto + Number.EPSILON) * 100) / 100;
        }
    }

    return Math.round((monto + Number.EPSILON) * 100) / 100;
}

export function redondearMonto(monto) {
    return Math.round((Number.parseFloat(monto) + Number.EPSILON) * 100) / 100;
}

export function esExcepcionMontoGenerada(montoGuardado, montoEsperado, fueMarcadaGenerada) {
    if (fueMarcadaGenerada === true) return true;
    const diferencia = Math.abs(Number.parseFloat(montoGuardado) - Number.parseFloat(montoEsperado));
    return Number.isFinite(diferencia) && diferencia < 0.005;
}

export function obtenerPrimerMesCambioProgramado(subcategoria, mesBase, mesObjetivo) {
    if (!Array.isArray(subcategoria?.historialAumentos)) return '';
    const cambios = subcategoria.historialAumentos
        .filter(cambio =>
            patronMes.test(cambio?.desdeMes || '') &&
            cambio.desdeMes > mesBase &&
            cambio.desdeMes <= mesObjetivo
        )
        .map(cambio => cambio.desdeMes)
        .sort();
    return cambios[0] || '';
}

export function mesTieneCambioProgramado(subcategoria, mesBase, mesObjetivo) {
    return Boolean(obtenerPrimerMesCambioProgramado(subcategoria, mesBase, mesObjetivo));
}
