function crearErrorExpresionImporte() {
    return new Error('La expresión del importe no es válida.');
}

export function evaluarExpresionImporte(texto) {
    const expresion = String(texto).trim();
    if (!expresion || expresion.length > 200) throw crearErrorExpresionImporte();

    let posicion = 0;
    let profundidad = 0;

    function ignorarEspacios() {
        while (/\s/.test(expresion[posicion] || '')) posicion += 1;
    }

    function leerFactor() {
        ignorarEspacios();
        const operador = expresion[posicion];
        if (operador === '+' || operador === '-') {
            posicion += 1;
            const valor = leerFactor();
            return operador === '-' ? -valor : valor;
        }

        if (operador === '(') {
            profundidad += 1;
            if (profundidad > 32) throw crearErrorExpresionImporte();
            posicion += 1;
            const valor = leerSuma();
            ignorarEspacios();
            if (expresion[posicion] !== ')') throw crearErrorExpresionImporte();
            posicion += 1;
            profundidad -= 1;
            return valor;
        }

        const numero = expresion.slice(posicion).match(/^(?:\d+(?:[.,]\d*)?|[.,]\d+)/);
        if (!numero) throw crearErrorExpresionImporte();
        posicion += numero[0].length;
        return Number(numero[0].replace(',', '.'));
    }

    function leerProducto() {
        let valor = leerFactor();
        while (true) {
            ignorarEspacios();
            const operador = expresion[posicion];
            if (operador !== '*' && operador !== '/') return valor;
            posicion += 1;
            const siguiente = leerFactor();
            if (operador === '/' && siguiente === 0) throw crearErrorExpresionImporte();
            valor = operador === '*' ? valor * siguiente : valor / siguiente;
        }
    }

    function leerSuma() {
        let valor = leerProducto();
        while (true) {
            ignorarEspacios();
            const operador = expresion[posicion];
            if (operador !== '+' && operador !== '-') return valor;
            posicion += 1;
            const siguiente = leerProducto();
            valor = operador === '+' ? valor + siguiente : valor - siguiente;
        }
    }

    const resultado = leerSuma();
    ignorarEspacios();
    if (posicion !== expresion.length || !Number.isFinite(resultado)) {
        throw crearErrorExpresionImporte();
    }
    const resultadoRedondeado = Math.round((resultado + Math.sign(resultado) * Number.EPSILON) * 100) / 100;
    if (!Number.isFinite(resultadoRedondeado)) throw crearErrorExpresionImporte();
    return Number(resultadoRedondeado.toFixed(2));
}
