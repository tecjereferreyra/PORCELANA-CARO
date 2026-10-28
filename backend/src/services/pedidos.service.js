
const { ejecutarSP } = require('../config/db');
const { AppError } = require('../middlewares/errores');
const { enlaceDePedido, enlaceParaCliente } = require('../utils/whatsapp');


async function crearPedido(datos) {
    // Si eligió un trabajo de la galería, se busca por slug para obtener su id y nombre
    let trabajo = null;
    if (datos.trabajo) {
        const filas = await ejecutarSP('sp_trabajo_obtener', [datos.trabajo]);
        if (filas.length === 0) {
            throw new AppError('El trabajo seleccionado no existe', 400);
        }
        trabajo = filas[0];
    }

    const filas = await ejecutarSP('sp_pedido_crear', [
        datos.nombre,
        datos.telefono,
        datos.email,
        trabajo ? trabajo.trabajo_id : null,
        datos.descripcion,
        datos.cantidad,
        datos.fechaNecesaria
    ]);

    // Los SP escalares devuelven una columna con el nombre del SP
    const pedidoId = filas[0].sp_pedido_crear;

    const whatsapp = enlaceDePedido({
        pedidoId,
        nombre: datos.nombre,
        telefono: datos.telefono,
        trabajo: trabajo ? trabajo.nombre : null,
        trabajoSlug: trabajo ? trabajo.slug : null,
        cantidad: datos.cantidad,
        fechaNecesaria: datos.fechaNecesaria,
        descripcion: datos.descripcion
    });

    return { pedidoId, whatsapp };
}

// ---------------------------------------------------------------------
//  Panel de administración
// ---------------------------------------------------------------------

// Estados posibles de un pedido (para el filtro y el selector)
async function listarEstados() {
    const filas = await ejecutarSP('sp_estados_listar');
    return filas.map((e) => ({ id: e.estado_id, nombre: e.nombre }));
}

// Todos los pedidos (el más nuevo primero), opcionalmente de un solo estado.
// Cada uno trae `whatsapp`: enlace al chat del cliente con su pedido resumido.
async function listarPedidos(estadoId = null) {
    const filas = await ejecutarSP('sp_pedidos_listar', [estadoId]);
    return filas.map((p) => ({
        id: p.pedido_id,
        cliente: p.cliente,
        telefono: p.telefono,
        email: p.email,
        trabajo: p.trabajo,
        descripcion: p.descripcion,
        cantidad: p.cantidad,
        fechaNecesaria: p.fecha_necesaria,
        estadoId: p.estado_id,
        estado: p.estado,
        creadoEn: p.creado_en,
        whatsapp: enlaceParaCliente(p)
    }));
}

async function cambiarEstado(pedidoId, estadoId) {
    const filas = await ejecutarSP('sp_pedido_cambiar_estado', [pedidoId, estadoId]);
    if (!filas[0].sp_pedido_cambiar_estado) {
        throw new AppError('Pedido no encontrado', 404);
    }
}

module.exports = { crearPedido, listarEstados, listarPedidos, cambiarEstado };