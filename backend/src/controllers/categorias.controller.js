
const asyncHandler = require('../middlewares/asyncHandler');
const categoriasService = require('../services/categorias.service');

// GET /api/admin/categorias
const listar = asyncHandler(async (req, res) => {
    const datos = await categoriasService.listarCategorias();
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, datos });
});

// POST /api/admin/categorias   body: { nombre, orden? }
const crear = asyncHandler(async (req, res) => {
    const datos = await categoriasService.crearCategoria(req.datos);
    res.status(201).json({ ok: true, datos });
});

// PUT /api/admin/categorias/:id   body: { nombre, orden, activo }
const actualizar = asyncHandler(async (req, res) => {
    const { id, ...cambios } = req.datos;
    await categoriasService.actualizarCategoria(id, cambios);
    res.json({ ok: true });
});

module.exports = { listar, crear, actualizar };