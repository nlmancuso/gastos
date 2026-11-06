        // ---------------- SCRIPT ANÁLISIS & GRÁFICOS (CORREGIDO) ----------------
        let chartInstTotales = null; let chartInstEvolCat = null; let chartInstEvolSubcat = null; let chartInstRecurrentesIndiv = null; let chartInstBalance = null;

        function initChartRangeInputs() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            
            if (!window.appState.chartRangeFrom || !window.appState.chartRangeTo) {
                let [cYear, cMonth] = currentMonth.split('-').map(Number);
                let mFrom = cMonth - 3, yFrom = cYear; while (mFrom < 1) { mFrom += 12; yFrom--; }
                const fromStr = `${yFrom}-${String(mFrom).padStart(2, '0')}`;
                let mTo = cMonth + 3, yTo = cYear; while (mTo > 12) { mTo -= 12; yTo++; }
                const toStr = `${yTo}-${String(mTo).padStart(2, '0')}`;
                window.appState.chartRangeFrom = fromStr;
                window.appState.chartRangeTo = toStr;
            }

            const elFrom = document.getElementById('chartMonthFrom'); 
            const elTo = document.getElementById('chartMonthTo');
            if (elFrom) elFrom.value = window.appState.chartRangeFrom; 
            if (elTo) elTo.value = window.appState.chartRangeTo;
        }

        function resetDefaultMonthRange() {
            window.appState.chartRangeFrom = null;
            window.appState.chartRangeTo = null;
            window.saveDataToCloud();
            initChartRangeInputs();
            renderCharts();
        }

        function applyCustomMonthRange() {
            const elFrom = document.getElementById('chartMonthFrom').value; 
            const elTo = document.getElementById('chartMonthTo').value;
            if (elFrom && elTo && elFrom <= elTo) {
                window.appState.chartRangeFrom = elFrom;
                window.appState.chartRangeTo = elTo;
                window.saveDataToCloud();
                renderCharts();
            }
        }

        function initRecurrentesCheckboxesList() {
            const container = document.getElementById('containerFiltrosRecurrentesGrid'); if (!container) return;
            let mapIdsUnicos = new Map();
            (window.appState.gastos || []).forEach(g => {
                const baseEsFijo = (g.categoria || '').toLowerCase().includes('fijo') || (g.categoria || '').toLowerCase().includes('servicio');
                if (g.isRecurrente || baseEsFijo) { if (!mapIdsUnicos.has(g.id)) mapIdsUnicos.set(g.id, g.concepto); }
            });
            if (window.filtrosRecurrentesGrid.length === 0 && window.appState.recurrentesPreferidos?.length > 0) window.filtrosRecurrentesGrid = [...window.appState.recurrentesPreferidos];
            container.innerHTML = '';
            let colorPalette = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16']; let colorIdx = 0;
            mapIdsUnicos.forEach((concepto, id) => {
                const isChecked = window.filtrosRecurrentesGrid.length === 0 || window.filtrosRecurrentesGrid.includes(id);
                let color = colorPalette[colorIdx % colorPalette.length]; colorIdx++;
                container.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${id}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroRecurrenteGrid(this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${color};"></span>${concepto}</label>`;
            });
        }
        window.toggleFiltroRecurrenteGrid = function(checkbox) {
            const id = checkbox.value; let mapIdsUnicos = [];
            (window.appState.gastos || []).forEach(g => {
                const baseEsFijo = (g.categoria || '').toLowerCase().includes('fijo') || (g.categoria || '').toLowerCase().includes('servicio');
                if (g.isRecurrente || baseEsFijo) { if (!mapIdsUnicos.includes(g.id)) mapIdsUnicos.push(g.id); }
            });
            if (window.filtrosRecurrentesGrid.length === 0) window.filtrosRecurrentesGrid = [...mapIdsUnicos];
            if (checkbox.checked) { if (!window.filtrosRecurrentesGrid.includes(id)) window.filtrosRecurrentesGrid.push(id); }
            else { window.filtrosRecurrentesGrid = window.filtrosRecurrentesGrid.filter(i => i !== id); }
            if (window.filtrosRecurrentesGrid.length === mapIdsUnicos.length) window.filtrosRecurrentesGrid = [];
            initRecurrentesCheckboxesList(); renderCharts();
        };
        window.marcarTodosRecurrentesGrid = function(marcar) { window.filtrosRecurrentesGrid = marcar ? [] : ['__NINGUNO__']; initRecurrentesCheckboxesList(); renderCharts(); };

        function renderFiltrosGraficosCheckboxes() {
            const catList = window.appState.categorias || [];
            const subcatList = window.appState.subcategorias || [];
            let colorPalette = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];

            const contTotales = document.getElementById('containerFiltrosGraficoTotales');
            if (contTotales) {
                contTotales.innerHTML = '';
                [ { nombre: "Gastos Totales", color: "#f43f5e" }, { nombre: "Ingresos / Sueldo", color: "#10b981" } ].forEach(item => {
                    const isChecked = window.filtrosGraficoTotales.length === 0 || window.filtrosGraficoTotales.includes(item.nombre);
                    contTotales.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${item.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroGrafico('Totales', this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${item.color};"></span>${item.nombre}</label>`;
                });
            }
            const contEvolCat = document.getElementById('containerFiltrosGraficoEvolCat');
            if (contEvolCat) {
                contEvolCat.innerHTML = '';
                catList.forEach(cat => {
                    const isChecked = window.filtrosGraficoEvolCat.length === 0 || window.filtrosGraficoEvolCat.includes(cat.nombre);
                    contEvolCat.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${cat.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroGrafico('EvolCat', this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${cat.color};"></span>${cat.nombre}</label>`;
                });
            }
            
            // --- INICIALIZACIÓN Y RENDERIZADO CORREGIDO PARA SUBCATEGORÍAS ---
            const contEvolSubcat = document.getElementById('containerFiltrosGraficoEvolSubcat');
            if (contEvolSubcat) {
                if (!window.filtrosGraficoEvolSubcat) {
                    window.filtrosGraficoEvolSubcat = [];
                }
                contEvolSubcat.innerHTML = '';
                subcatList.forEach((sub, idx) => {
                    const color = colorPalette[idx % colorPalette.length];
                    const isChecked = window.filtrosGraficoEvolSubcat.length === 0 || window.filtrosGraficoEvolSubcat.includes(sub.id);
                    contEvolSubcat.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${sub.id}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroGrafico('EvolSubcat', this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${color};"></span>${sub.nombre}</label>`;
                });
            }

            const contBalance = document.getElementById('containerFiltrosGraficoBalance');
            if (contBalance) {
                contBalance.innerHTML = '';
                [ { nombre: "Ingreso / Sueldo", color: "#10b981" }, { nombre: "Gastos Totales", color: "#f43f5e" }, { nombre: "Resto Disponible", color: "#3b82f6" } ].forEach(item => {
                    const isChecked = window.filtrosGraficoBalance.length === 0 || window.filtrosGraficoBalance.includes(item.nombre);
                    contBalance.innerHTML += `<label class="cursor-pointer px-2.5 py-1 rounded-lg text-xs font-semibold border transition inline-flex items-center gap-1.5 ${isChecked ? 'bg-slate-800 text-white border-slate-600' : 'bg-slate-900/60 text-slate-500 border-slate-800'}"><input type="checkbox" value="${item.nombre}" ${isChecked ? 'checked' : ''} onchange="toggleFiltroGrafico('Balance', this)" class="hidden"><span class="w-2 h-2 rounded-full" style="background-color: ${item.color};"></span>${item.nombre}</label>`;
                });
            }
        }
        window.toggleFiltroGrafico = function(tipo, checkbox) {
            const val = checkbox.value; let arrRef, fullList;
            if (tipo === 'Totales') { if (window.filtrosGraficoTotales.length === 0) window.filtrosGraficoTotales = ["Gastos Totales", "Ingresos / Sueldo"]; arrRef = window.filtrosGraficoTotales; fullList = ["Gastos Totales", "Ingresos / Sueldo"]; }
            else if (tipo === 'EvolCat') { const catList = window.appState.categorias || []; if (window.filtrosGraficoEvolCat.length === 0) window.filtrosGraficoEvolCat = catList.map(c => c.nombre); arrRef = window.filtrosGraficoEvolCat; fullList = catList.map(c => c.nombre); }
            else if (tipo === 'EvolSubcat') { const subcatList = window.appState.subcategorias || []; if (!window.filtrosGraficoEvolSubcat) window.filtrosGraficoEvolSubcat = []; if (window.filtrosGraficoEvolSubcat.length === 0) window.filtrosGraficoEvolSubcat = subcatList.map(s => s.id); arrRef = window.filtrosGraficoEvolSubcat; fullList = subcatList.map(s => s.id); }
            else if (tipo === 'Balance') { if (window.filtrosGraficoBalance.length === 0) window.filtrosGraficoBalance = ["Ingreso / Sueldo", "Gastos Totales", "Resto Disponible"]; arrRef = window.filtrosGraficoBalance; fullList = ["Ingreso / Sueldo", "Gastos Totales", "Resto Disponible"]; }
            
            if (checkbox.checked) { if (!arrRef.includes(val)) arrRef.push(val); } else { const idx = arrRef.indexOf(val); if (idx !== -1) arrRef.splice(idx, 1); }
            if (arrRef.length === fullList.length) { 
                if (tipo === 'Totales') window.filtrosGraficoTotales = []; 
                if (tipo === 'EvolCat') window.filtrosGraficoEvolCat = []; 
                if (tipo === 'EvolSubcat') window.filtrosGraficoEvolSubcat = []; 
                if (tipo === 'Balance') window.filtrosGraficoBalance = []; 
            }
            renderFiltrosGraficosCheckboxes(); renderCharts();
        };
        window.marcarTodosGrafico = function(tipo, marcar) {
            if (tipo === 'Totales') window.filtrosGraficoTotales = marcar ? [] : ['__NINGUNO__'];
            else if (tipo === 'EvolCat') window.filtrosGraficoEvolCat = marcar ? [] : ['__NINGUNO__'];
            else if (tipo === 'EvolSubcat') window.filtrosGraficoEvolSubcat = marcar ? [] : ['__NINGUNO__'];
            else if (tipo === 'Balance') window.filtrosGraficoBalance = marcar ? [] : ['__NINGUNO__'];
            renderFiltrosGraficosCheckboxes(); renderCharts();
        };

        function renderCharts() {
            if (!window.appState.chartRangeFrom || !window.appState.chartRangeTo) initChartRangeInputs();
            let labelsMonths = [], dataTotales = [], dataIngresos = [], dataResto = [];
            let catList = window.appState.categorias || [];
            let subcatList = window.appState.subcategorias || [];
            let [startYear, startMonth] = window.appState.chartRangeFrom.split('-').map(Number);
            let [endYear, endMonth] = window.appState.chartRangeTo.split('-').map(Number);
            let currY = startYear, currM = startMonth;
            
            let filtrosTotales = window.filtrosGraficoTotales || [];
            let filtrosEvolCat = window.filtrosGraficoEvolCat || [];
            let filtrosEvolSubcat = window.filtrosGraficoEvolSubcat || [];
            let filtrosBalance = window.filtrosGraficoBalance || [];

            let datasetsEvolCat = catList.filter(cat => filtrosEvolCat.length === 0 || filtrosEvolCat.includes(cat.nombre)).map(cat => ({ label: cat.nombre, data: [], borderColor: cat.color, backgroundColor: cat.color, borderWidth: 2, pointRadius: 3, pointStyle: 'rect', fill: false, tension: 0.3 }));
            
            let colorPalette = ['#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4', '#f43f5e', '#84cc16'];
            let datasetsEvolSubcat = subcatList.filter(sub => filtrosEvolSubcat.length === 0 || filtrosEvolSubcat.includes(sub.id)).map((sub, idx) => {
                let color = colorPalette[idx % colorPalette.length];
                return { label: sub.nombre, subId: sub.id, data: [], borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 3, pointStyle: 'rect', fill: false, tension: 0.3 };
            });

            let mapIdToDatasetIndex = {}; let datasetsRecurrentesIndiv = []; let colorIdx = 0; let filtrosRecGrid = window.filtrosRecurrentesGrid;

            (window.appState.gastos || []).forEach(g => {
                const baseEsFijo = (g.categoria || '').toLowerCase().includes('fijo') || (g.categoria || '').toLowerCase().includes('servicio');
                if ((g.isRecurrente || baseEsFijo) && mapIdToDatasetIndex[g.id] === undefined) {
                    if (filtrosRecGrid.length === 0 || filtrosRecGrid.includes(g.id)) {
                        let color = colorPalette[colorIdx % colorPalette.length]; colorIdx++;
                        mapIdToDatasetIndex[g.id] = datasetsRecurrentesIndiv.length;
                        datasetsRecurrentesIndiv.push({ label: g.concepto, data: [], borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 3, pointStyle: 'rect', fill: false, tension: 0.3 });
                    }
                }
            });

            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            while (currY < endYear || (currY === endYear && currM <= endMonth)) {
                let ymStr = `${currY}-${String(currM).padStart(2, '0')}`;
                labelsMonths.push(`${monthNames[currM - 1]} ${currY}`);
                const calc = window.getCalculatedDataForMonth(ymStr);
                const sumaTotalMes = calc.totalFijos + calc.totalTarjetas;
                dataTotales.push(sumaTotalMes); dataIngresos.push(calc.sueldoActual); dataResto.push(calc.sueldoActual - sumaTotalMes);
                
                let valoresMesRecurrente = new Array(datasetsRecurrentesIndiv.length).fill(0);
                calc.items.forEach(item => { if (item.isRecurrente && mapIdToDatasetIndex[item.id] !== undefined) valoresMesRecurrente[mapIdToDatasetIndex[item.id]] += item.monto; });
                datasetsRecurrentesIndiv.forEach((ds, idx) => ds.data.push(valoresMesRecurrente[idx]));
                
                catList.forEach(cat => { if (filtrosEvolCat.length === 0 || filtrosEvolCat.includes(cat.nombre)) { let dsObj = datasetsEvolCat.find(d => d.label === cat.nombre); if (dsObj) dsObj.data.push(calc.totalesPorCat[cat.nombre] || 0); } });

                let totalesPorSubcatMes = {};
                calc.items.forEach(item => {
                    const gridKey = `${item.id}_${ymStr}`;
                    const subId = window.appState.excepcionesSubcategoria?.[gridKey] !== undefined ? window.appState.excepcionesSubcategoria[gridKey] : item.subcategoriaId;
                    if (subId) {
                        totalesPorSubcatMes[subId] = (totalesPorSubcatMes[subId] || 0) + item.monto;
                    }
                });
                datasetsEvolSubcat.forEach(ds => {
                    ds.data.push(totalesPorSubcatMes[ds.subId] || 0);
                });

                currM++; if (currM > 12) { currM = 1; currY++; }
            }

            let datasetsTotales = [];
            if (filtrosTotales.length === 0 || filtrosTotales.includes("Gastos Totales")) {
                datasetsTotales.push({ 
                    label: 'Gastos Totales', 
                    data: dataTotales, 
                    borderColor: '#f43f5e', 
                    backgroundColor: '#f43f5e', 
                    borderWidth: 2, 
                    pointRadius: 3, 
                    pointStyle: 'rect', 
                    fill: false, 
                    tension: 0.3 
                });
            }
            if (filtrosTotales.length === 0 || filtrosTotales.includes("Ingresos / Sueldo")) {
                datasetsTotales.push({ 
                    label: 'Ingresos / Sueldo', 
                    data: dataIngresos, 
                    borderColor: '#10b981', 
                    backgroundColor: '#10b981', 
                    borderWidth: 2, 
                    pointRadius: 3, 
                    pointStyle: 'rect', 
                    fill: false, 
                    tension: 0.3 
                });
            }
            const ctxTotales = document.getElementById('chartEvolucionTotales');
            if (ctxTotales) chartInstTotales = updateOrCreateChart(chartInstTotales, ctxTotales, { type: 'line', data: { labels: labelsMonths, datasets: datasetsTotales }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

            const ctxEvolCat = document.getElementById('chartEvolucionCategorias');
            if (ctxEvolCat) chartInstEvolCat = updateOrCreateChart(chartInstEvolCat, ctxEvolCat, { type: 'line', data: { labels: labelsMonths, datasets: datasetsEvolCat }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

            const ctxEvolSubcat = document.getElementById('chartEvolucionSubcategorias');
            if (ctxEvolSubcat) chartInstEvolSubcat = updateOrCreateChart(chartInstEvolSubcat, ctxEvolSubcat, { type: 'line', data: { labels: labelsMonths, datasets: datasetsEvolSubcat }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

            const ctxRecurrentesIndiv = document.getElementById('chartEvolucionRecurrentesIndiv');
            if (ctxRecurrentesIndiv) chartInstRecurrentesIndiv = updateOrCreateChart(chartInstRecurrentesIndiv, ctxRecurrentesIndiv, { type: 'line', data: { labels: labelsMonths, datasets: datasetsRecurrentesIndiv }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });

            let datasetsBalance = [];
            if (filtrosBalance.length === 0 || filtrosBalance.includes("Ingreso / Sueldo")) datasetsBalance.push({ label: 'Ingreso / Sueldo', data: dataIngresos, backgroundColor: '#10b981', borderRadius: 6 });
            if (filtrosBalance.length === 0 || filtrosBalance.includes("Gastos Totales")) datasetsBalance.push({ label: 'Gastos Totales', data: dataTotales, backgroundColor: '#f43f5e', borderRadius: 6 });
            if (filtrosBalance.length === 0 || filtrosBalance.includes("Resto Disponible")) datasetsBalance.push({ label: 'Resto Disponible', data: dataResto, backgroundColor: '#3b82f6', borderRadius: 6 });

            const ctxBalance = document.getElementById('chartBalanceGeneral');
            if (ctxBalance) chartInstBalance = updateOrCreateChart(chartInstBalance, ctxBalance, { type: 'bar', data: { labels: labelsMonths, datasets: datasetsBalance }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } } });
        }

