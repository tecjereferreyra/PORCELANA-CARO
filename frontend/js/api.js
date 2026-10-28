

export class ErrorApi extends Error {
    constructor(mensaje, estado = 0, detalles = []) {
        super(mensaje);
        this.name = 'ErrorApi';
        this.estado = estado;
        this.detalles = detalles; // [{ campo, mensaje }] cuando falla la validación
    }
}

async function pedir(url, opciones = {}) {
    let respuesta;
    try {
        respuesta = await fetch(url, {
            ...opciones,
            headers: {
                Accept: 'application/json',
                ...(opciones.body ? { 'Content-Type': 'application/json' } : {})
            }
        });
    } catch {
        throw new ErrorApi('No hay conexión. Revisá tu internet e intentá de nuevo.');
    }

    let cuerpo = null;
    try {
        cuerpo = await respuesta.json();
    } catch {
        // el servidor no devolvió JSON (caído, reiniciándose, etc.)
    }

    if (!respuesta.ok || !cuerpo || cuerpo.ok === false) {
        throw new ErrorApi(
            (cuerpo && cuerpo.mensaje) || 'Algo salió mal. Probá de nuevo en un momento.',
            respuesta.status,
            (cuerpo && cuerpo.detalles) || []
        );
    }
    return cuerpo.datos;
}

export const api = {
    categorias: () => pedir('/api/categorias'),

    trabajos: (categoriaSlug = null) =>
        pedir(
            categoriaSlug
                ? `/api/trabajos?categoria=${encodeURIComponent(categoriaSlug)}`
                : '/api/trabajos'
        ),

    trabajo: (slug) => pedir(`/api/trabajos/${encodeURIComponent(slug)}`),

    // datos: { nombre, telefono, email, trabajo, cantidad, fechaNecesaria, descripcion, sitioWeb }
    crearPedido: (datos) =>
        pedir('/api/pedidos', { method: 'POST', body: JSON.stringify(datos) })
};