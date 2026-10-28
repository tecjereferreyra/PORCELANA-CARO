
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { validar } = require('../middlewares/validar');
const pedidosController = require('../controllers/pedidos.controller');

const router = Router();

// Máximo 5 pedidos por IP por hora. Los intentos con datos inválidos
// (respuestas 4xx) no cuentan, para no castigar a quien se equivoca al escribir.
const limitadorPedidos = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: 5,
    skipFailedRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            ok: false,
            mensaje: 'Enviaste varios pedidos seguidos. Probá de nuevo en un rato o escribinos por WhatsApp'
        });
    }
});

const esquemaPedido = {
    nombre: { tipo: 'texto', min: 2, max: 100, etiqueta: 'El nombre' },
    telefono: { tipo: 'telefono', etiqueta: 'El teléfono' },
    email: { tipo: 'email', requerido: false, etiqueta: 'El email' },
    // slug del modelo elegido en la galería (opcional: también se puede pedir algo a medida)
    trabajo: { tipo: 'texto', min: 1, max: 100, requerido: false, etiqueta: 'El modelo' },
    descripcion: { tipo: 'texto', min: 10, max: 1000, multilinea: true, etiqueta: 'La descripción' },
    cantidad: { tipo: 'entero', min: 1, max: 500, defecto: 1, etiqueta: 'La cantidad' },
    fechaNecesaria: { tipo: 'fecha', futura: true, requerido: false, etiqueta: 'La fecha' },
    // honeypot: campo oculto que solo completan los bots
    sitioWeb: { tipo: 'texto', min: 1, max: 200, requerido: false, etiqueta: 'El campo' }
};

// POST /api/pedidos
router.post('/pedidos', limitadorPedidos, validar(esquemaPedido), pedidosController.crear);

module.exports = router;