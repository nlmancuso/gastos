import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularAlertasVencimiento,
    calcularAlertasPorDestinatario,
    escaparHtml,
    formatearMonto,
    normalizarFecha,
    reconstruirMiembrosEspacio
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

test('groups a card once, uses its full total despite the recorded payment, and ignores old purchases', () => {
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
            'old-purchase_2026-10': 'PAGADO',
            'current-purchase-a_2026-11': 'PENDIENTE',
            'current-purchase-b_2026-11': 'PENDIENTE'
        },
        excepcionesMontoPagadoBloque: {
            'Mercado Pago_2026-11': 800
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].concepto, 'Tarjeta: Mercado Pago');
    assert.equal(alerts[0].monto, 800);
    assert.equal(alerts[0].vencimiento, '2026-11-10');
});

test('does not add automatically overdue card purchases from older months', () => {
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
            id: 'current-purchase',
            concepto: 'Compra actual',
            monto: 500,
            cuotas: 1,
            categoria: 'Mercado Pago',
            startMonth: '2026-11',
            vencimiento: '2026-11-12'
        }
    ]);

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 500);
    assert.equal(alerts[0].vencimiento, '2026-11-12');
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

test('alerts both card categories due today when they have not been paid', () => {
    const state = crearEstado([
        {
            id: 'santander-purchase',
            concepto: 'Compra Santander',
            monto: 1000,
            cuotas: 1,
            categoria: 'Santander Visa',
            startMonth: '2026-11',
            vencimiento: '2026-11-11'
        },
        {
            id: 'ciudad-purchase',
            concepto: 'Compra Ciudad',
            monto: 2000,
            cuotas: 1,
            categoria: 'Ciudad Visa',
            startMonth: '2026-11',
            vencimiento: '2026-11-11'
        }
    ], {
        categorias: [
            { nombre: 'Santander Visa', esTarjeta: true, vencimientoUnicoEnBloque: true },
            { nombre: 'Ciudad Visa', esTarjeta: true, vencimientoUnicoEnBloque: true }
        ]
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 2);
    assert.deepEqual(
        alerts.map(alert => [alert.categoria, alert.monto, alert.vencimiento]).sort(),
        [
            ['Ciudad Visa', 2000, '2026-11-11'],
            ['Santander Visa', 1000, '2026-11-11']
        ]
    );
});

test('includes an overdue unpaid service and its current monthly expense', () => {
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
    assert.equal(alerts[0].monto, 2000);
    assert.equal(alerts[0].vencimiento, '2026-11-10');
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
    }], {
        excepcionesEstado: {
            'card-purchase_2026-10': 'VENCIDO'
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 1000);
    assert.equal(alerts[0].vencimiento, '2026-10-10');
});

test('uses the full individual expense amount despite a recorded partial payment', () => {
    const state = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-11'
    }], {
        excepcionesEstado: {
            'internet_2026-11': 'PENDIENTE'
        },
        excepcionesMontoPagado: {
            'internet_2026-11': 350
        }
    });

    const alerts = calcularAlertasVencimiento(state, '2026-11-11');
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].monto, 1000);
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

test('aggregates workspace alerts per owner and accepted group member', () => {
    const personal = crearEstado([{
        id: 'internet',
        concepto: 'Internet',
        monto: 1000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-11'
    }], {
        grupoInfo: {
            miembros: {
                'uid-ana': { email: 'ana@example.com', rol: 'admin' }
            }
        }
    });
    const shared = crearEstado([{
        id: 'luz',
        concepto: 'Luz',
        monto: 2000,
        cuotas: 1,
        categoria: 'Servicios',
        startMonth: '2026-11',
        vencimiento: '2026-11-12'
    }], {
        grupoInfo: {
            nombreGrupo: 'Casa',
            miembros: {
                'uid-ana': { email: 'ana@example.com', rol: 'admin' },
                'uid-juan': { email: 'juan@example.com', rol: 'editor', invitacionId: 'inv-1' }
            }
        }
    });

    const recipients = calcularAlertasPorDestinatario([
        { id: 'personal_uid-ana', appState: personal },
        { id: 'group-casa', appState: shared }
    ], '2026-11-11');

    assert.deepEqual(
        recipients.map(recipient => [
            recipient.email,
            recipient.alerts.map(alert => [alert.espacio, alert.concepto])
        ]),
        [
            ['ana@example.com', [
                ['Mi Espacio Personal', 'Internet'],
                ['Casa', 'Luz']
            ]],
            ['juan@example.com', [
                ['Casa', 'Luz']
            ]]
        ]
    );
});

test('recovers an empty workspace membership only from accepted invites and its admin', () => {
    const members = reconstruirMiembrosEspacio({}, [
        {
            estado: 'PENDIENTE',
            remitenteEmail: 'admin@example.com',
            destinatarioUid: 'uid-pending',
            destinatarioEmail: 'pending@example.com'
        },
        {
            estado: 'ACEPTADO',
            remitenteEmail: 'admin@example.com',
            destinatarioUid: 'uid-accepted',
            destinatarioEmail: 'accepted@example.com',
            rol: 'editor'
        }
    ], 'uid-admin');

    assert.deepEqual(members, {
        'uid-accepted': { email: 'accepted@example.com', rol: 'editor' },
        'uid-admin': { email: 'admin@example.com', rol: 'admin' }
    });
});

test('normalizes supported dates, formats cents, and escapes HTML', () => {
    assert.equal(normalizarFecha('11/11/2026'), '2026-11-11');
    assert.equal(normalizarFecha('2026-02-30'), '');
    assert.equal(formatearMonto(61775160.14), '61.775.160,14');
    assert.equal(escaparHtml('<Mercado & Pago>'), '&lt;Mercado &amp; Pago&gt;');
});
