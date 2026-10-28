
import { apiAdmin } from './apiAdmin.js';

const URL_LOGIN = '/admin/login.html';
const SECCIONES = ['pedidos', 'categorias', 'trabajos']; // lista cerrada: nunca viene del usuario

const pestanas = Object.fromEntries(
    SECCIONES.map((n) => [n, document.getElementById(`tab-${n}`)])
);
const paneles = Object.fromEntries(
    SECCIONES.map((n) => [n, document.getElementById(`seccion-${n}`)])
);
const cargadas = new Set();
const contador = document.getElementById('contador-pedidos');

// Número de pedidos nuevos junto a la pestaña "Pedidos"
function mostrarPendientes(cantidad) {
    contador.hidden = cantidad === 0;
    contador.textContent = String(cantidad);
    contador.title = cantidad === 1 ? '1 pedido nuevo' : `${cantidad} pedidos nuevos`;
}

async function mostrar(nombre) {
    SECCIONES.forEach((n) => {
        const activa = n === nombre;
        pestanas[n].setAttribute('aria-selected', String(activa));
        pestanas[n].tabIndex = activa ? 0 : -1;
        paneles[n].hidden = !activa;
    });
    history.replaceState(null, '', `#${nombre}`);

    if (cargadas.has(nombre)) return;
    cargadas.add(nombre);
    paneles[nombre].textContent = 'Cargando…';

    try {
        const modulo = await import(`./componentes/${nombre}.js`);
        await modulo.iniciar(paneles[nombre], { alCambiarPendientes: mostrarPendientes });
    } catch (error) {
        console.error(error);
        cargadas.delete(nombre);
        paneles[nombre].textContent =
            'Esta sección no pudo cargarse. Recargá la página para intentar de nuevo.';
    }
}

// ---------- Pestañas (clic y flechas del teclado) ----------
SECCIONES.forEach((nombre) => {
    pestanas[nombre].addEventListener('click', () => mostrar(nombre));
});

document.querySelector('.pestanas').addEventListener('keydown', (evento) => {
    const paso = { ArrowRight: 1, ArrowLeft: -1 }[evento.key];
    if (!paso) return;
    const actual = SECCIONES.findIndex((n) => pestanas[n].getAttribute('aria-selected') === 'true');
    const siguiente = SECCIONES[(actual + paso + SECCIONES.length) % SECCIONES.length];
    mostrar(siguiente);
    pestanas[siguiente].focus();
});

// ---------- Salir ----------
document.getElementById('boton-salir').addEventListener('click', () => {
    apiAdmin.logout().finally(() => window.location.replace(URL_LOGIN));
});

// ---------- Inicio: sin sesión se vuelve al login ----------
apiAdmin
    .sesion()
    .then(({ usuario }) => {
        document.getElementById('nombre-usuario').textContent = usuario;
        const deLaUrl = window.location.hash.replace('#', '');
        mostrar(SECCIONES.includes(deLaUrl) ? deLaUrl : 'pedidos');
    })
    .catch(() => window.location.replace(URL_LOGIN));