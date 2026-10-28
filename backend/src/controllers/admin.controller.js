// =====================================================================
//  controllers/admin.controller.js  |  Sesión del panel
//  login, logout y "quién soy" (para que el front sepa si hay sesión).
// =====================================================================
const asyncHandler = require('../middlewares/asyncHandler');
const { emitirSesion, cerrarSesion } = require('../middlewares/auth');
const adminService = require('../services/admin.service');

// POST /api/admin/login
const login = asyncHandler(async (req, res) => {
    const admin = await adminService.iniciarSesion(req.datos.usuario, req.datos.clave);
    emitirSesion(res, admin); // deja el token en la cookie httpOnly
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, datos: { usuario: admin.usuario } });
});

// POST /api/admin/logout
const logout = (req, res) => {
    cerrarSesion(res);
    res.json({ ok: true });
};

// GET /api/admin/sesion  (ruta protegida: si llega acá, la sesión es válida)
const sesion = (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json({ ok: true, datos: { usuario: req.admin.usuario } });
};

module.exports = { login, logout, sesion };