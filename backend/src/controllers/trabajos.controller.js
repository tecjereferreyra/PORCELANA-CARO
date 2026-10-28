
const asyncHandler = require('../middlewares/asyncHandler');
const trabajosService = require('../services/trabajos.service');

// La galería cambia poco: el navegador puede guardarla 1 minuto
const CACHE_PUBLICO = 'public, max-age=60';

// GET /api/categorias
const listarCategorias = asyncHandler(async (req, res) => {
    const datos = await trabajosService.listarCategorias();
    res.set('Cache-Control', CACHE_PUBLICO);
    res.json({ ok: true, datos });
});

// GET /api/trabajos            -> toda la galería
// GET /api/trabajos?categoria=flores
const listarTrabajos = asyncHandler(async (req, res) => {
    const datos = await trabajosService.listarTrabajos(req.datos.categoria);
    res.set('Cache-Control', CACHE_PUBLICO);
    res.json({ ok: true, datos });
});

// GET /api/trabajos/:slug
const obtenerTrabajo = asyncHandler(async (req, res) => {
    const datos = await trabajosService.obtenerTrabajo(req.datos.slug);
    res.set('Cache-Control', CACHE_PUBLICO);
    res.json({ ok: true, datos });
});

// ---------------------------------------------------------------------
//  Panel de administración (rutas protegidas en admin.routes.js)
// ---------------------------------------------------------------------

// GET /api/admin/trabajos
const listarAdmin = asyncHandler(async (req, res) => {
    const datos = await trabajosService.listarTrabajosAdmin();
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, datos });
});

// POST /api/admin/trabajos   (multipart: imagen + campos de texto)
const crearTrabajo = asyncHandler(async (req, res) => {
    const datos = await trabajosService.crearTrabajo(req.datos, req.file);
    res.status(201).json({ ok: true, datos });
});

// PUT /api/admin/trabajos/:id   (multipart; la imagen es opcional)
const actualizarTrabajo = asyncHandler(async (req, res) => {
    const { id, ...cambios } = req.datos;
    await trabajosService.actualizarTrabajo(id, cambios, req.file);
    res.json({ ok: true });
});

// DELETE /api/admin/trabajos/:id
const eliminarTrabajo = asyncHandler(async (req, res) => {
    await trabajosService.eliminarTrabajo(req.datos.id);
    res.json({ ok: true });
});

module.exports = {
    listarCategorias,
    listarTrabajos,
    obtenerTrabajo,
    listarAdmin,
    crearTrabajo,
    actualizarTrabajo,
    eliminarTrabajo
};