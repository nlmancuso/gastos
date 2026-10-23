import { Resend } from 'resend';

// Inicializar Resend con la API Key de las variables de entorno
const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarAlertas() {
    try {
        console.log("Iniciando verificación de vencimientos...");

        // Aquí iría tu lógica para leer los datos (por ejemplo, desde un JSON o base de datos)
        // Simulamos o traemos los gastos que están próximos a vencer
        const gastosPorVencer = [
            // Ejemplo de estructura de datos que procesas habitualmente
            // { categoria: 'Alquiler', monto: 150000, fechaVencimiento: '2026-10-25', esTarjeta: false }
        ];

        // Nota: Si no hay gastos próximos a vencer, puedes decidir si enviar igual un reporte o salir.
        // Preparamos los destinatarios permitiendo separar por comas (,) o puntos y comas (;)
        const rawEmailTo = process.env.EMAIL_TO || '';
        const destinatarios = rawEmailTo.split(/[,;]/).map(email => email.trim()).filter(Boolean);

        if (destinatarios.length === 0) {
            console.error("Error: No hay destinatarios configurados en EMAIL_TO.");
            return;
        }

        // Armado del contenido HTML del correo
        const contenidoHtml = `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
                <h2 style="color: #e11d48; text-align: center;">⚠️ Alertas de Vencimiento</h2>
                <p>Hola, te recordamos que tienes los siguientes gastos próximos a vencer:</p>
                
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                
                <p style="font-size: 14px; color: #666; text-align: center;">
                    Este es un reporte automático generado por tu sistema de control de gastos.
                </p>
            </div>
        `;

        // Envío del correo mediante Resend usando el Array de destinatarios
        const data = await resend.emails.send({
            from: 'Alertas de Gastos <onboarding@resend.dev>',
            to: destinatarios, // Array limpio con múltiples correos soportados
            subject: `⚠️ Alertas de Vencimiento de Gastos`,
            html: contenidoHtml
        });

        console.log("Correo enviado exitosamente:", data);
    } catch (error) {
        console.error("Error al enviar el correo de alertas:", error);
        process.exit(1);
    }
}

enviarAlertas();
