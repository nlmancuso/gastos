// notificador.js - Lee grupo_mancusososa de Firestore y envía el reporte por Resend
const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { Resend } = require('resend');

// Inicializar Firebase Admin (se conecta automáticamente con el entorno web público o SDK por defecto)
initializeApp({
  projectId: "gastos-app" // Se ajustará automáticamente o usará el proyecto por defecto
});

const db = getFirestore();
const resend = new Resend(process.env.RESEND_API_KEY);

async function verificarVencimientos() {
  try {
    console.log("Consultando el grupo 'grupo_mancusososa' en Firestore...");
    
    // Obtenemos directamente el documento del grupo
    const docRef = db.collection('app_data').doc('grupo_mancusososa');
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      console.log("No se encontró el documento grupo_mancusososa en Firestore.");
      return;
    }

    const data = docSnap.data();
    let gastosPorVencer = [];
    
    // Hoy es 22/10/2026 (según tu captura los formatos de fecha son DD/MM/YYYY)
    // Vamos a buscar los que tengan vencimiento cercano o coincidan
    if (data.gastos && Array.isArray(data.gastos)) {
      data.gastos.forEach(gasto => {
        if (gasto.estado === 'PENDIENTE' && gasto.vencimiento) {
          gastosPorVencer.push({
            concepto: gasto.concepto || 'Sin concepto',
            categoria: gasto.categoria || 'Sin categoría',
            monto: gasto.monto || 0,
            vencimiento: gasto.vencimiento
          });
        }
      });
    }

    let htmlContenido = `<h2>🔔 Alerta de Vencimientos: Grupo Mancuso Sosa</h2>`;
    
    if (gastosPorVencer.length > 0) {
      htmlContenido += `<p>Se encontraron los siguientes gastos pendientes:</p><ul>`;
      gastosPorVencer.forEach(g => {
        htmlContenido += `<li><b>${g.concepto}</b> (${g.categoria}) - Monto: <b>$${g.monto}</b> - Vence: <b>${g.vencimiento}</b></li>`;
      });
      htmlContenido += `</ul>`;
    } else {
      htmlContenido += `<p>¡Excelente! No hay gastos pendientes registrados en este grupo.</p>`;
    }

    // Enviar el correo con Resend
    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '📊 Vencimientos - Grupo Mancuso Sosa',
      html: htmlContenido
    });

    console.log("Correo enviado exitosamente con los datos del grupo.");
  } catch (error) {
    console.error("Error al procesar los vencimientos de Firebase:", error);
  }
}

verificarVencimientos();
