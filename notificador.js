// notificador.js - Alertas automáticas de vencimientos
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function enviarAlerta() {
  try {
    console.log("Revisando gastos próximos a vencer...");
    
    // Aquí conectaremos con tu base de datos de Firebase para buscar los vencimientos
    // Por ahora, enviemos una prueba de funcionamiento:

    const data = await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '🔔 Alerta: Tus gastos están siendo monitoreados',
      html: '<p>¡Hola! El sistema automático de alertas de vencimientos de tu app de gastos se ha configurado correctamente.</p>'
    });

    console.log("Correo enviado con éxito:", data);
  } catch (error) {
    console.error("Error al enviar el correo:", error);
  }
}

enviarAlerta();
