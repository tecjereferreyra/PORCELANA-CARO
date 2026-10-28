// =====================================================================
//  js/admin/login.js  |  Pantalla de ingreso al panel
// =====================================================================
import { apiAdmin } from './apiAdmin.js';

const PANEL = '/admin/panel.html';

const form = document.getElementById('form-login');
const estado = document.getElementById('estado-login');
const boton = document.getElementById('boton-login');
const campoClave = document.getElementById('clave');
const mostrarClave = document.getElementById('mostrar-clave');

function decir(texto, tipo = '') {
    estado.className = `estado${tipo ? ` estado--${tipo}` : ''}`;
    estado.textContent = texto;
}

// Si ya hay una sesión abierta se pasa directo al panel
apiAdmin
    .sesion()
    .then(() => window.location.replace(PANEL))
    .catch(() => {
        // sin sesión: se queda en el login
    });

mostrarClave.addEventListener('change', () => {
    campoClave.type = mostrarClave.checked ? 'text' : 'password';
});

form.addEventListener('submit', async (evento) => {
    evento.preventDefault();

    const usuario = form.elements.usuario.value.trim();
    const clave = campoClave.value; // la contraseña no se recorta ni se modifica

    if (!usuario || !clave) {
        decir('Completá el usuario y la contraseña.', 'error');
        return;
    }

    boton.disabled = true;
    boton.textContent = 'Ingresando…';
    decir('');

    try {
        await apiAdmin.login(usuario, clave);
        window.location.assign(PANEL);
    } catch (error) {
        decir(error.message, 'error');
        campoClave.value = '';
        campoClave.focus();
        boton.disabled = false;
        boton.textContent = 'Ingresar';
    }
});