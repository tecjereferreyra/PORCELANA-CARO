
const multer = require('multer');
const { AppError } = require('./errores');

const MAX_MB = 5;
const TIPOS_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: MAX_MB * 1024 * 1024,
        files: 1,
        fields: 20,
        fieldSize: 10 * 1024 // 10 KB por campo de texto
    },
    fileFilter: (req, file, cb) => {
        if (!TIPOS_PERMITIDOS.includes(file.mimetype)) {
            return cb(new AppError('La imagen debe ser JPG, PNG o WebP', 400));
        }
        cb(null, true);
    }
});

// El mimetype lo declara el cliente y se puede falsear: se comprueban
// los primeros bytes del archivo (la "firma" real del formato).
function esImagenReal(buffer) {
    if (!buffer || buffer.length < 12) return false;

    const esJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;

    const esPng =
        buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47 &&
        buffer[4] === 0x0d && buffer[5] === 0x0a && buffer[6] === 0x1a && buffer[7] === 0x0a;

    const esWebp =
        buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP';

    return esJpeg || esPng || esWebp;
}

function subida(obligatoria = true, campo = 'imagen') {
    const verificar = (req, res, next) => {
        if (!req.file) {
            return obligatoria ? next(new AppError('Falta la imagen', 400)) : next();
        }
        if (!esImagenReal(req.file.buffer)) {
            return next(new AppError('El archivo no es una imagen válida', 400));
        }
        next();
    };
    // Express acepta un arreglo de middlewares
    return [upload.single(campo), verificar];
}

module.exports = { subida, MAX_MB };