
const asyncHandler = require('../middlewares/asyncHandler');
const logger = require('../middlewares/logger');
const pedidosService = require('../services/pedidos.service');

// POST /api/pedidos
const crear = asyncHandler(async (req, res) => {
   
    if (req.datos.sitioWeb) {
        logger.info(`Pedido descartado por honeypot (ip=${req.ip})`);
        return res.status(201).json({ ok: true, datos: { pedidoId: null, whatsapp: null } });
    }

    const { sitioWeb, ...datos } = req.datos;
    const resultado = await pedidosService.crearPedido(datos);

    res.set('Cache-Control', 'no-store');
    res.status(201).json({ ok: true, datos: resultado });
});

// ---------------------------------------------------------------------
//  Panel de administración (rutas protegidas en admin.routes.js)
// ---------------------------------------------------------------------

// GET /api/admin/estados
const estados = asyncHandler(async (req, res) => {
    const datos = await pedidosService.listarEstados();
    res.json({ ok: true, datos });
});

// GET /api/admin/pedidos            -> todos
// GET /api/admin/pedidos?estado=1   -> solo los de ese estado
const listarAdmin = asyncHandler(async (req, res) => {
    const datos = await pedidosService.listarPedidos(req.datos.estado);
    res.set('Cache-Control', 'no-store'); // datos de clientes: nunca al caché
    res.json({ ok: true, datos });
});

// PATCH /api/admin/pedidos/:id/estado   body: { "estadoId": 2 }
const cambiarEstado = asyncHandler(async (req, res) => {
    await pedidosService.cambiarEstado(req.datos.id, req.datos.estadoId);
    res.json({ ok: true });
});

module.exports = { crear, estados, listarAdmin, cambiarEstado };