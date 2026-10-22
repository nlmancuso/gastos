// notificador.js - Modo diagnóstico para Firestore
const { Resend } = require('resend');
const https = require('https');

const resend = new Resend(process.env.RESEND_API_KEY);

function consultarFirestorePublico() {
  return new Promise((resolve, reject) => {
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
    console.log("Consultando Firestore...");
    const resultado = await consultarFirestorePublico();
    
    let gastosPorVencer = [];
    let textoDiagnostico = "<h3>Datos leídos de Firebase:</h3><pre>";

    if (resultado && resultado.fields && resultado.fields.gastos) {
      const arrayGastos = resultado.fields.gastos.arrayValue.values || [];
      
      arrayGastos.forEach((item, index) => {
        const fields = item.mapValue.fields;
        
        const concepto = fields.concepto ? fields.concepto.stringValue : (fields.nombre ? fields.nombre.stringValue : 'Sin concepto');
        const monto = fields.monto ? (fields.monto.doubleValue || fields.monto.integerValue || 0) : 0;
        const vencimiento = fields.vencimiento ? fields.vencimiento.stringValue : 'Sin fecha';
        const estado = fields.estado ? fields.estado.stringValue : 'Sin estado';

        textoDiagnostico += `\n[${index}] ${concepto} - Estado: '${estado}' - Vence: ${vencimiento}`;

        // Verificamos si coincide el estado (ignorando mayúsculas/minúsculas o espacios)
        if (estado.trim().toUpperCase() === 'PENDIENTE') {
          gastosPorVencer.push({ concepto, monto, vencimiento });
        }
      });
    } else {
      textoDiagnostico += "\nNo se encontró el campo 'gastos' en el documento.";
    }

    textoDiagnostico += "</pre>";

    let htmlContenido = `<h2>🔔 Reporte de Vencimientos - Grupo Mancuso Sosa</h2>`;
    
    if (gastosPorVencer.length > 0) {
      htmlContenido += `<p>Se encontraron <b>${gastosPorVencer.length}</b> gastos pendientes:</p><ul>`;
      gastosPorVencer.forEach(g => {
        htmlContenido += `<li><b>${g.concepto}</b> - Monto: <b>$${g.monto}</b> - Vence: <b>${g.vencimiento}</b></li>`;
      });
      htmlContenido += `</ul>`;
    } else {
      htmlContenido += `<p>⚠️ El filtro estricto no encontró elementos con estado PENDIENTE, pero aquí tenés el diagnóstico técnico:</p>` + textoDiagnostico;
    }

    // Enviamos siempre el correo para ver qué detectó
    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '📊 Diagnóstico de Vencimientos - Grupo Mancuso Sosa',
      html: htmlContenido
    });

    console.log("Correo de diagnóstico enviado con éxito.");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
