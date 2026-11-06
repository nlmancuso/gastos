        // ---------------- SCRIPT SALDOS Y BANCOS ----------------
        function renderSaldosApp() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const calcData = window.getCalculatedDataForMonth(currentMonth);
            const container = document.getElementById('containerBancosGrid');
            const containerResumen = document.getElementById('containerResumenDisponibles');
            if (!container) return; container.innerHTML = ''; if (containerResumen) containerResumen.innerHTML = '';
            const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            let totalDisponibleRealSuma = 0; let tarjetasBancosHtml = '';

            (window.appState.cuentasBancarias || []).forEach(cuenta => {
                const saldosMes = cuenta.saldosPorMes?.[currentMonth] || { bcoSaldo: 0, mpSaldo: 0 };
                const bcoSaldo = parseFloat(saldosMes.bcoSaldo) || 0; const mpSaldo = parseFloat(saldosMes.mpSaldo) || 0;
                const totalIngresos = bcoSaldo + mpSaldo; const catAsociadas = cuenta.categoriasAsociadas || []; const fijosAsociadosIds = cuenta.gastosFijosAsociados || [];
                let totalesTarjetasEspecificas = {}; let vencimientosTarjetas = {}; let gastosFijosCuenta = [];

                calcData.items.forEach(item => {
                    if (item.estado === 'PAGADO') return;
                    const catObj = (window.appState.categorias || []).find(c => c.nombre === item.categoria);
                    const esTarjeta = catObj ? catObj.esTarjeta : true;
                    if (esTarjeta && catAsociadas.includes(item.categoria)) {
                        totalesTarjetasEspecificas[item.categoria] = (totalesTarjetasEspecificas[item.categoria] || 0) + item.monto;
                        if (item.vencimiento && !vencimientosTarjetas[item.categoria]) vencimientosTarjetas[item.categoria] = item.vencimiento;
                    } else if (!esTarjeta && fijosAsociadosIds.includes(item.id)) gastosFijosCuenta.push(item);
                });

                let tarjetasDesglosadasHtml = ''; let sumaTarjetas = 0;
                Object.entries(totalesTarjetasEspecificas).forEach(([nombreCat, montoCat]) => {
                    sumaTarjetas += montoCat; const vencStr = vencimientosTarjetas[nombreCat] ? window.formatFechaVencimientoSimple(vencimientosTarjetas[nombreCat]) : '';
                    tarjetasDesglosadasHtml += `<div class="flex justify-between items-center text-xs text-slate-300 py-1.5 border-b border-slate-800/40 gap-2"><span class="font-semibold shrink-0">${nombreCat}:</span><span class="text-[11px] text-amber-400 font-mono text-center flex-1">${vencStr ? `Venc: ${vencStr}` : ''}</span><span class="text-rose-400 font-bold shrink-0">-$${montoCat.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
                });
                const fijosHtml = gastosFijosCuenta.map(g => {
                    const vencFmt = g.vencimiento ? window.formatFechaVencimientoSimple(g.vencimiento) : '';
                    return `<div class="flex justify-between items-center text-xs text-slate-400 py-1.5 border-b border-slate-800/40 gap-2"><span class="truncate shrink-0 max-w-[140px]">- ${g.concepto} (${g.categoria})</span><span class="text-[11px] text-amber-400 font-mono text-center flex-1">${vencFmt ? `Venc: ${vencFmt}` : ''}</span><span class="text-rose-400 font-semibold shrink-0">-$${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
                }).join('');

                const totalGastosFijos = gastosFijosCuenta.reduce((acc, g) => acc + g.monto, 0);
                const totalDescuentosBanco = sumaTarjetas + totalGastosFijos; const disponibleFinal = totalIngresos - totalDescuentosBanco;
                totalDisponibleRealSuma += disponibleFinal;

                tarjetasBancosHtml += `<div class="card-bg p-4 rounded-2xl border border-slate-800 relative"><div class="flex justify-between items-center mb-1"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider truncate flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-emerald-400"></i> ${cuenta.nombre}</span></div><h2 class="text-xl font-extrabold my-0.5 ${disponibleFinal >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(disponibleFinal)}</h2><span class="text-[10px] text-slate-500 font-medium">Disponible Real</span></div>`;

                container.innerHTML += `<div class="card-bg p-5 rounded-2xl flex flex-col justify-between shadow-xl border border-slate-800"><div><div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-800"><h4 class="text-base font-bold text-white flex items-center gap-2"><i class="fa-solid fa-university text-emerald-400"></i> ${cuenta.nombre}</h4><div class="flex items-center gap-2"><button onclick="editCuenta('${cuenta.id}')" class="text-slate-400 hover:text-white text-xs"><i class="fa-solid fa-pen"></i></button><button onclick="deleteCuenta('${cuenta.id}')" class="text-slate-400 hover:text-rose-400 text-xs"><i class="fa-solid fa-trash-can"></i></button></div></div><div class="space-y-1.5 text-xs mb-4"><div class="flex justify-between text-slate-300"><span>Saldo Banco:</span> <strong>${fmt(bcoSaldo)}</strong></div><div class="flex justify-between text-slate-300"><span>Saldo Mercado Pago:</span> <strong>${fmt(mpSaldo)}</strong></div><div class="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800"><span>Total Saldos:</span> <span>${fmt(totalIngresos)}</span></div></div><div class="space-y-1 mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800"><div class="flex justify-between items-center mb-2"><span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Descuentos Aplicados</span><span class="text-[10px] text-slate-500 font-semibold">${window.formatMonthDisplay(currentMonth)}</span></div>${tarjetasDesglosadasHtml}${fijosHtml}${(!tarjetasDesglosadasHtml && !fijosHtml) ? '<p class="text-[11px] text-slate-500 italic py-1">No hay descuentos pendientes.</p>' : `<div class="flex justify-between items-center text-xs text-rose-400 font-bold pt-2 mt-1 border-t border-slate-800/80"><span>Total Descuentos:</span><span>-$${totalDescuentosBanco.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`}</div></div><div class="pt-3 border-t border-slate-800 flex justify-between items-center"><span class="text-xs font-bold text-slate-300 uppercase">Disponible Real:</span><span class="text-base font-extrabold ${disponibleFinal >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(disponibleFinal)}</span></div></div>`;
            });

            if (containerResumen) containerResumen.innerHTML = `${tarjetasBancosHtml}<div class="card-bg p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 relative"><div class="flex justify-between items-center mb-1"><span class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><i class="fa-solid fa-coins"></i> DISPONIBLE REAL TOTAL</span></div><h2 class="text-xl font-black my-0.5 ${totalDisponibleRealSuma >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(totalDisponibleRealSuma)}</h2><span class="text-[10px] text-slate-400 font-medium">Suma Cuentas y Bancos</span></div>`;
        }

        window.openModalCuenta = function() {
            document.getElementById('cuentaId').value = ''; document.getElementById('modalCuentaTitulo').innerText = "Nueva Cuenta / Banco";
            document.getElementById('cuentaNombre').value = ''; document.getElementById('cuentaBcoSaldo').value = ''; document.getElementById('cuentaMpSaldo').value = '';
            renderCategoriasAsociadasCheckboxes([], []); document.getElementById('modalCuenta').classList.remove('hidden');
        };
        window.editCuenta = function(id) {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const cuenta = (window.appState.cuentasBancarias || []).find(c => c.id === id); if (!cuenta) return;
            const saldosMes = cuenta.saldosPorMes?.[currentMonth] || { bcoSaldo: 0, mpSaldo: 0 };
            document.getElementById('cuentaId').value = cuenta.id; document.getElementById('modalCuentaTitulo').innerText = "Configurar Banco y Descuentos";
            document.getElementById('cuentaNombre').value = cuenta.nombre; document.getElementById('cuentaBcoSaldo').value = saldosMes.bcoSaldo; document.getElementById('cuentaMpSaldo').value = saldosMes.mpSaldo;
            renderCategoriasAsociadasCheckboxes(cuenta.categoriasAsociadas || [], cuenta.gastosFijosAsociados || []); document.getElementById('modalCuenta').classList.remove('hidden');
        };
        function renderCategoriasAsociadasCheckboxes(categoriasSeleccionadas = [], gastosFijosSeleccionados = []) {
            const containerCat = document.getElementById('containerCategoriasAsociadas'); const containerFijos = document.getElementById('containerGastosFijosAsociados');
            if (!containerCat || !containerFijos) return; containerCat.innerHTML = ''; containerFijos.innerHTML = '';
            const catList = window.appState.categorias || [];
            catList.filter(c => c.esTarjeta).forEach(cat => {
                const isChecked = categoriasSeleccionadas.includes(cat.nombre);
                containerCat.innerHTML += `<div class="flex items-center gap-2 p-1.5 bg-slate-950 rounded-lg border border-slate-800"><input type="checkbox" id="catCheck_${cat.nombre}" value="${cat.nombre}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 cursor-pointer"><label for="catCheck_${cat.nombre}" class="text-xs text-slate-300 font-semibold cursor-pointer truncate flex items-center gap-1.5"><span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${cat.color};"></span>${cat.nombre}</label></div>`;
            });
            const currentMonth = window.appState.currentMonth || '2026-10';
            const calcData = window.getCalculatedDataForMonth(currentMonth);
            calcData.items.filter(item => { const catObj = catList.find(c => c.nombre === item.categoria); return catObj ? !catObj.esTarjeta : true; }).forEach(item => {
                const isChecked = gastosFijosSeleccionados.includes(item.id);
                containerFijos.innerHTML += `<div class="flex items-center justify-between p-1.5 bg-slate-950 rounded-lg border border-slate-800"><div class="flex items-center gap-2 truncate"><input type="checkbox" id="fijoCheck_${item.id}" value="${item.id}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 cursor-pointer"><label for="fijoCheck_${item.id}" class="text-xs text-slate-300 font-semibold cursor-pointer truncate">${item.concepto} <span class="text-[10px] text-slate-500">(${item.categoria})</span></label></div><span class="text-xs font-bold text-rose-400 shrink-0">$${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
            });
        }
        window.handleSaveCuenta = function(e) {
            e.preventDefault(); const currentMonth = window.appState.currentMonth || '2026-10';
            const id = document.getElementById('cuentaId').value; const nombre = document.getElementById('cuentaNombre').value.trim();
            const bcoSaldo = parseFloat(document.getElementById('cuentaBcoSaldo').value) || 0; const mpSaldo = parseFloat(document.getElementById('cuentaMpSaldo').value) || 0;
            const categoriasAsociadas = Array.from(document.querySelectorAll('#containerCategoriasAsociadas input[type="checkbox"]:checked')).map(cb => cb.value);
            const gastosFijosAsociados = Array.from(document.querySelectorAll('#containerGastosFijosAsociados input[type="checkbox"]:checked')).map(cb => cb.value);
            if (!window.appState.cuentasBancarias) window.appState.cuentasBancarias = [];
            if (id) {
                const idx = window.appState.cuentasBancarias.findIndex(c => c.id === id);
                if (idx !== -1) {
                    if (!window.appState.cuentasBancarias[idx].saldosPorMes) window.appState.cuentasBancarias[idx].saldosPorMes = {};
                    window.appState.cuentasBancarias[idx].saldosPorMes[currentMonth] = { bcoSaldo, mpSaldo };
                    window.appState.cuentasBancarias[idx].nombre = nombre; window.appState.cuentasBancarias[idx].categoriasAsociadas = categoriasAsociadas; window.appState.cuentasBancarias[idx].gastosFijosAsociados = gastosFijosAsociados;
                }
            } else {
                let saldosPorMes = {}; saldosPorMes[currentMonth] = { bcoSaldo, mpSaldo };
                window.appState.cuentasBancarias.push({ id: Date.now().toString(), nombre, saldosPorMes, categoriasAsociadas, gastosFijosAsociados });
            }
            window.saveDataToCloud(); closeModal('modalCuenta'); renderSaldosApp();
        };
        window.deleteCuenta = function(id) { if (confirm("¿Estás seguro de eliminar esta cuenta?")) { window.appState.cuentasBancarias = (window.appState.cuentasBancarias || []).filter(c => c.id !== id); window.saveDataToCloud(); renderSaldosApp(); } };

