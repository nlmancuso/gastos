        // ---------------- SCRIPT SALDOS Y CUENTAS ----------------
        let entidadesCuentaEnEdicion = [];

        function escaparHtml(valor) {
            return String(valor ?? '').replace(/[&<>"']/g, caracter => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[caracter]);
        }

        function crearIdEntidadCuenta() {
            return `ent-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        }

        function obtenerEntidadesCuenta(cuenta) {
            if (Array.isArray(cuenta.entidades) && cuenta.entidades.length) {
                return cuenta.entidades;
            }

            const saldosPorMes = cuenta.saldosPorMes || {};
            const bancoPorMes = {};
            const mercadoPagoPorMes = {};
            Object.entries(saldosPorMes).forEach(([mes, saldos]) => {
                bancoPorMes[mes] = Number(saldos.bcoSaldo) || 0;
                mercadoPagoPorMes[mes] = Number(saldos.mpSaldo) || 0;
            });

            return [
                { id: 'legacy-banco', nombre: 'Banco', saldosPorMes: bancoPorMes },
                { id: 'legacy-mercado-pago', nombre: 'Mercado Pago', saldosPorMes: mercadoPagoPorMes }
            ];
        }

        function renderSaldosApp() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            const calcData = window.getCalculatedDataForMonth(currentMonth);
            const container = document.getElementById('containerBancosGrid');
            const containerResumen = document.getElementById('containerResumenDisponibles');
            if (!container) return;
            container.innerHTML = '';
            if (containerResumen) containerResumen.innerHTML = '';

            const fmt = num => "$ " + num.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            let totalDisponibleRealSuma = 0;
            let tarjetasCuentasHtml = '';

            (window.appState.cuentasBancarias || []).forEach(cuenta => {
                const entidades = obtenerEntidadesCuenta(cuenta);
                const totalIngresos = entidades.reduce((total, entidad) => total + (Number(entidad.saldosPorMes?.[currentMonth]) || 0), 0);
                const saldosEntidadesHtml = entidades.map(entidad => {
                    const saldo = Number(entidad.saldosPorMes?.[currentMonth]) || 0;
                    return `<div class="flex justify-between text-slate-300"><span>${escaparHtml(entidad.nombre)}:</span><strong>${fmt(saldo)}</strong></div>`;
                }).join('');
                const catAsociadas = cuenta.categoriasAsociadas || [];
                const fijosAsociadosIds = cuenta.gastosFijosAsociados || [];
                const totalesTarjetasEspecificas = {};
                const vencimientosTarjetas = {};
                const gastosFijosCuenta = [];

                calcData.items.forEach(item => {
                    if (item.estado === 'PAGADO') return;
                    const catObj = (window.appState.categorias || []).find(c => c.nombre === item.categoria);
                    const esTarjeta = catObj ? catObj.esTarjeta : true;
                    if (esTarjeta && catAsociadas.includes(item.categoria)) {
                        totalesTarjetasEspecificas[item.categoria] = (totalesTarjetasEspecificas[item.categoria] || 0) + item.monto;
                        if (item.vencimiento && !vencimientosTarjetas[item.categoria]) vencimientosTarjetas[item.categoria] = item.vencimiento;
                    } else if (!esTarjeta && fijosAsociadosIds.includes(item.id)) {
                        gastosFijosCuenta.push(item);
                    }
                });

                let tarjetasDesglosadasHtml = '';
                let sumaTarjetas = 0;
                Object.entries(totalesTarjetasEspecificas).forEach(([nombreCat, montoCat]) => {
                    sumaTarjetas += montoCat;
                    const vencStr = vencimientosTarjetas[nombreCat] ? window.formatFechaVencimientoSimple(vencimientosTarjetas[nombreCat]) : '';
                    tarjetasDesglosadasHtml += `<div class="flex justify-between items-center text-xs text-slate-300 py-1.5 border-b border-slate-800/40 gap-2"><span class="font-semibold shrink-0">${escaparHtml(nombreCat)}:</span><span class="text-[11px] text-amber-400 font-mono text-center flex-1">${vencStr ? `Venc: ${vencStr}` : ''}</span><span class="text-rose-400 font-bold shrink-0">-$${montoCat.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
                });
                const fijosHtml = gastosFijosCuenta.map(g => {
                    const vencFmt = g.vencimiento ? window.formatFechaVencimientoSimple(g.vencimiento) : '';
                    return `<div class="flex justify-between items-center text-xs text-slate-400 py-1.5 border-b border-slate-800/40 gap-2"><span class="truncate shrink-0 max-w-[140px]">- ${escaparHtml(g.concepto)} (${escaparHtml(g.categoria)})</span><span class="text-[11px] text-amber-400 font-mono text-center flex-1">${vencFmt ? `Venc: ${vencFmt}` : ''}</span><span class="text-rose-400 font-semibold shrink-0">-$${g.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
                }).join('');

                const totalDescuentos = sumaTarjetas + gastosFijosCuenta.reduce((acc, gasto) => acc + gasto.monto, 0);
                const disponibleFinal = totalIngresos - totalDescuentos;
                totalDisponibleRealSuma += disponibleFinal;
                const nombreCuenta = escaparHtml(cuenta.nombre);

                tarjetasCuentasHtml += `<div class="card-bg p-4 rounded-2xl border border-slate-800 relative"><div class="flex justify-between items-center mb-1"><span class="text-xs font-bold text-slate-400 uppercase tracking-wider truncate flex items-center gap-1.5"><i class="fa-solid fa-building-columns text-emerald-400"></i> ${nombreCuenta}</span></div><h2 class="text-xl font-extrabold my-0.5 ${disponibleFinal >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(disponibleFinal)}</h2><span class="text-[10px] text-slate-500 font-medium">Disponible Real</span></div>`;

                container.innerHTML += `<div class="card-bg p-5 rounded-2xl flex flex-col justify-between shadow-xl border border-slate-800"><div><div class="flex justify-between items-center mb-3 pb-2 border-b border-slate-800"><h4 class="text-base font-bold text-white flex items-center gap-2"><i class="fa-solid fa-wallet text-emerald-400"></i> ${nombreCuenta}</h4><div class="flex items-center gap-2"><button onclick="editCuenta('${escaparHtml(cuenta.id)}')" class="text-slate-400 hover:text-white text-xs" title="Editar cuenta"><i class="fa-solid fa-pen"></i></button><button onclick="deleteCuenta('${escaparHtml(cuenta.id)}')" class="text-slate-400 hover:text-rose-400 text-xs" title="Eliminar cuenta"><i class="fa-solid fa-trash-can"></i></button></div></div><div class="space-y-1.5 text-xs mb-4">${saldosEntidadesHtml}<div class="flex justify-between text-emerald-400 font-bold pt-1 border-t border-slate-800"><span>Total saldos:</span><span>${fmt(totalIngresos)}</span></div></div><div class="space-y-1 mb-4 bg-slate-900/60 p-3 rounded-xl border border-slate-800"><div class="flex justify-between items-center mb-2"><span class="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">Descuentos Aplicados</span><span class="text-[10px] text-slate-500 font-semibold">${window.formatMonthDisplay(currentMonth)}</span></div>${tarjetasDesglosadasHtml}${fijosHtml}${(!tarjetasDesglosadasHtml && !fijosHtml) ? '<p class="text-[11px] text-slate-500 italic py-1">No hay descuentos pendientes.</p>' : `<div class="flex justify-between items-center text-xs text-rose-400 font-bold pt-2 mt-1 border-t border-slate-800/80"><span>Total Descuentos:</span><span>-$${totalDescuentos.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`}</div></div><div class="pt-3 border-t border-slate-800 flex justify-between items-center"><span class="text-xs font-bold text-slate-300 uppercase">Disponible Real:</span><span class="text-base font-extrabold ${disponibleFinal >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(disponibleFinal)}</span></div></div>`;
            });

            if (containerResumen) {
                containerResumen.innerHTML = `${tarjetasCuentasHtml}<div class="card-bg p-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 relative"><div class="flex justify-between items-center mb-1"><span class="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5"><i class="fa-solid fa-coins"></i> DISPONIBLE REAL TOTAL</span></div><h2 class="text-xl font-black my-0.5 ${totalDisponibleRealSuma >= 0 ? 'text-emerald-400' : 'text-rose-500'}">${fmt(totalDisponibleRealSuma)}</h2><span class="text-[10px] text-slate-400 font-medium">Suma de cuentas</span></div>`;
            }
        }

        function renderEntidadesCuenta(entidades = []) {
            const container = document.getElementById('containerEntidadesCuenta');
            const currentMonth = window.appState.currentMonth || '2026-10';
            entidadesCuentaEnEdicion = entidades.length ? entidades : [{ id: '', nombre: '', saldosPorMes: {} }];
            container.innerHTML = entidadesCuentaEnEdicion.map((entidad, index) => {
                const id = escaparHtml(entidad.id || '');
                const nombre = escaparHtml(entidad.nombre || '');
                const saldo = Number(entidad.saldosPorMes?.[currentMonth]) || 0;
                return `<div class="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] items-end gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3" data-entity-id="${id}"><div><label class="block text-[11px] font-bold text-slate-400 uppercase mb-1">Nombre de entidad</label><input type="text" class="cuentaEntidadNombre w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value="${nombre}" required maxlength="80" placeholder="Ej: Banco, Mercado Pago..."></div><div><label class="block text-[11px] font-bold text-slate-400 uppercase mb-1">Saldo de ${escaparHtml(window.formatMonthDisplay(currentMonth))} ($)</label><input type="number" step="0.01" class="cuentaEntidadSaldo w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white" value="${saldo}" required></div><button type="button" onclick="quitarEntidadCuenta(this)" class="h-9 w-9 rounded-lg border border-slate-700 text-slate-400 hover:border-rose-700 hover:text-rose-400 disabled:cursor-not-allowed disabled:opacity-40" title="${entidadesCuentaEnEdicion.length === 1 ? 'La cuenta debe tener al menos una entidad' : 'Quitar entidad'}" ${entidadesCuentaEnEdicion.length === 1 ? 'disabled' : ''}><i class="fa-solid fa-trash-can"></i></button></div>`;
            }).join('');
        }

        function capturarEntidadesModal() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            return Array.from(document.querySelectorAll('#containerEntidadesCuenta > div')).map(fila => {
                const id = fila.dataset.entityId || crearIdEntidadCuenta();
                fila.dataset.entityId = id;
                const original = entidadesCuentaEnEdicion.find(entidad => entidad.id === id);
                const saldosPorMes = { ...(original?.saldosPorMes || {}) };
                const saldo = Number(fila.querySelector('.cuentaEntidadSaldo').value);
                saldosPorMes[currentMonth] = Number.isFinite(saldo) ? saldo : 0;
                return {
                    id,
                    nombre: fila.querySelector('.cuentaEntidadNombre').value.trim(),
                    saldosPorMes
                };
            });
        }

        window.agregarEntidadCuenta = function() {
            const entidades = capturarEntidadesModal();
            entidades.push({ id: crearIdEntidadCuenta(), nombre: '', saldosPorMes: {} });
            renderEntidadesCuenta(entidades);
        };

        window.quitarEntidadCuenta = function(boton) {
            const entidades = capturarEntidadesModal();
            if (entidades.length <= 1) return;
            const id = boton.closest('[data-entity-id]').dataset.entityId;
            renderEntidadesCuenta(entidades.filter(entidad => entidad.id !== id));
        };

        window.openModalCuenta = function() {
            document.getElementById('cuentaId').value = '';
            document.getElementById('modalCuentaTitulo').innerText = 'Nueva Cuenta';
            document.getElementById('cuentaNombre').value = '';
            renderEntidadesCuenta();
            renderCategoriasAsociadasCheckboxes([], []);
            document.getElementById('modalCuenta').classList.remove('hidden');
        };

        window.editCuenta = function(id) {
            const cuenta = (window.appState.cuentasBancarias || []).find(item => item.id === id);
            if (!cuenta) return;
            document.getElementById('cuentaId').value = cuenta.id;
            document.getElementById('modalCuentaTitulo').innerText = 'Configurar Cuenta';
            document.getElementById('cuentaNombre').value = cuenta.nombre || '';
            renderEntidadesCuenta(obtenerEntidadesCuenta(cuenta));
            renderCategoriasAsociadasCheckboxes(cuenta.categoriasAsociadas || [], cuenta.gastosFijosAsociados || []);
            document.getElementById('modalCuenta').classList.remove('hidden');
        };

        function renderCategoriasAsociadasCheckboxes(categoriasSeleccionadas = [], gastosFijosSeleccionados = []) {
            const containerCat = document.getElementById('containerCategoriasAsociadas');
            const containerFijos = document.getElementById('containerGastosFijosAsociados');
            if (!containerCat || !containerFijos) return;
            containerCat.innerHTML = '';
            containerFijos.innerHTML = '';
            const catList = window.appState.categorias || [];
            catList.filter(c => c.esTarjeta).forEach(cat => {
                const isChecked = categoriasSeleccionadas.includes(cat.nombre);
                containerCat.innerHTML += `<div class="flex items-center gap-2 p-1.5 bg-slate-950 rounded-lg border border-slate-800"><input type="checkbox" id="catCheck_${escaparHtml(cat.nombre)}" value="${escaparHtml(cat.nombre)}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-600 cursor-pointer"><label for="catCheck_${escaparHtml(cat.nombre)}" class="text-xs text-slate-300 font-semibold cursor-pointer truncate flex items-center gap-1.5"><span class="w-2 h-2 rounded-full shrink-0" style="background-color: ${escaparHtml(cat.color)};"></span>${escaparHtml(cat.nombre)}</label></div>`;
            });
            const currentMonth = window.appState.currentMonth || '2026-10';
            const calcData = window.getCalculatedDataForMonth(currentMonth);
            calcData.items.filter(item => {
                const catObj = catList.find(c => c.nombre === item.categoria);
                return catObj ? !catObj.esTarjeta : true;
            }).forEach(item => {
                const isChecked = gastosFijosSeleccionados.includes(item.id);
                containerFijos.innerHTML += `<div class="flex items-center justify-between p-1.5 bg-slate-950 rounded-lg border border-slate-800"><div class="flex items-center gap-2 truncate"><input type="checkbox" id="fijoCheck_${escaparHtml(item.id)}" value="${escaparHtml(item.id)}" ${isChecked ? 'checked' : ''} class="w-4 h-4 rounded border-slate-700 bg-slate-900 text-amber-500 cursor-pointer"><label for="fijoCheck_${escaparHtml(item.id)}" class="text-xs text-slate-300 font-semibold cursor-pointer truncate">${escaparHtml(item.concepto)} <span class="text-[10px] text-slate-500">(${escaparHtml(item.categoria)})</span></label></div><span class="text-xs font-bold text-rose-400 shrink-0">$${item.monto.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span></div>`;
            });
        }

        window.handleSaveCuenta = function(event) {
            event.preventDefault();
            const currentMonth = window.appState.currentMonth || '2026-10';
            const id = document.getElementById('cuentaId').value;
            const nombre = document.getElementById('cuentaNombre').value.trim();
            const entidades = capturarEntidadesModal();
            if (!nombre || !entidades.length || entidades.some(entidad => !entidad.nombre)) {
                window.mostrarMensajeApp('Datos incompletos', 'Ingresá el nombre de la cuenta y el nombre de cada entidad.', 'error');
                return;
            }
            const categoriasAsociadas = Array.from(document.querySelectorAll('#containerCategoriasAsociadas input[type="checkbox"]:checked')).map(cb => cb.value);
            const gastosFijosAsociados = Array.from(document.querySelectorAll('#containerGastosFijosAsociados input[type="checkbox"]:checked')).map(cb => cb.value);
            if (!window.appState.cuentasBancarias) window.appState.cuentasBancarias = [];
            const cuentaExistente = window.appState.cuentasBancarias.find(cuenta => cuenta.id === id);
            if (cuentaExistente) {
                cuentaExistente.nombre = nombre;
                cuentaExistente.entidades = entidades;
                delete cuentaExistente.saldosPorMes;
                cuentaExistente.categoriasAsociadas = categoriasAsociadas;
                cuentaExistente.gastosFijosAsociados = gastosFijosAsociados;
            } else {
                window.appState.cuentasBancarias.push({
                    id: crearIdEntidadCuenta(),
                    nombre,
                    entidades,
                    categoriasAsociadas,
                    gastosFijosAsociados
                });
            }
            window.saveDataToCloud();
            closeModal('modalCuenta');
            renderSaldosApp();
        };

        window.deleteCuenta = function(id) {
            if (confirm('¿Estás seguro de eliminar esta cuenta?')) {
                window.appState.cuentasBancarias = (window.appState.cuentasBancarias || []).filter(cuenta => cuenta.id !== id);
                window.saveDataToCloud();
                renderSaldosApp();
            }
        };
