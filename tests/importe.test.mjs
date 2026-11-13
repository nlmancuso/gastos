import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluarExpresionImporte } from '../importe.mjs';

test('evalúa operaciones con prioridad y paréntesis', () => {
    assert.equal(evaluarExpresionImporte('2+2'), 4);
    assert.equal(evaluarExpresionImporte('2 + 3 * 4'), 14);
    assert.equal(evaluarExpresionImporte('(2 + 3) * 4'), 20);
});

test('acepta decimales con punto o coma y redondea a centavos', () => {
    assert.equal(evaluarExpresionImporte('1,5 + 2.25'), 3.75);
    assert.equal(evaluarExpresionImporte('1 / 3'), 0.33);
});

test('rechaza expresiones inválidas, divisiones por cero y código', () => {
    for (const expresion of ['2+', '4/0', 'alert(1)', '2**3', '1e3']) {
        assert.throws(() => evaluarExpresionImporte(expresion));
    }
});
