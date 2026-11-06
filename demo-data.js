(function() {
    const addMonths = (month, offset) => {
        const [year, monthNumber] = month.split('-').map(Number);
        const date = new Date(year, monthNumber - 1 + offset, 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    };

    const currentMonth = () => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    };

    function crearDatosDemo() {
        const mesActual = currentMonth();
        const primerMes = addMonths(mesActual, -11);
        const meses = Array.from({ length: 15 }, (_, index) => addMonths(primerMes, index));
        const gastos = [
            { id: 'demo-alquiler', concepto: 'Alquiler y expensas', monto: 580000, cuotas: 1, categoria: 'Gastos Fijo', subcategoriaId: 'sub_alquiler', startMonth: primerMes, vencimiento: `${primerMes}-10`, isRecurrente: true },
            { id: 'demo-servicios', concepto: 'Luz, gas y agua', monto: 92000, cuotas: 1, categoria: 'Servicios', subcategoriaId: 'sub_servicios_basicos', startMonth: primerMes, vencimiento: `${primerMes}-18`, isRecurrente: true },
            { id: 'demo-internet', concepto: 'Internet y telefonía', monto: 38000, cuotas: 1, categoria: 'Servicios', subcategoriaId: 'sub_conectividad', startMonth: primerMes, vencimiento: `${primerMes}-22`, isRecurrente: true },
            { id: 'demo-streaming', concepto: 'Streaming', monto: 14500, cuotas: 1, categoria: 'Servicios', subcategoriaId: 'sub_suscripciones', startMonth: primerMes, vencimiento: `${primerMes}-08`, isRecurrente: true }
        ];
        const categoriasPlanilla = [
            { nombre: 'Gastos Fijo', color: '#10b981', esTarjeta: false, vencimientoUnicoEnBloque: false },
            { nombre: 'Servicios', color: '#f97316', esTarjeta: false, vencimientoUnicoEnBloque: false },
            { nombre: 'Santander Visa', color: '#ef4444', esTarjeta: true, vencimientoUnicoEnBloque: true },
            { nombre: 'Ciudad Visa', color: '#3b82f6', esTarjeta: true, vencimientoUnicoEnBloque: true },
            { nombre: 'Mercado Pago', color: '#f59e0b', esTarjeta: true, vencimientoUnicoEnBloque: true },
            { nombre: 'Santander Amex', color: '#f97316', esTarjeta: true, vencimientoUnicoEnBloque: true }
        ];
        const subcategorias = [
            { id: 'sub_alquiler', nombre: 'Alquiler / Expensas', porcentajeAumento: 1.8 },
            { id: 'sub_servicios_basicos', nombre: 'Servicios Básicos (Luz/Gas/Agua)', porcentajeAumento: 2.4 },
            { id: 'sub_conectividad', nombre: 'Internet / Cable / Telefonía', porcentajeAumento: 1.2 },
            { id: 'sub_suscripciones', nombre: 'Streaming y Suscripciones', porcentajeAumento: 0.8 }
        ];
        const tarjetas = ['Santander Visa', 'Ciudad Visa', 'Mercado Pago', 'Santander Amex'];

        for (let index = 0; index < 12; index++) {
            const mes = meses[index];
            gastos.push({
                id: `demo-compra-${mes}`,
                concepto: ['Supermercado', 'Indumentaria', 'Farmacia', 'Combustible'][index % 4],
                monto: 42000 + index * 4800,
                cuotas: 1,
                categoria: tarjetas[index % tarjetas.length],
                startMonth: mes,
                vencimiento: `${mes}-15`
            });
            if (index % 2 === 0) {
                gastos.push({
                    id: `demo-cuotas-${mes}`,
                    concepto: ['Electrodoméstico', 'Muebles', 'Tecnología'][index % 3],
                    monto: 180000 + index * 12000,
                    cuotas: 6,
                    categoria: tarjetas[(index + 1) % tarjetas.length],
                    startMonth: mes,
                    vencimiento: `${mes}-20`
                });
            }
        }

        const gastosMensuales = [];
        const categoriasMensuales = ['Alimentación', 'Hogar', 'Transporte', 'Salud', 'Educación', 'Ocio', 'Otros'];
        const usuariosDemo = [
            { uid: 'demo-usuario-1', email: 'nico.demo@example.com' },
            { uid: 'demo-usuario-2', email: 'ana.demo@example.com' }
        ];
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const mes = meses[monthIndex];
            const cantidad = 5 + monthIndex % 3;
            for (let index = 0; index < cantidad; index++) {
                const dia = String(2 + index * 3).padStart(2, '0');
                const usuario = usuariosDemo[(monthIndex + index) % usuariosDemo.length];
                gastosMensuales.push({
                    id: `demo-gm-${mes}-${index}`,
                    fecha: `${mes}-${dia}`,
                    concepto: ['Compra semanal', 'Nafta', 'Farmacia', 'Cena', 'Servicio del hogar', 'Actividad'][index % 6],
                    categoria: categoriasMensuales[(monthIndex + index) % categoriasMensuales.length],
                    monto: Math.round((18000 + ((monthIndex * 7900 + index * 12300) % 95000)) / 100) * 100,
                    medioPago: ['Efectivo', 'Débito', 'Transferencia', 'Tarjeta'][index % 4],
                    usuarioUid: usuario.uid,
                    usuarioEmail: usuario.email
                });
            }
        }

        const saldosPorMesBanco = {};
        const saldosPorMesBilletera = {};
        meses.forEach((mes, index) => {
            saldosPorMesBanco[mes] = Math.round((720000 + index * 34000) / 1000) * 1000;
            saldosPorMesBilletera[mes] = Math.round((95000 + index * 6200) / 1000) * 1000;
        });

        const cuentasBancarias = [
            {
                id: 'demo-cuenta-principal',
                nombre: 'Cuenta principal',
                entidades: [
                    { id: 'demo-entidad-banco', nombre: 'Banco', saldosPorMes: saldosPorMesBanco },
                    { id: 'demo-entidad-caja', nombre: 'Ahorros', saldosPorMes: Object.fromEntries(meses.map((mes, index) => [mes, 280000 + index * 12000])) }
                ],
                categoriasAsociadas: ['Santander Visa', 'Ciudad Visa', 'Santander Amex'],
                gastosFijosAsociados: ['demo-alquiler', 'demo-servicios', 'demo-internet']
            },
            {
                id: 'demo-cuenta-digital',
                nombre: 'Billetera digital',
                entidades: [
                    { id: 'demo-entidad-mp', nombre: 'Mercado Pago', saldosPorMes: saldosPorMesBilletera }
                ],
                categoriasAsociadas: ['Mercado Pago'],
                gastosFijosAsociados: ['demo-streaming']
            }
        ];

        const gastosHormiga = [];
        const categoriasHormiga = ['Kiosco', 'Panadería', 'Ferretería', 'Cafetería', 'Supermercado Rápido', 'Transporte / Peaje', 'Propinas', 'Varios'];
        for (let monthIndex = 0; monthIndex < 12; monthIndex++) {
            const mes = meses[monthIndex];
            for (let index = 0; index < 7; index++) {
                const dia = String(3 + index * 4).padStart(2, '0');
                gastosHormiga.push({
                    id: `demo-gh-${mes}-${index}`,
                    concepto: ['Café', 'Algo para merendar', 'Kiosco', 'Viaje', 'Compra rápida', 'Propina', 'Pan'][index],
                    monto: 1600 + ((monthIndex * 390 + index * 710) % 6200),
                    fecha: `${mes}-${dia}`,
                    categoria: categoriasHormiga[(monthIndex + index) % categoriasHormiga.length],
                    medioPago: ['Efectivo', 'Débito', 'Mercado Pago'][index % 3]
                });
            }
        }

        const sueldoData = {};
        for (let index = 0; index < 15; index++) {
            const mes = meses[index];
            sueldoData[mes] = Math.round((1850000 * Math.pow(1.035, Math.floor(index / 3))) / 1000) * 1000;
        }
        const miembros = {
            'demo-usuario-1': { email: usuariosDemo[0].email, rol: 'admin' },
            'demo-usuario-2': { email: usuariosDemo[1].email, rol: 'editor' }
        };

        return {
            appState: {
                currentMonth: mesActual,
                chartRangeFrom: primerMes,
                chartRangeTo: addMonths(mesActual, 3),
                gastos,
                gastosMensuales,
                excepcionesMonto: {},
                excepcionesCategoria: {},
                excepcionesVencimiento: {},
                excepcionesVencimientoGrid: {},
                excepcionesEstado: {},
                excepcionesEliminacion: {},
                excepcionesEliminacionSoloMes: {},
                excepcionesMontoPagado: {},
                excepcionesMontoPagadoBloque: {},
                aumentosIndividuales: {},
                subcategorias,
                sueldos: sueldoData,
                cuentasBancarias,
                categorias: categoriasPlanilla,
                categoriasGastosMensuales: categoriasMensuales.map((nombre, index) => ({
                    nombre,
                    color: ['#10b981', '#8b5cf6', '#3b82f6', '#ef4444', '#06b6d4', '#f59e0b', '#64748b'][index]
                })),
                recurrentesPreferidos: [],
                sortColumn: 'concepto',
                sortAscending: true,
                grupoInfo: {
                    adminUid: 'demo-usuario-1',
                    miembros,
                    invitacionesPendientes: []
                }
            },
            hormigaState: {
                gastos: gastosHormiga,
                categorias: [
                    { nombre: 'Kiosco', color: '#f59e0b' },
                    { nombre: 'Panadería', color: '#d97706' },
                    { nombre: 'Ferretería', color: '#78716c' },
                    { nombre: 'Cafetería', color: '#b45309' },
                    { nombre: 'Supermercado Rápido', color: '#10b981' },
                    { nombre: 'Transporte / Peaje', color: '#3b82f6' },
                    { nombre: 'Propinas', color: '#ec4899' },
                    { nombre: 'Varios', color: '#64748b' }
                ],
                sortColumn: 'fecha',
                sortAscending: false,
                filtrosCategorias: [],
                filtrosHormigaCatGrafico: []
            }
        };
    }

    function esControlDeNavegacion(elemento) {
        if (elemento.hasAttribute('data-demo-allow')) return true;
        if (elemento.id === 'chartMonthFrom' || elemento.id === 'chartMonthTo' || elemento.id === 'tipoGastoUnificado') return true;
        if (elemento.matches('input[type="checkbox"]') && elemento.closest('[id^="containerFiltros"]')) return true;
        if (elemento.matches('button') && elemento.closest('[id^="containerFiltros"]')) return true;
        if (elemento.matches('button') && /expandirGraficoModal|marcarTodas|marcarTodos|applyCustomMonthRange|resetDefaultMonthRange|toggleFiltro|filtrarGastosMensuales|toggleCategoriaAcordeon|sort/.test(elemento.getAttribute('onclick') || '')) return true;
        if (elemento.matches('button') && /closeModal|cerrarModal|cerrarGrafico|cerrarModalGrafico/.test(elemento.getAttribute('onclick') || '')) return true;
        return false;
    }

    function aplicarModoSoloLectura() {
        if (!window.demoModeActive) return;
        const appContent = document.getElementById('appContent');
        if (!appContent) return;
        appContent.querySelectorAll('button, input, select, textarea').forEach(elemento => {
            elemento.disabled = !esControlDeNavegacion(elemento);
        });
        const selectorVistas = document.getElementById('selectorVista');
        if (selectorVistas) selectorVistas.disabled = true;
    }

    window.actualizarVisibilidadDemoLocal = function() {
        const boton = document.getElementById('btnModoDemo');
        const email = window.auth?.currentUser?.email?.trim().toLowerCase();
        const esAdmin = email === 'nicolaslmancuso@gmail.com' && !window.demoModeActive;
        const seccion = document.getElementById('seccionDatosDemo');
        seccion?.classList.toggle('hidden', !esAdmin);
        boton?.classList.toggle('hidden', !esAdmin);
    };

    window.toggleModoDemoLocal = function() {
        if (window.demoModeActive) {
            window.location.reload();
            return;
        }
        const email = window.auth?.currentUser?.email?.trim().toLowerCase();
        if (email !== 'nicolaslmancuso@gmail.com') {
            window.mostrarMensajeApp?.('Acceso restringido', 'El modo demo está disponible únicamente para el administrador.', 'error');
            window.actualizarVisibilidadDemoLocal();
            return;
        }
        if (!window.appState || !window.hormigaState) {
            window.mostrarMensajeApp?.('Demo no disponible', 'Esperá a que termine de cargar la aplicación e intentá nuevamente.', 'error');
            return;
        }

        const demo = crearDatosDemo();
        window.demoModeActive = true;
        window.appState = demo.appState;
        window.hormigaState = demo.hormigaState;
        window.filtrosTemporales = [];
        window.filtrosGraficoTotales = [];
        window.filtrosGraficoEvolCat = [];
        window.filtrosGraficoEvolSubcat = [];
        window.filtrosGraficoBalance = [];
        window.filtrosRecurrentesGrid = [];

        const banner = document.getElementById('bannerModoDemo');
        if (banner) banner.classList.remove('hidden');
        window.actualizarVisibilidadDemoLocal();
        const grupoStatus = document.getElementById('grupoStatus');
        if (grupoStatus) grupoStatus.textContent = 'Modo demo local · dos perfiles simulados';
        const syncStatus = document.getElementById('textoSincronizacion');
        if (syncStatus) syncStatus.textContent = 'Solo local';
        const syncIndicator = document.getElementById('indicadorSincronizacion');
        if (syncIndicator) syncIndicator.className = 'w-2 h-2 rounded-full bg-violet-400';
        const selectorVistas = document.getElementById('selectorVista');
        if (selectorVistas) selectorVistas.disabled = true;

        window.marcarTodosFiltros(true);
        window.marcarTodosHormiga(true);
        window.marcarTodasCategoriasTablaGastoMensual(true);
        window.marcarTodasCategoriasGastoMensual(true);
        window.switchTab('planilla');
        window.renderApp();
        aplicarModoSoloLectura();
    };

    const observer = new MutationObserver(() => {
        window.actualizarVisibilidadDemoLocal();
        if (window.demoModeActive) setTimeout(aplicarModoSoloLectura, 0);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.actualizarVisibilidadDemoLocal();
})();
