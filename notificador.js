import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarAlertas() {
    try {
        console.log("Iniciando verificación de vencimientos...");

        // Aquí definimos los gastos próximos a vencer (puedes ajustarlos o leerlos de tu estructura)
        const gastosPorVencer = [
            {
                nombre: 'Supermercado',
                monto: 600000,
                categoria: 'Gastos Fijo',
                fechaVencimiento: '2026-10-24',
                estadoBadge: 'VENCE MAÑANA',
                badgeColor: '#f59e0b' // Ambar
            },
            {
                nombre: 'Prueba Fecha',
                monto: 25000,
                categoria: 'Gastos Fijo',
                fechaVencimiento: '2026-10-23',
                estadoBadge: 'VENCE HOY',
                badgeColor: '#e11d48' // Rojo
            }
        ];

        // Procesar destinatarios (soporta comas o puntos y comas)
        const rawEmailTo = process.env.EMAIL_TO || '';
        const destinatarios = rawEmailTo.split(/[,;]/).map(email => email.trim()).filter(Boolean);

        if (destinatarios.length === 0) {
            console.error("Error: No hay destinatarios configurados.");
            process.exit(1);
        }

        // Generar el HTML de la lista de gastos detallados
        const listaGastosHtml = gastosPorVencer.map(gasto => `
            <div style="padding: 15px 0; border-bottom: 1px solid #eaeaea;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <strong style="font-size: 16px; color: #111;">${gasto.nombre}</strong>
                        <div style="font-size: 13px; color: #666; margin-top: 4px;">
                            Categoría: ${gasto.categoria} | Fecha: ${gasto.fechaVencimiento}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 16px; font-weight: bold; color: #111;">$${gasto.monto.toLocaleString('es-AR')}</div>
                        <span style="display: inline-block; background-color: ${gasto.badgeColor}; color: white; font-size: 10px; font-weight: bold; padding: 3px 8px; border-radius: 4px; margin-top: 4px;">
                            ${gasto.estadoBadge}
                        </span>
                    </div>
                </div>
            </div>
        `).join('');

        // Armado del correo con el diseño oscuro elegante
        const contenidoHtml = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f4f5; padding: 30px; color: #333;">
                <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
                    
                    <!-- Encabezado oscuro -->
                    <div style="background-color: #0f172a; padding: 30px; text-align: center; color: white;">
                        <div style="font-size: 28px; margin-bottom: 8px;">🔔</div>
                        <h2 style="margin: 0; font-size: 22px; font-weight: bold;">Alerta de Vencimientos</h2>
                        <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Tienes pagos pendientes próximos a vencer</p>
                    </div>

                    <!-- Cuerpo -->
                    <div style="padding: 30px;">
                        <p style="font-size: 14px; color: #475569; margin-top: 0;">El sistema ha detectado los siguientes movimientos que requieren tu atención:</p>
                        
                        <div style="margin-top: 20px;">
                            ${listaGastosHtml}
                        </div>
                    </div>

                </div>
            </div>
        `;

        // Envío a través de Resend con la lista de destinatarios
        const data = await resend.emails.send({
            from: 'Control de Gastos <onboarding@resend.dev>',
            to: destinatarios,
            subject: `⚠️ Alertas de Vencimiento de Gastos - ${gastosPorVencer.length} pendiente(s)`,
            html: contenidoHtml
        });

        console.log("Correo enviado exitosamente:", data);
    } catch (error) {
        console.error("Error al enviar el correo:", error);
        process.exit(1);
    }
}

enviarAlertas();
