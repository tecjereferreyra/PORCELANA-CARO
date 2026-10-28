
const { Router } = require('express');
const { validar } = require('../middlewares/validar');
const trabajosController = require('../controllers/trabajos.controller');

const router = Router();

// ?categoria=flores (opcional)
const esquemaFiltro = {
    categoria: { tipo: 'texto', min: 1, max: 60, requerido: false, etiqueta: 'La categoría' }
};

// /trabajos/:slug
const esquemaSlug = {
    slug: { tipo: 'texto', min: 1, max: 100, etiqueta: 'El trabajo' }
};

// GET /api/categorias
router.get('/categorias', trabajosController.listarCategorias);

// GET /api/trabajos  y  GET /api/trabajos?categoria=flores
router.get('/trabajos', validar(esquemaFiltro, 'query'), trabajosController.listarTrabajos);

// GET /api/trabajos/pescador-con-cana
router.get('/trabajos/:slug', validar(esquemaSlug, 'params'), trabajosController.obtenerTrabajo);

module.exports = router;