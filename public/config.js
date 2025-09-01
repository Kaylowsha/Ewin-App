// config.js - Configuración de Firebase (sin módulos ES6)

// Tu configuración específica de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBn-IaAxgljgNkQbbR44o-TjxKhZXXdhQQ",
  authDomain: "peluqueria-natwin.firebaseapp.com",
  projectId: "peluqueria-natwin",
  storageBucket: "peluqueria-natwin.firebasestorage.app",
  messagingSenderId: "857456171449",
  appId: "1:857456171449:web:a8f578b03dd5ca4d27fe68"
};

// Variables globales
let app, firebaseAuth, firebaseDB;

// Función para inicializar Firebase
function initializeFirebase() {
  try {
    if (!firebase.apps.length) {
    app = firebase.initializeApp(firebaseConfig);
} else {
    app = firebase.app();
}
   firebaseAuth = firebase.auth();
firebaseDB = firebase.firestore();
    console.log('🔥 Firebase configurado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error configurando Firebase:', error);
    return false;
  }
}

// Hacer las variables globales
window.firebaseApp = function() { return app; };
window.firebaseAuth = function() { return firebaseAuth; };
window.firebaseDB = function() { return firebaseDB; };
window.initFirebase = initializeFirebase;

console.log('📋 Config.js cargado');

// FUNCIONES FIRESTORE - Reemplazan localStorage
// Agregar estas funciones al final de config.js

// 1. GUARDAR SERVICIO EN FIRESTORE
async function guardarServicioFirestore(servicio) {
    try {
        await firebaseDB.collection('servicios').add({
            barbero: servicio.barbero,
            servicio: servicio.servicios ? servicio.servicios.join(', ') : servicio.servicio,
            monto: servicio.montoCobrado || servicio.monto,
            comision: servicio.comision || 0,
            fecha: firebase.firestore.Timestamp.now(),
            formaPago: servicio.formaPago || 'Efectivo'
        });
        console.log('✅ Servicio guardado en Firestore');
        return true;
    } catch (error) {
        console.error('❌ Error guardando servicio:', error);
        return false;
    }
}

// 2. OBTENER SERVICIOS DE FIRESTORE - VERSIÓN CORREGIDA
async function obtenerServiciosFirestore() {
    try {
        const snapshot = await firebaseDB.collection('servicios')
            .orderBy('fecha', 'desc')
            .get();
        
        const servicios = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            
            // Calcular comisión según el barbero
            const comision = data.barbero === 'Ewin' ? 1.0 : 0.5;
            const montoCobrado = data.monto || 0;
            const miParte = montoCobrado * comision;
            
            servicios.push({
                id: doc.id,
                barbero: data.barbero,
                servicio: data.servicio,
                servicios: [data.servicio], // Array para compatibilidad
                monto: data.monto,
                montoCobrado: montoCobrado, // Campo esperado por el dashboard
                miParte: miParte, // Campo esperado por el dashboard
                comision: data.comision || 0,
                fecha: data.fecha.toDate(),
                fechaTexto: data.fecha.toDate().toLocaleString('es-CL'),
                formaPago: data.formaPago || 'Efectivo',
                formaPagoTexto: data.formaPago === 'efectivo' ? '💵 Efectivo' : 
                               data.formaPago === 'mercado-pago' ? '💳 Mercado Pago' : 
                               '💳 ' + data.formaPago,
                notas: null
            });
        });
        
        console.log(`📊 ${servicios.length} servicios obtenidos de Firestore`);
        return servicios;
    } catch (error) {
        console.error('❌ Error obteniendo servicios:', error);
        return [];
    }
}

// 3. GUARDAR TRANSACCIÓN (adelantos/retiros)
async function guardarTransaccionFirestore(transaccion) {
    try {
        await firebaseDB.collection('transacciones').add({
            tipo: transaccion.tipo,
            barbero: transaccion.barbero,
            monto: transaccion.monto,
            fecha: firebase.firestore.Timestamp.now(),
            descripcion: transaccion.descripcion || ''
        });
        console.log('✅ Transacción guardada en Firestore');
        return true;
    } catch (error) {
        console.error('❌ Error guardando transacción:', error);
        return false;
    }
}

// 4. OBTENER TRANSACCIONES DE FIRESTORE
async function obtenerTransaccionesFirestore() {
    try {
        const snapshot = await firebaseDB.collection('transacciones')
            .orderBy('fecha', 'desc')
            .get();
        
        const transacciones = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            transacciones.push({
                id: doc.id,
                tipo: data.tipo,
                barbero: data.barbero,
                monto: data.monto,
                fecha: data.fecha.toDate(),
                descripcion: data.descripcion || ''
            });
        });
        
        console.log(`💰 ${transacciones.length} transacciones obtenidas de Firestore`);
        return transacciones;
    } catch (error) {
        console.error('❌ Error obteniendo transacciones:', error);
        return [];
    }
}

// Hacer funciones globales
window.guardarServicioFirestore = guardarServicioFirestore;
window.obtenerServiciosFirestore = obtenerServiciosFirestore;
window.guardarTransaccionFirestore = guardarTransaccionFirestore;
window.obtenerTransaccionesFirestore = obtenerTransaccionesFirestore;

console.log('🔥 Funciones Firestore cargadas');