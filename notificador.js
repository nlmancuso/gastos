import { Resend } from 'resend';
import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const resend = new Resend(process.env.RESEND_API_KEY);

const firebaseConfig = {
    apiKey: "AIzaSyDwRTcVpwoHJfTZ-eUr5ileTks5LN-npOE",
    authDomain: "gastos-334ff.firebaseapp.com",
    projectId: "gastos-334ff",
    storageBucket: "gastos-334ff.firebasestorage.app",
    messagingSenderId: "140017165186",
    appId: "1:140017165186:web:2b6d7d57896696bef3a59b"
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

function normalizarFecha(fechaStr) {
    if (!fechaStr) return '';
    fechaStr = String(fechaStr).trim();
    if (fechaStr.includes('/')) {
        const partes = fechaStr.split('/');
        if (partes.length === 3) {
            let [d, m, y] = partes;
            if (y.length === 2) y = '20' + y;
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
        }
    }
    return fechaStr;
}

function obtenerFechasHoyMañana() {
    const hoyDate = new Date();
    const hoyStr = hoyDate.toISOString().slice(0, 10);

    const manianaDate = new Date();
    manianaDate.setDate(hoyDate.getDate() + 1);
    const manianaStr = manianaDate.toISOString().slice(0, 10);

    return { hoyStr, manianaStr };
}

async function enviarAlertas() {
    try {
        console.log("Conectando a Firebase para extracción sincronizada de tarjetas y gastos...");
        const grupoId = "grupo_mancusososa";
        const docRef = doc(db, "app_data", grupoId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.error("Error: No se encontraron datos para el grupo en Firebase.");
            process.exit(1);
        }

        const dataApp = docSnap.data();
        const appState = dataApp.appState || {};
        const gastosRegistrados = appState.gastos || [];
        const categoriasConfig = appState.categorias || [];
        const excepcionesVencGrid = appState.excepcionesVencimientoGrid || {};
        const excepcionesVenc = appState.excepcionesVencimiento || {};
        const vencimientosTarjetas = appState.vencimientosTarjetas || {};

        const targetMonth = new Date().toISOString().slice(0, 7);
        const { hoyStr, manianaStr } = obtenerFechasHoyMañana();

        let esTarjetaMap = {};
        categoriasConfig.forEach(c => {
            const nombreCat = c.nombre || c;
            esTarjetaMap[nombreCat] = c.esTarjeta ?? false;
        });

        let itemsCalculados = [];

        // 1. Procesar gastos de la lista principal
        gastosRegistrados.forEach(gasto => {
            const startYM = gasto.startMonth || targetMonth;
            if (targetMonth >= startYM) {
                const gridKey = `${gasto.id}_${targetMonth}`;
                let vencimientoCrudo = excepcionesVencGrid[gridKey] 
                    || excepcionesVenc[gridKey] 
                    || gasto.vencimiento 
                    || gasto.fechaVencimiento 
                    || '';

                let vencimientoFinal = normalizarFecha(vencimientoCrudo);
                const catNombre = gasto.categoria || 'Otros';
                const esTarjeta = esTarjetaMap[catNombre] ?? false;
                const monto = parseFloat(gasto.monto) || 0;

                if (!esTarjeta && (vencimientoFinal === hoyStr || vencimientoFinal === manianaStr)) {
                    itemsCalculados.push({
                        concepto: gasto.concepto || catNombre,
                        monto: monto,
                        categoria: catNombre,
                        vencimiento: vencimientoFinal,
                        esTarjeta: false,
                        estadoBadge: vencimientoFinal === hoyStr ? 'VENCE HOY' : 'VENCE MAÑANA',
                        badgeColor: vencimientoFinal === hoyStr ? '#e11d48' : '#f59e0b'
                    });
                }
            }
        });

        // 2. Procesar tarjetas agrupadas
        let totalesPorTarjeta = {};
        let fechasTarjetas = {};

        categoriasConfig.forEach(cat => {
            const catNombre = cat.nombre || cat;
            if (cat.esTarjeta || esTarjetaMap[catNombre]) {
                let vencTarjetaCrudo = vencimientosTarjetas[catNombre] 
                    || vencimientosTarjetas[`${catNombre}_${targetMonth}`] 
                    || cat.vencimiento 
                    || cat.vencimientoHabitual 
                    || '';
                
                fechasTarjetas[catNombre] = normalizarFecha(vencTarjetaCrudo);
                totalesPorTarjeta[catNombre] = 0;
            }
        });

        gastosRegistrados.forEach(gasto => {
            const startYM = gasto.startMonth || targetMonth;
            if (targetMonth >= startYM) {
                const catNombre = gasto.categoria || '';
                if (totalesPorTarjeta[catNombre] !== undefined) {
                    totalesPorTarjeta[catNombre] += parseFloat(gasto.monto) || 0;
                }
            }
        });

        Object.keys(totalesPorTarjeta).forEach(catNombre => {
            const montoTotalCat = totalesPorTarjeta[catNombre];
            let vencFinalCat = fechasTarjetas[catNombre];

            if (!vencFinalCat) {
                gastosRegistrados.forEach(g => {
                    if (g.categoria === catNombre) {
                        const gridKey = `${g.id}_${targetMonth}`;
                        let vItem = excepcionesVencGrid[gridKey] || excepcionesVenc[gridKey] || g.vencimiento || '';
                        if (vItem) vencFinalCat = normalizarFecha(vItem);
                    }
                });
            }

            if (montoTotalCat > 0 && (vencFinalCat === hoyStr || vencFinalCat === manianaStr)) {
                itemsCalculados.push({
                    concepto: `💳 Tarjeta: ${catNombre}`,
                    monto: montoTotalCat,
                    categoria: catNombre,
                    vencimiento: vencFinalCat,
                    esTarjeta: true,
                    estadoBadge: vencFinalCat === hoyStr ? 'VENCE HOY' : 'VENCE MAÑANA',
                    badgeColor: vencFinalCat === hoyStr ? '#e11d48' : '#f59e0b'
                });
            }
        });

        if (itemsCalculados.length === 0) {
            console.log("No hay vencimientos exactos para hoy ni para mañana.");
            return;
        }

        const rawEmailTo = process.env.EMAIL_TO || '';
        const destinatarios = rawEmailTo.split(/[,;]/).map(email => email.trim()).filter(Boolean);

        const montoTotalGeneral = itemsCalculados.reduce((acc, item) => acc + item.monto, 0);
        const cantidadUrgentes = itemsCalculados.length;

        // Se agregó un padding-right de 15px en el contenedor derecho para separarlo del borde
        const listaGastosHtml = itemsCalculados.map(item => `
            <div style="padding: 15px 5px 15px 0; border-bottom: 1px solid #eaeaea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="padding-right: 10px;">
                        <strong style="font-size: 15px; color: #111;">${item.concepto}</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 3px;">
                            ${item.esTarjeta ? 'Categoría Agrupada' : `Categoría: ${item.categoria}`} | Vence: ${item.vencimiento ? item.vencimiento.split('-').reverse().join('/') : 'Sin fecha'}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 120px; padding-right: 10px;">
                        <div style="font-size: 15px; font-weight: bold; color: #111;">$${item.monto.toLocaleString('es-AR')}</div>
                        <span style="display: inline-block; background-color: ${item.badgeColor}; color: white; font-size: 9px; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-top: 4px;">
                            ${item.estadoBadge}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        const contenidoHtml = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #0f172a; padding: 25px; text-align: center; color: white;">
                        <div style="font-size: 24px; margin-bottom: 6px;">🔔</div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Alerta de Vencimientos</h2>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Vencimientos para hoy y mañana</p>
                    </div>
                    <div style="background-color: #1e293b; padding: 15px 25px; display: flex; justify-content: space-around; color: white; text-align: center;">
                        <div>
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Total a Pagar</div>
                            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #38bdf8;">$${montoTotalGeneral.toLocaleString('es-AR')}</div>
                        </div>
                        <div style="border-left: 1px solid #334155; padding-left: 20px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Vencimientos</div>
                            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #f43f5e;">${cantidadUrgentes} alerta(s)</div>
                        </div>
                    </div>
                    <div style="padding: 25px;">
                        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #334155; text-transform: uppercase;">Detalle Urgente</h4>
                        <div>${listaGastosHtml}</div>
                    </div>
                </div>
            </div>
        `;

        await resend.emails.send({
            from: 'Control de Gastos <onboarding@resend.dev>',
            to: destinatarios.length > 0 ? destinatarios : ['delivered@resend.dev'],
            subject: `🚨 Alerta de Pagos: $${montoTotalGeneral.toLocaleString('es-AR')} vencen hoy/mañana`,
            html: contenidoHtml
        });

        console.log("Correo de alerta enviado exitosamente con diseño ajustado.");
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        process.exit(1);
    }
}

enviarAlertas();
