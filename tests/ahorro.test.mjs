import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularAhorroAcumuladoParaMes,
    calcularAhorroNetoParaMes,
    calcularAhorroParaMes,
    calcularRetirosAhorroParaMes,
    obtenerConfiguracionAhorro
} from '../ahorro.mjs';

test('mantiene el ahorro anterior y aplica cambios desde el mes indicado', () => {
    const ahorros = {
        '2026-10': { tipo: 'importe', valor: 1000 },
        '2026-12': { tipo: 'porcentaje', valor: 10 }
    };
    const sueldos = {
        '2026-11': 30000,
        '2026-12': 40000,
        '2027-01': 50000
    };

    assert.equal(calcularAhorroParaMes(ahorros, '2026-11', mes => sueldos[mes]), 1000);
    assert.equal(calcularAhorroParaMes(ahorros, '2026-12', mes => sueldos[mes]), 4000);
    assert.equal(calcularAhorroParaMes(ahorros, '2027-01', mes => sueldos[mes]), 5000);
});

test('respeta una configuración futura independiente', () => {
    const ahorros = {
        '2026-10': { tipo: 'porcentaje', valor: 5 },
        '2026-12': { tipo: 'importe', valor: 2500 },
        '2027-02': { tipo: 'porcentaje', valor: 8 }
    };
    const sueldo = () => 50000;

    assert.equal(calcularAhorroParaMes(ahorros, '2026-11', sueldo), 2500);
    assert.equal(calcularAhorroParaMes(ahorros, '2026-12', sueldo), 2500);
    assert.equal(calcularAhorroParaMes(ahorros, '2027-02', sueldo), 4000);
});

test('acumula aportes anteriores aunque el rango del gráfico empiece después', () => {
    const ahorros = {
        '2026-10': { tipo: 'importe', valor: 1000 },
        '2026-12': { tipo: 'porcentaje', valor: 10 }
    };
    const sueldos = {
        '2026-12': 40000,
        '2027-01': 50000
    };
    const obtenerSueldo = mes => sueldos[mes] || 30000;

    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, [], '2026-09', obtenerSueldo), 0);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, [], '2026-11', obtenerSueldo), 2000);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, [], '2026-12', obtenerSueldo), 6000);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, [], '2027-01', obtenerSueldo), 11000);
});

test('descuenta retiros del mes y del acumulado desde ese mes en adelante', () => {
    const ahorros = {
        '2026-10': { tipo: 'importe', valor: 100000 }
    };
    const retiros = [{ id: 'retiro-1', mes: '2026-12', monto: 200000 }];
    const sueldo = () => 0;

    assert.equal(calcularRetirosAhorroParaMes(retiros, '2026-12'), 200000);
    assert.equal(calcularAhorroNetoParaMes(ahorros, retiros, '2026-12', sueldo), -100000);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, retiros, '2026-11', sueldo), 200000);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, retiros, '2026-12', sueldo), 100000);
    assert.equal(calcularAhorroAcumuladoParaMes(ahorros, retiros, '2027-01', sueldo), 200000);
});

test('no calcula ahorro si todavía no hay una configuración válida', () => {
    assert.equal(calcularAhorroParaMes({}, '2026-11', () => 50000), 0);
    assert.equal(obtenerConfiguracionAhorro({ '2026-11': { tipo: 'otro', valor: 20 } }, '2026-11'), null);
});
