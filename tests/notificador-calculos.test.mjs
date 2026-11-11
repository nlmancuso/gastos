import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularAlertasVencimiento,
    escaparHtml,
    formatearMonto,
    normalizarFecha
} from '../notificador-calculos.mjs';

const tarjetaMercadoPago = {
    nombre: 'Mercado Pago',
    esTarjeta: true,
    vencimientoUnicoEnBloque: true
};

function crearEstado(gastos, overrides = {}) {
    return {
        gastos,
        categorias: [tarjetaMercadoPago, {
            nombre: 'Servicios',
            esTarjeta: false,
            vencimientoUnicoEnBloque: false
        }],
        excepcionesMonto: {},
        excepcionesCategoria: {},
        excepcionesVencimiento: {},
        excepcionesVencimientoGrid: {},
        excepcionesEstado: {},
        excepcionesEliminacion: {},
        excepcionesEliminacionSoloMes: {},
        excepcionesMontoPagado: {},
        excepcionesMontoPagadoBloque: {},
        aumentosIndividuales: {},
        subcategorias: [],
        ...overrides
    };
}

test('alerts only use current-month card items and omit a paid card', () => {
    const state = crearEstado([
        {
            id: 'old-purchase',
            concepto: 'Compra vieja',
            monto: 9000000,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-10',
            vencimiento: '2026-10-10'
        },
        {
            id: 'current-purchase-a',
            concepto: 'Compra actual A',
            monto: 300000,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-11',
            vencimiento: '2026-11-10'
        },
        {
            id: 'current-purchase-b',
            concepto: 'Compra actual B',
            monto: 500000,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-11',
            vencimiento: '2026-11-10'
        }
    ], {
        excepcionesEstado: {
            'old-purchase_2026-10': 'PAGADO',
            'current-purchase-a_2026-11': 'PAGADO',
            'current-purchase-b_2026-11': 'PAGADO'
        }
    });

    assert.deepEqual(calcularAlertasVencimiento(state, '2026-11-11'), []);
});

test('groups a card once, subtracts its recorded partial payment, and ignores old purchases', () => {
    const state = crearEstado([
        {
            id: 'old-purchase',
            concepto: 'Compra vieja',
            monto: 9000000,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-10',
            vencimiento: '2026-10-10'
        },
        {
            id: 'current-purchase-a',
            concepto: 'Compra actual A',
            monto: 300,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-11',
            vencimiento: '2026-11-10'
        },
        {
            id: 'current-purchase-b',
            concepto: 'Compra actual B',
            monto: 500,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-11',
            vencimiento: '2026-11-10'
        }
    ], {
        excepcionesEstado: {
            'old-purchase_2026-10': 'PAGADO'
        },
        excepcionesMontoPagadoBloque: {
            'Mercado Pago_2026-11': 200
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].concepto, 'Tarjeta: Mercado Pago');
    assert.equal(alerts[0].monto, 600);
    assert.equal(alerts[0].vencimiento, '2026-11-10');
});

test('alerts an overdue card carryover in the current month without duplicating it next month', () => {
    const state = crearEstado([{
        id: 'card-purchase',
        concepto: 'Compra con tarjeta',
        monto: 1000,
        cuotas: 1,
        categoria: 'Mercado Pago',
        startMonth: '2026-11',
        vencimiento: '2026-11-10'
    }], {
        excepcionesMontoPagadoBloque: {
            'Mercado Pago_2026-11': 200
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-12-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 800);
    assert.equal(alerts[0].vencimiento, '2026-11-10');
});

test('alerts an expense due today when it has not been paid', () => {
    const state = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-11'
    }]);

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 1000);
    assert.equal(alerts[0].vencimiento, '2026-11-11');
});

test('alerts a card category due today when it has not been paid', () => {
    const state = crearEstado([{
        id: 'card-purchase',
        concepto: 'Compra con tarjeta',
        monto: 1000,
        cuotas: 1,
        categoria: 'Mercado Pago',
        startMonth: '2026-11',
        vencimiento: '2026-11-11'
    }]);

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].concepto, 'Tarjeta: Mercado Pago');
    assert.equal(alerts[0].monto, 1000);
    assert.equal(alerts[0].vencimiento, '2026-11-11');
});

test('carries an overdue unpaid individual expense into the current month alert', () => {
    const state = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-10',
        vencimiento: '2026-10-10'
    }], {
        excepcionesEstado: {
            'internet_2026-10': 'VENCIDO'
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 1000);
    assert.equal(alerts[0].vencimiento, '2026-10-10');
});

test('carries an overdue unpaid card balance into the current month alert', () => {
    const state = crearEstado([{
        id: 'card-purchase',
        concepto: 'Compra con tarjeta',
        monto: 1000,
        cuotas: 1,
        categoria: 'Mercado Pago',
        startMonth: '2026-10',
        vencimiento: '2026-10-10'
    }]);

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 1000);
    assert.equal(alerts[0].vencimiento, '2026-10-10');
});

test('shows only the unpaid remainder for an individual expense', () => {
    const state = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-11'
    }], {
        excepcionesMontoPagado: {
            'internet_2026-11': 350
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 650);
});

test('does not alert for individually paid expenses', () => {
    const state = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-10'
    }], {
        excepcionesEstado: {
            'internet_2026-11': 'PAGADO'
        }
    });

    assert.deepEqual(calcularAlertasVencimiento(state, '2026-11-11'), []);
});

test('normalizes supported dates, formats cents, and escapes HTML', () => {
    assert.equal(normalizarFecha('11/11/2026'), '2026-11-11');
    assert.equal(normalizarFecha('2026-02-30'), '');
    assert.equal(formatearMonto(61775160.14), '61.775.160,14');
    assert.equal(escaparHtml('<Mercado & Pago>'), '&lt;Mercado &amp; Pago&gt;');
});
