// public/admin.js

// Global variables
let currentUser = null;
let firebaseDB = null;
let adminViewMode = 'ewin'; // 'ewin' or 'empleado'

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Panel de Administración cargando...');

    // Initialize Firebase and Auth
    if (typeof authFunctions === 'undefined' || !authFunctions.initAuth()) {
        alert('Error crítico: No se pudo inicializar el sistema de autenticación.');
        window.location.href = 'index.html';
        return;
    }
    firebaseDB = firebase.firestore();

    // Check user session and role
    currentUser = authFunctions.getCurrentUser();
    if (!currentUser || currentUser.rol !== 'administrador') {
        window.location.href = 'index.html';
        return;
    }

    console.log(`Sesión de admin activa: ${currentUser.nombre}`);

    // Setup UI and event listeners
    setupAdminInterface();
    addAdminDashboard();

    // Initial load
    showDashboardFinanciero();
});

function setupAdminInterface() {
    const welcomeText = document.getElementById('welcomeText');
    const logoutBtn = document.getElementById('logoutBtn');

    if (welcomeText) {
        welcomeText.innerHTML = `<i class="bi bi-person-badge me-1"></i>${currentUser.nombre} (Admin)`;
    }

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => authFunctions.logout());
    }
}

function addAdminDashboard() {
    const adminDashboard = document.getElementById('admin-dashboard');
    if(adminDashboard){
        adminDashboard.innerHTML = `
            <div class="row">
                <div class="col-md-3 mb-3">
                    <button class="btn btn-primary w-100" onclick="showDashboardFinanciero()">
                        <i class="bi bi-cash-stack me-2"></i>
                        Dashboard
                    </button>
                </div>
                <div class="col-md-3 mb-3">
                    <button class="btn btn-info w-100" onclick="showServicesManager()">
                        <i class="bi bi-scissors me-2"></i>
                        Servicios
                    </button>
                </div>
                <div class="col-md-3 mb-3">
                    <button class="btn btn-danger w-100" onclick="showAdelantosManager()">
                        <i class="bi bi-cash-coin me-2"></i>
                        Adelantos
                    </button>
                </div>
                <div class="col-md-3 mb-3">
                    <button class="btn btn-warning w-100" onclick="showCierreCaja()">
                        <i class="bi bi-calculator me-2"></i>
                        Cierre de Caja
                    </button>
                </div>
            </div>
            <div id="adminResults" class="mt-3"></div>
        `;
    }
}


// --- DATA FUNCTIONS (FIRESTORE) ---

async function getServicios(period) {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'dia':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
        case 'semana':
            const firstDayOfWeek = now.getDate() - now.getDay();
            startDate = new Date(now.setDate(firstDayOfWeek));
            startDate.setHours(0, 0, 0, 0);
            break;
        case 'mes':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
        default:
            startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    try {
        const servicesRef = firebaseDB.collection('servicios');
        const querySnapshot = await servicesRef
            .where('fecha', '>=', startDate)
            .orderBy('fecha', 'desc')
            .get();

        const services = [];
        querySnapshot.forEach(doc => {
            services.push({ id: doc.id, ...doc.data() });
        });
        return services;
    } catch (error) {
        console.error('Error obteniendo servicios:', error);
        return [];
    }
}

async function getAdelantos() {
    try {
        const adelantosRef = firebaseDB.collection('adelantos');
        const querySnapshot = await adelantosRef.orderBy('fecha', 'desc').get();

        const adelantos = [];
        querySnapshot.forEach(doc => {
            adelantos.push({ id: doc.id, ...doc.data() });
        });
        return adelantos;
    } catch (error) {
        console.error('Error obteniendo adelantos:', error);
        return [];
    }
}

async function deleteService(serviceId) {
    if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) return;
    try {
        await firebaseDB.collection('servicios').doc(serviceId).delete();
        showServicesManager(); // Refresh the view
        alert('Servicio eliminado con éxito.');
    } catch (error) {
        console.error('Error eliminando servicio:', error);
        alert('No se pudo eliminar el servicio.');
    }
}


// --- ADMIN FEATURE FUNCTIONS ---

async function showDashboardFinanciero() {
    const adminResults = document.getElementById('adminResults');
    adminResults.innerHTML = '<h4>Dashboard Financiero</h4><p>Cargando datos...</p>';

    const services = await getServicios('mes'); // Get all services for the month for a complete dashboard
    const adelantos = await getAdelantos();

    let totalBruto = 0;
    let totalAdelantos = 0;
    const barberosData = {};

    services.forEach(s => {
        totalBruto += s.montoCobrado;
        const comision = getComision(s.barberoNombre); // Assuming barberoNombre is stored
        const suParte = s.montoCobrado * comision;

        if (!barberosData[s.userId]) {
            barberosData[s.userId] = {
                nombre: s.barberoNombre,
                totalCobrado: 0,
                suParte: 0,
                servicios: 0,
                adelantos: 0
            };
        }
        barberosData[s.userId].totalCobrado += s.montoCobrado;
        barberosData[s.userId].suParte += suParte;
        barberosData[s.userId].servicios++;
    });

    adelantos.forEach(a => {
        if (a.estado === 'pendiente' && barberosData[a.userId]) {
            barberosData[a.userId].adelantos += a.monto;
            totalAdelantos += a.monto;
        }
    });

    let dashboardHTML = '<div class="row">';
    for (const userId in barberosData) {
        const barbero = barberosData[userId];
        const neto = barbero.suParte - barbero.adelantos;
        dashboardHTML += `
            <div class="col-md-6">
                <div class="card">
                    <div class="card-header">${barbero.nombre}</div>
                    <div class="card-body">
                        <p>Servicios: ${barbero.servicios}</p>
                        <p>Total Cobrado: $${barbero.totalCobrado.toLocaleString()}</p>
                        <p>Su Parte: $${barbero.suParte.toLocaleString()}</p>
                        <p>Adelantos: $${barbero.adelantos.toLocaleString()}</p>
                        <p>Neto a Pagar: $${neto.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    }
    dashboardHTML += '</div>';

    const totalNeto = Object.values(barberosData).reduce((acc, barbero) => acc + (barbero.suParte - barbero.adelantos), 0);

    dashboardHTML += `
        <div class="mt-4">
            <h4>Resumen General (Mes)</h4>
            <p>Total Bruto: $${totalBruto.toLocaleString()}</p>
            <p>Total Adelantos: $${totalAdelantos.toLocaleString()}</p>
            <p>Total Neto a Pagar: $${totalNeto.toLocaleString()}</p>
        </div>
    `;

    adminResults.innerHTML = dashboardHTML;
}

async function showServicesManager() {
    const adminResults = document.getElementById('adminResults');
    adminResults.innerHTML = '<h4>Gestionar Servicios</h4><p>Cargando servicios...</p>';

    const services = await getServicios('dia'); // Show today's services by default

    let servicesHTML = `
        <table class="table table-striped">
            <thead>
                <tr>
                    <th>Fecha</th>
                    <th>Barbero</th>
                    <th>Servicios</th>
                    <th>Monto</th>
                    <th>Acciones</th>
                </tr>
            </thead>
            <tbody>
    `;

    services.forEach(s => {
        servicesHTML += `
            <tr>
                <td>${new Date(s.fecha.seconds * 1000).toLocaleString('es-CL')}</td>
                <td>${s.barberoNombre}</td>
                <td>${s.servicios.join(', ')}</td>
                <td>$${s.montoCobrado.toLocaleString()}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteService('${s.id}')">Eliminar</button>
                </td>
            </tr>
        `;
    });

    servicesHTML += '</tbody></table>';
    adminResults.innerHTML = servicesHTML;
}

function getComision(barberoNombre) {
    // This is a simplification. In a real app, this would be based on user role or a db value.
    return barberoNombre.toLowerCase().includes('ewin') ? 1.0 : 0.5;
}

// Placeholder for other admin functions
function showAdelantosManager() {
    const adminResults = document.getElementById('adminResults');
    adminResults.innerHTML = '<h4>Gestionar Adelantos</h4><p>Función en desarrollo.</p>';
}

function showCierreCaja() {
    const adminResults = document.getElementById('adminResults');
    adminResults.innerHTML = '<h4>Cierre de Caja</h4><p>Función en desarrollo.</p>';
}
