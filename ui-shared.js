        // ---------------- SCRIPT GASTOS HORMIGA ----------------
        const categoriasHormigaDefault = [ { nombre: "Kiosco", color: "#f59e0b" }, { nombre: "Panadería", color: "#d97706" }, { nombre: "Ferretería", color: "#78716c" }, { nombre: "Cafetería", color: "#b45309" }, { nombre: "Supermercado Rápido", color: "#10b981" }, { nombre: "Transporte / Peaje", color: "#3b82f6" }, { nombre: "Propinas", color: "#ec4899" }, { nombre: "Varios", color: "#64748b" } ];
        let chartInstHormigaCat = null; let chartInstHormigaEvol = null; let chartInstHormigaEvolCat = null;

        function obtenerFechaLocalParaInput(fecha = new Date()) {
            const año = fecha.getFullYear();
            const mes = String(fecha.getMonth() + 1).padStart(2, '0');
            const dia = String(fecha.getDate()).padStart(2, '0');
            return `${año}-${mes}-${dia}`;
        }

        function updateOrCreateChart(instance, canvas, config) {
            if (!canvas) return instance;
            if (instance && instance.canvas === canvas) {
                instance.data = config.data;
                instance.options = config.options;
                instance.update('none');
                return instance;
            }
            if (instance) instance.destroy();
            return new Chart(canvas, config);
        }
