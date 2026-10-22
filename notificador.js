// notificador.js - Inspector de estructura de Firestore
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
    console.log("Inspeccionando documento en Firestore...");
    const resultado = await consultarFirestorePublico();
    
    let camposDisponibles = [];
    if (resultado && resultado.fields) {
      camposDisponibles = Object.keys(resultado.fields);
    }

    let htmlContenido = `<h2>🔍 Diagnóstico de Campos - Grupo Mancuso Sosa</h2>`;
    htmlContenido += `<p>Los campos encontrados en el documento <b>grupo_mancusososa</b> son:</p>`;
    htmlContenido += `<ul>`;
    camposDisponibles.forEach(campo => {
      htmlContenido += `<li><b>${campo}</b></li>`;
    });
    htmlContenido += `</ul>`;
    htmlContenido += `<p>Con esta lista exacta sabremos cómo leer tus gastos correctamente.</p>`;

    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '🔍 Inspector de Campos - Firestore',
      html: htmlContenido
    });

    console.log("Correo de inspección enviado con éxito.");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
