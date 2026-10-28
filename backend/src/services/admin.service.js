
const bcrypt = require('bcryptjs');
const { ejecutarSP } = require('../config/db');
const { AppError } = require('../middlewares/errores');

const COSTO_BCRYPT = 12;
const CLAVE_MIN = 10;
const CLAVE_MAX = 72; // bcrypt solo usa los primeros 72 bytes

// Hash de relleno: si el usuario no existe igual se hace una comparación,
// así la respuesta tarda lo mismo y no se puede averiguar qué usuarios existen.
const HASH_RELLENO = bcrypt.hashSync('relleno-para-igualar-tiempos', COSTO_BCRYPT);

/**
 * Verifica usuario y contraseña. Devuelve { administrador_id, usuario }.
 * El mensaje de error es el mismo si falla el usuario o la clave.
 */
async function iniciarSesion(usuario, clave) {
    const filas = await ejecutarSP('sp_admin_obtener', [usuario]);
    const admin = filas[0];

    const coincide = await bcrypt.compare(clave, admin ? admin.password_hash : HASH_RELLENO);

    if (!admin || !coincide) {
        throw new AppError('Usuario o contraseña incorrectos', 401);
    }
    return { administrador_id: admin.administrador_id, usuario: admin.usuario };
}

/**
 * Crea un administrador guardando solo el hash bcrypt.
 * Lo usa el comando `npm run crear-admin`.
 */
async function crearAdmin(usuario, clave) {
    if (typeof clave !== 'string' || clave.length < CLAVE_MIN) {
        throw new AppError(`La contraseña debe tener al menos ${CLAVE_MIN} caracteres`, 400);
    }
    if (Buffer.byteLength(clave) > CLAVE_MAX) {
        throw new AppError(`La contraseña no puede superar los ${CLAVE_MAX} caracteres`, 400);
    }

    const hash = await bcrypt.hash(clave, COSTO_BCRYPT);
    const filas = await ejecutarSP('sp_admin_crear', [usuario, hash]);
    return filas[0].sp_admin_crear; // id del administrador
}

module.exports = { iniciarSesion, crearAdmin };