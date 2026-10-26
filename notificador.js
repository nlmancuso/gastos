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

function sumarUnMesAFecha(fechaStr) {
    if (!fechaStr) return '';
    const partes = fechaStr.split('-');
    if (partes.length !== 3) return '';
    let y = parseInt(partes[0]);
    let m = parseInt(partes[1]);
    let d = parseInt(partes[2]);
    m += 1;
    if (m > 12) { m = 1; y += 1; }
    const ultimoDiaMes = new Date(y, m, 0).getDate();
    if (d > ultimoDiaMes) d = ultimoDiaMes;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
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
        console.log("Conectando a Firebase para calcular vencimientos reales...");
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

        const targetMonth = new Date().toISOString().slice(0, 7);
        const { hoyStr, manianaStr } = obtenerFechasHoyMañana();

        let esTarjetaMap = {};
        categoriasConfig.forEach(c => {
            esTarjetaMap[c.nombre] = c.esTarjeta ?? true;
        });

        // Replicamos el motor de cálculo de la web para obtener los ítems del mes con sus vencimientos reales
        let itemsCalculados = [];
        gastosRegistrados.forEach(gasto => {
            const startYM = gasto.startMonth || targetMonth;
            if (targetMonth >= startYM) {
                const totalCuotas = parseInt(gasto.cuotas) || 1;
                const baseEsFijo = (gasto.categoria || '').toLowerCase().includes('fijo') || (gasto.categoria || '').toLowerCase().includes('servicio');
                const isRecurrente = gasto.isRecurrente || baseEsFijo;

                let vencCalculado = gasto.vencimiento || '';
                
                if (isRecurrente && startYM !== targetMonth) {
                    const [sY, sM] = startYM.split('-').map(Number);
                    const [tY, tM] = targetMonth.split('-').map(Number);
                    const diffMeses = (tY - sY) * 12 + (tM - sM);
                    for (let step = 0; step < diffMeses; step++) {
                        vencCalculado = sumarUnMesAFecha(vencCalculado);
                    }
                }

                const gridKey = `${gasto.id}_${targetMonth}`;
                let vencimientoFinal = excepcionesVencGrid[gridKey] !== undefined 
                    ? excepcionesVencGrid[gridKey] 
                    : (excepcionesVenc[gridKey] !== undefined ? excepcionesVenc[gridKey] : vencCalculado);

                const catNombre = gasto.categoria || 'Otros';
                const esTarjeta = esTarjetaMap[catNombre] ?? true;
                const monto = parseFloat(gasto.monto) || 0;

                if (vencimientoFinal === hoyStr || vencimientoFinal === manianaStr) {
                    itemsCalculados.push({
                        concepto: gasto.concepto,
                        monto: monto,
                        categoria: catNombre,
                        vencimiento: vencimientoFinal,
                        esTarjeta: esTarjeta,
                        estadoBadge: vencimientoFinal === hoyStr ? 'VENCE HOY' : 'VENCE MAÑANA',
                        badgeColor: vencimientoFinal === hoyStr ? '#e11d48' : '#f59e0b'
                    });
                }
            }
        });

        // Agrupamos las tarjetas en bloque tal como lo pediste
        let resumenFinalList = [];
        let tarjetasAgrupadas = {};

        itemsCalculados.forEach(item => {
            if (item.esTarjeta) {
                if (!tarjetasAgrupadas[item.categoria]) {
                    tarjetasAgrupadas[item.categoria] = {
                        nombre: item.categoria,
                        monto: 0,
                        vencimiento: item.vencimiento,
                        estadoBadge: item.estadoBadge,
                        badgeColor: item.badgeColor,
                        esTarjeta: true
                    };
                }
                tarjetasAgrupadas[item.categoria].monto += item.monto;
            } else {
                resumenFinalList.push(item);
            }
        });

        Object.values(tarjetasAgrupadas).forEach(tarjeta => {
            resumenFinalList.push(tarjeta);
        });

        if (resumenFinalList.length === 0) {
            console.log("No hay vencimientos para hoy ni para mañana según el motor de cálculo.");
            return;
        }

        const rawEmailTo = process.env.EMAIL_TO || '';
        const destinatarios = rawEmailTo.split(/[,;]/).map(email => email.trim()).filter(Boolean);

        const montoTotal = resumenFinalList.reduce((acc, item) => acc + item.monto, 0);
        const cantidadUrgentes = resumenFinalList.length;

        const listaGastosHtml = resumenFinalList.map(item => `
            <div style="padding: 15px 0; border-bottom: 1px solid #eaeaea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 15px; color: #111;">${item.esTarjeta ? `💳 Tarjeta / Bloque: ${item.nombre}` : item.concepto}</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 3px;">
                            ${item.esTarjeta ? 'Categoría Agrupada' : `Categoría: ${item.categoria}`} | Vence: ${item.vencimiento.split('-').reverse().join('/')}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 15px; font-weight: bold; color: #111;">$${item.monto.toLocaleString('es-AR')}</div>
                        <span style="display: inline-block; background-color: ${item.badgeColor}; color: white; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-top: 3px;">
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
                            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #38bdf8;">$${montoTotal.toLocaleString('es-AR')}</div>
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
            subject: `🚨 Alerta de Pagos: $${montoTotal.toLocaleString('es-AR')} vencen hoy/mañana`,
            html: contenidoHtml
        });

        console.log("Correo de alerta enviado exitosamente con datos reales.");
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        process.exit(1);
    }
}

enviarAlertas();
