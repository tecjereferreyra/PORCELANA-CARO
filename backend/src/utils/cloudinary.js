
require('dotenv').config();
const { v2: cloudinary } = require('cloudinary');
const { AppError } = require('../middlewares/errores');
const logger = require('../middlewares/logger');

const CARPETA = process.env.CLOUDINARY_CARPETA || 'caro-porcelana';

const configurado = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
);

if (configurado) {
    cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
    });
}

function exigirConfiguracion() {
    if (!configurado) {
        throw new AppError('El servicio de imágenes no está configurado', 500);
    }
}


function subirImagen(buffer, nombreBase = 'trabajo') {
    exigirConfiguracion();

    const publicId = `${nombreBase}-${Date.now().toString(36)}`;

    return new Promise((resolve, reject) => {
        const flujo = cloudinary.uploader.upload_stream(
            {
                folder: CARPETA,
                public_id: publicId,
                resource_type: 'image',
                overwrite: false,
                allowed_formats: ['jpg', 'png', 'webp'],
                transformation: [{ width: 1600, height: 1600, crop: 'limit', quality: 'auto' }]
            },
            (err, resultado) => {
                if (err) {
                    logger.error(`Cloudinary: fallo al subir (${err.message})`, err);
                    return reject(new AppError('No se pudo subir la imagen, intentá de nuevo', 502));
                }
                resolve({ url: resultado.secure_url, publicId: resultado.public_id });
            }
        );
        flujo.end(buffer);
    });
}


async function eliminarImagen(publicId) {
    if (!publicId || !configurado) return;
    try {
        await cloudinary.uploader.destroy(publicId, { invalidate: true });
    } catch (err) {
        logger.error(`Cloudinary: no se pudo borrar ${publicId} (${err.message})`, err);
    }
}

// Inserta una transformación en la URL de entrega:
//   .../upload/v1/x.jpg  ->  .../upload/f_auto,q_auto,w_800/v1/x.jpg
function transformar(url, transformacion) {
    if (!url || !url.includes('/upload/')) return url;
    return url.replace('/upload/', `/upload/${transformacion}/`);
}

// f_auto = mejor formato para cada navegador (WebP/AVIF), q_auto = calidad óptima
const miniatura = (url) => transformar(url, 'f_auto,q_auto,c_limit,w_800');
const grande = (url) => transformar(url, 'f_auto,q_auto,c_limit,w_1600');

// Comprueba que las 3 claves del .env sean correctas (sin subir nada)
async function probarCredenciales() {
    exigirConfiguracion();
    return cloudinary.api.ping();
}

module.exports = { subirImagen, eliminarImagen, miniatura, grande, probarCredenciales };