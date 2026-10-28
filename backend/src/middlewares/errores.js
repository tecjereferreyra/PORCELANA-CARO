
const logger = require('./logger');

// Error "esperado": se le muestra el mensaje al usuario
class AppError extends Error {
    constructor(mensaje, estado = 500, detalles = null) {
        super(mensaje);
        this.name = 'AppError';
        this.estado = estado;
        this.detalles = detalles;
    }
}

// 404 para rutas que no existen (va después de todas las rutas)
function noEncontrado(req, res, next) {
    next(new AppError('Recurso no encontrado', 404));
}

// Traduce errores de PostgreSQL (por código SQLSTATE) a respuestas claras
function traducirErrorPG(err) {
    switch (err.code) {
        case '22023': // validación lanzada por nuestros SP (mensaje en español)
            return new AppError(err.message, 400);
        case '23505': // unique_violation
            return new AppError('Ya existe un registro con esos datos', 409);
        case '23514': // check_violation
            return new AppError('Los datos no cumplen las reglas de validación', 400);
        case '23503': // foreign_key_violation
            return new AppError('Alguno de los datos seleccionados no es válido', 400);
        case '22001': // string_data_right_truncation
            return new AppError('Alguno de los textos es demasiado largo', 400);
        case '22P02': // invalid_text_representation
            return new AppError('Alguno de los datos tiene un formato inválido', 400);
        default:
            return null;
    }
}

// Errores de Express, multer, etc.
function traducirOtros(err) {
    if (err.type === 'entity.parse.failed') {
        return new AppError('El cuerpo de la petición no es un JSON válido', 400);
    }
    if (err.type === 'entity.too.large') {
        return new AppError('La petición es demasiado grande', 413);
    }
    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return new AppError('La imagen supera el tamaño máximo permitido', 400);
        }
        return new AppError('No se pudo procesar el archivo enviado', 400);
    }
    return null;
}

// Manejador final (4 parámetros: así Express lo reconoce como de errores)
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
    if (res.headersSent) {
        return next(err);
    }

    let error = err instanceof AppError ? err : traducirErrorPG(err) || traducirOtros(err);

    if (!error) {
        // Error no previsto: se registra completo, al usuario no se le muestra el detalle
        logger.error(`${req.method} ${req.originalUrl}`, err);
        error = new AppError('Error interno del servidor', 500);
    }

    const respuesta = { ok: false, mensaje: error.message };
    if (error.detalles) {
        respuesta.detalles = error.detalles;
    }
    res.status(error.estado).json(respuesta);
}

module.exports = { AppError, noEncontrado, manejadorErrores };