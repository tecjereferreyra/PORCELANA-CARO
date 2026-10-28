
import { ErrorApi } from '../api.js';

const URL_LOGIN = '/admin/login.html';

async function pedir(url, { metodo = 'GET', cuerpo, redirigir401 = true } = {}) {
    const opciones = {
        method: metodo,
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'X-Requested-With': 'fetch' }
    };

    if (cuerpo instanceof FormData) {
        opciones.body = cuerpo; // el navegador agrega el Content-Type con su "boundary"
    } else if (cuerpo !== undefined) {
        opciones.headers['Content-Type'] = 'application/json';
        opciones.body = JSON.stringify(cuerpo);
    }

    let respuesta;
    try {
        respuesta = await fetch(url, opciones);
    } catch {
        throw new ErrorApi('No hay conexión. Revisá tu internet e intentá de nuevo.');
    }

    let datosRespuesta = null;
    try {
        datosRespuesta = await respuesta.json();
    } catch {
        // el servidor no devolvió JSON
    }

    if (respuesta.status === 401 && redirigir401) {
        window.location.assign(URL_LOGIN);
        throw new ErrorApi('Tu sesión venció. Volvé a ingresar.', 401);
    }

    if (!respuesta.ok || !datosRespuesta || datosRespuesta.ok === false) {
        throw new ErrorApi(
            (datosRespuesta && datosRespuesta.mensaje) || 'Algo salió mal. Probá de nuevo en un momento.',
            respuesta.status,
            (datosRespuesta && datosRespuesta.detalles) || []
        );
    }
    return datosRespuesta.datos;
}

export const apiAdmin = {
    // ---- Sesión ----
    login: (usuario, clave) =>
        pedir('/api/admin/login', {
            metodo: 'POST',
            cuerpo: { usuario, clave },
            redirigir401: false // un 401 acá significa "clave incorrecta", no "sesión vencida"
        }),
    logout: () => pedir('/api/admin/logout', { metodo: 'POST', redirigir401: false }),
    sesion: () => pedir('/api/admin/sesion', { redirigir401: false }),

    // ---- Pedidos ----
    estados: () => pedir('/api/admin/estados'),
    pedidos: (estadoId = null) =>
        pedir(estadoId ? `/api/admin/pedidos?estado=${encodeURIComponent(estadoId)}` : '/api/admin/pedidos'),
    cambiarEstadoPedido: (id, estadoId) =>
        pedir(`/api/admin/pedidos/${id}/estado`, { metodo: 'PATCH', cuerpo: { estadoId } }),

    // ---- Categorías ----
    categorias: () => pedir('/api/admin/categorias'),
    crearCategoria: (datos) => pedir('/api/admin/categorias', { metodo: 'POST', cuerpo: datos }),
    actualizarCategoria: (id, datos) =>
        pedir(`/api/admin/categorias/${id}`, { metodo: 'PUT', cuerpo: datos }),

    // ---- Trabajos (los formularios con imagen se envían como FormData) ----
    trabajos: () => pedir('/api/admin/trabajos'),
    crearTrabajo: (formData) => pedir('/api/admin/trabajos', { metodo: 'POST', cuerpo: formData }),
    actualizarTrabajo: (id, formData) =>
        pedir(`/api/admin/trabajos/${id}`, { metodo: 'PUT', cuerpo: formData }),
    eliminarTrabajo: (id) => pedir(`/api/admin/trabajos/${id}`, { metodo: 'DELETE' })
};