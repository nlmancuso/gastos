        const categoriasGastoMensual = [
            { nombre: 'Alimentación', color: '#10b981' },
            { nombre: 'Hogar', color: '#8b5cf6' },
            { nombre: 'Transporte', color: '#3b82f6' },
            { nombre: 'Salud', color: '#ef4444' },
            { nombre: 'Educación', color: '#06b6d4' },
            { nombre: 'Ocio', color: '#f59e0b' },
            { nombre: 'Otros', color: '#64748b' }
        ];
        let ordenGastosMensuales = { columna: 'fecha', ascendente: false };
        let filtrosCategoriasTablaGastoMensual = [];
        let filtrosCategoriasGraficoGastoMensual = [];
        let chartGastoMensualCategorias = null;
        let chartGastoMensualEvolucion = null;
        let chartGastoMensualEvolucionCategorias = null;
        let chartGastoMensualUsuarios = null;
        let gastoMensualPendienteDeEliminar = null;
        let guardandoGastoMensual = false;

        function obtenerCategoriasGastoMensual() {
            if (!Array.isArray(window.appState.categoriasGastosMensuales)) {
                window.appState.categoriasGastosMensuales = categoriasGastoMensual.map(categoria => ({ ...categoria }));
            }
            return window.appState.categoriasGastosMensuales;
        }

        function renderSelectoresCategoriaGastoMensual() {
            const categorias = obtenerCategoriasGastoMensual();
            const selectorCategoria = document.getElementById('gastoMensualCategoria');
            const categoriaSeleccionada = selectorCategoria.value;

            selectorCategoria.replaceChildren();
            categorias.forEach(categoria => {
                const opcion = document.createElement('option');
                opcion.value = categoria.nombre;
                opcion.textContent = categoria.nombre;
                selectorCategoria.appendChild(opcion);
            });
            if (categorias.some(categoria => categoria.nombre === categoriaSeleccionada)) {
                selectorCategoria.value = categoriaSeleccionada;
            }
            renderFiltrosCategoriasTablaGastoMensual();
        }

        function renderFiltrosCategoriasTablaGastoMensual() {
            const container = document.getElementById('containerFiltrosCategoriasTablaGastoMensual');
            if (!container) return;
            const categorias = obtenerCategoriasGastoMensual();
            const nombres = obtenerNombresCategoriasGastoMensual();
            container.replaceChildren();
            nombres.forEach((nombre, index) => {
                const categoria = categorias.find(item => item.nombre === nombre);
                const color = categoria?.color || ['#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#64748b'][index % 7];
                const seleccionado = filtrosCategoriasTablaGastoMensual.length === 0
                    || filtrosCategoriasTablaGastoMensual.includes(nombre);
                const etiqueta = document.createElement('label');
                etiqueta.className = `cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${seleccionado ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = nombre;
                checkbox.checked = seleccionado;
                checkbox.className = 'hidden';
                checkbox.addEventListener('change', () => window.toggleFiltroCategoriaTablaGastoMensual(checkbox));
                const punto = document.createElement('span');
                punto.className = 'w-2 h-2 rounded-full';
                punto.style.backgroundColor = color;
                const texto = document.createElement('span');
                texto.textContent = nombre;
                etiqueta.append(checkbox, punto, texto);
                container.appendChild(etiqueta);
            });
        }

        window.toggleFiltroCategoriaTablaGastoMensual = function(checkbox) {
            const nombres = obtenerNombresCategoriasGastoMensual();
            if (filtrosCategoriasTablaGastoMensual.includes('__NINGUNA__')) {
                filtrosCategoriasTablaGastoMensual = [];
            } else if (filtrosCategoriasTablaGastoMensual.length === 0) {
                filtrosCategoriasTablaGastoMensual = [...nombres];
            }
            if (checkbox.checked) {
                if (!filtrosCategoriasTablaGastoMensual.includes(checkbox.value)) {
                    filtrosCategoriasTablaGastoMensual.push(checkbox.value);
                }
            } else {
                filtrosCategoriasTablaGastoMensual = filtrosCategoriasTablaGastoMensual.filter(nombre => nombre !== checkbox.value);
            }
            if (filtrosCategoriasTablaGastoMensual.length === nombres.length) {
                filtrosCategoriasTablaGastoMensual = [];
            }
            renderFiltrosCategoriasTablaGastoMensual();
            renderGastoMensualApp();
        };

        window.marcarTodasCategoriasTablaGastoMensual = function(marcar) {
            filtrosCategoriasTablaGastoMensual = marcar ? [] : ['__NINGUNA__'];
            renderFiltrosCategoriasTablaGastoMensual();
            renderGastoMensualApp();
        }

        function obtenerNombresCategoriasGastoMensual() {
            return [...new Set([
                ...obtenerCategoriasGastoMensual().map(categoria => categoria.nombre),
                ...(window.appState.gastosMensuales || []).map(gasto => gasto.categoria).filter(Boolean)
            ])];
        }

        function renderFiltrosCategoriasGraficoGastoMensual() {
            const container = document.getElementById('containerFiltrosCategoriasGastoMensual');
            if (!container) return;
            const categorias = obtenerCategoriasGastoMensual();
            const nombresCategorias = obtenerNombresCategoriasGastoMensual();
            container.replaceChildren();

            nombresCategorias.forEach((nombre, index) => {
                const categoria = categorias.find(item => item.nombre === nombre);
                const color = categoria?.color || ['#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#64748b'][index % 7];
                const seleccionado = filtrosCategoriasGraficoGastoMensual.length === 0
                    || filtrosCategoriasGraficoGastoMensual.includes(nombre);
                const etiqueta = document.createElement('label');
                etiqueta.className = `cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${seleccionado ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}`;
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.value = nombre;
                checkbox.checked = seleccionado;
                checkbox.className = 'hidden';
                checkbox.addEventListener('change', () => window.toggleFiltroCategoriaGastoMensual(checkbox));
                const punto = document.createElement('span');
                punto.className = 'w-2 h-2 rounded-full';
                punto.style.backgroundColor = color;
                const texto = document.createElement('span');
                texto.textContent = nombre;
                etiqueta.append(checkbox, punto, texto);
                container.appendChild(etiqueta);
            });
        }

        window.toggleFiltroCategoriaGastoMensual = function(checkbox) {
            const categorias = obtenerNombresCategoriasGastoMensual();
            if (filtrosCategoriasGraficoGastoMensual.length === 0) {
                filtrosCategoriasGraficoGastoMensual = [...categorias];
            } else if (filtrosCategoriasGraficoGastoMensual.includes('__NINGUNA__')) {
                filtrosCategoriasGraficoGastoMensual = [];
            }

            if (checkbox.checked) {
                if (!filtrosCategoriasGraficoGastoMensual.includes(checkbox.value)) {
                    filtrosCategoriasGraficoGastoMensual.push(checkbox.value);
                }
            } else {
                filtrosCategoriasGraficoGastoMensual = filtrosCategoriasGraficoGastoMensual
                    .filter(nombre => nombre !== checkbox.value);
            }
            if (filtrosCategoriasGraficoGastoMensual.length === categorias.length) {
                filtrosCategoriasGraficoGastoMensual = [];
            }
            renderFiltrosCategoriasGraficoGastoMensual();
            renderGraficosGastoMensual();
        };

        window.marcarTodasCategoriasGastoMensual = function(marcar) {
            filtrosCategoriasGraficoGastoMensual = marcar ? [] : ['__NINGUNA__'];
            renderFiltrosCategoriasGraficoGastoMensual();
            renderGraficosGastoMensual();
        };

        function renderListaCategoriasGastoMensual() {
            const container = document.getElementById('listaCategoriasGastoMensual');
            container.replaceChildren();
            obtenerCategoriasGastoMensual().forEach((categoria, index) => {
                const fila = document.createElement('div');
                fila.className = 'flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800';
                const campos = document.createElement('div');
                campos.className = 'flex items-center gap-2 flex-1';
                const color = document.createElement('input');
                color.type = 'color';
                color.value = categoria.color || '#64748b';
                color.className = 'w-8 h-8 rounded bg-slate-900 border border-slate-800 cursor-pointer p-0.5';
                color.setAttribute('aria-label', `Color de ${categoria.nombre}`);
                color.addEventListener('change', () => actualizarCategoriaGastoMensual(index, 'color', color.value));
                const nombre = document.createElement('input');
                nombre.type = 'text';
                nombre.value = categoria.nombre;
                nombre.maxLength = 40;
                nombre.className = 'flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white';
                nombre.setAttribute('aria-label', 'Nombre de categoría');
                nombre.addEventListener('change', () => actualizarCategoriaGastoMensual(index, 'nombre', nombre.value));
                const eliminar = document.createElement('button');
                eliminar.type = 'button';
                eliminar.className = 'text-rose-400 hover:text-rose-300 p-2';
                eliminar.title = 'Eliminar categoría';
                eliminar.setAttribute('aria-label', `Eliminar categoría ${categoria.nombre}`);
                eliminar.innerHTML = '<i class="fa-solid fa-trash-can text-xs"></i>';
                eliminar.addEventListener('click', () => eliminarCategoriaGastoMensual(index));
                campos.append(color, nombre);
                fila.append(campos, eliminar);
                container.appendChild(fila);
            });
        }

        async function guardarCambiosCategoriasGastoMensual(categorias, gastos) {
            try {
                await window.guardarCategoriasGastoMensual(categorias, gastos);
                renderListaCategoriasGastoMensual();
                renderGastoMensualApp();
            } catch (error) {
                console.error('Error al guardar las categorías de gasto mensual:', error);
                window.mostrarMensajeApp('No se pudieron guardar las categorías', 'Revisá tu conexión y tus permisos e intentá nuevamente.', 'error');
            }
        }

        window.openModalCategoriasGastoMensual = function() {
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Solo los usuarios con permiso de escritura pueden administrar categorías.', 'error');
                return;
            }
            renderListaCategoriasGastoMensual();
            document.getElementById('modalCategoriasGastoMensual').classList.remove('hidden');
        };

        window.agregarCategoriaGastoMensual = async function(event) {
            event.preventDefault();
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Solo los usuarios con permiso de escritura pueden administrar categorías.', 'error');
                return;
            }
            const inputNombre = document.getElementById('nuevaCategoriaGastoMensualNombre');
            const nombre = inputNombre.value.trim();
            const categorias = obtenerCategoriasGastoMensual().map(categoria => ({ ...categoria }));
            if (!nombre) return;
            if (categorias.some(categoria => categoria.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase())) {
                window.mostrarMensajeApp('Categoría existente', 'Ya hay una categoría con ese nombre.', 'error');
                return;
            }
            categorias.push({ nombre, color: document.getElementById('nuevaCategoriaGastoMensualColor').value });
            await guardarCambiosCategoriasGastoMensual(categorias, window.appState.gastosMensuales || []);
            if (window.appState.categoriasGastosMensuales.some(categoria => categoria.nombre === nombre)) {
                inputNombre.value = '';
            }
        };

        window.actualizarCategoriaGastoMensual = async function(index, campo, valor) {
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Solo los usuarios con permiso de escritura pueden administrar categorías.', 'error');
                return;
            }
            const categorias = obtenerCategoriasGastoMensual().map(categoria => ({ ...categoria }));
            const categoriaActual = categorias[index];
            if (!categoriaActual) return;
            const gastos = (window.appState.gastosMensuales || []).map(gasto => ({ ...gasto }));
            if (campo === 'nombre') {
                const nombre = valor.trim();
                if (!nombre) {
                    renderListaCategoriasGastoMensual();
                    return;
                }
                if (categorias.some((categoria, categoriaIndex) => categoriaIndex !== index && categoria.nombre.toLocaleLowerCase() === nombre.toLocaleLowerCase())) {
                    window.mostrarMensajeApp('Categoría existente', 'Ya hay una categoría con ese nombre.', 'error');
                    renderListaCategoriasGastoMensual();
                    return;
                }
                gastos.forEach(gasto => {
                    if (gasto.categoria === categoriaActual.nombre) gasto.categoria = nombre;
                });
                categoriaActual.nombre = nombre;
            } else if (campo === 'color') {
                categoriaActual.color = valor;
            } else {
                return;
            }
            await guardarCambiosCategoriasGastoMensual(categorias, gastos);
        };

        window.eliminarCategoriaGastoMensual = async function(index) {
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Solo los usuarios con permiso de escritura pueden administrar categorías.', 'error');
                return;
            }
            const categorias = obtenerCategoriasGastoMensual().map(categoria => ({ ...categoria }));
            if (categorias.length <= 1) {
                window.mostrarMensajeApp('No se puede eliminar', 'Debe quedar al menos una categoría.', 'error');
                return;
            }
            categorias.splice(index, 1);
            await guardarCambiosCategoriasGastoMensual(categorias, window.appState.gastosMensuales || []);
        };

        document.getElementById('formNuevaCategoriaGastoMensual').addEventListener('submit', window.agregarCategoriaGastoMensual);

        document.addEventListener('DOMContentLoaded', () => {
            const fechaInput = document.getElementById('gastoMensualFecha');
            if (fechaInput) fechaInput.value = obtenerFechaLocalParaInput();
        });

        function esEditorGastoMensual() {
            return typeof window.esUsuarioEditor === 'function' && window.esUsuarioEditor();
        }

        window.filtrarGastosMensuales = function(categoria) {
            filtrosCategoriasTablaGastoMensual = categoria ? [categoria] : [];
            renderGastoMensualApp();
        };

        window.sortGastosMensuales = function(columna) {
            if (ordenGastosMensuales.columna === columna) {
                ordenGastosMensuales.ascendente = !ordenGastosMensuales.ascendente;
            } else {
                ordenGastosMensuales = { columna, ascendente: columna !== 'fecha' };
            }
            renderGastoMensualApp();
        };

        window.renderGastoMensualApp = function() {
            const mes = window.appState.currentMonth || '2026-10';
            const mesTexto = window.formatMonthDisplay(mes);
            const gastosMes = (Array.isArray(window.appState.gastosMensuales) ? window.appState.gastosMensuales : [])
                .filter(gasto => gasto.fecha && gasto.fecha.slice(0, 7) === mes);
            const editor = esEditorGastoMensual();
            const formulario = document.getElementById('formGastoMensualContainer');
            const tituloFormulario = document.getElementById('tituloFormGastoMensual');
            const formularioCampos = document.getElementById('formGastoMensual');
            const mensajeLectura = document.getElementById('gastoMensualSoloLectura');
            if (formulario) formulario.classList.remove('hidden');
            if (tituloFormulario) tituloFormulario.classList.toggle('hidden', !editor);
            if (formularioCampos) formularioCampos.classList.toggle('hidden', !editor);
            if (mensajeLectura) mensajeLectura.classList.toggle('hidden', editor);
            document.getElementById('btnCategoriasGastoMensual').classList.toggle('hidden', !editor);
            renderSelectoresCategoriaGastoMensual();
            renderFiltrosCategoriasGraficoGastoMensual();

            document.getElementById('badgeGastoMensualMes').textContent = mesTexto;
            document.getElementById('badgeGastoMensualCategoriaMes').textContent = mesTexto;
            const total = gastosMes.reduce((suma, gasto) => suma + (Number(gasto.monto) || 0), 0);
            const hoy = new Date();
            const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
            const [año, numeroMes] = mes.split('-').map(Number);
            const diasMes = new Date(año, numeroMes, 0).getDate();
            const diasContabilizados = mes < mesActual ? diasMes : mes === mesActual ? hoy.getDate() : 0;
            const promedio = diasContabilizados > 0 ? total / diasContabilizados : 0;
            const formatoMoneda = monto => '$ ' + monto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            document.getElementById('cardGastoMensualTotal').textContent = formatoMoneda(total);
            document.getElementById('cardGastoMensualPromedio').textContent = formatoMoneda(promedio);
            document.getElementById('cardGastoMensualCantidad').textContent = `${gastosMes.length} gasto${gastosMes.length === 1 ? '' : 's'}`;

            const totalesPorCategoria = new Map();
            gastosMes.forEach(gasto => {
                totalesPorCategoria.set(gasto.categoria, (totalesPorCategoria.get(gasto.categoria) || 0) + (Number(gasto.monto) || 0));
            });
            const resumen = document.getElementById('containerGastoMensualCatTotales');
            resumen.replaceChildren();
            const categoriasConGastos = [...totalesPorCategoria.entries()].sort((a, b) => b[1] - a[1]);
            if (categoriasConGastos.length === 0) {
                const vacio = document.createElement('p');
                vacio.className = 'text-xs text-slate-500 italic text-center py-6';
                vacio.textContent = 'No hay gastos registrados en este mes.';
                resumen.appendChild(vacio);
            } else {
                categoriasConGastos.forEach(([nombre, monto]) => {
                    const categoria = obtenerCategoriasGastoMensual().find(item => item.nombre === nombre);
                    const porcentaje = total > 0 ? (monto / total) * 100 : 0;
                    const fila = document.createElement('div');
                    fila.className = 'p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5';
                    const cabecera = document.createElement('div');
                    cabecera.className = 'flex justify-between items-center text-xs';
                    const etiqueta = document.createElement('span');
                    etiqueta.className = 'font-bold text-white flex items-center gap-2';
                    const punto = document.createElement('span');
                    punto.className = 'w-2.5 h-2.5 rounded-full';
                    punto.style.backgroundColor = categoria ? categoria.color : '#64748b';
                    const nombreCategoria = document.createElement('span');
                    nombreCategoria.textContent = nombre || 'Sin categoría';
                    etiqueta.append(punto, nombreCategoria);
                    const montoCategoria = document.createElement('span');
                    montoCategoria.className = 'font-extrabold text-sky-400';
                    montoCategoria.textContent = `${formatoMoneda(monto)} (${porcentaje.toFixed(1)}%)`;
                    cabecera.append(etiqueta, montoCategoria);
                    const barra = document.createElement('div');
                    barra.className = 'w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80';
                    const progreso = document.createElement('div');
                    progreso.className = 'h-full rounded-full';
                    progreso.style.width = `${porcentaje}%`;
                    progreso.style.backgroundColor = categoria ? categoria.color : '#64748b';
                    barra.appendChild(progreso);
                    fila.append(cabecera, barra);
                    resumen.appendChild(fila);
                });
            }

            const gastosFiltrados = gastosMes
                .filter(gasto => filtrosCategoriasTablaGastoMensual.includes('__NINGUNA__')
                    ? false
                    : filtrosCategoriasTablaGastoMensual.length === 0 || filtrosCategoriasTablaGastoMensual.includes(gasto.categoria || 'Sin categoría'))
                .sort((a, b) => {
                    const valorA = ordenGastosMensuales.columna === 'monto' ? Number(a.monto) || 0 : a[ordenGastosMensuales.columna] || '';
                    const valorB = ordenGastosMensuales.columna === 'monto' ? Number(b.monto) || 0 : b[ordenGastosMensuales.columna] || '';
                    if (valorA < valorB) return ordenGastosMensuales.ascendente ? -1 : 1;
                    if (valorA > valorB) return ordenGastosMensuales.ascendente ? 1 : -1;
                    return 0;
                });
            renderGraficosGastoMensual();

            const tabla = document.getElementById('tablaGastoMensualCuerpo');
            tabla.replaceChildren();
            if (gastosFiltrados.length === 0) {
                const fila = document.createElement('tr');
                const celda = document.createElement('td');
                celda.colSpan = 7;
                celda.className = 'px-6 py-8 text-center text-slate-500';
                celda.textContent = 'No hay gastos mensuales que coincidan.';
                fila.appendChild(celda);
                tabla.appendChild(fila);
                return;
            }

            gastosFiltrados.forEach(gasto => {
                const fila = document.createElement('tr');
                fila.className = 'hover:bg-slate-900/40 transition-colors';
                const fecha = document.createElement('td');
                fecha.className = 'px-5 py-3.5 text-slate-400 text-xs';
                fecha.textContent = gasto.fecha ? gasto.fecha.split('-').reverse().join('/') : '';
                const concepto = document.createElement('td');
                concepto.className = 'px-5 py-3.5 text-white font-bold';
                concepto.textContent = gasto.concepto || '';
                const categoria = document.createElement('td');
                categoria.className = 'px-5 py-3.5 text-slate-300';
                const nombreCategoria = gasto.categoria || 'Sin categoría';
                const categoriaConfig = obtenerCategoriasGastoMensual().find(item => item.nombre === nombreCategoria);
                const colorCategoria = categoriaConfig?.color || '#64748b';
                const etiquetaCategoria = document.createElement('span');
                etiquetaCategoria.className = 'px-2.5 py-0.5 rounded-lg text-xs font-semibold text-white border inline-flex items-center gap-1.5';
                etiquetaCategoria.style.backgroundColor = `${colorCategoria}22`;
                etiquetaCategoria.style.borderColor = `${colorCategoria}55`;
                const puntoCategoria = document.createElement('span');
                puntoCategoria.className = 'w-2 h-2 rounded-full';
                puntoCategoria.style.backgroundColor = colorCategoria;
                const textoCategoria = document.createElement('span');
                textoCategoria.textContent = nombreCategoria;
                etiquetaCategoria.append(puntoCategoria, textoCategoria);
                categoria.appendChild(etiquetaCategoria);
                const medioPago = document.createElement('td');
                medioPago.className = 'px-5 py-3.5 text-slate-400 text-xs';
                medioPago.textContent = gasto.medioPago || 'Efectivo';
                const usuario = document.createElement('td');
                usuario.className = 'px-5 py-3.5 text-slate-400 text-xs';
                usuario.textContent = gasto.usuarioEmail
                    ? gasto.usuarioEmail.split('@')[0]
                    : (gasto.usuarioUid ? `Usuario ${gasto.usuarioUid.slice(0, 8)}` : 'Sin identificar');
                const monto = document.createElement('td');
                monto.className = 'px-5 py-3.5 text-right font-extrabold text-sky-400';
                monto.textContent = formatoMoneda(Number(gasto.monto) || 0);
                const acciones = document.createElement('td');
                acciones.className = 'px-5 py-3.5 text-right';
                if (editor) {
                    const botonEliminar = document.createElement('button');
                    botonEliminar.type = 'button';
                    botonEliminar.className = 'text-slate-400 hover:text-rose-400';
                    botonEliminar.title = 'Eliminar';
                    botonEliminar.setAttribute('aria-label', `Eliminar ${gasto.concepto || 'gasto'}`);
                    botonEliminar.innerHTML = '<i class="fa-solid fa-trash-can text-xs"></i>';
                    botonEliminar.addEventListener('click', () => window.deleteGastoMensual(gasto.id));
                    acciones.appendChild(botonEliminar);
                }
                fila.append(fecha, concepto, categoria, medioPago, usuario, monto, acciones);
                tabla.appendChild(fila);
            });
        };

        function renderGraficosGastoMensual() {
            if (typeof Chart === 'undefined') return;
            const gastos = Array.isArray(window.appState.gastosMensuales) ? window.appState.gastosMensuales : [];
            const mesActual = window.appState.currentMonth || '2026-10';
            const [añoActual, numeroMesActual] = mesActual.split('-').map(Number);
            const meses = [];
            for (let desplazamiento = 5; desplazamiento >= 0; desplazamiento--) {
                const fecha = new Date(añoActual, numeroMesActual - 1 - desplazamiento, 1);
                const clave = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}`;
                meses.push({ clave, etiqueta: window.formatMonthDisplay(clave) });
            }

            const categoriasConfiguradas = obtenerCategoriasGastoMensual();
            const nombresCategorias = [...new Set([
                ...categoriasConfiguradas.map(categoria => categoria.nombre),
                ...gastos.map(gasto => gasto.categoria).filter(Boolean)
            ])];
            const coloresPredeterminados = ['#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#64748b', '#ec4899', '#84cc16', '#fb923c'];
            const colorCategoria = nombre => {
                const indice = categoriasConfiguradas.findIndex(categoria => categoria.nombre === nombre);
                return indice >= 0
                    ? categoriasConfiguradas[indice].color
                    : coloresPredeterminados[(nombresCategorias.indexOf(nombre) + categoriasConfiguradas.length) % coloresPredeterminados.length];
            };
            const gastosMesActual = gastos.filter(gasto => gasto.fecha && gasto.fecha.slice(0, 7) === mesActual);
            const totalesMesPorCategoria = new Map();
            gastosMesActual.forEach(gasto => {
                if (!gasto.categoria) return;
                totalesMesPorCategoria.set(gasto.categoria, (totalesMesPorCategoria.get(gasto.categoria) || 0) + (Number(gasto.monto) || 0));
            });

            const canvasCategorias = document.getElementById('chartGastoMensualCategorias');
            if (canvasCategorias) {
                const etiquetas = [...totalesMesPorCategoria.keys()];
                chartGastoMensualCategorias = updateOrCreateChart(chartGastoMensualCategorias, canvasCategorias, {
                    type: 'doughnut',
                    data: {
                        labels: etiquetas,
                        datasets: [{
                            data: etiquetas.map(nombre => totalesMesPorCategoria.get(nombre)),
                            backgroundColor: etiquetas.map(colorCategoria),
                            borderWidth: 0
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'right',
                                display: etiquetas.length > 0,
                                labels: { color: '#cbd5e1' }
                            }
                        }
                    }
                });
            }

            const canvasEvolucion = document.getElementById('chartGastoMensualEvolucion');
            if (canvasEvolucion) {
                const totalesPorMes = meses.map(mes => gastos.reduce((suma, gasto) => (
                    gasto.fecha && gasto.fecha.slice(0, 7) === mes.clave
                        ? suma + (Number(gasto.monto) || 0)
                        : suma
                ), 0));
                chartGastoMensualEvolucion = updateOrCreateChart(chartGastoMensualEvolucion, canvasEvolucion, {
                    type: 'bar',
                    data: {
                        labels: meses.map(mes => mes.etiqueta),
                        datasets: [{
                            label: 'Gastos Mensuales',
                            data: totalesPorMes,
                            backgroundColor: '#38bdf8',
                            borderRadius: 6
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: { legend: { display: false } },
                        scales: {
                            x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
                        }
                    }
                });
            }

            const canvasEvolucionCategorias = document.getElementById('chartGastoMensualEvolucionCategorias');
            if (canvasEvolucionCategorias) {
                const categoriasVisibles = filtrosCategoriasGraficoGastoMensual.includes('__NINGUNA__')
                    ? []
                    : nombresCategorias.filter(nombre => filtrosCategoriasGraficoGastoMensual.length === 0 || filtrosCategoriasGraficoGastoMensual.includes(nombre));
                const datasets = categoriasVisibles.map(nombre => ({
                    label: nombre,
                    data: meses.map(mes => gastos.reduce((suma, gasto) => (
                        gasto.fecha && gasto.fecha.slice(0, 7) === mes.clave && gasto.categoria === nombre
                            ? suma + (Number(gasto.monto) || 0)
                            : suma
                    ), 0)),
                    borderColor: colorCategoria(nombre),
                    backgroundColor: colorCategoria(nombre),
                    borderWidth: 2,
                    fill: false,
                    tension: 0.3
                }));
                chartGastoMensualEvolucionCategorias = updateOrCreateChart(chartGastoMensualEvolucionCategorias, canvasEvolucionCategorias, {
                    type: 'line',
                    data: {
                        labels: meses.map(mes => mes.etiqueta),
                        datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                display: datasets.length > 0,
                                position: 'bottom',
                                labels: { color: '#cbd5e1' }
                            }
                        },
                        scales: {
                            x: { ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                            y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
                        }
                    }
                });
            }

            renderGraficoGastoMensualPorUsuario(gastos, meses);
        }

        function renderGraficoGastoMensualPorUsuario(gastos, meses) {
            const canvas = document.getElementById('chartGastoMensualUsuarios');
            if (!canvas || typeof Chart === 'undefined') return;
            const totalesPorUsuario = new Map();
            gastos.forEach(gasto => {
                if (!gasto.fecha) return;
                const claveMes = gasto.fecha.slice(0, 7);
                const mesIndice = meses.findIndex(mes => mes.clave === claveMes);
                if (mesIndice < 0) return;

                const claveUsuario = gasto.usuarioUid || (gasto.usuarioEmail ? `email:${gasto.usuarioEmail.toLowerCase()}` : 'sin-identificar');
                const nombreUsuario = gasto.usuarioEmail
                    ? gasto.usuarioEmail.split('@')[0]
                    : (gasto.usuarioUid ? `Usuario ${gasto.usuarioUid.slice(0, 8)}` : 'Sin identificar');
                if (!totalesPorUsuario.has(claveUsuario)) {
                    totalesPorUsuario.set(claveUsuario, {
                        nombre: nombreUsuario,
                        valores: Array(meses.length).fill(0)
                    });
                }
                totalesPorUsuario.get(claveUsuario).valores[mesIndice] += Number(gasto.monto) || 0;
            });

            const colores = ['#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#f43f5e', '#22d3ee', '#84cc16', '#fb923c'];
            const datasets = [...totalesPorUsuario.values()].map((usuario, indice) => ({
                label: usuario.nombre,
                data: usuario.valores,
                backgroundColor: colores[indice % colores.length],
                borderRadius: 6
            }));

            chartGastoMensualUsuarios = updateOrCreateChart(chartGastoMensualUsuarios, canvas, {
                type: 'bar',
                data: {
                    labels: meses.map(mes => mes.etiqueta),
                    datasets
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: datasets.length > 0,
                            position: 'bottom',
                            labels: { color: '#cbd5e1' }
                        },
                        tooltip: {
                            callbacks: {
                                label: contexto => `${contexto.dataset.label}: $ ${Number(contexto.raw || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                            }
                        }
                    },
                    scales: {
                        x: { stacked: false, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } },
                        y: { beginAtZero: true, ticks: { color: '#94a3b8' }, grid: { color: '#1e293b' } }
                    }
                }
            });
        }

        window.handleSaveGastoMensual = async function(event) {
            event.preventDefault();
            if (guardandoGastoMensual) return;
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Tu permiso en este grupo es de solo lectura.', 'error');
                return;
            }

            const usuarioActual = window.auth?.currentUser;
            if (!usuarioActual) {
                window.mostrarMensajeApp('Sesión no disponible', 'Volvé a iniciar sesión para registrar el gasto.', 'error');
                return;
            }
            const concepto = document.getElementById('gastoMensualConcepto').value.trim();
            const monto = Number(document.getElementById('gastoMensualMonto').value);
            const fecha = document.getElementById('gastoMensualFecha').value;
            if (!concepto || !Number.isFinite(monto) || monto <= 0 || !fecha) {
                window.mostrarMensajeApp('Datos incompletos', 'Ingresá una descripción, un monto mayor a cero y una fecha válida.', 'error');
                return;
            }

            const nuevoGasto = {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                concepto,
                monto,
                fecha,
                categoria: document.getElementById('gastoMensualCategoria').value,
                medioPago: document.getElementById('gastoMensualMedioPago').value,
                usuarioUid: usuarioActual.uid,
                usuarioEmail: usuarioActual.email || 'Usuario sin correo'
            };
            const mesSeleccionado = window.appState.currentMonth;
            const formulario = document.getElementById('formGastoMensual');
            const botonGuardar = formulario.querySelector('button[type="submit"]');
            const textoOriginalBoton = botonGuardar.innerHTML;
            guardandoGastoMensual = true;
            botonGuardar.disabled = true;
            botonGuardar.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Guardando...';
            try {
                await window.agregarGastoMensualCompartido(nuevoGasto);
            } catch (error) {
                console.error('Error al guardar el gasto mensual compartido:', error);
                const detalle = error.code === 'permission-denied'
                    ? 'Firestore rechazó la escritura por permisos. Revisá las reglas del grupo.'
                    : 'Revisá tu conexión e intentá nuevamente.';
                window.mostrarMensajeApp('No se pudo guardar', `El gasto no se guardó en Firestore. ${detalle}`, 'error');
                return;
            } finally {
                guardandoGastoMensual = false;
                botonGuardar.disabled = false;
                botonGuardar.innerHTML = textoOriginalBoton;
            }
            window.persistCurrentMonthSelection(mesSeleccionado);
            document.getElementById('gastoMensualConcepto').value = '';
            document.getElementById('gastoMensualMonto').value = '';
            document.getElementById('gastoMensualFecha').value = obtenerFechaLocalParaInput();
            renderGastoMensualApp();
        };

        window.deleteGastoMensual = function(id) {
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Tu permiso en este grupo es de solo lectura.', 'error');
                return;
            }
            gastoMensualPendienteDeEliminar = (window.appState.gastosMensuales || []).find(gasto => gasto.id === id) || null;
            if (!gastoMensualPendienteDeEliminar) return;
            document.getElementById('nombreGastoMensualAEliminar').textContent = gastoMensualPendienteDeEliminar.concepto || 'este gasto';
            document.getElementById('errorEliminarGastoMensual').classList.add('hidden');
            document.getElementById('modalConfirmarGastoMensual').classList.remove('hidden');
        };

        window.cerrarConfirmacionGastoMensual = function() {
            document.getElementById('modalConfirmarGastoMensual').classList.add('hidden');
            document.getElementById('errorEliminarGastoMensual').classList.add('hidden');
            document.getElementById('btnConfirmarEliminarGastoMensual').disabled = false;
            document.getElementById('btnConfirmarEliminarGastoMensual').textContent = 'Sí, eliminar';
            gastoMensualPendienteDeEliminar = null;
        };

        window.confirmarEliminacionGastoMensual = async function() {
            if (!esEditorGastoMensual()) {
                window.mostrarMensajeApp('Acceso restringido', 'Tu permiso en este grupo es de solo lectura.', 'error');
                window.cerrarConfirmacionGastoMensual();
                return;
            }
            if (!gastoMensualPendienteDeEliminar) return;

            const boton = document.getElementById('btnConfirmarEliminarGastoMensual');
            const mensajeError = document.getElementById('errorEliminarGastoMensual');
            boton.disabled = true;
            boton.textContent = 'Eliminando...';
            mensajeError.classList.add('hidden');
            try {
                await window.eliminarGastoMensualCompartido(gastoMensualPendienteDeEliminar.id);
            } catch (error) {
                console.error('Error al eliminar el gasto mensual compartido:', error);
                const detalle = error.code === 'permission-denied'
                    ? 'Firestore rechazó el borrado por permisos. Verificá que tu usuario tenga permiso de escritura en este grupo y que las reglas de Firestore lo permitan.'
                    : `No se pudo completar la operación (${error.code || 'error desconocido'}). Revisá la conexión e intentá nuevamente.`;
                mensajeError.textContent = `El gasto sigue guardado. ${detalle}`;
                mensajeError.classList.remove('hidden');
                boton.disabled = false;
                boton.textContent = 'Reintentar';
                return;
            }
            window.appState.gastosMensuales = (window.appState.gastosMensuales || [])
                .filter(gasto => gasto.id !== gastoMensualPendienteDeEliminar.id);
            window.cerrarConfirmacionGastoMensual();
            renderGastoMensualApp();
        };
