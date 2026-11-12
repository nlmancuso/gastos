import test from 'node:test';
import assert from 'node:assert/strict';
import {
    calcularMontoConInflacion,
    crearHistorialAumentos,
    obtenerPrimerMesCambioProgramado,
    obtenerPorcentajeAumentoSubcategoria
} from '../inflacion.mjs';

test('mantiene la tasa legacy y capitaliza mes a mes', () => {
    const subcategoria = { porcentajeAumento: 10 };
    const montoDiciembre = calcularMontoConInflacion(
        1000,
        '2026-11',
        '2026-12',
        mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes)
    );
    const montoEnero = calcularMontoConInflacion(
        1000,
        '2026-11',
        '2027-01',
        mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes)
    );

    assert.equal(montoDiciembre, 1100);
    assert.equal(montoEnero, 1210);
});

test('aplica una nueva tasa desde su mes y conserva la anterior', () => {
    const subcategoria = {
        porcentajeAumento: 10,
        historialAumentos: [{ desdeMes: '2026-12', porcentajeAumento: 5 }]
    };

    assert.equal(obtenerPorcentajeAumentoSubcategoria(subcategoria, '2026-11'), 10);
    assert.equal(
        calcularMontoConInflacion(1000, '2026-11', '2026-12', mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes), '2026-12'),
        1050
    );
    assert.equal(
        calcularMontoConInflacion(1000, '2026-11', '2027-01', mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes), '2026-12'),
        1102.5
    );
});

test('usa un importe manual como base para la inflación del mes siguiente', () => {
    const subcategoria = {
        porcentajeAumento: 10,
        historialAumentos: [{ desdeMes: '2026-12', porcentajeAumento: 10 }]
    };

    assert.equal(
        calcularMontoConInflacion(1050, '2026-12', '2027-01', mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes), '2027-01'),
        1155
    );
});

test('no redondea meses anteriores al cambio de tasa', () => {
    const subcategoria = {
        porcentajeAumento: 10,
        historialAumentos: [{ desdeMes: '2027-02', porcentajeAumento: 0 }]
    };
    const mesInicioRedondeo = obtenerPrimerMesCambioProgramado(subcategoria, '2026-11', '2027-02');

    assert.equal(mesInicioRedondeo, '2027-02');
    assert.equal(
        calcularMontoConInflacion(
            0.05,
            '2026-11',
            '2027-02',
            mes => obtenerPorcentajeAumentoSubcategoria(subcategoria, mes),
            mesInicioRedondeo
        ),
        0.06
    );
});

test('una nueva configuración reemplaza cambios posteriores desde su vigencia', () => {
    const historial = crearHistorialAumentos([
        { desdeMes: '2026-12', porcentajeAumento: 5 },
        { desdeMes: '2027-03', porcentajeAumento: 8 }
    ], '2027-01', 6);

    assert.deepEqual(historial, [
        { desdeMes: '2026-12', porcentajeAumento: 5 },
        { desdeMes: '2027-01', porcentajeAumento: 6 }
    ]);
});
