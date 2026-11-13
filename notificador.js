import { cert, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import {
    calcularAlertasPorDestinatario,
    escaparHtml,
    formatearMonto,
    reconstruirMiembrosEspacio,
    obtenerFechaArgentina
} from './notificador-calculos.mjs';

function requiredEnv(name) {
    const value = process.env[name]?.trim();
    if (!value) throw new Error(`Falta configurar la variable ${name}.`);
    return value;
}

function inicializarFirestore() {
    let serviceAccount;
    try {
        serviceAccount = JSON.parse(requiredEnv('FIREBASE_SERVICE_ACCOUNT'));
    } catch (error) {
        if (error instanceof SyntaxError) {
            throw new Error('FIREBASE_SERVICE_ACCOUNT no contiene un JSON válido.', { cause: error });
        }
        throw error;
    }

    const configuredProjectId = requiredEnv('FIREBASE_PROJECT_ID');
    if (serviceAccount.project_id !== configuredProjectId) {
        throw new Error('La cuenta de servicio no pertenece al proyecto de Firebase configurado.');
    }
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
        throw new Error('FIREBASE_SERVICE_ACCOUNT no incluye client_email y private_key.');
    }

    const app = initializeApp({
        credential: cert(serviceAccount),
        projectId: configuredProjectId
    });
    return getFirestore(app);
}

async function obtenerEspaciosConMiembros(db) {
    const [espaciosSnapshot, invitacionesSnapshot] = await Promise.all([
        db.collection('app_data').get(),
        db.collection('invitaciones').get()
    ]);
    const invitacionesPorGrupo = new Map();
    invitacionesSnapshot.forEach(snapshot => {
        const invitacion = snapshot.data();
        if (typeof invitacion.grupoId !== 'string') return;
        const invitaciones = invitacionesPorGrupo.get(invitacion.grupoId) || [];
        invitaciones.push(invitacion);
        invitacionesPorGrupo.set(invitacion.grupoId, invitaciones);
    });

    const espacios = [];
    for (const documento of espaciosSnapshot.docs) {
        const appState = documento.data()?.appState;
        if (!appState || !Array.isArray(appState.gastos)) {
            throw new Error(`El espacio "${documento.id}" no contiene una lista válida de gastos.`);
        }

        const grupoInfo = appState.grupoInfo && typeof appState.grupoInfo === 'object'
            ? appState.grupoInfo
            : {};
        const miembrosActuales = grupoInfo.miembros && typeof grupoInfo.miembros === 'object' && !Array.isArray(grupoInfo.miembros)
            ? { ...grupoInfo.miembros }
            : {};
        const adminUid = typeof grupoInfo.adminUid === 'string' ? grupoInfo.adminUid : '';

        const miembros = reconstruirMiembrosEspacio(
            miembrosActuales,
            invitacionesPorGrupo.get(documento.id) || [],
            adminUid
        );

        if (Object.keys(miembros).length === 0) {
            console.warn(`Se omite el espacio "${documento.id}": no se pudieron identificar miembros actuales.`);
            continue;
        }

        espacios.push({
            id: documento.id,
            appState: { ...appState, grupoInfo: { ...grupoInfo, miembros } }
        });
    }

    return espacios;
}

function crearHtmlAlerta(items, total, hoy) {
    const listaGastosHtml = items.map(item => {
        const estadoBadge = item.vencimiento < hoy
            ? { texto: '¡VENCIDO!', color: '#991b1b' }
            : item.vencimiento === hoy
                ? { texto: 'VENCE HOY', color: '#e11d48' }
                : { texto: 'VENCE MAÑANA', color: '#f59e0b' };
        const concepto = item.esTarjeta ? `💳 ${item.concepto}` : item.concepto;
        const vencimiento = item.vencimiento.split('-').reverse().join('/');
        const espacioHtml = item.espacio
            ? `<div style="font-size: 11px; color: #64748b; margin-top: 3px;">Espacio: ${escaparHtml(item.espacio)}</div>`
            : '';

        return `
            <div style="padding: 15px 5px 15px 0; border-bottom: 1px solid #eaeaea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div style="padding-right: 10px;">
                        <strong style="font-size: 15px; color: #111;">${escaparHtml(concepto)}</strong>
                        <div style="font-size: 12px; color: #666; margin-top: 3px;">
                            ${item.esTarjeta ? 'Categoría agrupada' : `Categoría: ${escaparHtml(item.categoria)}`} | Vence: ${vencimiento}
                        </div>
                        ${espacioHtml}
                    </div>
                    <div style="text-align: right; min-width: 120px; padding-right: 10px;">
                        <div style="font-size: 15px; font-weight: bold; color: #111;">$${formatearMonto(item.monto)}</div>
                        <span style="display: inline-block; background-color: ${estadoBadge.color}; color: white; font-size: 9px; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-top: 4px;">
                            ${estadoBadge.texto}
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    return `
        <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                <div style="background-color: #0f172a; padding: 25px; text-align: center; color: white;">
                    <div style="font-size: 24px; margin-bottom: 6px;">🔔</div>
                    <h2 style="margin: 0; font-size: 20px; font-weight: bold;">Alerta de Vencimientos</h2>
                    <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8;">Incluye solo saldos pendientes vencidos, de hoy y de mañana</p>
                </div>
                <div style="background-color: #1e293b; padding: 15px 25px; display: flex; justify-content: space-around; color: white; text-align: center;">
                    <div>
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Total pendiente</div>
                        <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #38bdf8;">$${formatearMonto(total)}</div>
                    </div>
                    <div style="border-left: 1px solid #334155; padding-left: 20px;">
                        <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase;">Alertas</div>
                        <div style="font-size: 18px; font-weight: bold; margin-top: 4px; color: #f43f5e;">${items.length} ítem(s)</div>
                    </div>
                </div>
                <div style="padding: 25px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 13px; color: #334155; text-transform: uppercase;">Detalle de vencimientos</h4>
                    <div>${listaGastosHtml}</div>
                </div>
            </div>
        </div>
    `;
}

async function enviarAlertas() {
    const db = inicializarFirestore();
    const espacios = await obtenerEspaciosConMiembros(db);

    const today = obtenerFechaArgentina();
    const recipients = calcularAlertasPorDestinatario(espacios, today);
    const totalAlerts = recipients.reduce((total, recipient) => total + recipient.alerts.length, 0);
    if (totalAlerts === 0) {
        console.log('No hay saldos pendientes vencidos, de hoy ni de mañana.');
        return;
    }

    if (process.env.ENVIAR_CORREO !== 'true') {
        console.log(`Prueba sin envío: ${totalAlerts} alerta(s) para ${recipients.length} usuario(s). No se envió ningún correo.`);
        return;
    }

    const emailJsPublicKey = requiredEnv('EMAILJS_PUBLIC_KEY');
    const emailJsPrivateKey = requiredEnv('EMAILJS_PRIVATE_KEY');
    const emailJsTemplateId = requiredEnv('EMAILJS_ALERTS_TEMPLATE_ID');
    const emailJsServiceId = process.env.EMAILJS_SERVICE_ID?.trim() || 'service_hib3aln';
    const erroresEnvio = [];
    for (const [index, recipient] of recipients.entries()) {
        const total = Math.round(recipient.alerts.reduce((sum, item) => sum + item.monto, 0) * 100) / 100;
        try {
            const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: emailJsServiceId,
                    template_id: emailJsTemplateId,
                    user_id: emailJsPublicKey,
                    accessToken: emailJsPrivateKey,
                    template_params: {
                        to_email: recipient.email,
                        subject: `🚨 Alerta de Pagos: $${formatearMonto(total)} pendientes/vencidos`,
                        html_content: crearHtmlAlerta(recipient.alerts, total, today)
                    }
                })
            });

            if (!response.ok) {
                const detalle = (await response.text()).trim();
                const detalleSeguro = detalle.toLowerCase().includes(recipient.email.toLowerCase())
                    ? 'El proveedor incluyó el destinatario en el detalle del error.'
                    : detalle.slice(0, 200);
                throw new Error(`EmailJS respondió HTTP ${response.status}${detalleSeguro ? `: ${detalleSeguro}` : '.'}`);
            }
        } catch (error) {
            const mensaje = error instanceof Error ? error.message : 'Error desconocido';
            const mensajeSinCorreo = mensaje.split(recipient.email).join('[destinatario]');
            console.error(`Falló el envío individual #${index + 1}: ${mensajeSinCorreo}`);
            erroresEnvio.push(index + 1);
        }
    }

    if (erroresEnvio.length > 0) {
        throw new Error(`Falló el envío de ${erroresEnvio.length} de ${recipients.length} correos.`);
    }
    console.log(`EmailJS aceptó ${recipients.length} correos individuales con ${totalAlerts} alerta(s).`);
}

enviarAlertas().catch(error => {
    console.error('Falló la ejecución del notificador:', error);
    process.exitCode = 1;
});
