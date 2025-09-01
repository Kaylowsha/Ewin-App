// public/empleado.js

// Global variables
let currentUser = null;
let firebaseDB = null;
let currentPeriod = 'dia';

// Service catalog
const servicios = {
    'corte-tradicional-estudiante': { nombre: 'Corte Tradicional - Estudiante' },
    'corte-tijera': { nombre: 'Corte Tijera' },
    'fade-degradados': { nombre: 'Fade - Degradados' },
    'barba-rasurado': { nombre: 'Barba Rasurado' },
    'perfilado-barba': { nombre: 'Perfilado Barba' },
    'barba-premium': { nombre: 'Barba Premium' },
    'rasurado-barba-vapor': { nombre: 'Rasurado de Barba con Vapor' },
    'limpieza-facial-premium': { nombre: 'Limpieza Facial Premium' },
    'servicio-full': { nombre: 'Servicio Full' },
    'cejas': { nombre: 'Cejas' },
    'disenos': { nombre: 'Diseños' },
    'lineas': { nombre: 'Líneas' }
};

// DOM Elements
let welcomeText, logoutBtn, serviceForm, submitBtn, confirmationCard, serviceCard;

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log('Panel de trabajo cargando...');

    // Initialize Firebase and Auth
    if (typeof authFunctions === 'undefined' || !authFunctions.initAuth()) {
        alert('Error crítico: No se pudo inicializar el sistema de autenticación.');
        window.location.href = 'index.html';
        return;
    }
    firebaseDB = firebase.firestore();

    // Check user session
    currentUser = authFunctions.getCurrentUser();
    if (!currentUser) {
        console.log('No user session found, redirecting to login.');
        window.location.href = 'index.html';
        return;
    }

    console.log(`Sesión activa: ${currentUser.nombre} (${currentUser.rol})`);

    // Cache DOM elements
    cacheDOMElements();

    // Setup UI and event listeners
    setupInterface();
    setupEventListeners();

    // Initial data load and summary update
    await updateSummary();
});

function cacheDOMElements() {
    welcomeText = document.getElementById('welcomeText');
    logoutBtn = document.getElementById('logoutBtn');
    serviceForm = document.getElementById('serviceForm');
    submitBtn = document.getElementById('submitBtn');
    confirmationCard = document.getElementById('confirmationCard');
    serviceCard = document.getElementById('serviceCard');
}

function setupInterface() {
    const roleBadge = currentUser.rol === 'administrador' ? ' 👑' : '';
    welcomeText.innerHTML = `<i class="bi bi-person-circle me-1"></i>${currentUser.nombre}${roleBadge}`;

    document.getElementById('currentBarbero').innerHTML =
        `<i class="bi bi-person-check me-2"></i>${currentUser.nombre}`;

}

function setupEventListeners() {
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceSubmit);
    }

    document.getElementById('servicioPrincipal')?.addEventListener('change', updateServicePreview);
    document.getElementById('servicioAdicional')?.addEventListener('change', updateServicePreview);
    document.getElementById('montoCobrado')?.addEventListener('input', updateServicePreview);

    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => authFunctions.logout());
    }

    // Event listeners for period tabs
    document.getElementById('btn-dia')?.addEventListener('click', () => changePeriod('dia'));
    document.getElementById('btn-semana')?.addEventListener('click', () => changePeriod('semana'));
    document.getElementById('btn-mes')?.addEventListener('click', () => changePeriod('mes'));
}


// --- DATA FUNCTIONS (FIRESTORE) ---

async function guardarServicioFirestore(serviceData) {
    try {
        // Add user and timestamp info
        const dataToSave = {
            ...serviceData,
            userId: currentUser.uid,
            barberoNombre: currentUser.nombre,
            fechaTimestamp: firebase.firestore.FieldValue.serverTimestamp()
        };
        await firebaseDB.collection('servicios').add(dataToSave);
        console.log('Servicio guardado en Firestore');
        return true;
    } catch (error) {
        console.error('Error guardando servicio en Firestore:', error);
        alert('Error al guardar el servicio. Por favor, inténtalo de nuevo.');
        return false;
    }
}

async function getServiciosPorPeriodo(userId, period) {
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
            .where('userId', '==', userId)
            .where('fecha', '>=', startDate)
            .orderBy('fecha', 'desc')
            .get();

        const services = [];
        querySnapshot.forEach(doc => {
            services.push({ id: doc.id, ...doc.data() });
        });
        return services;
    } catch (error) {
        console.error('Error obteniendo servicios por período:', error);
        return [];
    }
}

async function getAdelantosPendientes(userId) {
    try {
        const adelantosRef = firebaseDB.collection('adelantos');
        const querySnapshot = await adelantosRef
            .where('userId', '==', userId)
            .where('estado', '==', 'pendiente')
            .get();

        let totalAdelantos = 0;
        querySnapshot.forEach(doc => {
            totalAdelantos += doc.data().monto;
        });
        return totalAdelantos;
    } catch (error) {
        console.error('Error obteniendo adelantos pendientes:', error);
        return 0;
    }
}


// --- UI AND LOGIC FUNCTIONS ---

async function changePeriod(period) {
    currentPeriod = period;

    // Update active button
    document.querySelectorAll('.period-tabs .btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${period}`).classList.add('active');

    // Update labels
    const labels = {
        'dia': { recaudado: 'Mi parte recaudada hoy', servicios: 'Servicios hoy', titulo: 'Mis Servicios de Hoy', neto: 'Mi parte hoy menos adelantos' },
        'semana': { recaudado: 'Mi parte recaudada esta semana', servicios: 'Servicios esta semana', titulo: 'Mis Servicios de esta Semana', neto: 'Mi parte esta semana menos adelantos' },
        'mes': { recaudado: 'Mi parte recaudada este mes', servicios: 'Servicios este mes', titulo: 'Mis Servicios de este Mes', neto: 'Mi parte este mes menos adelantos' }
    };

    document.getElementById('labelRecaudado').textContent = labels[period].recaudado;
    document.getElementById('labelServicios').textContent = labels[period].servicios;
    document.getElementById('tituloServicios').textContent = labels[period].titulo;
    document.getElementById('netoDescription').textContent = labels[period].neto;

    await updateSummary();
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const formData = getServiceFormData();
    if (!validateServiceFormData(formData)) return;

    setServiceLoading(true);

    const success = await guardarServicioFirestore(formData);

    if (success) {
        showServiceConfirmation(formData);
        await updateSummary();
        console.log('Servicio registrado:', formData);
    }

    setServiceLoading(false);
}

function getServiceFormData() {
    const principal = document.getElementById('servicioPrincipal').value;
    const adicional = document.getElementById('servicioAdicional').value;
    const montoCobrado = parseFloat(document.getElementById('montoCobrado').value);

    const serviciosSeleccionados = [servicios[principal].nombre];
    if (adicional) serviciosSeleccionados.push(servicios[adicional].nombre);

    return {
        servicios: serviciosSeleccionados,
        montoCobrado: montoCobrado,
        formaPago: document.getElementById('formaPago').value,
        formaPagoTexto: document.getElementById('formaPago').options[document.getElementById('formaPago').selectedIndex].text,
        notas: document.getElementById('notas').value.trim() || null,
        fecha: new Date(), // Storing as JS Date, Firestore will convert to its timestamp
        fechaTexto: new Date().toLocaleString('es-CL')
    };
}

function validateServiceFormData(data) {
    if (!data.servicios.length || data.servicios[0] === undefined) {
        alert('Debes seleccionar al menos un servicio principal');
        return false;
    }
    if (!data.montoCobrado || data.montoCobrado <= 0) {
        alert('Debes ingresar un monto válido');
        return false;
    }
    if (!data.formaPago) {
        alert('Debes seleccionar una forma de pago');
        return false;
    }
    return true;
}

function getComision(rol) {
    return rol === 'administrador' ? 1.0 : 0.5;
}

async function updateSummary() {
    const serviciosPeriodo = await getServiciosPorPeriodo(currentUser.uid, currentPeriod);
    const totalCobrado = serviciosPeriodo.reduce((sum, s) => sum + s.montoCobrado, 0);
    const comision = getComision(currentUser.rol);
    const miParte = totalCobrado * comision;

    const adelantos = await getAdelantosPendientes(currentUser.uid);
    const totalNeto = miParte - adelantos;

    document.getElementById('totalRecaudado').textContent = `$${miParte.toLocaleString()}`;
    document.getElementById('serviciosPeriodo').textContent = serviciosPeriodo.length;
    document.getElementById('adelantosPendientes').textContent = `$${adelantos.toLocaleString()}`;
    document.getElementById('totalNeto').textContent = `$${totalNeto.toLocaleString()}`;
    document.getElementById('totalServiciosPeriodo').textContent = `${serviciosPeriodo.length} servicios`;

    // Update net total card color
    const netoElement = document.querySelector('#totalNeto').closest('.card-body');
    if (netoElement) {
        netoElement.style.background = totalNeto < 0
            ? 'linear-gradient(135deg, #dc3545, #c82333)'
            : 'linear-gradient(135deg, #28a745, #20c997)';
    }

    displayServicesList(serviciosPeriodo);
}

function displayServicesList(servicios) {
    const container = document.getElementById('serviciosDelDia');
    if (!container) return;

    if (servicios.length === 0) {
        container.innerHTML = `
            <div class="text-center text-muted py-4">
                <i class="bi bi-inbox display-4 mb-3"></i>
                <p>No hay servicios registrados en este período</p>
                <button class="btn btn-primary" onclick="goToRegistro()">
                    <i class="bi bi-plus-circle me-2"></i>
                    Registrar Primer Servicio
                </button>
            </div>
        `;
        return;
    }

    container.innerHTML = servicios.map((servicio, index) => {
        const serviciosList = servicio.servicios.join(' + ');
        const fechaFormateada = new Date(servicio.fecha.seconds * 1000).toLocaleString('es-CL');
        const comision = getComision(currentUser.rol);
        const miParte = servicio.montoCobrado * comision;

        return `
            <div class="service-item fade-in">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="d-flex align-items-center">
                        <span class="service-number me-3">${index + 1}</span>
                        <div>
                            <h6 class="mb-1">${serviciosList}</h6>
                            <small class="text-muted">
                                <i class="bi bi-clock me-1"></i>${fechaFormateada}
                                <i class="bi bi-credit-card ms-2 me-1"></i>${servicio.formaPagoTexto}
                            </small>
                        </div>
                    </div>
                    <div class="text-end">
                        <div class="fw-bold text-success">$${servicio.montoCobrado.toLocaleString()}</div>
                        <small class="text-muted">Total cobrado</small>
                        <div class="small text-primary">Mi parte: $${miParte.toLocaleString()}</div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}


// --- HELPER & UI FUNCTIONS ---

function updateServicePreview() {
    const principal = document.getElementById('servicioPrincipal').value;
    const adicional = document.getElementById('servicioAdicional').value;
    const monto = parseFloat(document.getElementById('montoCobrado').value) || 0;

    let descripcion = [];
    if (principal && servicios[principal]) descripcion.push(servicios[principal].nombre);
    if (adicional && servicios[adicional]) descripcion.push(servicios[adicional].nombre);

    const servicePreview = document.getElementById('servicePreview');
    if (descripcion.length > 0 && monto > 0) {
        servicePreview.style.display = 'block';
        document.getElementById('serviceDescription').textContent = descripcion.join(' + ');
        document.getElementById('previewAmount').textContent = `$${monto.toLocaleString()}`;
    } else {
        servicePreview.style.display = 'none';
    }
}

function showServiceConfirmation(data) {
    const serviciosList = data.servicios.join(' + ');

    document.getElementById('confirmationDetails').innerHTML = `
        <div class="text-start">
            <p><strong>Barbero:</strong> ${currentUser.nombre}</p>
            <p><strong>Servicios:</strong> ${serviciosList}</p>
            <p><strong>Monto cobrado:</strong> $${data.montoCobrado.toLocaleString()}</p>
            <p><strong>Forma de pago:</strong> ${data.formaPagoTexto}</p>
            ${data.notas ? `<p><strong>Notas:</strong> ${data.notas}</p>` : ''}
        </div>
    `;

    serviceCard.style.display = 'none';
    confirmationCard.style.display = 'block';
}

function resetForm() {
    serviceForm.reset();
    document.getElementById('servicePreview').style.display = 'none';
    confirmationCard.style.display = 'none';
    serviceCard.style.display = 'block';
}

function setServiceLoading(loading) {
    if (loading) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="bi bi-arrow-clockwise loading-spinner me-2"></i>Guardando...';
    } else {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-check-circle me-2"></i>Registrar Servicio';
    }
}

function goToSummary() {
    new bootstrap.Tab(document.getElementById('resumen-tab')).show();
}

function goToRegistro() {
    new bootstrap.Tab(document.getElementById('registro-tab')).show();
}

// Note: Admin functions are not included in this refactoring pass.
// They will be moved to a separate admin.js file later.
