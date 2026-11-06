        let currentActiveTab = 'planilla';

        window.switchTab = function(tabName) {
            currentActiveTab = tabName;
            
            document.getElementById('viewSettings').classList.add('hidden');
            document.getElementById('viewPlanilla').classList.add('hidden');
            document.getElementById('viewAnalisis').classList.add('hidden');
            document.getElementById('viewSaldos').classList.add('hidden');
            document.getElementById('viewGastos').classList.add('hidden');

            document.getElementById('btnTabPlanilla').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabAnalisis').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabSaldos').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabGastos').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";

            if (tabName === 'planilla') {
                document.getElementById('viewPlanilla').classList.remove('hidden');
                document.getElementById('btnTabPlanilla').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                renderPlanillaTab();
            } else if (tabName === 'analisis') {
                document.getElementById('viewAnalisis').classList.remove('hidden');
                document.getElementById('btnTabAnalisis').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                initChartRangeInputs();
                initRecurrentesCheckboxesList();
                renderFiltrosGraficosCheckboxes();
                renderCharts();
            } else if (tabName === 'saldos') {
                document.getElementById('viewSaldos').classList.remove('hidden');
                document.getElementById('btnTabSaldos').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                renderSaldosApp();
            } else if (tabName === 'gastos') {
                document.getElementById('viewGastos').classList.remove('hidden');
                document.getElementById('btnTabGastos').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                window.cambiarTipoGastoUnificado(document.getElementById('tipoGastoUnificado').value);
            }
        };

        window.cambiarTipoGastoUnificado = function(tipo) {
            const esHormiga = tipo === 'hormiga';
            const camposGrupo = document.getElementById('gastoMensualFields');
            const camposHormiga = document.getElementById('gastoHormigaFields');
            const panelGrupo = document.getElementById('viewMensual');
            const panelHormiga = document.getElementById('viewHormiga');
            const resumenGrupo = document.getElementById('resumenGastoMensual');
            const resumenHormiga = document.getElementById('resumenGastoHormiga');
            const titulo = document.getElementById('tituloFormGastoMensual');
            const ayuda = document.getElementById('ayudaTipoGastoUnificado');
            document.getElementById('medioPagoGrupoContainer').classList.toggle('hidden', esHormiga);
            document.getElementById('medioPagoHormigaContainer').classList.toggle('hidden', !esHormiga);
            document.getElementById('gastoMensualMedioPago').disabled = esHormiga || !window.esUsuarioEditor();
            document.getElementById('hormigaMedioPago').disabled = !esHormiga;
            const botonGuardar = document.getElementById('btnGuardarGastoUnificado');
            const botonCategorias = document.getElementById('btnCategoriasTipoGasto');

            camposGrupo.classList.toggle('hidden', esHormiga);
            camposGrupo.disabled = esHormiga;
            camposHormiga.classList.toggle('hidden', !esHormiga);
            camposHormiga.disabled = !esHormiga;
            panelGrupo.classList.toggle('hidden', esHormiga);
            panelHormiga.classList.toggle('hidden', !esHormiga);
            resumenGrupo.classList.toggle('hidden', esHormiga);
            resumenHormiga.classList.toggle('hidden', !esHormiga);

            titulo.innerHTML = esHormiga
                ? '<i class="fa-solid fa-cookie-bite text-amber-400"></i> Registrar Gasto Hormiga'
                : '<i class="fa-solid fa-plus-circle text-sky-400"></i> Registrar gasto de Grupo';
            ayuda.textContent = esHormiga
                ? 'Este gasto es privado y solo vos podés verlo, sin importar el espacio seleccionado.'
                : 'Este gasto será visible para los integrantes del grupo.';
            botonGuardar.className = esHormiga
                ? 'w-full sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2'
                : 'w-full sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2';
            botonGuardar.innerHTML = esHormiga
                ? '<i class="fa-solid fa-cookie"></i> Guardar Gasto Hormiga'
                : '<i class="fa-solid fa-floppy-disk"></i> Guardar gasto de Grupo';
            botonCategorias.className = `shrink-0 h-[42px] px-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-semibold ${
                esHormiga
                    ? 'border-amber-800/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
                    : 'border-sky-800/60 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60'
            }`;
            botonCategorias.classList.toggle('hidden', !esHormiga && !window.esUsuarioEditor());

            if (esHormiga) renderHormigaApp();
            else renderGastoMensualApp();
        };

        window.abrirCategoriasTipoGasto = function() {
            if (document.getElementById('tipoGastoUnificado').value === 'hormiga') {
                window.openModalCatHormiga();
            } else {
                window.openModalCategoriasGastoMensual();
            }
        };

        window.handleSaveGastoUnificado = function(event) {
            if (document.getElementById('tipoGastoUnificado').value === 'hormiga') {
                window.handleSaveGastoHormiga(event);
            } else {
                window.handleSaveGastoMensual(event);
            }
        };

        window.openSettingsSection = function(sectionName = 'categorias') {
            const categoriasPanel = document.getElementById('modalCatGeneral');
            const grupoPanel = document.getElementById('modalGestionGrupo');
            document.getElementById(`settingsSection${sectionName}`).appendChild(categoriasPanel);
            document.getElementById('settingsSectiongrupo').appendChild(grupoPanel);
            categoriasPanel.className = ['categorias', 'subcategorias'].includes(sectionName) ? 'w-full' : 'hidden';
            grupoPanel.className = sectionName === 'grupo' ? 'w-full' : 'hidden';
            document.getElementById('settingsCategoriasPanelContent').classList.toggle('hidden', sectionName !== 'categorias');
            document.getElementById('settingsSubcategoriasPanelContent').classList.toggle('hidden', sectionName !== 'subcategorias');
            document.getElementById('viewPlanilla').classList.add('hidden');
            document.getElementById('viewAnalisis').classList.add('hidden');
            document.getElementById('viewSaldos').classList.add('hidden');
            document.getElementById('viewGastos').classList.add('hidden');
            document.getElementById('viewSettings').classList.remove('hidden');
            ['btnTabPlanilla', 'btnTabAnalisis', 'btnTabSaldos', 'btnTabGastos'].forEach(id => {
                document.getElementById(id).className = 'px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer';
            });

            ['categorias', 'subcategorias', 'grupo', 'notificaciones'].forEach(section => {
                document.getElementById(`settingsSection${section}`).classList.toggle('hidden', section !== sectionName);
                const button = document.getElementById(`btnSettings${section}`);
                button.className = section === sectionName
                    ? 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-left'
                    : 'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 hover:text-white hover:bg-slate-800/70 text-left';
            });

            if (sectionName === 'categorias' || sectionName === 'subcategorias') {
                if (typeof window.renderSettingsCategories === 'function') window.renderSettingsCategories();
            } else if (sectionName === 'grupo') {
                window.renderMiembrosGrupoSettings();
            } else if (sectionName === 'notificaciones') {
                window.renderHistorialNotificaciones();
            }
        };

        window.switchSettingsSection = function(sectionName) {
            window.openSettingsSection(sectionName);
        };

        function renderApp() {
            const currentMonth = window.appState.currentMonth || '2026-10';
            if(document.getElementById('displayMonthText')) document.getElementById('displayMonthText').innerText = window.formatMonthDisplay(currentMonth);
            if(document.getElementById('badgeMonth')) document.getElementById('badgeMonth').innerText = window.formatMonthDisplay(currentMonth);

            window.renderActiveView(currentActiveTab, {
                planilla: renderPlanillaTab,
                analisis: renderCharts,
                saldos: renderSaldosApp,
                mensual: renderGastoMensualApp,
                hormiga: renderHormigaApp,
                gastos: () => {
                    if (document.getElementById('tipoGastoUnificado').value === 'hormiga') renderHormigaApp();
                    else renderGastoMensualApp();
                }
            });
        }
