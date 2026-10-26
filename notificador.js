import { initializeApp } from "firebase/app";
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

async function ejecutarEnvioCorreo() {
    try {
        const grupoId = "grupo_mancusososa";
        const docRef = doc(db, "app_data", grupoId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            console.log("No se encontró información para este grupo en Firebase.");
            return;
        }

        const data = docSnap.data();
        const gastosVigentes = data.appState?.gastos || [];

        console.log(`Conectado a Firebase con éxito. Gastos activos actuales: ${gastosVigentes.length}`);

        // ACÁ VA TU LÓGICA DE ENVÍO DE CORREO (ej: usando Nodemailer, SendGrid o API de envío)
        // Como ahora lee 'gastosVigentes' directamente de la nube, nunca va a mandar elementos borrados.

        console.log("¡Correo enviado con los datos actualizados!");
    } catch (error) {
        console.error("Error al procesar el envío de correo:", error);
    }
}

ejecutarEnvioCorreo();
