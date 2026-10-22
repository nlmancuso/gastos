// notificador.js - Envía correo solo si hay vencimientos detectados
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
    console.log("Consultando Firestore para grupo_mancusososa...");
    const resultado = await consultarFirestorePublico();
    
    let gastosPorVencer = [];

    if (resultado && resultado.fields && resultado.fields.gastos) {
      const arrayGastos = resultado.fields.gastos.arrayValue.values || [];
      
      arrayGastos.forEach(item => {
        const fields = item.mapValue.fields;
        
        // Mapeamos de forma flexible los nombres de los campos que usa tu interfaz web
        const concepto = fields.concepto ? fields.concepto.stringValue : (fields.nombre ? fields.nombre.stringValue : 'Sin concepto');
        const categoria = fields.categoria ? fields.categoria.stringValue : 'Sin categoría';
        
        // El monto puede venir como doubleValue o integerValue
        let monto = 0;
        if (fields.monto) {
          monto = fields.monto.doubleValue !== undefined ? fields.monto.doubleValue : (fields.monto.integerValue ? Number(fields.monto.integerValue) : 0);
        }
        
        const vencimiento = fields.vencimiento ? fields.vencimiento.stringValue : '';
        const estado = fields.estado ? fields.estado.stringValue : '';

        // Si está pendiente, lo sumamos al reporte
        if (estado === 'PENDIENTE') {
          gastosPorVencer.push({ concepto, categoria, monto, vencimiento });
        }
      });
    }

    // CONDICIÓN CLAVE: Si no hay gastos pendientes, terminamos acá y NO enviamos correo
    if (gastosPorVencer.length === 0) {
      console.log("No hay gastos pendientes. No se enviará ningún correo.");
      return;
    }

    // Si hay gastos, armamos el HTML y enviamos
    let htmlContenido = `<h2>🔔 Alerta de Vencimientos: Grupo Mancuso Sosa</h2>`;
    htmlContenido += `<p>Se encontraron los siguientes gastos pendientes:</p><ul>`;
    gastosPorVencer.forEach(g => {
      htmlContenido += `<li><b>${g.concepto}</b> (${g.categoria}) - Monto: <b>$${g.monto.toLocaleString('es-AR')}</b> - Vence: <b>${g.vencimiento}</b></li>`;
    });
    htmlContenido += `</ul>`;

    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '📊 Vencimientos Pendientes - Grupo Mancuso Sosa',
      html: htmlContenido
    });

    console.log("¡Correo con vencimientos enviado exitosamente!");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
