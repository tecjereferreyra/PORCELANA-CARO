
const { AppError } = require('./errores');
const { normalizarTelefonoAR } = require('../utils/whatsapp');

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const REGEX_FECHA = /^\d{4}-\d{2}-\d{2}$/;

// Control salvo \t \n \r (para textos largos con saltos de línea)
const CONTROL_MULTILINEA = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const CONTROL_TODOS = /[\u0000-\u001F\u007F]+/g;

const largo = (texto) => Array.from(texto).length;

// Fecha de hoy en Argentina (YYYY-MM-DD)
function hoyArgentina() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Cordoba' });
}

function limpiarTexto(valor, multilinea) {
    let texto = String(valor).normalize('NFC').replace(/[<>]/g, '');
    if (multilinea) {
        texto = texto
            .replace(CONTROL_MULTILINEA, '')
            .replace(/\r\n?/g, '\n')
            .replace(/[ \t]+/g, ' ')
            .replace(/\n{3,}/g, '\n\n');
    } else {
        texto = texto.replace(CONTROL_TODOS, ' ').replace(/\s+/g, ' ');
    }
    return texto.trim();
}

const esVacio = (v) =>
    v === undefined || v === null || (typeof v === 'string' && v.trim() === '');

// Devuelve { valor } o { error }
function validarCampo(regla, bruto, campo) {
    const etiqueta = regla.etiqueta || `El campo ${campo}`;
    const requerido = regla.requerido !== false;

    if (esVacio(bruto)) {
        if (regla.defecto !== undefined) return { valor: regla.defecto };
        if (requerido) return { error: `${etiqueta} es obligatorio` };
        return { valor: null };
    }

    switch (regla.tipo) {
        case 'texto': {
            if (typeof bruto !== 'string') return { error: `${etiqueta} debe ser un texto` };
            const texto = limpiarTexto(bruto, regla.multilinea);
            const min = regla.min || 1;
            const max = regla.max || 255;
            const cantidad = largo(texto);
            if (cantidad < min || cantidad > max) {
                return { error: `${etiqueta} debe tener entre ${min} y ${max} caracteres` };
            }
            return { valor: texto };
        }

        case 'email': {
            if (typeof bruto !== 'string') return { error: `${etiqueta} no es válido` };
            const email = bruto.trim().toLowerCase();
            if (email.length > 150 || !REGEX_EMAIL.test(email)) {
                return { error: `${etiqueta} no es válido` };
            }
            return { valor: email };
        }

        case 'telefono': {
            if (typeof bruto !== 'string') return { error: `${etiqueta} no es válido` };
            // Se guarda siempre como 10 dígitos: código de área sin 0 + número sin 15
            const telefono = normalizarTelefonoAR(bruto);
            if (!telefono) {
                return {
                    error: `${etiqueta} no es válido: ingresá el código de área sin 0 y el número sin 15 (ej: 3573404315)`
                };
            }
            return { valor: telefono };
        }

        // Contraseñas: NO se limpian ni se recortan (cambiarían la clave real)
        case 'clave': {
            if (typeof bruto !== 'string') return { error: `${etiqueta} no es válida` };
            const min = regla.min || 1;
            const max = regla.max || 72;
            if (bruto.length < min || Buffer.byteLength(bruto) > max) {
                return { error: `${etiqueta} debe tener entre ${min} y ${max} caracteres` };
            }
            return { valor: bruto };
        }

        case 'entero': {
            const texto = String(bruto).trim();
            if (!/^-?\d+$/.test(texto)) return { error: `${etiqueta} debe ser un número entero` };
            const numero = Number(texto);
            if (!Number.isSafeInteger(numero)) return { error: `${etiqueta} no es válido` };
            if (regla.min !== undefined && numero < regla.min) {
                return { error: `${etiqueta} debe ser como mínimo ${regla.min}` };
            }
            if (regla.max !== undefined && numero > regla.max) {
                return { error: `${etiqueta} debe ser como máximo ${regla.max}` };
            }
            return { valor: numero };
        }

        case 'booleano': {
            const texto = String(bruto).trim().toLowerCase();
            if (['true', '1', 'on', 'si', 'sí'].includes(texto)) return { valor: true };
            if (['false', '0', 'off', 'no'].includes(texto)) return { valor: false };
            return { error: `${etiqueta} debe ser verdadero o falso` };
        }

        case 'fecha': {
            const texto = String(bruto).trim();
            if (!REGEX_FECHA.test(texto)) return { error: `${etiqueta} no es una fecha válida` };
            const [anio, mes, dia] = texto.split('-').map(Number);
            const f = new Date(Date.UTC(anio, mes - 1, dia));
            const real =
                f.getUTCFullYear() === anio && f.getUTCMonth() === mes - 1 && f.getUTCDate() === dia;
            if (!real) return { error: `${etiqueta} no es una fecha válida` };
            // futura: tiene que ser posterior a hoy (hora de Argentina)
            if (regla.futura && texto <= hoyArgentina()) {
                return { error: `${etiqueta} debe ser posterior a hoy` };
            }
            return { valor: texto };
        }

        default:
            throw new Error(`Tipo de validación desconocido: ${regla.tipo}`);
    }
}

function validar(esquema, origen = 'body') {
    return (req, res, next) => {
        const entrada = req[origen] && typeof req[origen] === 'object' ? req[origen] : {};
        const limpio = {};
        const errores = [];

        for (const [campo, regla] of Object.entries(esquema)) {
            const resultado = validarCampo(regla, entrada[campo], campo);
            if (resultado.error) {
                errores.push({ campo, mensaje: resultado.error });
            } else {
                limpio[campo] = resultado.valor;
            }
        }

        if (errores.length > 0) {
            return next(new AppError('Revisá los datos ingresados', 400, errores));
        }

        req.datos = { ...(req.datos || {}), ...limpio };
        next();
    };
}

// Esquema reutilizable para rutas con /:id
const esquemaId = {
    id: { tipo: 'entero', min: 1, etiqueta: 'El identificador' }
};

module.exports = { validar, esquemaId };