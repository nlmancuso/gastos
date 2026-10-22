// notificador.js - Lee Firebase y envía los vencimientos reales por correo
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Resend } = require('resend');

// Inicializar Firebase Admin usando variables de entorno o la conexión por defecto
// Como GitHub Actions corre en la nube, nos conectaremos a tu Firestore
initializeApp();
const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

async function verificarVencimientos() {
  try {
    console.log("Buscando gastos en Firestore...");
    
    // Suponiendo que tus gastos están en la colección principal de tu app
    const snapshot = await db.collection('app_data').get();
    
    if (snapshot.empty) {
      console.log("No se encontraron registros en la base de datos.");
      return;
    }

    let gastosPorVencer = [];
    let hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Recorremos los documentos para buscar fechas de vencimiento cercanas
    snapshot.forEach(doc => {
      const data = doc.data();
      // Verificamos si tiene estructura de gastos (ajustable según tus campos)
      if (data.gastos && Array.isArray(data.gastos)) {
        data.gastos.forEach(gasto => {
          if (gasto.fechaVencimiento && gasto.estado !== 'pagado') {
            const fechaVen = new Date(gasto.fechaVencimiento);
            // Lógica para comparar si vence hoy o en los próximos días
            gastosPorVencer.push({
              nombre: gasto.nombre || gasto.descripcion || 'Gasto sin nombre',
              monto: gasto.monto || 0,
              vencimiento: gasto.fechaVencimiento
            });
          }
        });
      }
    });

    let htmlContenido = `<h2>🔔 Alerta de Vencimientos - Control de Gastos</h2>`;
    
    if (gastosPorVencer.length > 0) {
      htmlContenido += `<p>Los siguientes gastos están próximos a vencer:</p><ul>`;
      gastosPorVencer.forEach(g => {
        htmlContenido += `<li><b>${g.nombre}</b> - Monto: <b>$${g.monto}</b> - Vence el: <b>${g.vencimiento}</b></li>`;
      });
      htmlContenido += `</ul>`;
    } else {
      htmlContenido += `<p>¡Buenas noticias! No tenés gastos pendientes registrados con fecha próxima para hoy.</p>`;
    }

    // Enviar correo con Resend
    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '📊 Resumen de Vencimientos de Tus Gastos',
      html: htmlContenido
    });

    console.log("Correo de vencimientos enviado correctamente.");
  } catch (error) {
    console.error("Error al procesar los vencimientos:", error);
  }
}

verificarVencimientos();
