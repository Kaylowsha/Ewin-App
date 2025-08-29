// auth.js - Sistema de autenticación
console.log('📁 Cargando auth.js...');

// Variables globales para autenticación (con nombres únicos)
let authService = null;
let authDbService = null;

// Funciones de autenticación
const authFunctions = {
    // Inicializar el sistema de autenticación
    initAuth: function() {
        try {
            console.log('🔐 Inicializando autenticación...');
            
            // Obtener referencias de Firebase
            authService = firebase.auth();
            authDbService = firebase.firestore();
            
            if (!authService || !authDbService) {
                throw new Error('Firebase no está disponible');
            }
            
            console.log('✅ Autenticación inicializada correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar auth:', error);
            return false;
        }
    },
    
    // Función de login
    login: async function(email, password) {
        try {
            console.log('🔑 Intentando login...');
            
            if (!authService) {
                throw new Error('Sistema de autenticación no inicializado');
            }
            
            // Realizar login
            const userCredential = await authService.signInWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            console.log('✅ Login exitoso:', user.email);
            
            // Obtener datos del usuario desde Firestore
            let userDoc = await authDbService.collection('barberos').doc(user.uid).get();
            
            // Si el usuario no existe en Firestore, crearlo automáticamente
            if (!userDoc.exists) {
                console.log('⚠️ Usuario no existe en Firestore, creando...');
                
                const isAdmin = email === 'ewin@barberia.com';
                
                const newUserData = {
                    nombre: email.split('@')[0],
                    email: email,
                    rol: isAdmin ? 'administrador' : 'empleado',
                    activo: true,
                    fechaIngreso: new Date()
                };
                
                await authDbService.collection('barberos').doc(user.uid).set(newUserData);
                console.log('✅ Usuario creado en Firestore:', newUserData);
                
                userDoc = await authDbService.collection('barberos').doc(user.uid).get();
            }
            
            const userData = userDoc.data();
            console.log('👤 Datos del usuario:', userData);
            
            // Guardar datos en sessionStorage para usar en otras páginas
            sessionStorage.setItem('userData', JSON.stringify({
                uid: user.uid,
                email: user.email,
                nombre: userData.nombre,
                rol: userData.rol
            }));
            
            // Redirigir según el rol
            if (userData.rol === 'administrador') {
                console.log('🎯 Redirigiendo a admin...');
                window.location.href = 'admin.html';
            } else {
                console.log('🎯 Redirigiendo a empleado...');
                window.location.href = 'empleado.html';
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ Error en login:', error);
            
            // Manejar errores específicos de Firebase
            let errorMessage = 'Error desconocido';
            
            switch (error.code) {
                case 'auth/user-not-found':
                    errorMessage = 'Usuario no encontrado';
                    break;
                case 'auth/wrong-password':
                    errorMessage = 'Contraseña incorrecta';
                    break;
                case 'auth/invalid-email':
                    errorMessage = 'Email inválido';
                    break;
                case 'auth/too-many-requests':
                    errorMessage = 'Demasiados intentos fallidos. Intenta más tarde';
                    break;
                default:
                    errorMessage = error.message;
            }
            
            throw new Error(errorMessage);
        }
    },
    
    // Función de logout
    logout: async function() {
        try {
            console.log('🚪 Cerrando sesión...');
            
            await authService.signOut();
            sessionStorage.clear();
            
            console.log('✅ Sesión cerrada');
            window.location.href = 'index.html';
            
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            throw error;
        }
    },
    
    // Verificar si el usuario está autenticado
    checkAuth: function() {
        return new Promise((resolve) => {
            authService.onAuthStateChanged((user) => {
                if (user) {
                    console.log('✅ Usuario autenticado:', user.email);
                    resolve(user);
                } else {
                    console.log('❌ Usuario no autenticado');
                    resolve(null);
                }
            });
        });
    },
    
    // Obtener usuario actual
    getCurrentUser: function() {
        const userData = sessionStorage.getItem('userData');
        return userData ? JSON.parse(userData) : null;
    }
};

// Exportar funciones globalmente
window.authFunctions = authFunctions;
console.log('✅ auth.js cargado correctamente');