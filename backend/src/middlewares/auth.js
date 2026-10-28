
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { AppError } = require('./errores');

const SECRETO = process.env.JWT_SECRET;
if (!SECRETO || SECRETO.length < 32) {
    throw new Error('JWT_SECRET falta en el .env o es demasiado corto (mínimo 32 caracteres)');
}

const NOMBRE_COOKIE = 'sesion_admin';

// JWT_EXPIRA acepta formatos como 30m, 8h, 7d
function aMilisegundos(texto) {
    const m = /^(\d+)\s*([mhd])$/.exec(texto);
    if (!m) throw new Error('JWT_EXPIRA inválido (ejemplos: 30m, 8h, 7d)');
    const unidad = { m: 60 * 1000, h: 60 * 60 * 1000, d: 24 * 60 * 60 * 1000 };
    return Number(m[1]) * unidad[m[2]];
}

const DURACION_MS = aMilisegundos(process.env.JWT_EXPIRA || '8h');

const opcionesCookie = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // HTTPS en Render
    sameSite: 'strict', // la cookie no viaja en peticiones desde otros sitios
    path: '/'
};

// Crea el token y lo deja en la cookie (lo usa el controller de login)
function emitirSesion(res, admin) {
    const token = jwt.sign(
        { sub: String(admin.administrador_id), usuario: admin.usuario },
        SECRETO,
        { algorithm: 'HS256', expiresIn: Math.floor(DURACION_MS / 1000) }
    );
    res.cookie(NOMBRE_COOKIE, token, { ...opcionesCookie, maxAge: DURACION_MS });
}

function cerrarSesion(res) {
    res.clearCookie(NOMBRE_COOKIE, opcionesCookie);
}

const METODOS_SEGUROS = ['GET', 'HEAD', 'OPTIONS'];

// Protege las rutas del panel
function requiereAdmin(req, res, next) {

    if (!METODOS_SEGUROS.includes(req.method) && req.get('x-requested-with') !== 'fetch') {
        return next(new AppError('Petición no permitida', 403));
    }

    const token = req.cookies && req.cookies[NOMBRE_COOKIE];
    if (!token) {
        return next(new AppError('Necesitás iniciar sesión', 401));
    }

    try {
        const payload = jwt.verify(token, SECRETO, { algorithms: ['HS256'] });
        req.admin = { id: Number(payload.sub), usuario: payload.usuario };
        next();
    } catch (err) {
        next(new AppError('Tu sesión venció, iniciá sesión nuevamente', 401));
    }
}

module.exports = { requiereAdmin, emitirSesion, cerrarSesion, NOMBRE_COOKIE };