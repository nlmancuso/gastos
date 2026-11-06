        let currentActiveTab = 'planilla';

        window.switchTab = function(tabName) {
            currentActiveTab = tabName;
            
            document.getElementById('viewSettings').classList.add('hidden');
            document.getElementById('viewPlanilla').classList.add('hidden');
            document.getElementById('viewAnalisis').classList.add('hidden');
            document.getElementById('viewSaldos').classList.add('hidden');
            document.getElementById('viewMensual').classList.add('hidden');
            document.getElementById('viewHormiga').classList.add('hidden');

            document.getElementById('btnTabPlanilla').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabAnalisis').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabSaldos').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabMensual').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";
            document.getElementById('btnTabHormiga').className = "px-5 py-2.5 text-sm font-semibold text-slate-400 hover:text-white flex items-center gap-2 cursor-pointer";

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
            } else if (tabName === 'mensual') {
                document.getElementById('viewMensual').classList.remove('hidden');
                document.getElementById('btnTabMensual').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                renderGastoMensualApp();
            } else if (tabName === 'hormiga') {
                document.getElementById('viewHormiga').classList.remove('hidden');
                document.getElementById('btnTabHormiga').className = "px-5 py-2.5 text-sm font-semibold tab-btn-active flex items-center gap-2 cursor-pointer";
                renderHormigaApp();
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
            document.getElementById('viewMensual').classList.add('hidden');
            document.getElementById('viewHormiga').classList.add('hidden');
            document.getElementById('viewSettings').classList.remove('hidden');
            ['btnTabPlanilla', 'btnTabAnalisis', 'btnTabSaldos', 'btnTabMensual', 'btnTabHormiga'].forEach(id => {
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
                hormiga: renderHormigaApp
            });
        }
