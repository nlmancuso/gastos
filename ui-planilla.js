        window.toggleImportesOcultos = function() {
            const ocultos = document.body.classList.toggle('importes-ocultos');
            const button = document.getElementById('btnToggleImportes');
            const label = ocultos ? 'Mostrar importes' : 'Ocultar importes';

            button.setAttribute('aria-label', label);
            button.setAttribute('aria-pressed', String(ocultos));
            button.title = label;
            button.innerHTML = `<i class="fa-solid ${ocultos ? 'fa-eye-slash' : 'fa-eye'}" aria-hidden="true"></i>`;
        };

        function obtenerItemsPlanillaConSaldo(targetMonth) {
            const pagosIndividuales = window.appState.excepcionesMontoPagado || {};
            const pagosBloque = window.appState.excepcionesMontoPagadoBloque || {};
            const balancesIndividuales = {};
            const balancesBloque = {};
            const ultimosItemsIndividuales = {};
            const categorias = window.appState.categorias || [];
            const gastos = window.appState.gastos || [];
            const mesesConInicio = gastos
                .map(gasto => gasto.startMonth)
                .filter(mes => /^\d{4}-\d{2}$/.test(mes || '') && mes <= targetMonth);
            let mes = mesesConInicio.length ? mesesConInicio.sort()[0] : targetMonth;
            const itemsObjetivo = [];

            const avanzarMes = valor => {
                let [año, numeroMes] = valor.split('-').map(Number);
                numeroMes += 1;
                if (numeroMes > 12) { numeroMes = 1; año += 1; }
                return `${año}-${String(numeroMes).padStart(2, '0')}`;
            };

            while (mes <= targetMonth) {
                let itemsMes = window.getCalculatedDataForMonth(mes).items;
                if (mes !== targetMonth) {
                    itemsMes = itemsMes.filter(item => {
                        const gasto = gastos.find(registro => registro.id === item.id);
                        return gasto && gasto.startMonth;
                    });
                }

                const categoriasActivas = new Set(itemsMes
                    .filter(item => categorias.find(categoria => categoria.nombre === item.categoria)?.vencimientoUnicoEnBloque)
                    .map(item => item.categoria));
                const idsActivos = new Set(itemsMes
                    .filter(item => !categorias.find(categoria => categoria.nombre === item.categoria)?.vencimientoUnicoEnBloque)
                    .map(item => item.id));

                Object.entries(balancesIndividuales).forEach(([id, saldo]) => {
                    if (saldo > 0 && !idsActivos.has(id) && ultimosItemsIndividuales[id]) {
                        itemsMes.push({ ...ultimosItemsIndividuales[id], id, monto: 0, esSaldoArrastrado: true });
                    }
                });
                Object.entries(balancesBloque).forEach(([nombre, saldo]) => {
                    if (saldo > 0 && !categoriasActivas.has(nombre)) {
                        itemsMes.push({
                            id: `saldo_bloque_${encodeURIComponent(nombre)}`,
                            concepto: 'Saldo pendiente de meses anteriores',
                            categoria: nombre,
                            tipo: 'Saldo anterior',
                            monto: 0,
                            vencimiento: '',
                            estado: 'PENDIENTE',
                            esSaldoArrastrado: true
                        });
                    }
                });

                const porCategoriaBloque = new Map();
                const resultadoMes = [];
                itemsMes.forEach(item => {
                    const esBloque = categorias.find(categoria => categoria.nombre === item.categoria)?.vencimientoUnicoEnBloque;
                    if (esBloque) {
                        if (!porCategoriaBloque.has(item.categoria)) porCategoriaBloque.set(item.categoria, []);
                        porCategoriaBloque.get(item.categoria).push(item);
                        return;
                    }

                    const idPago = item.idPago || item.id;
                    const key = `${idPago}_${mes}`;
                    const montoDebido = Math.round(((Number(item.monto) || 0) + (balancesIndividuales[idPago] || 0)) * 100) / 100;
                    const montoPagado = pagosIndividuales[key] !== undefined
                        ? Math.min(Math.max(Number(pagosIndividuales[key]) || 0, 0), montoDebido)
                        : montoDebido;
                    balancesIndividuales[idPago] = Math.max(0, Math.round((montoDebido - montoPagado) * 100) / 100);
                    ultimosItemsIndividuales[idPago] = item;
                    resultadoMes.push({
                        ...item,
                        idPago,
                        monto: montoDebido,
                        montoPagado,
                        montoDebido,
                        esSaldoArrastrado: !!item.esSaldoArrastrado
                    });
                });

                porCategoriaBloque.forEach((gastosCategoria, nombre) => {
                    const saldoAnterior = balancesBloque[nombre] || 0;
                    const montoDebido = Math.round((gastosCategoria.reduce((total, item) => total + (Number(item.monto) || 0), 0) + saldoAnterior) * 100) / 100;
                    const key = `${nombre}_${mes}`;
                    const montoPagado = pagosBloque[key] !== undefined
                        ? Math.min(Math.max(Number(pagosBloque[key]) || 0, 0), montoDebido)
                        : montoDebido;
                    balancesBloque[nombre] = Math.max(0, Math.round((montoDebido - montoPagado) * 100) / 100);
                    gastosCategoria.forEach((item, index) => {
                        resultadoMes.push({
                            ...item,
                            monto: Number(item.monto) || 0,
                            montoPagadoBloque: index === 0 ? montoPagado : undefined,
                            montoDebidoBloque: index === 0 ? montoDebido : undefined,
                            saldoAnteriorBloque: index === 0 ? saldoAnterior : undefined,
                            esSaldoBloqueArrastrado: !!item.esSaldoArrastrado
                        });
                    });
                });

                if (mes === targetMonth) itemsObjetivo.push(...resultadoMes);
                mes = avanzarMes(mes);
            }
            return itemsObjetivo;
        }

        window.actualizarMontoPagadoPlanilla = async function(input, esBloque) {
            if (!window.esUsuarioEditor()) {
                window.mostrarMensajeApp('Acceso restringido', 'Tu permiso en este grupo es de solo lectura.', 'error');
                renderPlanillaTab();
                return;
            }
            const monto = Number(input.value);
            const maximo = Number(input.max);
            if (!Number.isFinite(monto) || monto < 0 || monto > maximo) {
                window.mostrarMensajeApp('Monto no válido', 'El monto pagado debe estar entre cero y el total adeudado.', 'error');
                renderPlanillaTab();
                return;
            }
            const mes = window.appState.currentMonth || '2026-10';
            const id = esBloque
                ? `${decodeURIComponent(input.dataset.categoria)}_${mes}`
                : `${input.dataset.id}_${mes}`;
            try {
                await window.guardarMontoPagadoPlanilla(id, Math.round(monto * 100) / 100, esBloque);
                renderPlanillaTab();
            } catch (error) {
                console.error('Error al guardar el monto pagado:', error);
                window.mostrarMensajeApp('No se pudo guardar el monto pagado', 'Revisá tu conexión y tus permisos e intentá nuevamente.', 'error');
                renderPlanillaTab();
            }
        };

        function renderPlanillaTab() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const calculo = window.getCalculatedDataForMonth(currentMonth);
            const items = obtenerItemsPlanillaConSaldo(currentMonth);
            const categorias = window.appState.categorias || [];
            const sumarTotalesPorTipo = esTarjeta => items.reduce((total, item) => {
                const categoria = categorias.find(cat => cat.nombre === item.categoria);
                const esCategoriaTarjeta = categoria ? categoria.esTarjeta : true;
                if (esCategoriaTarjeta !== esTarjeta) return total;

                if (categoria?.vencimientoUnicoEnBloque) {
                    return total + (Number(item.montoDebidoBloque) || 0);
                }
                return total + (Number(item.monto) || 0);
            }, 0);
            const totalFijos = sumarTotalesPorTipo(false);
            const totalTarjetas = sumarTotalesPorTipo(true);
            const { sueldoActual } = calculo;
            const redondearCentavos = monto => Math.round(monto * 100) / 100;
            const totalFijosRedondeado = redondearCentavos(totalFijos);
            const totalTarjetasRedondeado = redondearCentavos(totalTarjetas);
            const totalGastosMes = redondearCentavos(totalFijosRedondeado + totalTarjetasRedondeado);
            const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2 });

            if(document.getElementById('cardSueldo')) document.getElementById('cardSueldo').innerText = fmt(sueldoActual);
            if(document.getElementById('cardGastosFijos')) document.getElementById('cardGastosFijos').innerText = fmt(totalFijosRedondeado);
            if(document.getElementById('cardTarjetas')) document.getElementById('cardTarjetas').innerText = fmt(totalTarjetasRedondeado);
            if(document.getElementById('cardGastosTotales')) document.getElementById('cardGastosTotales').innerText = fmt(totalGastosMes);
            if(document.getElementById('cardResto')) document.getElementById('cardResto').innerText = fmt(sueldoActual - totalGastosMes);

            renderFiltrosCategoriasPills();
            window.renderPlanillaAgrupadaTabla(items);
        }

        window.openModalSueldo = function() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const sueldoVal = window.getSueldoForMonth(currentMonth);
            document.getElementById('inputSueldoMonto').value = sueldoVal;
            document.getElementById('modalSueldo').classList.remove('hidden');
        };

        window.handleSaveSueldo = function(e) {
            e.preventDefault();
            const currentMonth = window.appState.currentMonth || '2026-10';
            const monto = parseFloat(document.getElementById('inputSueldoMonto').value) || 0;
            if (!window.appState.sueldos) window.appState.sueldos = {};
            window.appState.sueldos[currentMonth] = monto;
            window.saveDataToCloud();
            window.closeModal('modalSueldo');
            renderApp();
        };

        function renderFiltrosCategoriasPills() {
            const container = document.getElementById('containerFiltrosCategoriasPills');
            if (!container) return;
            container.innerHTML = '';
            const catList = window.appState.categorias || [];
            if (window.filtrosTemporales === undefined) window.filtrosTemporales = [];

            catList.forEach(cat => {
                const isChecked = window.filtrosTemporales.length === 0 || window.filtrosTemporales.includes(cat.nombre);
                const label = document.createElement('label');
                label.className = `cursor-pointer px-3 py-1.5 rounded-xl text-xs font-semibold border transition inline-flex items-center gap-2 ${isChecked ? 'bg-slate-900 text-white border-slate-700 shadow-md' : 'bg-slate-950/60 text-slate-500 border-slate-900'}`;
                label.innerHTML = `
                    <input type="checkbox" value="${cat.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroCategoriaPill(this)" class="hidden">
                    <span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color};"></span>
                    ${cat.nombre}
                `;
                container.appendChild(label);
            });
        }

        window.toggleFiltroCategoriaPill = function(checkbox) {
            const catNombre = checkbox.value;
            const catList = window.appState.categorias || [];
            if (window.filtrosTemporales.length === 0) window.filtrosTemporales = catList.map(c => c.nombre);
            if (checkbox.checked) {
                if (!window.filtrosTemporales.includes(catNombre)) window.filtrosTemporales.push(catNombre);
            } else {
                window.filtrosTemporales = window.filtrosTemporales.filter(c => c !== catNombre);
            }
            if (window.filtrosTemporales.length === catList.length) window.filtrosTemporales = [];
            renderApp();
        };

        window.marcarTodosFiltros = function(marcar) {
            window.filtrosTemporales = marcar ? [] : ['__NINGUNA__'];
            renderApp();
        };

        let draggedRowId = null;
        window.dragStart = function(e) { draggedRowId = e.currentTarget.getAttribute('data-id'); e.currentTarget.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move'; };
        window.dragOver = function(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
        window.dropItem = function(e, categoria) {
            e.preventDefault();
            const targetRow = e.target.closest('tr');
            if (!targetRow) return;
            const targetRowId = targetRow.getAttribute('data-id');
            if (!draggedRowId || draggedRowId === targetRowId) return;
            const rows = Array.from(targetRow.parentNode.querySelectorAll('tr[data-id]'));
            let nuevosIds = rows.map(r => r.getAttribute('data-id'));
            const fromIdx = nuevosIds.indexOf(draggedRowId);
            const toIdx = nuevosIds.indexOf(targetRowId);
            if (fromIdx !== -1 && toIdx !== -1) {
                nuevosIds.splice(fromIdx, 1);
                nuevosIds.splice(toIdx, 0, draggedRowId);
                if (!window.appState.ordenItemsCategoria) window.appState.ordenItemsCategoria = {};
                window.appState.ordenItemsCategoria[categoria] = nuevosIds;
                window.saveDataToCloud();
                renderApp();
            }
        };

        window.toggleCategoriaAcordeon = function(catNombre) { window.categoriasAbiertasMap[catNombre] = !window.categoriasAbiertasMap[catNombre]; renderApp(); };
        window.actualizarVencimientoGrid = function(gastoId, monthStr, nuevaFecha, categoriaNombre) {
            if (!window.appState.excepcionesVencimientoGrid) window.appState.excepcionesVencimientoGrid = {};
            const catObj = (window.appState.categorias || []).find(c => c.nombre === categoriaNombre);
            if (catObj && catObj.vencimientoUnicoEnBloque) {
                const calc = window.getCalculatedDataForMonth(monthStr);
                calc.items.forEach(item => { if (item.categoria === categoriaNombre) window.appState.excepcionesVencimientoGrid[`${item.id}_${monthStr}`] = nuevaFecha; });
            } else { window.appState.excepcionesVencimientoGrid[`${gastoId}_${monthStr}`] = nuevaFecha; }
            window.saveDataToCloud(); renderApp();
        };
        window.actualizarEstadoGasto = function(gastoId, monthStr, nuevoEstado) {
            if (!window.appState.excepcionesEstado) window.appState.excepcionesEstado = {};
            window.appState.excepcionesEstado[`${gastoId}_${monthStr}`] = nuevoEstado;
            window.saveDataToCloud(); renderApp();
        };

        let resolverConfirmacionAppPendiente = null;
        window.mostrarConfirmacionApp = function(titulo, mensaje) {
            const modal = document.getElementById('modalConfirmacionApp');
            const tituloModal = document.getElementById('modalConfirmacionAppTitulo');
            const mensajeModal = document.getElementById('modalConfirmacionAppMensaje');
            if (!modal || !tituloModal || !mensajeModal) {
                throw new Error('No se encontró el modal de confirmación de la aplicación.');
            }
            if (resolverConfirmacionAppPendiente) {
                throw new Error('Ya hay una confirmación abierta.');
            }
            tituloModal.textContent = titulo;
            mensajeModal.textContent = mensaje;
            modal.classList.remove('hidden');
            document.getElementById('btnCancelarConfirmacionApp').focus();
            return new Promise(resolve => {
                resolverConfirmacionAppPendiente = resolve;
            });
        };
        window.resolverConfirmacionApp = function(confirmado) {
            const modal = document.getElementById('modalConfirmacionApp');
            if (!modal || !resolverConfirmacionAppPendiente) return;
            modal.classList.add('hidden');
            const resolver = resolverConfirmacionAppPendiente;
            resolverConfirmacionAppPendiente = null;
            resolver(Boolean(confirmado));
        };
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && resolverConfirmacionAppPendiente) {
                window.resolverConfirmacionApp(false);
            }
        });

        window.renderSettingsCategories = function() {
            renderCatGeneralList(); 
            renderSubcatList();
        };

        window.openModalCatGeneral = function() {
            window.openSettingsSection('categorias');
        };

        function renderCatGeneralList() {
            const container = document.getElementById('listaCatGeneralConfig');
            if (!container) return; container.innerHTML = '';
            (window.appState.categorias || []).forEach((cat, index) => {
                container.innerHTML += `
                    <div class="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                        <div class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-2.5 flex-1">
                                <input type="color" value="${cat.color}" onchange="actualizarCatGenCampo(${index}, 'color', this.value)" class="w-10 h-10 rounded bg-slate-900 border border-slate-800 cursor-pointer p-1">
                                <input type="text" value="${cat.nombre}" onchange="actualizarCatGenCampo(${index}, 'nombre', this.value)" class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-sm font-bold text-white focus:outline-none">
                            </div>
                            <button onclick="eliminarCatGeneral(${index})" class="text-rose-400 hover:text-rose-300 p-2" title="Eliminar"><i class="fa-solid fa-trash-can text-xs"></i></button>
                        </div>
                        <div class="flex items-center gap-2 pt-1 border-t border-slate-900">
                            <input type="checkbox" id="catGenBloque_${index}" ${cat.vencimientoUnicoEnBloque ? 'checked' : ''} onchange="actualizarCatGenCampo(${index}, 'vencimientoUnicoEnBloque', this.checked)" class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 cursor-pointer">
                            <label for="catGenBloque_${index}" class="text-xs text-slate-300 font-semibold cursor-pointer">${cat.vencimientoUnicoEnBloque ? 'Vencimiento único en bloque (Tarjeta)' : 'Vencimiento individual'}</label>
                        </div>
                    </div>`;
            });
        }
        window.actualizarCatGenCampo = function(index, campo, valor) {
            if (!window.appState.categorias[index]) return;
            const nombreAnterior = window.appState.categorias[index].nombre;
            if (campo === 'nombre') {
                const nuevoNombre = valor.trim();
                if (!nuevoNombre) return;
                (window.appState.gastos || []).forEach(g => { if (g.categoria === nombreAnterior) g.categoria = nuevoNombre; });
                window.appState.categorias[index].nombre = nuevoNombre;
            } else { window.appState.categorias[index][campo] = valor; }
            window.saveDataToCloud(); renderApp(); renderCatGeneralList();
        };
        window.agregarCategoriaGeneral = function() {
            const nombre = document.getElementById('nuevaCatGenNombre').value.trim();
            const color = document.getElementById('nuevaCatGenColor').value;
            const vencimientoUnicoEnBloque = document.getElementById('nuevaCatGenBloque').checked;
            if (!nombre) return;
            if (!window.appState.categorias) window.appState.categorias = [];
            window.appState.categorias.push({ nombre, color, esTarjeta: vencimientoUnicoEnBloque, vencimientoUnicoEnBloque });
            document.getElementById('nuevaCatGenNombre').value = ''; document.getElementById('nuevaCatGenBloque').checked = false;
            window.saveDataToCloud(); renderApp(); renderCatGeneralList();
        };
        window.eliminarCatGeneral = async function(index) {
            const categorias = window.appState.categorias || [];
            const categoria = categorias[index];
            if (!categoria) return;
            if (categorias.length <= 1) {
                window.mostrarMensajeApp('No se puede eliminar', 'Debe haber al menos una categoría.', 'error');
                return;
            }
            const gastosAsociados = (window.appState.gastos || []).filter(gasto => gasto.categoria === categoria.nombre);
            if (gastosAsociados.length > 0) {
                const confirmar = await window.mostrarConfirmacionApp(
                    'Eliminar categoría',
                    `La categoría "${categoria.nombre}" tiene ${gastosAsociados.length} gasto(s) asociado(s). Los gastos no se eliminarán, pero la categoría dejará de estar disponible para agruparlos o asignarles nuevos gastos. ¿Querés continuar?`
                );
                if (!confirmar) return;
            }
            categorias.splice(index, 1);
            window.saveDataToCloud(); renderApp(); renderCatGeneralList();
        };

        window.actualizarVistaPreviaInflacionModal = function() {
            const montoBase = parseFloat(document.getElementById('gastoMonto').value) || 0;
            const pctIndivStr = document.getElementById('gastoPctAumento').value;
            const subcatId = document.getElementById('gastoSubcategoria').value;
            const isRecurrente = document.getElementById('gastoIsRecurrente').checked;
            const startMonth = document.getElementById('gastoStartMonth').value || window.appState.currentMonth;
            const subcat = (window.appState.subcategorias || []).find(s => s.id === subcatId);
            const tieneTasa = pctIndivStr !== '' || Boolean(
                subcat &&
                ((Number.parseFloat(subcat.porcentajeAumento) || 0) > 0 ||
                    (subcat.historialAumentos || []).some(cambio => Number.parseFloat(cambio.porcentajeAumento) > 0))
            );

            const container = document.getElementById('containerVistaPreviaInflacion');
            const grid = document.getElementById('gridVistaPrevia6Meses');

            if (montoBase > 0 && tieneTasa && startMonth && isRecurrente) {
                grid.innerHTML = '';
                let [currY, currM] = startMonth.split('-').map(Number);

                for (let i = 0; i < 6; i++) {
                    const mesProyectado = `${currY}-${String(currM).padStart(2, '0')}`;
                    const montoAcum = window.calcularMontoConInflacion(
                        montoBase,
                        startMonth,
                        mesProyectado,
                        mes => pctIndivStr !== ''
                            ? (parseFloat(pctIndivStr) || 0)
                            : window.getPorcentajeAumentoSubcategoria(subcat, mes),
                        pctIndivStr === ''
                            ? window.obtenerPrimerMesCambioProgramado(subcat, startMonth, mesProyectado)
                            : ''
                    );
                    const monthText = window.formatMonthDisplay(mesProyectado);
                    const fmtMonto = "$ " + montoAcum.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                    
                    grid.innerHTML += `<div class="flex justify-between border-b border-slate-800/60 pb-1"><span>${monthText}:</span> <strong class="text-emerald-400">${fmtMonto}</strong></div>`;
                    
                    currM++;
                    if (currM > 12) { currM = 1; currY++; }
                }
                container.classList.remove('hidden');
            } else {
                container.classList.add('hidden');
            }
        };

        window.agregarSubcategoriaGeneral = function() {
            const nombre = document.getElementById('nuevaSubcatNombre').value.trim();
            const pct = parseFloat(document.getElementById('nuevaSubcatPct').value) || 0;
            if (!nombre) return;
            if (!window.appState.subcategorias) window.appState.subcategorias = [];
            window.appState.subcategorias.push({ id: `sub_${Date.now()}`, nombre, porcentajeAumento: pct, historialAumentos: [] });
            document.getElementById('nuevaSubcatNombre').value = '';
            document.getElementById('nuevaSubcatPct').value = '';
            window.saveDataToCloud();
            renderSubcatList();
        };

        function renderSubcatList() {
            const container = document.getElementById('listaSubcatGeneralConfig');
            if (!container) return;
            container.innerHTML = '';
            const mesActual = window.appState.currentMonth || new Date().toISOString().slice(0, 7);
            (window.appState.subcategorias || []).forEach((s, idx) => {
                const porcentajeActual = window.getPorcentajeAumentoSubcategoria?.(s, mesActual) ?? s.porcentajeAumento ?? 0;
                container.innerHTML += `
                    <div class="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-sm space-y-3">
                        <div class="flex items-center justify-between gap-3">
                            <span class="font-bold text-slate-200">${s.nombre}</span>
                            <div class="flex items-center gap-2">
                                <span class="bg-amber-950 text-amber-400 font-mono px-3 py-1 rounded-lg border border-amber-800">${porcentajeActual}% vigente</span>
                                <button type="button" onclick="eliminarSubcategoria(${idx})" aria-label="Eliminar subcategoría ${s.nombre}" title="Eliminar subcategoría" class="text-rose-400 hover:text-rose-300 p-2"><i class="fa-solid fa-trash-can"></i></button>
                            </div>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-3 border-t border-slate-800 pt-3">
                            <div>
                                <label for="subcatInflacionPct_${idx}" class="mb-1 block text-xs font-semibold text-slate-400">Nuevo aumento (%)</label>
                                <input type="number" id="subcatInflacionPct_${idx}" min="0" step="0.1" value="${porcentajeActual}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                            </div>
                            <div>
                                <label for="subcatInflacionMes_${idx}" class="mb-1 block text-xs font-semibold text-slate-400">Vigente desde</label>
                                <input type="month" id="subcatInflacionMes_${idx}" value="${mesActual}" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500">
                            </div>
                            <button type="button" onclick="actualizarInflacionSubcategoria(${idx})" class="bg-amber-600 hover:bg-amber-500 text-white rounded-lg px-4 py-2 text-xs font-bold transition">Aplicar</button>
                        </div>
                        <p class="text-[11px] text-slate-500">Los meses anteriores quedan iguales. La nueva tasa se usa desde el mes indicado.</p>
                    </div>`;
            });
        }

        window.actualizarInflacionSubcategoria = async function(idx) {
            const subcategoria = window.appState.subcategorias?.[idx];
            const porcentajeInput = document.getElementById(`subcatInflacionPct_${idx}`);
            const mesInput = document.getElementById(`subcatInflacionMes_${idx}`);
            if (!subcategoria || !porcentajeInput || !mesInput) return;

            const porcentaje = Number(porcentajeInput.value);
            const desdeMes = mesInput.value;
            if (!Number.isFinite(porcentaje) || porcentaje < 0) {
                window.mostrarNotificacion("Porcentaje inválido", "Ingresá un porcentaje igual o mayor a cero.", "error");
                return;
            }
            if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(desdeMes)) {
                window.mostrarNotificacion("Mes inválido", "Seleccioná el mes desde el que se aplicará el nuevo porcentaje.", "error");
                return;
            }

            const subcategoriaAnterior = JSON.parse(JSON.stringify(subcategoria));
            const subcategoriaActualizada = {
                ...subcategoria,
                historialAumentos: window.crearHistorialAumentosSubcategoria(
                    subcategoria.historialAumentos,
                    desdeMes,
                    porcentaje
                )
            };
            window.appState.subcategorias[idx] = subcategoriaActualizada;
            window.recalcularExcepcionesInflacionSubcategoria(
                subcategoria.id,
                subcategoriaAnterior,
                subcategoriaActualizada,
                desdeMes
            );
            await window.saveDataToCloud();
            renderSubcatList();
            const mesTexto = window.formatMonthDisplay?.(desdeMes) || desdeMes;
            window.mostrarNotificacion("Inflación actualizada", `El ${porcentaje}% se aplicará desde ${mesTexto}.`, "exito");
        };

        window.eliminarSubcategoria = async function(idx) {
            const subcategorias = window.appState.subcategorias || [];
            const subcategoria = subcategorias[idx];
            if (!subcategoria) return;
            const tieneGastosAsociados = (window.appState.gastos || []).some(gasto => gasto.subcategoriaId === subcategoria.id)
                || Object.values(window.appState.excepcionesSubcategoria || {}).some(id => id === subcategoria.id);
            if (tieneGastosAsociados) {
                const confirmar = await window.mostrarConfirmacionApp(
                    'Eliminar subcategoría',
                    `La subcategoría "${subcategoria.nombre}" tiene gastos asociados. Los gastos no se eliminarán, pero dejarán de mostrar esta subcategoría y ya no se aplicará su porcentaje de aumento. ¿Querés continuar?`
                );
                if (!confirmar) return;
            }
            subcategorias.splice(idx, 1);
            window.saveDataToCloud();
            renderSubcatList();
        };

        window.toggleCuotasInputModal = function(isCuotas) {
            const container = document.getElementById('containerCuotasInput');
            if (!container) return;
            if (isCuotas) {
                container.classList.remove('hidden');
                if (document.getElementById('gastoCuotas').value < 2) document.getElementById('gastoCuotas').value = 2;
            } else {
                container.classList.add('hidden');
                document.getElementById('gastoCuotas').value = 1;
            }
            actualizarCalculoCuotasModal();
        };

        window.actualizarCalculoCuotasModal = function() {
            const montoTotal = parseFloat(document.getElementById('gastoMonto').value) || 0;
            const cantCuotas = parseInt(document.getElementById('gastoCuotas').value) || 1;
            const infoBox = document.getElementById('infoCuotaCalculada');
            const textoBox = document.getElementById('textoCuotaCalculada');
            const isCuotasChecked = document.getElementById('gastoEsCuotasCheck').checked;

            if (isCuotasChecked && cantCuotas > 1 && montoTotal > 0) {
                const valorCuota = montoTotal / cantCuotas;
                const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                if (textoBox) textoBox.innerText = `Valor de cada cuota: ${fmt(valorCuota)} (${cantCuotas} cuotas)`;
                if (infoBox) infoBox.classList.remove('hidden');
            } else {
                if (infoBox) infoBox.classList.add('hidden');
            }
        };

        window.openModalGasto = function() {
            document.getElementById('gastoId').value = ''; 
            document.getElementById('modalGastoTitulo').innerText = "Nuevo Gasto";
            document.getElementById('gastoConcepto').value = ''; 
            document.getElementById('gastoMonto').value = '';
            document.getElementById('gastoPctAumento').value = '';
            document.getElementById('gastoCuotas').value = '1'; 
            document.getElementById('gastoStartMonth').value = window.appState.currentMonth || '2026-10';
            document.getElementById('gastoVencimiento').value = ''; 
            document.getElementById('gastoIsRecurrente').checked = false;
            document.getElementById('gastoEsCuotasCheck').checked = false;
            document.getElementById('containerCuotasInput').classList.add('hidden');
            document.getElementById('containerVistaPreviaInflacion').classList.add('hidden');
            document.getElementById('infoCuotaCalculada').classList.add('hidden');

            const selectCat = document.getElementById('gastoCategoria'); 
            selectCat.innerHTML = '';
            (window.appState.categorias || []).forEach(c => { 
                const opt = document.createElement('option'); 
                opt.value = c.nombre; 
                opt.innerHTML = c.nombre; 
                selectCat.appendChild(opt); 
            });

            const selectSubcat = document.getElementById('gastoSubcategoria'); 
            selectSubcat.innerHTML = '<option value="">Sin Subcategoría</option>';
            const mesTasa = document.getElementById('gastoStartMonth').value || window.appState.currentMonth;
            (window.appState.subcategorias || []).forEach(s => { 
                const opt = document.createElement('option'); 
                opt.value = s.id; 
                opt.innerHTML = `${s.nombre} (${window.getPorcentajeAumentoSubcategoria(s, mesTasa)}%)`;
                selectSubcat.appendChild(opt); 
            });

            document.getElementById('modalGasto').classList.remove('hidden');
        };

        window.editGasto = function(id) {
            const gasto = (window.appState.gastos || []).find(g => g.id === id);
            if (!gasto) return;
            const currentActiveMonth = window.appState.currentMonth || '2026-10';

            document.getElementById('gastoId').value = gasto.id; 
            document.getElementById('modalGastoTitulo').innerText = "Editar Gasto";
            document.getElementById('gastoConcepto').value = gasto.concepto; 
            
            const montoActual = window.appState.excepcionesMonto?.[`${id}_${currentActiveMonth}`] !== undefined 
                ? window.appState.excepcionesMonto[`${id}_${currentActiveMonth}`] 
                : gasto.monto;
            const vencActual = window.appState.excepcionesVencimiento?.[`${id}_${currentActiveMonth}`] !== undefined 
                ? window.appState.excepcionesVencimiento[`${id}_${currentActiveMonth}`] 
                : (gasto.vencimiento || '');
            const pctIndiv = window.appState.aumentosIndividuales?.[id] !== undefined ? window.appState.aumentosIndividuales[id] : '';

            document.getElementById('gastoMonto').value = montoActual;
            document.getElementById('gastoPctAumento').value = pctIndiv;
            const cuotasVal = parseInt(gasto.cuotas) || 1;
            document.getElementById('gastoCuotas').value = cuotasVal; 
            document.getElementById('gastoStartMonth').value = gasto.startMonth || window.appState.currentMonth;
            document.getElementById('gastoVencimiento').value = vencActual; 
            document.getElementById('gastoIsRecurrente').checked = !!gasto.isRecurrente;
            
            const esCuotas = cuotasVal > 1;
            document.getElementById('gastoEsCuotasCheck').checked = esCuotas;
            if (esCuotas) {
                document.getElementById('containerCuotasInput').classList.remove('hidden');
                actualizarCalculoCuotasModal();
            } else {
                document.getElementById('containerCuotasInput').classList.add('hidden');
            }

            const selectCat = document.getElementById('gastoCategoria'); selectCat.innerHTML = '';
            const catActual = window.appState.excepcionesCategoria?.[`${id}_${currentActiveMonth}`] !== undefined
                ? window.appState.excepcionesCategoria[`${id}_${currentActiveMonth}`]
                : gasto.categoria;

            (window.appState.categorias || []).forEach(c => { 
                const opt = document.createElement('option'); 
                opt.value = c.nombre; 
                opt.innerHTML = c.nombre; 
                if (c.nombre === catActual) opt.selected = true; 
                selectCat.appendChild(opt); 
            });

            const selectSubcat = document.getElementById('gastoSubcategoria'); 
            selectSubcat.innerHTML = '<option value="">Sin Subcategoría</option>';
            const subcatActual = window.appState.excepcionesSubcategoria?.[`${id}_${currentActiveMonth}`] !== undefined
                ? window.appState.excepcionesSubcategoria[`${id}_${currentActiveMonth}`]
                : gasto.subcategoriaId;

            (window.appState.subcategorias || []).forEach(s => { 
                const opt = document.createElement('option'); 
                opt.value = s.id; 
                opt.innerHTML = `${s.nombre} (${window.getPorcentajeAumentoSubcategoria(s, currentActiveMonth)}%)`;
                if (s.id === subcatActual) opt.selected = true;
                selectSubcat.appendChild(opt); 
            });

            actualizarVistaPreviaInflacionModal();
            document.getElementById('modalGasto').classList.remove('hidden');
        };

        window.handleSaveGasto = function(e) {
            e.preventDefault();
            const id = document.getElementById('gastoId').value;
            const concepto = document.getElementById('gastoConcepto').value.trim();
            const monto = parseFloat(document.getElementById('gastoMonto').value) || 0;
            const cuotas = parseInt(document.getElementById('gastoCuotas').value) || 1;
            const categoria = document.getElementById('gastoCategoria').value;
            const subcategoriaId = document.getElementById('gastoSubcategoria').value;
            const pctAumentoVal = document.getElementById('gastoPctAumento').value;
            const startMonth = document.getElementById('gastoStartMonth').value;
            const vencimiento = document.getElementById('gastoVencimiento').value;
            const isRecurrente = document.getElementById('gastoIsRecurrente').checked;

            const currentActiveMonth = window.appState.currentMonth || '2026-10';

            if (!window.appState.gastos) window.appState.gastos = [];
            if (!window.appState.aumentosIndividuales) window.appState.aumentosIndividuales = {};
            if (!window.appState.excepcionesMonto) window.appState.excepcionesMonto = {};
            if (!window.appState.excepcionesMontoGeneradas) window.appState.excepcionesMontoGeneradas = {};
            if (!window.appState.excepcionesVencimiento) window.appState.excepcionesVencimiento = {};
            if (!window.appState.excepcionesCategoria) window.appState.excepcionesCategoria = {};
            if (!window.appState.excepcionesSubcategoria) window.appState.excepcionesSubcategoria = {};

            if (id) {
                const claveMontoActual = `${id}_${currentActiveMonth}`;
                window.appState.excepcionesMonto[claveMontoActual] = monto;
                delete window.appState.excepcionesMontoGeneradas[claveMontoActual];
                window.appState.excepcionesVencimiento[`${id}_${currentActiveMonth}`] = vencimiento;
                window.appState.excepcionesCategoria[`${id}_${currentActiveMonth}`] = categoria;
                window.appState.excepcionesSubcategoria[`${id}_${currentActiveMonth}`] = subcategoriaId;
                window.appState.aumentosIndividuales[id] = pctAumentoVal;

                let [currY, currM] = currentActiveMonth.split('-').map(Number);
                let montoPropagado = monto;
                let fechaPropagada = vencimiento;

                for (let i = 1; i <= 36; i++) {
                    currM++;
                    if (currM > 12) { currM = 1; currY++; }
                    let nextMonthStr = `${currY}-${String(currM).padStart(2, '0')}`;
                    
                    if (fechaPropagada) {
                        fechaPropagada = window.sumarUnMesAFecha(fechaPropagada);
                        window.appState.excepcionesVencimiento[`${id}_${nextMonthStr}`] = fechaPropagada;
                    }
                    window.appState.excepcionesCategoria[`${id}_${nextMonthStr}`] = categoria;
                    window.appState.excepcionesSubcategoria[`${id}_${nextMonthStr}`] = subcategoriaId;
                    const pctPropagacion = window.getPorcentajeAumentoGasto(
                        window.appState.gastos.find(g => g.id === id) || { id, subcategoriaId },
                        nextMonthStr
                    );
                    if (pctPropagacion > 0) {
                        montoPropagado = montoPropagado * (1 + (pctPropagacion / 100));
                    }
                    const claveMontoSiguiente = `${id}_${nextMonthStr}`;
                    window.appState.excepcionesMonto[claveMontoSiguiente] = Math.round(montoPropagado * 100) / 100;
                    window.appState.excepcionesMontoGeneradas[claveMontoSiguiente] = true;
                }

                const idx = window.appState.gastos.findIndex(g => g.id === id);
                if (idx !== -1) {
                    window.appState.gastos[idx].concepto = concepto;
                    window.appState.gastos[idx].cuotas = cuotas;
                    window.appState.gastos[idx].subcategoriaId = subcategoriaId;
                    window.appState.gastos[idx].isRecurrente = isRecurrente;
                }
            } else {
                const newId = Date.now().toString();
                const nuevoGasto = { id: newId, concepto, monto, cuotas, categoria, subcategoriaId, startMonth, vencimiento, isRecurrente };
                window.appState.gastos.push(nuevoGasto);
                if (pctAumentoVal !== '') window.appState.aumentosIndividuales[newId] = pctAumentoVal;
            }

            window.saveDataToCloud();
            window.closeModal('modalGasto');
            renderApp();
        };

let gastoAEliminarId = null;
let tipoEliminacionSeleccionado = null;

// Dispara el modal inicial con la información del gasto y el mes
window.deleteGasto = function(id) {
    const gasto = (window.appState.gastos || []).find(g => g.id === id);
    if (!gasto) return;

    gastoAEliminarId = id;
    tipoEliminacionSeleccionado = null;
    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const monthText = window.formatMonthDisplay ? window.formatMonthDisplay(currentMonth) : currentMonth;

    const elNombre = document.getElementById('eliminarGastoNombre');
    const elMesTexto = document.getElementById('eliminarGastoMesTexto');
    if (elNombre) elNombre.innerText = `"${gasto.concepto}"`;
    if (elMesTexto) elMesTexto.innerText = monthText;
    
    // Resetear vistas del modal a la selección inicial
    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.remove('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.add('hidden');

    document.querySelectorAll('.eliminarGastoMesRef').forEach(el => el.innerText = monthText);

    const modalEliminar = document.getElementById('modalEliminarGasto');
    if (modalEliminar) modalEliminar.classList.remove('hidden');
};

// Solicita la confirmación final mostrando qué opción se eligió
window.solicitarConfirmacionEliminacion = function(tipoEliminacion) {
    if (!gastoAEliminarId) return;

    tipoEliminacionSeleccionado = tipoEliminacion;
    const gasto = (window.appState.gastos || []).find(g => g.id === gastoAEliminarId);
    const currentMonth = window.appState.currentMonth || defaultLocalMonth;
    const monthText = window.formatMonthDisplay ? window.formatMonthDisplay(currentMonth) : currentMonth;

    let textoModalidad = '';
    if (tipoEliminacion === 'solo_mes') {
        textoModalidad = `ÚNICAMENTE para el mes de ${monthText}`;
    } else if (tipoEliminacion === 'mes_y_futuros') {
        textoModalidad = `A PARTIR de ${monthText} y hacia todos los meses futuros`;
    } else if (tipoEliminacion === 'todo') {
        textoModalidad = `COMPLETAMENTE de la base de datos (todo el historial pasado, presente y futuro)`;
    }

    const txtDetalle = document.getElementById('eliminarConfirmacionDetalleText');
    if (txtDetalle) {
        txtDetalle.innerHTML = `¿Realmente deseás eliminar el gasto <strong class="text-white">"${window.escapeHtml(gasto?.concepto)}"</strong> de forma <strong class="text-amber-400">${window.escapeHtml(textoModalidad)}</strong>?`;
    }

    // Alternar vista del modal hacia el paso de confirmación
    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.add('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.remove('hidden');
};

// Cancela la confirmación y vuelve a la lista de opciones de borrado
window.volverASeleccionEliminacion = function() {
    tipoEliminacionSeleccionado = null;
    const pasoSeleccion = document.getElementById('eliminarPasoSeleccion');
    const pasoConfirmacion = document.getElementById('eliminarPasoConfirmacion');
    if (pasoSeleccion) pasoSeleccion.classList.remove('hidden');
    if (pasoConfirmacion) pasoConfirmacion.classList.add('hidden');
};

// Ejecuta la eliminación definitiva una vez confirmado por el usuario
window.ejecutarEliminacionGasto = function() {
    if (!gastoAEliminarId || !tipoEliminacionSeleccionado) return;

    const id = gastoAEliminarId;
    const tipo = tipoEliminacionSeleccionado;
    const currentActiveMonth = window.appState.currentMonth || defaultLocalMonth;

    if (!window.appState.excepcionesEliminacion) window.appState.excepcionesEliminacion = {};
    if (!window.appState.excepcionesEliminacionSoloMes) window.appState.excepcionesEliminacionSoloMes = {};

    if (tipo === 'solo_mes') {
        window.appState.excepcionesEliminacionSoloMes[`${id}_${currentActiveMonth}`] = true;
    } else if (tipo === 'mes_y_futuros') {
        window.appState.excepcionesEliminacion[id] = currentActiveMonth;
    } else if (tipo === 'todo') {
        window.appState.gastos = (window.appState.gastos || []).filter(g => g.id !== id);
        delete window.appState.excepcionesEliminacion[id];
        if (window.appState.aumentosIndividuales) delete window.appState.aumentosIndividuales[id];
        Object.keys(window.appState.excepcionesMontoGeneradas || {}).forEach(k => {
            if (k.startsWith(`${id}_`)) delete window.appState.excepcionesMontoGeneradas[k];
        });
        
        Object.keys(window.appState.excepcionesEliminacionSoloMes || {}).forEach(k => {
            if (k.startsWith(`${id}_`)) delete window.appState.excepcionesEliminacionSoloMes[k];
        });
    }

    window.saveDataToCloud();
    if (typeof window.closeModal === 'function') window.closeModal('modalEliminarGasto');
    gastoAEliminarId = null;
    tipoEliminacionSeleccionado = null;
    triggerPageRenders();
};

        window.closeModal = function(id) { document.getElementById(id).classList.add('hidden'); };
