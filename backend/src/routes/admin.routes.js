
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { requiereAdmin } = require('../middlewares/auth');
const { validar, esquemaId } = require('../middlewares/validar');
const adminController = require('../controllers/admin.controller');
const pedidosController = require('../controllers/pedidos.controller');
const categoriasController = require('../controllers/categorias.controller');
const trabajosController = require('../controllers/trabajos.controller');
const { subida } = require('../middlewares/subida');

const router = Router();

// Máximo 5 intentos FALLIDOS por IP cada 15 minutos (los logins correctos no cuentan)
const limitadorLogin = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    skipSuccessfulRequests: true,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            ok: false,
            mensaje: 'Demasiados intentos fallidos. Esperá 15 minutos e intentá de nuevo'
        });
    }
});

const esquemaLogin = {
    usuario: { tipo: 'texto', min: 3, max: 40, etiqueta: 'El usuario' },
    clave: { tipo: 'clave', min: 1, max: 72, etiqueta: 'La contraseña' }
};

// ---- Públicas ----
router.post('/login', limitadorLogin, validar(esquemaLogin), adminController.login);
router.post('/logout', adminController.logout);

// ---- Protegidas (desde acá hace falta sesión) ----
router.use(requiereAdmin);

router.get('/sesion', adminController.sesion);

// ---- Pedidos ----
const esquemaFiltroEstado = {
    estado: { tipo: 'entero', min: 1, max: 99, requerido: false, etiqueta: 'El estado' }
};
const esquemaCambioEstado = {
    estadoId: { tipo: 'entero', min: 1, max: 99, etiqueta: 'El estado' }
};

router.get('/estados', pedidosController.estados);
router.get('/pedidos', validar(esquemaFiltroEstado, 'query'), pedidosController.listarAdmin);
router.patch(
    '/pedidos/:id/estado',
    validar(esquemaId, 'params'),
    validar(esquemaCambioEstado),
    pedidosController.cambiarEstado
);

// ---- Categorías ----
const esquemaCategoriaNueva = {
    nombre: { tipo: 'texto', min: 2, max: 60, etiqueta: 'El nombre' },
    orden: { tipo: 'entero', min: 0, max: 1000, defecto: 0, etiqueta: 'El orden' }
};
// Al editar todo es obligatorio: así un campo omitido no pisa el valor guardado
const esquemaCategoriaEdicion = {
    nombre: { tipo: 'texto', min: 2, max: 60, etiqueta: 'El nombre' },
    orden: { tipo: 'entero', min: 0, max: 1000, etiqueta: 'El orden' },
    activo: { tipo: 'booleano', etiqueta: 'La visibilidad' }
};

router.get('/categorias', categoriasController.listar);
router.post('/categorias', validar(esquemaCategoriaNueva), categoriasController.crear);
router.put(
    '/categorias/:id',
    validar(esquemaId, 'params'),
    validar(esquemaCategoriaEdicion),
    categoriasController.actualizar
);


const esquemaTrabajoNuevo = {
    categoriaId: { tipo: 'entero', min: 1, etiqueta: 'La categoría' },
    nombre: { tipo: 'texto', min: 2, max: 80, etiqueta: 'El nombre' },
    descripcion: { tipo: 'texto', min: 5, max: 300, etiqueta: 'La descripción' },
    destacado: { tipo: 'booleano', defecto: false, etiqueta: 'Destacado' },
    orden: { tipo: 'entero', min: 0, max: 100000, defecto: 0, etiqueta: 'El orden' }
};
// Al editar todo es obligatorio: un campo omitido no pisa el valor guardado
const esquemaTrabajoEdicion = {
    categoriaId: { tipo: 'entero', min: 1, etiqueta: 'La categoría' },
    nombre: { tipo: 'texto', min: 2, max: 80, etiqueta: 'El nombre' },
    descripcion: { tipo: 'texto', min: 5, max: 300, etiqueta: 'La descripción' },
    destacado: { tipo: 'booleano', etiqueta: 'Destacado' },
    orden: { tipo: 'entero', min: 0, max: 100000, etiqueta: 'El orden' },
    activo: { tipo: 'booleano', etiqueta: 'La visibilidad' }
};

router.get('/trabajos', trabajosController.listarAdmin);
router.post(
    '/trabajos',
    subida(), // imagen obligatoria
    validar(esquemaTrabajoNuevo),
    trabajosController.crearTrabajo
);
router.put(
    '/trabajos/:id',
    validar(esquemaId, 'params'),
    subida(false), // imagen opcional: si no viene, se conserva la actual
    validar(esquemaTrabajoEdicion),
    trabajosController.actualizarTrabajo
);
router.delete('/trabajos/:id', validar(esquemaId, 'params'), trabajosController.eliminarTrabajo);

module.exports = router;