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

async function enviarAlertas() {
    try {
        console.log("Conectando a Firebase para obtener datos actualizados...");
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

        const mesActual = new Date().toISOString().slice(0, 7);
        console.log(`Procesando gastos vigentes para el mes: ${mesActual}`);

        // Simulamos o filtramos los ítems activos del mes actual desde Firebase
        let gastosPorVencer = [];
        gastosRegistrados.forEach(gasto => {
            const startYM = gasto.startMonth || mesActual;
            if (mesActual >= startYM) {
                let badge = 'PENDIENTE';
                let color = '#3b82f6';
                
                if (gasto.vencimiento) {
                    const hoy = new Date().toISOString().slice(0, 10);
                    if (gasto.vencimiento < hoy) {
                        badge = 'VENCIDO';
                        color = '#e11d48';
                    } else if (gasto.vencimiento === hoy) {
                        badge = 'VENCE HOY';
                        color = '#f59e0b';
                    }
                }

                gastosPorVencer.push({
                    nombre: gasto.concepto,
                    monto: parseFloat(gasto.monto) || 0,
                    categoria: gasto.categoria || 'Otros',
                    fechaVencimiento: gasto.vencimiento || 'Sin fecha',
                    estadoBadge: badge,
                    badgeColor: color
                });
            }
        });

        if (gastosPorVencer.length === 0) {
            console.log("No hay gastos activos para reportar en este periodo.");
            return;
        }

        const rawEmailTo = process.env.EMAIL_TO || '';
        const destinatarios = rawEmailTo.split(/[,;]/).map(email => email.trim()).filter(Boolean);

        if (destinatarios.length === 0) {
            console.error("Error: No hay destinatarios configurados.");
            process.exit(1);
        }

        const montoTotal = gastosPorVencer.reduce((acc, gasto) => acc + gasto.monto, 0);
        const cantidadUrgentes = gastosPorVencer.filter(g => g.estadoBadge.includes('HOY') || g.estadoBadge.includes('VENCIDO')).length;

        const categoriasMap = {};
        gastosPorVencer.forEach(g => {
            categoriasMap[g.categoria] = (categoriasMap[g.categoria] || 0) + g.monto;
        });

        const listaGastosHtml = gastosPorVencer.map(gasto => `
            <div style="padding: 15px 0; border-bottom: 1px solid #eaeaea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 15px; color: #111;">${gasto.nombre}</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 3px;">
                            Categoría: ${gasto.categoria} | Vence: ${gasto.fechaVencimiento}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 15px; font-weight: bold; color: #111;">$${gasto.monto.toLocaleString('es-AR')}</div>
                        <span style="display: inline-block; background-color: ${gasto.badgeColor}; color: white; font-size: 9px; font-weight: bold; padding: 2px 6px; border-radius: 4px; margin-top: 3px;">
                            ${gasto.estadoBadge}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        const barrasCategoriasHtml = Object.entries(categoriasMap).map(([cat, totalCat]) => {
            const porcentaje = montoTotal > 0 ? Math.round((totalCat / montoTotal) * 100) : 0;
            return `
                <div style="margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; font-size: 12px; color: #475569; margin-bottom: 4px;">
                        <span>${cat}</span>
                        <span>$${totalCat.toLocaleString('es-AR')} (${porcentaje}%)</span>
                    </div>
                    <div style="background: #e2e8f0; border-radius: 4px; height: 8px; width: 100%; overflow: hidden;">
                        <div style="background: #3b82f6; height: 8px; width: ${porcentaje}%; border-radius: 4px;"></div>
                    </div>
                </div>
            `;
        }).join('');

        const contenidoHtml = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    <div style="background-color: #0f172a; padding: 25px; text-align: center; color: white;">
                        <div style="font-size: 24px; margin-bottom: 6px;">🔔</div>
                        <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Reporte de Vencimientos</h2>
                        <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Estado actualizado de tus finanzas</p>
                    </div>
                    <div style="background-color: #1e293b; padding: 15px 25px; display: flex; justify-content: space-around; color: white; text-align: center;">
                        <div>
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Total a Pagar</div>
                            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #38bdf8;">$${montoTotal.toLocaleString('es-AR')}</div>
                        </div>
                        <div style="border-left: 1px solid #334155; padding-left: 20px;">
                            <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Pagos Urgentes</div>
                            <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #f43f5e;">${cantidadUrgentes} pendiente(s)</div>
                        </div>
                    </div>
                    <div style="padding: 25px;">
                        <div style="margin-bottom: 25px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <h4 style="margin: 0 0 12px 0; font-size: 13px; color: #334155; text-transform: uppercase;">Distribución por Categoría</h4>
                            ${barrasCategoriasHtml}
                        </div>
                        <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #334155; text-transform: uppercase;">Detalle de Movimientos</h4>
                        <div>${listaGastosHtml}</div>
                    </div>
                </div>
            </div>
        `;

        const data = await resend.emails.send({
            from: 'Control de Gastos <onboarding@resend.dev>',
            to: destinatarios,
            subject: `📊 Reporte Financiero: $${montoTotal.toLocaleString('es-AR')} por vencer`,
            html: contenidoHtml
        });

        console.log("Correo enviado exitosamente:", data);
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        process.exit(1);
    }
}

enviarAlertas();
