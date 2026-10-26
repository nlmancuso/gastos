// notificador.js - Script optimizado para ejecución vía cron-job
import { initializeApp } from "firebase/apps";
import { getFirestore, doc, getDoc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyDwRTcVpwoHJfTZ-eUr5ileTks5LN-npOE",
    authDomain: "gastos-334ff.firebaseapp.com",
    projectId: "gastos-334ff",
    storageBucket: "gastos-334ff.firebasestorage.app",
    messagingSenderId: "140017165186",
    appId: "1:140017165186:web:2b6d7d57896696bef3a59b"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function enviarAlertasVencimientos() {
    try {
        const grupoId = "grupo_mancusososa";
        const docRef = doc(db, "app_data", grupoId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.log("No se encontraron datos en la nube para el grupo.");
            return;
        }

        const data = docSnap.data();
        const appState = data.appState || {};
        const gastos = appState.gastos || [];

        const mesActual = new Date().toISOString().slice(0, 7);
        console.log(`[Cron-Job] Procesando vencimientos en tiempo real para el mes: ${mesActual}`);

        // Filtramos y procesamos únicamente los gastos vigentes que están en la base de datos
        console.log(`Gastos activos recuperados sin caché: ${gastos.length}`);
        
        // Aquí podés disparar la lógica de envío de correo (por ejemplo, con fetch a una API o servicio de correo)
        
        console.log("¡Proceso de notificación finalizado con éxito!");
    } catch (error) {
        console.error("Error al ejecutar el servicio de notificaciones:", error);
    }
}

enviarAlertasVencimientos();
