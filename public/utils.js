// utils.js - Funciones de utilidad
console.log('📁 Cargando utils.js...');

// Variable global para Firestore
let utilsFirestore = null;

// Funciones de utilidad
const utilsFunctions = {
    // Inicializar utilidades
    initUtils: function() {
        try {
            console.log('🛠️ Inicializando utilidades...');
            
            // Obtener referencia de Firestore
            utilsFirestore = firebase.firestore();
            
            if (!utilsFirestore) {
                throw new Error('Firestore no está disponible');
            }
            
            console.log('✅ Utilidades inicializadas correctamente');
            return true;
        } catch (error) {
            console.error('❌ Error al inicializar utils:', error);
            return false;
        }
    },
    
    // Formatear fecha
    formatDate: function(date) {
        if (!date) return '';
        
        const d = date instanceof Date ? date : new Date(date);
        
        return d.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Formatear moneda
    formatCurrency: function(amount) {
        if (typeof amount !== 'number') return '$0';
        
        return new Intl.NumberFormat('es-CL', {
            style: 'currency',
            currency: 'CLP'
        }).format(amount);
    },
    
    // Mostrar notificación
    showNotification: function(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        notification.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        
        notification.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        // Agregar al body
        document.body.appendChild(notification);
        
        // Auto-remover después de 5 segundos
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 5000);
    },
    
    // Validar email
    validateEmail: function(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    },
    
    // Validar número de teléfono chileno
    validatePhone: function(phone) {
        const phoneRegex = /^(\+56|56)?[0-9]{8,9}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    },
    
    // Obtener datos de Firestore
    getData: async function(collection, docId = null) {
        try {
            if (!utilsFirestore) {
                throw new Error('Firestore no inicializado');
            }
            
            if (docId) {
                // Obtener documento específico
                const doc = await utilsFirestore.collection(collection).doc(docId).get();
                return doc.exists ? { id: doc.id, ...doc.data() } : null;
            } else {
                // Obtener toda la colección
                const snapshot = await utilsFirestore.collection(collection).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (error) {
            console.error('❌ Error al obtener datos:', error);
            throw error;
        }
    },
    
    // Guardar datos en Firestore
    saveData: async function(collection, data, docId = null) {
        try {
            if (!utilsFirestore) {
                throw new Error('Firestore no inicializado');
            }
            
            // Agregar timestamp
            data.timestamp = firebase.firestore.FieldValue.serverTimestamp();
            
            if (docId) {
                // Actualizar documento existente
                await utilsFirestore.collection(collection).doc(docId).set(data, { merge: true });
                return docId;
            } else {
                // Crear nuevo documento
                const docRef = await utilsFirestore.collection(collection).add(data);
                return docRef.id;
            }
        } catch (error) {
            console.error('❌ Error al guardar datos:', error);
            throw error;
        }
    },
    
    // Eliminar datos de Firestore
    deleteData: async function(collection, docId) {
        try {
            if (!utilsFirestore) {
                throw new Error('Firestore no inicializado');
            }
            
            await utilsFirestore.collection(collection).doc(docId).delete();
            return true;
        } catch (error) {
            console.error('❌ Error al eliminar datos:', error);
            throw error;
        }
    },
    
    // Generar ID único
    generateId: function() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    // Debounce para optimizar búsquedas
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// Exportar funciones globalmente
window.utilsFunctions = utilsFunctions;
console.log('✅ utils.js cargado correctamente');