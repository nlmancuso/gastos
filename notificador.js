// notificador.js - Alertas de Vencimientos con diseño profesional
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

function obtenerFechaFormateada(d) {
  const año = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return `${año}-${mes}-${dia}`;
}

async function procesarAlertas() {
  try {
    console.log("Consultando Firestore...");
    const resultado = await consultarFirestorePublico();
    
    let gastosFiltrados = [];

    const hoyDate = new Date();
    hoyDate.setHours(0, 0, 0, 0);
    const hoyStr = obtenerFechaFormateada(hoyDate);

    const mañanaDate = new Date();
    mañanaDate.setDate(hoyDate.getDate() + 1);
    mañanaDate.setHours(0, 0, 0, 0);
    const mañanaStr = obtenerFechaFormateada(mañanaDate);

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

          let vencimiento = '';
          const claveExcepcion = `${id}_${startMonth}`;
          
          if (excepcionesMap[claveExcepcion] && excepcionesMap[claveExcepcion] !== '') {
            vencimiento = excepcionesMap[claveExcepcion];
          } else if (fields.vencimiento && fields.vencimiento.stringValue) {
            vencimiento = fields.vencimiento.stringValue;
          }

          if (estado.toUpperCase() === 'PENDIENTE' && (vencimiento === hoyStr || vencimiento === mañanaStr)) {
            gastosFiltrados.push({ concepto, categoria, monto, vencimiento });
          }
        });
      }
    }

    if (gastosFiltrados.length === 0) {
      console.log("No hay gastos para hoy ni mañana. No se enviará correo.");
      return;
    }

    // Diseño HTML profesional y limpio
    let htmlContenido = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; padding: 40px 0; color: #1f2937;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);">
          
          <!-- Encabezado -->
          <div style="background-color: #0f172a; padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 22px; font-weight: 600; letter-spacing: -0.5px;">🔔 Alerta de Vencimientos</h1>
            <p style="margin: 8px 0 0 0; font-size: 14px; color: #94a3b8;">Tienes pagos pendientes próximos a vencer</p>
          </div>

          <!-- Cuerpo -->
          <div style="padding: 30px;">
            <p style="margin-top: 0; font-size: 15px; color: #4b5563;">El sistema ha detectado los siguientes movimientos que requieren tu atención:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
    `;

    gastosFiltrados.forEach(g => {
      const esHoy = g.vencimiento === hoyStr;
      const badgeColor = esHoy ? '#ef4444' : '#f59e0b';
      const badgeTexto = esHoy ? 'VENCE HOY' : 'VENCE MAÑANA';
      
      htmlContenido += `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 16px 0;">
                  <div style="font-size: 16px; font-weight: 600; color: #111827;">${g.concepto}</div>
                  <div style="font-size: 13px; color: #6b7280; margin-top: 3px;">Categoría: ${g.categoria} | Fecha: ${g.vencimiento}</div>
                </td>
                <td style="padding: 16px 0; text-align: right; vertical-align: top;">
                  <div style="font-size: 16px; font-weight: 700; color: #111827;">$${g.monto.toLocaleString('es-AR')}</div>
                  <div style="margin-top: 5px;">
                    <span style="background-color: ${badgeColor}; color: #ffffff; font-size: 10px; font-weight: 700; padding: 3px 8px; border-radius: 4px; display: inline-block;">${badgeTexto}</span>
                  </div>
                </td>
              </tr>
      `;
    });

    htmlContenido += `
            </table>
          </div>

          <!-- Pie de página -->
          <div style="background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb;">
            Este es un correo automático generado por tu aplicación de control de gastos. No respondas a este mensaje.
          </div>

        </div>
      </div>
    `;

    await resend.emails.send({
      from: 'Control de Gastos <onboarding@resend.dev>',
      to: [process.env.MY_EMAIL],
      subject: '⚠️ Atención: Gastos que vencen hoy o mañana',
      html: htmlContenido
    });

    console.log("¡Correo profesional enviado con éxito!");
  } catch (error) {
    console.error("Error al procesar:", error);
  }
}

procesarAlertas();
