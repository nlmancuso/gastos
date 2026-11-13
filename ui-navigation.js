        let currentActiveTab = 'planilla';
        const sidebarTabs = [
            ['planilla', 'btnTabPlanilla'],
            ['analisis', 'btnTabAnalisis'],
            ['saldos', 'btnTabSaldos'],
            ['gastos', 'btnTabGastos']
        ];
        const sidebarButtonBase = 'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors';

        function actualizarNavegacionLateral(tabName, ajustesActivos = false) {
            sidebarTabs.forEach(([tab, id]) => {
                const button = document.getElementById(id);
                const activo = !ajustesActivos && tab === tabName;
                button.className = activo
                    ? `sidebar-nav-button ${sidebarButtonBase} border border-emerald-500/20 bg-emerald-500/10 text-emerald-400`
                    : `sidebar-nav-button ${sidebarButtonBase} text-slate-400 hover:bg-slate-800/70 hover:text-white`;
            });
            const botonAjustes = document.getElementById('btnConfigCat');
            const ajustesOcultos = botonAjustes.classList.contains('hidden') || botonAjustes.style.display === 'none';
            botonAjustes.className = ajustesActivos
                ? `${sidebarButtonBase} border border-emerald-500/20 bg-emerald-500/10 text-emerald-400`
                : `${sidebarButtonBase} text-slate-400 hover:bg-slate-800/70 hover:text-white`;
            if (ajustesOcultos) {
                botonAjustes.classList.add('hidden');
                botonAjustes.style.display = 'none';
            }
        }

        function actualizarBotonMenuLateral() {
            const boton = document.getElementById('btnToggleSidebar');
            const icono = document.getElementById('iconToggleSidebar');
            if (!boton || !icono) return;
            const esMovil = window.matchMedia('(max-width: 767px)').matches;
            const estaAbierto = esMovil
                ? document.getElementById('appContent').classList.contains('sidebar-mobile-open')
                : !document.body.classList.contains('app-sidebar-collapsed');
            const texto = esMovil
                ? (estaAbierto ? 'Cerrar barra lateral' : 'Abrir barra lateral')
                : (estaAbierto ? 'Ocultar barra lateral' : 'Mostrar barra lateral');
            boton.setAttribute('aria-label', texto);
            boton.setAttribute('aria-expanded', String(estaAbierto));
            boton.title = texto;
            icono.className = `fa-solid ${esMovil && estaAbierto ? 'fa-xmark' : estaAbierto ? 'fa-bars' : 'fa-angles-right'}`;
        }

        function aplicarPreferenciaMenuLateral() {
            const colapsado = localStorage.getItem('app_sidebar_collapsed') === 'true';
            document.body.classList.toggle('app-sidebar-collapsed', colapsado);
            actualizarBotonMenuLateral();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', aplicarPreferenciaMenuLateral, { once: true });
        } else {
            aplicarPreferenciaMenuLateral();
        }

        window.toggleAppSidebar = function() {
            const appContent = document.getElementById('appContent');
            if (window.matchMedia('(max-width: 767px)').matches) {
                appContent.classList.toggle('sidebar-mobile-open');
                document.getElementById('appSidebarOverlay').classList.toggle('hidden', !appContent.classList.contains('sidebar-mobile-open'));
            } else {
                const colapsado = !document.body.classList.contains('app-sidebar-collapsed');
                document.body.classList.toggle('app-sidebar-collapsed', colapsado);
                localStorage.setItem('app_sidebar_collapsed', String(colapsado));
            }
            actualizarBotonMenuLateral();
        };

        window.closeAppSidebarMobile = function() {
            const appContent = document.getElementById('appContent');
            appContent.classList.remove('sidebar-mobile-open');
            document.getElementById('appSidebarOverlay').classList.add('hidden');
            actualizarBotonMenuLateral();
        };

        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') window.closeAppSidebarMobile();
        });

        window.addEventListener('resize', () => {
            if (!window.matchMedia('(max-width: 767px)').matches) window.closeAppSidebarMobile();
        });

        window.switchTab = function(tabName) {
            currentActiveTab = tabName;
            actualizarNavegacionLateral(tabName);
            window.closeAppSidebarMobile();
            
            document.getElementById('viewSettings').classList.add('hidden');
            document.getElementById('viewPlanilla').classList.add('hidden');
            document.getElementById('viewAnalisis').classList.add('hidden');
            document.getElementById('viewSaldos').classList.add('hidden');
            document.getElementById('viewGastos').classList.add('hidden');

            if (tabName === 'planilla') {
                document.getElementById('viewPlanilla').classList.remove('hidden');
                renderPlanillaTab();
            } else if (tabName === 'analisis') {
                document.getElementById('viewAnalisis').classList.remove('hidden');
                initChartRangeInputs();
                initRecurrentesCheckboxesList();
                renderFiltrosGraficosCheckboxes();
                renderCharts();
            } else if (tabName === 'saldos') {
                document.getElementById('viewSaldos').classList.remove('hidden');
                renderSaldosApp();
            } else if (tabName === 'gastos') {
                document.getElementById('viewGastos').classList.remove('hidden');
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
            const selectorTipoGasto = document.getElementById('tipoGastoUnificado');
            const editando = esHormiga
                ? Boolean(window.gastoHormigaEnEdicionId)
                : Boolean(window.gastoMensualEnEdicionId);
            const botonCancelarEdicion = document.getElementById('btnCancelarEdicionGasto');
            document.getElementById('categoriaGrupoContainer').classList.toggle('hidden', esHormiga);
            document.getElementById('categoriaHormigaContainer').classList.toggle('hidden', !esHormiga);
            document.getElementById('medioPagoGrupoContainer').classList.toggle('hidden', esHormiga);
            document.getElementById('medioPagoHormigaContainer').classList.toggle('hidden', !esHormiga);
            document.getElementById('gastoMensualCategoria').disabled = esHormiga || !window.esUsuarioEditor();
            document.getElementById('hormigaCategoriaSelect').disabled = !esHormiga;
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

            titulo.innerHTML = editando
                ? (esHormiga
                    ? '<i class="fa-solid fa-pen text-amber-400"></i> Editar Gasto Hormiga'
                    : '<i class="fa-solid fa-pen text-sky-400"></i> Editar gasto de Grupo')
                : (esHormiga
                    ? '<i class="fa-solid fa-cookie-bite text-amber-400"></i> Registrar Gasto Hormiga'
                    : '<i class="fa-solid fa-plus-circle text-sky-400"></i> Registrar gasto de Grupo');
            ayuda.textContent = editando
                ? 'Guardá los cambios o cancelá para salir del modo edición.'
                : esHormiga
                    ? 'Este gasto es privado y solo vos podés verlo, sin importar el espacio seleccionado.'
                    : 'Este gasto será visible para los integrantes del grupo.';
            botonGuardar.className = esHormiga
                ? 'w-full sm:col-span-2 lg:col-span-1 sm:w-auto bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2'
                : 'w-full sm:col-span-2 lg:col-span-1 sm:w-auto bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition flex items-center justify-center gap-2';
            botonGuardar.innerHTML = editando
                ? '<i class="fa-solid fa-floppy-disk"></i> Guardar cambios'
                : esHormiga
                    ? '<i class="fa-solid fa-cookie"></i> Guardar Gasto Hormiga'
                    : '<i class="fa-solid fa-floppy-disk"></i> Guardar gasto de Grupo';
            selectorTipoGasto.disabled = Boolean(window.gastoHormigaEnEdicionId || window.gastoMensualEnEdicionId);
            botonCancelarEdicion.classList.toggle('hidden', !editando);
            botonCategorias.className = `shrink-0 h-[42px] px-3 rounded-xl border transition flex items-center justify-center gap-2 text-xs font-semibold ${
                esHormiga
                    ? 'border-amber-800/60 bg-amber-950/40 text-amber-300 hover:bg-amber-900/60'
                    : 'border-sky-800/60 bg-sky-950/40 text-sky-300 hover:bg-sky-900/60'
            }`;
            botonCategorias.classList.toggle('hidden', !esHormiga && !window.esUsuarioEditor());

            if (esHormiga) renderHormigaApp();
            else renderGastoMensualApp();
        };

        window.cancelarEdicionGastoUnificado = function() {
            if (document.getElementById('tipoGastoUnificado').value === 'hormiga') {
                window.cancelarEdicionGastoHormiga();
            } else {
                window.cancelarEdicionGastoMensual();
            }
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
            actualizarNavegacionLateral(null, true);
            window.closeAppSidebarMobile();
            categoriasPanel.className = ['categorias', 'subcategorias'].includes(sectionName) ? 'w-full' : 'hidden';
            grupoPanel.className = sectionName === 'grupo' ? 'w-full' : 'hidden';
            document.getElementById('settingsCategoriasPanelContent').classList.toggle('hidden', sectionName !== 'categorias');
            document.getElementById('settingsSubcategoriasPanelContent').classList.toggle('hidden', sectionName !== 'subcategorias');
            document.getElementById('viewPlanilla').classList.add('hidden');
            document.getElementById('viewAnalisis').classList.add('hidden');
            document.getElementById('viewSaldos').classList.add('hidden');
            document.getElementById('viewGastos').classList.add('hidden');
            document.getElementById('viewSettings').classList.remove('hidden');

            ['categorias', 'subcategorias', 'grupo', 'perfil', 'notificaciones'].forEach(section => {
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
            } else if (sectionName === 'perfil') {
                window.renderPerfil();
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
