const own = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);
const roundMoney = value => Math.round((toNumber(value) + Number.EPSILON) * 100) / 100;

function toNumber(value) {
    if (typeof value === 'string') {
        const normalized = value.trim().replace(/\s/g, '');
        if (!normalized) return 0;
        if (/^-?\d{1,3}(\.\d{3})+,\d+$/.test(normalized)) {
            value = normalized.replace(/\./g, '').replace(',', '.');
        } else if (normalized.includes(',') && !normalized.includes('.')) {
            value = normalized.replace(',', '.');
        } else {
            value = normalized;
        }
    }
    const number = Number(value);
    return Number.isFinite(number) ? number : 0;
}

function isValidMonth(month) {
    return /^\d{4}-(0[1-9]|1[0-2])$/.test(month || '');
}

function nextMonth(month) {
    let [year, monthNumber] = month.split('-').map(Number);
    monthNumber += 1;
    if (monthNumber > 12) {
        monthNumber = 1;
        year += 1;
    }
    return `${year}-${String(monthNumber).padStart(2, '0')}`;
}

function previousMonth(month) {
    let [year, monthNumber] = month.split('-').map(Number);
    monthNumber -= 1;
    if (monthNumber < 1) {
        monthNumber = 12;
        year -= 1;
    }
    return `${year}-${String(monthNumber).padStart(2, '0')}`;
}

function isValidDate(date) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date || '');
    if (!match) return false;
    const [, year, month, day] = match.map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
        && parsed.getUTCMonth() === month - 1
        && parsed.getUTCDate() === day;
}

export function normalizarFecha(fecha) {
    if (!fecha) return '';
    if (typeof fecha === 'object' && typeof fecha.toDate === 'function') {
        fecha = fecha.toDate();
    }
    if (fecha instanceof Date) {
        if (Number.isNaN(fecha.getTime())) return '';
        fecha = `${fecha.getUTCFullYear()}-${String(fecha.getUTCMonth() + 1).padStart(2, '0')}-${String(fecha.getUTCDate()).padStart(2, '0')}`;
    }

    const value = String(fecha).trim();
    const isoDate = /^(\d{4}-\d{2}-\d{2})(?:$|[T\s])/.exec(value)?.[1];
    if (isoDate && isValidDate(isoDate)) return isoDate;

    const localDate = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(value);
    if (!localDate) return '';
    const [, dayValue, monthValue, yearValue] = localDate;
    const year = yearValue.length === 2 ? `20${yearValue}` : yearValue;
    const normalized = `${year}-${monthValue.padStart(2, '0')}-${dayValue.padStart(2, '0')}`;
    return isValidDate(normalized) ? normalized : '';
}

function sumarUnMesAFecha(fecha) {
    const normalized = normalizarFecha(fecha);
    if (!normalized) return '';
    const [year, month, day] = normalized.split('-').map(Number);
    let nextYear = year;
    let nextMonthNumber = month + 1;
    if (nextMonthNumber > 12) {
        nextMonthNumber = 1;
        nextYear += 1;
    }
    const lastDay = new Date(Date.UTC(nextYear, nextMonthNumber, 0)).getUTCDate();
    return `${nextYear}-${String(nextMonthNumber).padStart(2, '0')}-${String(Math.min(day, lastDay)).padStart(2, '0')}`;
}

function obtenerMontoGasto(state, gasto, targetMonth, startMonth) {
    const excepciones = state.excepcionesMonto || {};
    const key = `${gasto.id}_${targetMonth}`;
    if (own(excepciones, key)) {
        return { monto: toNumber(excepciones[key]), mesBase: targetMonth };
    }

    let monthToCheck = targetMonth;
    for (let index = 0; index < 36; index += 1) {
        const previousValue = `${gasto.id}_${monthToCheck}`;
        if (own(excepciones, previousValue)) {
            return { monto: toNumber(excepciones[previousValue]), mesBase: monthToCheck };
        }
        monthToCheck = previousMonth(monthToCheck);
    }
    return { monto: toNumber(gasto.monto), mesBase: startMonth };
}

function obtenerPorcentajeAumento(state, gasto) {
    const aumentos = state.aumentosIndividuales || {};
    if (own(aumentos, gasto.id) && aumentos[gasto.id] !== '') {
        return toNumber(aumentos[gasto.id]);
    }
    const subcategoria = (state.subcategorias || []).find(item => item.id === gasto.subcategoriaId);
    return toNumber(subcategoria?.porcentajeAumento);
}

function estadoDeGasto(state, gastoId, month, vencimiento, hoy) {
    const estadoGuardado = state.excepcionesEstado?.[`${gastoId}_${month}`];
    if (estadoGuardado) return String(estadoGuardado).trim().toUpperCase();
    return vencimiento && vencimiento < hoy ? 'VENCIDO' : 'PENDIENTE';
}

function calcularItemsDelMes(state, targetMonth, hoy) {
    const gastos = Array.isArray(state.gastos) ? state.gastos : [];
    const categorias = Array.isArray(state.categorias) ? state.categorias : [];
    const items = [];

    gastos.forEach(gasto => {
        const monthDeleted = state.excepcionesEliminacion?.[gasto.id];
        if (monthDeleted && targetMonth >= monthDeleted) return;
        if (state.excepcionesEliminacionSoloMes?.[`${gasto.id}_${targetMonth}`]) return;

        const monthKey = `${gasto.id}_${targetMonth}`;
        const categoria = state.excepcionesCategoria?.[monthKey] ?? gasto.categoria ?? 'Otros';
        const startMonth = isValidMonth(gasto.startMonth) ? gasto.startMonth : targetMonth;
        let { monto, mesBase } = obtenerMontoGasto(state, gasto, targetMonth, startMonth);

        const totalCuotas = Number.parseInt(gasto.cuotas, 10) || 1;
        const categoriaBase = String(gasto.categoria || '').toLowerCase();
        const categoriaActual = String(categoria || '').toLowerCase();
        const isRecurring = !!gasto.isRecurrente
            || categoriaBase.includes('fijo')
            || categoriaBase.includes('servicio')
            || categoriaActual.includes('fijo')
            || categoriaActual.includes('servicio');

        const percent = obtenerPorcentajeAumento(state, gasto);
        if (isRecurring && percent > 0 && targetMonth > mesBase && isValidMonth(mesBase)) {
            const [baseYear, baseMonth] = mesBase.split('-').map(Number);
            const [targetYear, targetMonthNumber] = targetMonth.split('-').map(Number);
            const monthsPassed = (targetYear - baseYear) * 12 + targetMonthNumber - baseMonth;
            for (let index = 0; index < monthsPassed; index += 1) {
                monto *= 1 + percent / 100;
            }
            monto = roundMoney(monto);
        }

        const addItem = (type, itemAmount, dueDate) => {
            const vencimiento = normalizarFecha(dueDate);
            items.push({
                id: gasto.id,
                concepto: gasto.concepto || categoria,
                categoria,
                tipo: type,
                monto: itemAmount,
                vencimiento,
                estado: estadoDeGasto(state, gasto.id, targetMonth, vencimiento, hoy),
                subcategoriaId: gasto.subcategoriaId
            });
        };

        if (totalCuotas > 1) {
            const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
            const monthsFromStart = (Number(targetMonth.slice(0, 4)) - startYear) * 12
                + Number(targetMonth.slice(5, 7)) - startMonthNumber;
            if (monthsFromStart < 0 || monthsFromStart >= totalCuotas) return;

            let dueDate = normalizarFecha(gasto.vencimiento);
            for (let index = 0; index < monthsFromStart; index += 1) {
                dueDate = sumarUnMesAFecha(dueDate);
            }
            const dueOverride = state.excepcionesVencimientoGrid?.[monthKey] !== undefined
                ? state.excepcionesVencimientoGrid[monthKey]
                : state.excepcionesVencimiento?.[monthKey] ?? dueDate;
            addItem(`Cuota ${monthsFromStart + 1}/${totalCuotas}`, roundMoney(monto / totalCuotas), dueOverride);
            return;
        }

        if (isRecurring) {
            if (targetMonth < startMonth) return;
            const [startYear, startMonthNumber] = startMonth.split('-').map(Number);
            const monthsFromStart = (Number(targetMonth.slice(0, 4)) - startYear) * 12
                + Number(targetMonth.slice(5, 7)) - startMonthNumber;
            let dueDate = normalizarFecha(gasto.vencimiento);
            for (let index = 0; index < monthsFromStart; index += 1) {
                dueDate = sumarUnMesAFecha(dueDate);
            }
            const dueOverride = state.excepcionesVencimientoGrid?.[monthKey] !== undefined
                ? state.excepcionesVencimientoGrid[monthKey]
                : state.excepcionesVencimiento?.[monthKey] ?? dueDate;
            addItem(categoriaBase.includes('fijo') || categoriaBase.includes('servicio')
                || categoriaActual.includes('fijo') || categoriaActual.includes('servicio')
                ? 'Recurrente'
                : 'Débito Automático', monto, dueOverride);
            return;
        }

        if (targetMonth !== startMonth) return;
        const dueOverride = state.excepcionesVencimientoGrid?.[monthKey] !== undefined
            ? state.excepcionesVencimientoGrid[monthKey]
            : state.excepcionesVencimiento?.[monthKey] ?? gasto.vencimiento ?? '';
        addItem('Débito', monto, dueOverride);
    });

    return items;
}

function clampPayment(value, amountDue) {
    return Math.min(Math.max(toNumber(value), 0), amountDue);
}

function obtenerItemsConSaldo(state, targetMonth, hoy) {
    const gastos = Array.isArray(state.gastos) ? state.gastos : [];
    const categorias = Array.isArray(state.categorias) ? state.categorias : [];
    const mesesConInicio = gastos
        .map(gasto => gasto.startMonth)
        .filter(month => isValidMonth(month) && month <= targetMonth);
    let month = mesesConInicio.length ? mesesConInicio.sort()[0] : targetMonth;
    const balancesIndividuales = {};
    const balancesBloque = {};
    const ultimosItemsIndividuales = {};
    const ultimosItemsBloque = {};
    const pagosIndividuales = state.excepcionesMontoPagado || {};
    const pagosBloque = state.excepcionesMontoPagadoBloque || {};
    let itemsObjetivo = [];

    while (month <= targetMonth) {
        let itemsMes = calcularItemsDelMes(state, month, hoy);
        if (month !== targetMonth) {
            itemsMes = itemsMes.filter(item => {
                const gasto = gastos.find(registro => registro.id === item.id);
                return gasto && gasto.startMonth;
            });
        }

        const esBloque = categoria => !!categorias.find(item => item.nombre === categoria)?.vencimientoUnicoEnBloque;
        const categoriasActivas = new Set(itemsMes.filter(item => esBloque(item.categoria)).map(item => item.categoria));
        const idsActivos = new Set(itemsMes.filter(item => !esBloque(item.categoria)).map(item => item.id));

        Object.entries(balancesIndividuales).forEach(([id, balance]) => {
            if (balance > 0 && !idsActivos.has(id) && ultimosItemsIndividuales[id]) {
                itemsMes.push({ ...ultimosItemsIndividuales[id], id, monto: 0, esSaldoArrastrado: true });
            }
        });
        Object.entries(balancesBloque).forEach(([name, balance]) => {
            if (balance > 0 && !categoriasActivas.has(name)) {
                const lastItem = ultimosItemsBloque[name];
                itemsMes.push({
                    ...(lastItem || {}),
                    id: `saldo_bloque_${encodeURIComponent(name)}`,
                    concepto: 'Saldo pendiente de meses anteriores',
                    categoria: name,
                    tipo: 'Saldo anterior',
                    monto: 0,
                    vencimiento: lastItem?.vencimiento || '',
                    estado: 'PENDIENTE',
                    esSaldoArrastrado: true
                });
            }
        });

        const gruposBloque = new Map();
        const resultadoMes = [];
        itemsMes.forEach(item => {
            if (esBloque(item.categoria)) {
                if (!gruposBloque.has(item.categoria)) gruposBloque.set(item.categoria, []);
                gruposBloque.get(item.categoria).push(item);
                return;
            }

            const idPago = item.idPago || item.id;
            const key = `${idPago}_${month}`;
            const amountDue = roundMoney(toNumber(item.monto) + (balancesIndividuales[idPago] || 0));
            const amountPaid = own(pagosIndividuales, key)
                ? clampPayment(pagosIndividuales[key], amountDue)
                : amountDue;
            balancesIndividuales[idPago] = roundMoney(Math.max(0, amountDue - amountPaid));
            if (!item.esSaldoArrastrado) ultimosItemsIndividuales[idPago] = item;

            if (month === targetMonth) {
                resultadoMes.push({
                    ...item,
                    idPago,
                    monto: amountDue,
                    montoDebido: amountDue,
                    montoPagado: amountPaid
                });
            }
        });

        gruposBloque.forEach((gastosCategoria, name) => {
            const saldoAnterior = balancesBloque[name] || 0;
            const amountDue = roundMoney(
                gastosCategoria.reduce((total, item) => total + toNumber(item.monto), 0) + saldoAnterior
            );
            const key = `${name}_${month}`;
            const amountPaid = own(pagosBloque, key)
                ? clampPayment(pagosBloque[key], amountDue)
                : amountDue;
            balancesBloque[name] = roundMoney(Math.max(0, amountDue - amountPaid));
            if (!gastosCategoria.every(item => item.esSaldoArrastrado)) {
                ultimosItemsBloque[name] = gastosCategoria.find(item => !item.esSaldoArrastrado) || gastosCategoria[0];
            }

            if (month === targetMonth) {
                gastosCategoria.forEach((item, index) => {
                    resultadoMes.push({
                        ...item,
                        monto: toNumber(item.monto),
                        montoPagadoBloque: index === 0 ? amountPaid : undefined,
                        montoDebidoBloque: index === 0 ? amountDue : undefined,
                        saldoAnteriorBloque: index === 0 ? saldoAnterior : undefined
                    });
                });
            }
        });

        if (month === targetMonth) itemsObjetivo = resultadoMes;
        month = nextMonth(month);
    }

    return itemsObjetivo;
}

function getLocalDateParts(date, timeZone) {
    const parts = new Intl.DateTimeFormat('en', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(date);
    return Object.fromEntries(parts.map(part => [part.type, part.value]));
}

export function obtenerFechaArgentina(date = new Date()) {
    const parts = getLocalDateParts(date, 'America/Argentina/Buenos_Aires');
    return `${parts.year}-${parts.month}-${parts.day}`;
}

export function calcularAlertasVencimiento(state, hoy = obtenerFechaArgentina()) {
    if (!isValidDate(hoy)) throw new TypeError('La fecha de hoy debe tener formato AAAA-MM-DD.');

    const currentMonth = hoy.slice(0, 7);
    const nextTargetMonth = nextMonth(currentMonth);
    const tomorrowDate = new Date(`${hoy}T00:00:00Z`);
    tomorrowDate.setUTCDate(tomorrowDate.getUTCDate() + 1);
    const tomorrow = `${tomorrowDate.getUTCFullYear()}-${String(tomorrowDate.getUTCMonth() + 1).padStart(2, '0')}-${String(tomorrowDate.getUTCDate()).padStart(2, '0')}`;
    const alerts = [];

    [currentMonth, nextTargetMonth].forEach(month => {
        const items = obtenerItemsConSaldo(state || {}, month, hoy);
        const categories = Array.isArray(state?.categorias) ? state.categorias : [];
        const paidIndividualMap = state?.excepcionesMontoPagado || {};
        const paidBlockMap = state?.excepcionesMontoPagadoBloque || {};
        const processedBlocks = new Set();

        items.forEach(item => {
            const category = categories.find(entry => entry.nombre === item.categoria);
            const isBlock = !!category?.vencimientoUnicoEnBloque;

            if (isBlock) {
                if (processedBlocks.has(item.categoria)) return;
                processedBlocks.add(item.categoria);
                const group = items.filter(entry => entry.categoria === item.categoria);
                const actualItems = group.filter(entry => !entry.esSaldoArrastrado);
                if (!actualItems.length && month !== currentMonth) return;
                const allMarkedPaid = actualItems.length > 0
                    && actualItems.every(entry => String(entry.estado).toUpperCase() === 'PAGADO');
                if (allMarkedPaid) return;

                const dueItem = group.find(entry => entry.montoDebidoBloque !== undefined);
                const amountDue = toNumber(dueItem?.montoDebidoBloque);
                const markedPaidAmount = actualItems
                    .filter(entry => String(entry.estado).toUpperCase() === 'PAGADO')
                    .reduce((total, entry) => total + toNumber(entry.monto), 0);
                const remainingBeforeBlockPayment = roundMoney(Math.max(0, amountDue - markedPaidAmount));
                const key = `${item.categoria}_${month}`;
                const amountPaid = own(paidBlockMap, key)
                    ? clampPayment(paidBlockMap[key], remainingBeforeBlockPayment)
                    : 0;
                const remaining = roundMoney(Math.max(0, remainingBeforeBlockPayment - amountPaid));
                const dueDateValue = actualItems.find(entry =>
                    String(entry.estado).toUpperCase() !== 'PAGADO' && normalizarFecha(entry.vencimiento)
                )?.vencimiento
                    || state?.vencimientosTarjetas?.[key]
                    || state?.vencimientosTarjetas?.[item.categoria]
                    || group.find(entry => normalizarFecha(entry.vencimiento))?.vencimiento;
                const dueDate = normalizarFecha(dueDateValue);

                if (remaining > 0 && dueDate && dueDate <= tomorrow) {
                    alerts.push({
                        id: `${item.categoria}_${month}`,
                        concepto: `Tarjeta: ${item.categoria}`,
                        categoria: item.categoria,
                        vencimiento: dueDate,
                        monto: remaining,
                        esTarjeta: true
                    });
                }
                return;
            }

            if (String(item.estado).toUpperCase() === 'PAGADO') return;
            const idPago = item.idPago || item.id;
            const key = `${idPago}_${month}`;
            const amountDue = toNumber(item.montoDebido ?? item.monto);
            const amountPaid = own(paidIndividualMap, key)
                ? clampPayment(paidIndividualMap[key], amountDue)
                : 0;
            const remaining = roundMoney(Math.max(0, amountDue - amountPaid));
            const dueDate = normalizarFecha(item.vencimiento);
            if (remaining > 0 && dueDate && dueDate <= tomorrow) {
                alerts.push({
                    id: `${idPago}_${month}`,
                    concepto: item.concepto || item.categoria || 'Gasto',
                    categoria: item.categoria || 'Otros',
                    vencimiento: dueDate,
                    monto: remaining,
                    esTarjeta: false
                });
            }
        });
    });

    return alerts.sort((left, right) =>
        left.vencimiento.localeCompare(right.vencimiento)
        || left.concepto.localeCompare(right.concepto, 'es')
    );
}

export function formatearMonto(monto) {
    return new Intl.NumberFormat('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(toNumber(monto));
}

export function escaparHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, character => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[character]);
}
