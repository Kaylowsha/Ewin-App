// public/index.js

document.addEventListener('DOMContentLoaded', () => {
    console.log('Login page loaded.');

    // Initialize Firebase Auth
    if (typeof authFunctions === 'undefined' || !authFunctions.initAuth()) {
        displayAlert('Error crítico: No se pudo inicializar el sistema de autenticación.', 'danger');
        return;
    }

    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            // Basic validation
            if (!email || !password) {
                displayAlert('Por favor, ingresa tu correo y contraseña.', 'warning');
                return;
            }

            // Disable button
            loginBtn.disabled = true;
            loginBtn.innerHTML = '<i class="bi bi-arrow-clockwise loading-spinner me-2"></i>Iniciando Sesión...';

            try {
                await authFunctions.login(email, password);
                // Redirect is handled by auth.js
            } catch (error) {
                console.error('Login failed:', error);
                displayAlert(error.message, 'danger');

                // Re-enable button
                loginBtn.disabled = false;
                loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Iniciar Sesión';
            }
        });
    }
});

function displayAlert(message, type = 'danger') {
    const alertContainer = document.getElementById('alert-container');
    if (alertContainer) {
        const alertHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        alertContainer.innerHTML = alertHTML;
    }
}
