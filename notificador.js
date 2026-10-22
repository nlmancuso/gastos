// notificador.js - Filtra solo vencimientos de hoy y mañana
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

// Función auxiliar para formatear fechas a YYYY-MM-DD
function obtenerFechaFormateada(d) {
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

async function procesarAlertas() {
  try {
    console.log("Consultando Firestore para grupo_mancusososa...");
    const resultado = await consultarFirestorePublico();
    
    let gastosFiltrados = [];

    // Definimos las fechas objetivo: Hoy y Mañana
    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const hoyStr = obtenerFechaFormateada(hoyDate); // Ej: "2026-10-22"

    const mañanaDate = new Date();
    mañanaDate.setDate(hoyDate.getDate() + 1);
    mañanaDate.setHours(0, 0, 0, 0);
    const mañanaStr = obtenerFechaFormateada(mañanaDate); // Ej: "2026-10-23"

    console.log(`Buscando vencimientos para hoy (${hoyStr}) y mañana (${mañanaStr})...`);

    if (resultado && resultado.fields && resultado.fields.appState) {
      const appStateMap = resultado.fields.appState.mapValue.fields;
      
      let excepcionesMap = {};
      if (appStateMap.excepcionesVencimiento && appStateMap.excepcionesVencimiento.mapValue && appStateMap.excepcionesVencimiento.mapValue.fields) {
        const rawExcepciones = appStateMap.excepcionesVencimiento.mapValue.fields;
        for (const [key, val] of Object.entries(rawExcepciones)) {
          excepcionesMap[key] = val.stringValue || '';
        }
      }

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
          const startMonth = fields.startMonth ? fields.startMonth.stringValue : '2026-10';

          // Obtenemos la fecha de vencimiento real
          let vencimiento = '';
          const claveExcepcion = `${id}_${startMonth}`;
          
          if (excepcionesMap[claveExcepcion] && excepcionesMap[claveExcepcion] !== '') {
            vencimiento = excepcionesMap[claveExcepcion];
          } else if (fields.vencimiento && fields.vencimiento.stringValue) {
            vencimiento = fields.vencimiento.stringValue;
          }

          // Filtramos: debe estar pendiente Y su vencimiento debe ser hoy o mañana
          if (estado.toUpperCase() === 'PENDIENTE' && (vencimiento === hoyStr || vencimiento === mañanaStr)) {
            gastosFiltrados.push({ concepto, categoria, monto, vencimiento });
          }
        });
      }
    }

    // CONDICIÓN: Si no hay gastos para hoy o mañana, NO se envía ningún correo
    if (gastosFiltrados.length === 0) {
      console.log("No hay gastos que vencer hoy ni mañana. No se enviará correo.");
      return;
    }

    // Si hay coincidencias, armamos el correo
    let htmlContenido = `<h2>🔔 Alerta de Vencimientos: Grupo Mancuso Sosa</h2>`;
    htmlContenido += `<p>Los siguientes gastos vencen hoy o mañana:</p><ul>`;
    
    gastosFiltrados.forEach(g => {
      let etiquetaVencimiento = g.vencimiento === hoyStr ? '<b>¡Vence HOY!</b>' : '<b>Vence mañana</b>';
      htmlContenido += `<li><b>${g.concepto}</b> (${g.categoria}) - Monto: <b>$${g.monto.toLocaleString('es-AR')}</b> - ${etvencimiento = etiquetaVencimiento} (${g.vencimiento})</li>`;
    });
    
    htmlContenido += `</ul>`;

    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '⚠️ Atención: Gastos que vencen hoy o mañana',
      html: htmlContenido
    });

    console.log("¡Correo de alertas de vencimiento enviado con éxito!");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
