// notificador.js - Lectura directa de Firestore para Grupo Mancuso Sosa
const { Resend } = require('resend');
const https = require('https');

const resend = new Resend(process.env.RESEND_API_KEY);

function consultarFirestorePublico() {
  return new Promise((resolve, reject) => {
    // Usamos tu ID de proyecto exacto: gastos-334ff
    const url = `https://firestore.googleapis.com/v1/projects/gastos-334ff/databases/(default)/documents/app_data/grupo_mancusososa`;

    https.get(url, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function procesarAlertas() {
  try {
    console.log("Iniciando consulta a Firestore para el proyecto gastos-334ff...");
    const resultado = await consultarFirestorePublico();
    
    let htmlContenido = `<h2>🔔 Alerta de Vencimientos: Grupo Mancuso Sosa</h2>`;
    let gastosPorVencer = [];

    if (resultado && resultado.fields && resultado.fields.gastos) {
      const arrayGastos = resultado.fields.gastos.arrayValue.values || [];
      
      arrayGastos.forEach(item => {
        const fields = item.mapValue.fields;
        const concepto = fields.concepto ? fields.concepto.stringValue : 'Sin concepto';
        const categoria = fields.categoria ? fields.categoria.stringValue : 'Sin categoría';
        const monto = fields.monto ? fields.monto.doubleValue || fields.monto.integerValue : 0;
        const vencimiento = fields.vencimiento ? fields.vencimiento.stringValue : '';
        const estado = fields.estado ? fields.estado.stringValue : '';

        // Filtramos los que están pendientes
        if (estado === 'PENDIENTE') {
          gastosPorVencer.push({ concepto, categoria, monto, vencimiento });
        }
      });
    }

    if (gastosPorVencer.length > 0) {
      htmlContenido += `<p>Se encontraron los siguientes gastos pendientes:</p><ul>`;
      gastosPorVencer.forEach(g => {
        htmlContenido += `<li><b>${g.concepto}</b> (${g.categoria}) - Monto: <b>$${g.monto}</b> - Vence: <b>${g.vencimiento}</b></li>`;
      });
      htmlContenido += `</ul>`;
    } else {
      htmlContenido += `<p>No se detectaron gastos pendientes para este grupo en este momento.</p>`;
    }

    // Enviar el correo con Resend
    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '📊 Vencimientos - Grupo Mancuso Sosa',
      html: htmlContenido
    });

    console.log("¡Correo enviado con éxito!");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
