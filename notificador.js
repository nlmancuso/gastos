// notificador.js - Lee appState y cruza con excepcionesVencimiento
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

    if (resultado && resultado.fields && resultado.fields.appState) {
      const appStateMap = resultado.fields.appState.mapValue.fields;
      
      // 1. Extraemos las excepciones de vencimiento si existen
      let excepcionesMap = {};
      if (appStateMap.excepcionesVencimiento && appStateMap.excepcionesVencimiento.mapValue && appStateMap.excepcionesVencimiento.mapValue.fields) {
        const rawExcepciones = appStateMap.excepcionesVencimiento.mapValue.fields;
        for (const [key, val] of Object.entries(rawExcepciones)) {
          excepcionesMap[key] = val.stringValue || '';
        }
      }

      // 2. Buscamos el array de gastos
      const gastosField = appStateMap.gastos || appStateMap.items;
      
      if (gastosField && gastosField.arrayValue && gastosField.arrayValue.values) {
        const arrayGastos = gastosField.arrayValue.values;
        
        arrayGastos.forEach(item => {
          const fields = item.mapValue.fields;
          
          const id = fields.id ? fields.id.stringValue : '';
          const concepto = fields.concepto ? fields.concepto.stringValue : 'Sin concepto';
          const categoria = fields.categoria ? fields.categoria.stringValue : 'Sin categoría';
          
          let monto = 0;
          if (fields.monto) {
            monto = fields.monto.doubleValue !== undefined ? fields.monto.doubleValue : (fields.monto.integerValue ? Number(fields.monto.integerValue) : 0);
          }
          
          const estado = fields.estado ? fields.estado.stringValue : 'PENDIENTE';
          const startMonth = fields.startMonth ? fields.startMonth.stringValue : '2026-10'; // Mes actual por defecto

          // 3. Buscamos si tiene vencimiento registrado en excepciones (ej: id_2026-10)
          let vencimiento = 'Sin fecha';
          const claveExcepcion = `${id}_${startMonth}`;
          
          if (excepcionesMap[claveExcepcion] && excepcionesMap[claveExcepcion] !== '') {
            vencimiento = excepcionesMap[claveExcepcion];
          } else if (fields.vencimiento && fields.vencimiento.stringValue) {
            vencimiento = fields.vencimiento.stringValue;
          }

          if (estado.toUpperCase() === 'PENDIENTE') {
            gastosPorVencer.push({ concepto, categoria, monto, vencimiento });
          }
        });
      }
    }

    if (gastosPorVencer.length === 0) {
      console.log("No hay gastos pendientes para notificar.");
      return;
    }

    // Armamos el correo con los datos reales
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

    console.log("¡Correo enviado con éxito con las fechas cruzadas!");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
