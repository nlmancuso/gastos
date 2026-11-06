        document.addEventListener('DOMContentLoaded', () => {
            const fechaInput = document.getElementById('hormigaFecha');
            if (fechaInput) fechaInput.value = obtenerFechaLocalParaInput();
        });

        window.sortHormigaData = function(column) {
            if (window.hormigaState.sortColumn === column) {
                window.hormigaState.sortAscending = !window.hormigaState.sortAscending;
            } else {
                window.hormigaState.sortColumn = column;
                window.hormigaState.sortAscending = true;
            }
            renderHormigaApp();
        };

        function renderHormigaApp() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const monthText = window.formatMonthDisplay(currentMonth);
            if(document.getElementById('badgeHormigaMonth')) document.getElementById('badgeHormigaMonth').innerText = monthText;
            if(document.getElementById('badgeHormigaMonthCat')) document.getElementById('badgeHormigaMonthCat').innerText = monthText;
            
            renderHormigaCategoriasSelect();
            renderFiltrosHormigaEvolCatCheckboxes();

            const itemsHormiga = (window.hormigaState.gastos || []).filter(g => g.fecha && g.fecha.slice(0, 7) === currentMonth);
            const catHormigaList = window.hormigaState.categorias || categoriasHormigaDefault;
            let totalHormiga = 0; itemsHormiga.forEach(g => totalHormiga += parseFloat(g.monto) || 0);
            const [year, month] = currentMonth.split('-').map(Number);
            const diasEnMes = new Date(year, month, 0).getDate();
            const hoy = new Date();
            const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
            const diasTranscurridos = currentMonth < mesActual ? diasEnMes : currentMonth === mesActual ? hoy.getDate() : 0;
            const promedioDiario = diasTranscurridos > 0 ? totalHormiga / diasTranscurridos : 0;
            const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            document.getElementById('cardHormigaTotal').innerText = fmt(totalHormiga);
            document.getElementById('cardHormigaPromedio').innerText = fmt(promedioDiario);
            document.getElementById('cardHormigaCantidad').innerText = `${itemsHormiga.length} compra${itemsHormiga.length === 1 ? '' : 's'}`;

            const containerCatTotales = document.getElementById('containerHormigaCatTotales');
            if (containerCatTotales) {
                containerCatTotales.innerHTML = ''; let totalesPorCat = {};
                catHormigaList.forEach(c => totalesPorCat[c.nombre] = 0);
                itemsHormiga.forEach(g => { if (totalesPorCat[g.categoria] !== undefined) totalesPorCat[g.categoria] += parseFloat(g.monto) || 0; else totalesPorCat[g.categoria] = parseFloat(g.monto) || 0; });
                let categoriasConMonto = catHormigaList.map(cat => ({ ...cat, monto: totalesPorCat[cat.nombre] || 0 })).filter(cat => cat.monto > 0);
                categoriasConMonto.sort((a, b) => b.monto - a.monto);
                if (categoriasConMonto.length === 0) containerCatTotales.innerHTML = '<p class="text-xs text-slate-500 italic text-center py-6">No hay gastos hormiga en este mes.</p>';
                else {
                    categoriasConMonto.forEach(cat => {
                        const porcentaje = totalHormiga > 0 ? ((cat.monto / totalHormiga) * 100).toFixed(1) : 0;
                        containerCatTotales.innerHTML += `<div class="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1.5"><div class="flex justify-between items-center text-xs"><span class="font-bold text-white flex items-center gap-2"><span class="w-2.5 h-2.5 rounded-full" style="background-color: ${cat.color};"></span>${cat.nombre}</span><span class="font-extrabold text-amber-400">${fmt(cat.monto)} <span class="text-[10px] text-slate-500 font-normal">(${porcentaje}%)</span></span></div><div class="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800/80"><div class="h-full rounded-full transition-all duration-500" style="width: ${porcentaje}%; background-color: ${cat.color};"></div></div></div>`;
                    });
                }
            }

            const tbody = document.getElementById('tablaHormigaCuerpo');
            if (tbody) {
                tbody.innerHTML = ''; let itemsFiltrados = itemsHormiga;
                const filtrosActivos = window.hormigaState.filtrosCategorias || [];
                if (filtrosActivos.length > 0) itemsFiltrados = itemsFiltrados.filter(g => filtrosActivos.includes(g.categoria));

                const sortCol = window.hormigaState.sortColumn || 'fecha';
                const sortAsc = window.hormigaState.sortAscending !== false;
                itemsFiltrados.sort((a, b) => {
                    let valA = a[sortCol] || '';
                    let valB = b[sortCol] || '';
                    if (sortCol === 'monto') {
                        valA = parseFloat(valA) || 0;
                        valB = parseFloat(valB) || 0;
                    }
                    if (valA < valB) return sortAsc ? -1 : 1;
                    if (valA > valB) return sortAsc ? 1 : -1;
                    return 0;
                });

                if (itemsFiltrados.length === 0) tbody.innerHTML = `<tr><td colspan="6" class="px-6 py-8 text-center text-slate-500">No hay gastos hormiga que coincidan.</td></tr>`;
                else {
                    itemsFiltrados.forEach(g => {
                        const catObj = catHormigaList.find(c => c.nombre === g.categoria); const colorCat = catObj ? catObj.color : '#f59e0b';
                        const fechaFmt = g.fecha ? g.fecha.split('-').reverse().join('/') : '';
                        tbody.innerHTML += `<tr class="hover:bg-slate-900/40 transition-colors"><td class="px-5 py-3.5 text-slate-400 text-xs">${fechaFmt}</td><td class="px-5 py-3.5 text-white font-bold">${g.concepto}</td><td class="px-5 py-3.5"><span class="px-2.5 py-0.5 rounded-lg text-xs font-semibold text-white border inline-flex items-center gap-1.5" style="background-color: ${colorCat}22; border-color: ${colorCat}55;"><span class="w-2 h-2 rounded-full" style="background-color: ${colorCat};"></span>${g.categoria}</span></td><td class="px-5 py-3.5 text-slate-400 text-xs">${g.medioPago || 'Efectivo'}</td><td class="px-5 py-3.5 text-right font-extrabold text-amber-400">${fmt(g.monto)}</td><td class="px-5 py-3.5 text-right"><button onclick="deleteGastoHormiga('${g.id}')" class="text-slate-400 hover:text-rose-400" title="Eliminar"><i class="fa-solid fa-trash-can text-xs"></i></button></td></tr>`;
                    });
                }
            }
            renderHormigaCharts();
        }

        function renderHormigaCategoriasSelect() {
            const select = document.getElementById('hormigaCategoriaSelect');
            if (select) {
                const currentVal = select.value; select.innerHTML = '';
                (window.hormigaState.categorias || categoriasHormigaDefault).forEach(cat => { const opt = document.createElement('option'); opt.value = cat.nombre; opt.innerHTML = cat.nombre; select.appendChild(opt); });
                if (currentVal) select.value = currentVal;
            }
            renderFiltrosHormigaCatCheckboxes();
        }
        function renderFiltrosHormigaCatCheckboxes() {
            const container = document.getElementById('containerFiltrosHormigaCat'); if (!container) return; container.innerHTML = '';
            (window.hormigaState.categorias || categoriasHormigaDefault).forEach(cat => {
                const isChecked = !window.hormigaState.filtrosCategorias || window.hormigaState.filtrosCategorias.length === 0 || window.hormigaState.filtrosCategorias.includes(cat.nombre);
                container.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${cat.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroHormigaCategoria(this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${cat.color};"></span>${cat.nombre}</label>`;
            });
        }

        function renderFiltrosHormigaEvolCatCheckboxes() {
            const container = document.getElementById('containerFiltrosHormigaEvolCat'); if (!container) return; container.innerHTML = '';
            (window.hormigaState.categorias || categoriasHormigaDefault).forEach(cat => {
                const isChecked = !window.hormigaState.filtrosCategorias || window.hormigaState.filtrosCategorias.length === 0 || window.hormigaState.filtrosCategorias.includes(cat.nombre);
                container.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${cat.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroHormigaCategoria(this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${cat.color};"></span>${cat.nombre}</label>`;
            });
        }

        window.toggleFiltroHormigaCategoria = function(checkbox) {
            const catNombre = checkbox.value; const catList = window.hormigaState.categorias || categoriasHormigaDefault;
            if (!window.hormigaState.filtrosCategorias || window.hormigaState.filtrosCategorias.length === 0) window.hormigaState.filtrosCategorias = catList.map(c => c.nombre);
            if (checkbox.checked) { if (!window.hormigaState.filtrosCategorias.includes(catNombre)) window.hormigaState.filtrosCategorias.push(catNombre); }
            else { window.hormigaState.filtrosCategorias = window.hormigaState.filtrosCategorias.filter(c => c !== catNombre); }
            if (window.hormigaState.filtrosCategorias.length === catList.length) window.hormigaState.filtrosCategorias = [];
            renderFiltrosHormigaCatCheckboxes(); renderHormigaApp();
        };
        window.marcarTodosHormiga = function(marcar) { window.hormigaState.filtrosCategorias = marcar ? [] : ['__NINGUNA__']; renderFiltrosHormigaCatCheckboxes(); renderHormigaApp(); };

        function renderHormigaCharts() {
            const currentMonth = window.appState.currentMonth || '2026-10'; const allHormigaGastos = window.hormigaState.gastos || []; const catHormigaList = window.hormigaState.categorias || categoriasHormigaDefault;
            const currentItems = allHormigaGastos.filter(g => g.fecha && g.fecha.slice(0, 7) === currentMonth);
            let catMap = {}; catHormigaList.forEach(c => { catMap[c.nombre] = 0; });
            currentItems.forEach(g => { if (catMap[g.categoria] !== undefined) catMap[g.categoria] += parseFloat(g.monto) || 0; });
            let catLabels = [], catData = [], catColors = [];
            Object.keys(catMap).forEach(cName => { if (catMap[cName] > 0) { catLabels.push(cName); catData.push(catMap[cName]); const found = catHormigaList.find(c => c.nombre === cName); catColors.push(found ? found.color : '#f59e0b'); } });

            const ctxHormigaCat = document.getElementById('chartHormigaCategorias');
            if (ctxHormigaCat) chartInstHormigaCat = updateOrCreateChart(chartInstHormigaCat, ctxHormigaCat, { type: 'doughnut', data: { labels: catLabels, datasets: [{ data: catData, backgroundColor: catColors, borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#cbd5e1' } } } } });

            let [cYear, cMonth] = currentMonth.split('-').map(Number); let monthsLabels = [], totalsByMonth = [];
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            for (let i = 11; i >= 0; i--) {
                let m = cMonth - i, y = cYear; while (m < 1) { m += 12; y--; }
                monthsLabels.push(`${monthNames[m - 1]} ${y}`); let totalM = 0;
                allHormigaGastos.forEach(g => { if (g.fecha && g.fecha.slice(0, 7) === `${y}-${String(m).padStart(2, '0')}`) totalM += parseFloat(g.monto) || 0; });
                totalsByMonth.push(totalM);
            }
            const ctxHormigaEvol = document.getElementById('chartHormigaEvolucion');
            if (ctxHormigaEvol) chartInstHormigaEvol = updateOrCreateChart(chartInstHormigaEvol, ctxHormigaEvol, { type: 'bar', data: { labels: monthsLabels, datasets: [{ label: 'Gasto Hormiga Total', data: totalsByMonth, backgroundColor: '#f59e0b', borderRadius: 6 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

            const filtrosHormigaActivos = window.hormigaState.filtrosCategorias || [];
            let datasetsCatSeparadas = catHormigaList
                .filter(cat => filtrosHormigaActivos.length === 0 || filtrosHormigaActivos.includes(cat.nombre))
                .map(cat => {
                    let dataPorMes = []; let [currY2, currM2] = currentMonth.split('-').map(Number);
                    for (let i = 11; i >= 0; i--) {
                        let m = currM2 - i, y = currY2; while (m < 1) { m += 12; y--; }
                        let ymStr = `${y}-${String(m).padStart(2, '0')}`; let sumaCatMes = 0;
                        allHormigaGastos.forEach(g => { if (g.fecha && g.fecha.slice(0, 7) === ymStr && g.categoria === cat.nombre) sumaCatMes += parseFloat(g.monto) || 0; });
                        dataPorMes.push(sumaCatMes);
                    }
                    return { label: cat.nombre, data: dataPorMes, borderColor: cat.color, backgroundColor: cat.color, borderWidth: 2, fill: false, tension: 0.3 };
                });

            const ctxHormigaEvolCat = document.getElementById('chartHormigaEvolucionCategorias');
            if (ctxHormigaEvolCat) {
                chartInstHormigaEvolCat = updateOrCreateChart(chartInstHormigaEvolCat, ctxHormigaEvolCat, {
                    type: 'line', 
                    data: { labels: monthsLabels, datasets: datasetsCatSeparadas }, 
                    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } 
                }); 
            }
        }

        let gastoHormigaPendienteDeEliminar = null;

        async function guardarEstadoHormigaConManejoError(estadoAnterior) {
            try {
                await window.saveHormigaDataToCloud();
                return true;
            } catch (error) {
                console.error('Error al guardar los gastos hormiga:', error);
                window.hormigaState = estadoAnterior;
                renderHormigaApp();
                window.mostrarNotificacion('No se pudieron guardar los cambios', 'Revisá tu conexión e intentá nuevamente.', 'error');
                return false;
            }
        }

        window.handleSaveGastoHormiga = async function(e) {
            e.preventDefault();
            const concepto = document.getElementById('hormigaConcepto').value; const monto = parseFloat(document.getElementById('hormigaMonto').value);
            const fecha = document.getElementById('hormigaFecha').value; const categoria = document.getElementById('hormigaCategoriaSelect').value; const medioPago = document.getElementById('hormigaMedioPago').value;
            if (!concepto || !monto || !fecha) return;
            const estadoAnterior = JSON.parse(JSON.stringify(window.hormigaState));
            window.hormigaState.gastos.push({ id: Date.now().toString(), concepto, monto, fecha, categoria, medioPago });
            renderHormigaApp();
            if (!await guardarEstadoHormigaConManejoError(estadoAnterior)) return;
            document.getElementById('hormigaConcepto').value = '';
            document.getElementById('hormigaMonto').value = '';
        };
        window.deleteGastoHormiga = function(id) {
            gastoHormigaPendienteDeEliminar = (window.hormigaState.gastos || []).find(gasto => gasto.id === id) || null;
            if (!gastoHormigaPendienteDeEliminar) return;
            document.getElementById('nombreGastoHormigaAEliminar').textContent = gastoHormigaPendienteDeEliminar.concepto || 'este gasto';
            document.getElementById('errorEliminarGastoHormiga').classList.add('hidden');
            document.getElementById('modalConfirmarGastoHormiga').classList.remove('hidden');
        };
        window.cerrarConfirmacionGastoHormiga = function() {
            document.getElementById('modalConfirmarGastoHormiga').classList.add('hidden');
            document.getElementById('errorEliminarGastoHormiga').classList.add('hidden');
            document.getElementById('btnConfirmarEliminarGastoHormiga').disabled = false;
            document.getElementById('btnConfirmarEliminarGastoHormiga').textContent = 'Sí, eliminar';
            document.getElementById('btnCancelarEliminarGastoHormiga').disabled = false;
            gastoHormigaPendienteDeEliminar = null;
        };
        window.confirmarEliminacionGastoHormiga = async function() {
            if (!gastoHormigaPendienteDeEliminar) return;
            const boton = document.getElementById('btnConfirmarEliminarGastoHormiga');
            const botonCancelar = document.getElementById('btnCancelarEliminarGastoHormiga');
            const mensajeError = document.getElementById('errorEliminarGastoHormiga');
            const estadoAnterior = JSON.parse(JSON.stringify(window.hormigaState));
            boton.disabled = true;
            botonCancelar.disabled = true;
            boton.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Eliminando...';
            mensajeError.classList.add('hidden');
            window.hormigaState.gastos = (window.hormigaState.gastos || []).filter(gasto => gasto.id !== gastoHormigaPendienteDeEliminar.id);
            renderHormigaApp();
            try {
                await window.saveHormigaDataToCloud();
            } catch (error) {
                console.error('Error al eliminar el gasto hormiga:', error);
                window.hormigaState = estadoAnterior;
                renderHormigaApp();
                mensajeError.textContent = 'No se pudo eliminar el gasto. Revisá la conexión e intentá nuevamente.';
                mensajeError.classList.remove('hidden');
                boton.disabled = false;
                botonCancelar.disabled = false;
                boton.textContent = 'Reintentar';
                return;
            }
            window.cerrarConfirmacionGastoHormiga();
        };
        window.openModalCatHormiga = function() { renderCatHormigaList(); document.getElementById('modalCatHormiga').classList.remove('hidden'); };
        function renderCatHormigaList() {
            const container = document.getElementById('listaCatHormigaConfig'); container.innerHTML = '';
            (window.hormigaState.categorias || []).forEach((cat, index) => {
                container.innerHTML += `<div class="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800"><div class="flex items-center gap-2 flex-1"><input type="color" value="${cat.color}" onchange="actualizarCatHormigaCampo(${index}, 'color', this.value)" class="w-8 h-8 rounded bg-slate-900 border border-slate-800 cursor-pointer p-0.5"><input type="text" value="${cat.nombre}" onchange="actualizarCatHormigaCampo(${index}, 'nombre', this.value)" class="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-bold text-white"></div><button onclick="eliminarCatHormiga(${index})" class="text-rose-400 hover:text-rose-300 p-2" title="Eliminar"><i class="fa-solid fa-trash-can text-xs"></i></button></div>`;
            });
        }
        window.actualizarCatHormigaCampo = async function(index, campo, valor) {
            if (!window.hormigaState.categorias[index]) return;
            const estadoAnterior = JSON.parse(JSON.stringify(window.hormigaState));
            window.hormigaState.categorias[index][campo] = valor;
            renderHormigaCategoriasSelect();
            renderHormigaApp();
            if (!await guardarEstadoHormigaConManejoError(estadoAnterior)) renderCatHormigaList();
        };
        window.agregarCategoriaHormiga = async function() {
            const nombre = document.getElementById('nuevaCatHormigaNombre').value.trim(); const color = document.getElementById('nuevaCatHormigaColor').value;
            if (!nombre) return;
            const estadoAnterior = JSON.parse(JSON.stringify(window.hormigaState));
            window.hormigaState.categorias.push({ nombre, color });
            renderCatHormigaList();
            renderHormigaCategoriasSelect();
            renderHormigaApp();
            if (!await guardarEstadoHormigaConManejoError(estadoAnterior)) {
                renderCatHormigaList();
                return;
            }
            document.getElementById('nuevaCatHormigaNombre').value = '';
        };
        window.eliminarCatHormiga = async function(index) {
            if (window.hormigaState.categorias.length <= 1) {
                window.mostrarNotificacion('No se puede eliminar', 'Debe quedar al menos una categoría de Gasto Hormiga.', 'info');
                return;
            }
            const estadoAnterior = JSON.parse(JSON.stringify(window.hormigaState));
            window.hormigaState.categorias.splice(index, 1);
            renderCatHormigaList();
            renderHormigaCategoriasSelect();
            renderHormigaApp();
            if (!await guardarEstadoHormigaConManejoError(estadoAnterior)) renderCatHormigaList();
        };

        // ---------------- FUNCIONES DE MÁS / EXPANDIR GRÁFICOS ----------------
        let modalChartInstance = null;

        window.expandirGraficoModal = function(originalCanvasId, titulo) {
            const originalCanvas = document.getElementById(originalCanvasId);
            if (!originalCanvas) return;

            const originalChart = Chart.getChart(originalCanvas);
            if (!originalChart) return;

            document.getElementById('modalGraficoTitulo').innerText = titulo || "Vista Ampliada del Gráfico";

            const modalCanvas = document.getElementById('chartModalCanvas');
            const ctx = modalCanvas.getContext('2d');

            if (modalChartInstance) {
                modalChartInstance.destroy();
            }

            modalChartInstance = new Chart(ctx, {
                type: originalChart.config.type,
                data: JSON.parse(JSON.stringify(originalChart.config.data)),
                options: {
                    ...originalChart.config.options,
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        ...originalChart.config.options.plugins,
                        legend: {
                            ...originalChart.config.options.plugins?.legend,
                            display: true,
                            labels: { color: '#cbd5e1', font: { size: 12 } }
                        }
                    }
                }
            });

            document.getElementById('modalGraficoExpandido').classList.remove('hidden');
        };

        window.cerrarGraficoModal = function() {
            document.getElementById('modalGraficoExpandido').classList.add('hidden');
            if (modalChartInstance) {
                modalChartInstance.destroy();
                modalChartInstance = null;
            }
        };

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') window.cerrarGraficoModal();
        });
    