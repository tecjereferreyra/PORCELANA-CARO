
const fs = require('fs');
const path = require('path');
const asyncHandler = require('../middlewares/asyncHandler');
const trabajosService = require('../services/trabajos.service');
const { escapar, completar } = require('../utils/plantilla');

const enProduccion = process.env.NODE_ENV === 'production';
const SITIO_URL = (process.env.SITIO_URL || '').replace(/\/+$/, '');
const DIR_FRONTEND = path.join(__dirname, '../../../frontend');
const REGEX_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// En producción se lee una sola vez; en desarrollo cada vez (para ver los cambios al recargar)
const cache = {};
function leerPlantilla(nombre) {
    if (enProduccion && cache[nombre]) return cache[nombre];
    const html = fs.readFileSync(path.join(DIR_FRONTEND, nombre), 'utf8');
    if (enProduccion) cache[nombre] = html;
    return html;
}

const enviarHtml = (res, html) =>
    res.set('Cache-Control', 'public, max-age=300').type('html').send(html);

// GET /
const inicio = asyncHandler(async (req, res) => {
    // Imagen para la vista previa al compartir: la primera pieza (las destacadas van primero)
    let ogImagen = '';
    try {
        const lista = await trabajosService.listarTrabajos();
        if (lista.length > 0) {
            ogImagen = `<meta property="og:image" content="${escapar(lista[0].imagen)}">`;
        }
    } catch {
        // sin imagen de vista previa: la página igual se sirve
    }

    const html = completar(
        leerPlantilla('index.html'),
        { SITIO_URL, OG_IMAGE: ogImagen },
        ['OG_IMAGE']
    );
    enviarHtml(res, html);
});

// GET /trabajo/:slug
const trabajo = asyncHandler(async (req, res, next) => {
    const { slug } = req.params;
    if (!REGEX_SLUG.test(slug) || slug.length > 100) return next();

    let t;
    try {
        t = await trabajosService.obtenerTrabajo(slug);
    } catch (err) {
        if (err.estado === 404) return next(); // cae en el 404 general
        throw err;
    }

    const descripcionMeta = `${t.nombre}: ${t.descripcion} Pieza artesanal en porcelana fría, hecha a pedido.`;

    const html = completar(leerPlantilla('trabajo.html'), {
        SITIO_URL,
        TITULO: `${t.nombre} | Caro Porcelana`,
        DESCRIPCION_META: descripcionMeta.slice(0, 300),
        URL: `${SITIO_URL}/trabajo/${t.slug}`,
        IMAGEN: t.imagen,
        NOMBRE: t.nombre,
        DESCRIPCION: t.descripcion,
        CATEGORIA: t.categoria,
        CATEGORIA_SLUG: t.categoriaSlug,
        WHATSAPP: t.whatsapp
    });
    enviarHtml(res, html);
});

module.exports = { inicio, trabajo };