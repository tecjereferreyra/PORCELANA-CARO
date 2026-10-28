
const { ejecutarSP } = require('../config/db');
const { AppError } = require('../middlewares/errores');
const { miniatura, grande, subirImagen, eliminarImagen } = require('../utils/cloudinary');
const { generarSlug, conSufijo } = require('../utils/slug');
const { enlaceDeTrabajo } = require('../utils/whatsapp');

// Categorías para los filtros de la galería
async function listarCategorias() {
    const filas = await ejecutarSP('sp_categorias_listar');
    return filas.map((c) => ({
        id: c.categoria_id,
        nombre: c.nombre,
        slug: c.slug
    }));
}

// Galería completa o filtrada por categoría (slug)
async function listarTrabajos(categoriaSlug = null) {
    const filas = await ejecutarSP('sp_trabajos_listar', [categoriaSlug]);
    return filas.map((t) => ({
        id: t.trabajo_id,
        nombre: t.nombre,
        slug: t.slug,
        descripcion: t.descripcion,
        categoria: t.categoria,
        categoriaSlug: t.categoria_slug,
        destacado: t.destacado,
        imagen: miniatura(t.imagen_url) // 800 px, para la grilla
    }));
}

// Ficha de un trabajo: imagen grande para el zoom y botón "Encargar"
async function obtenerTrabajo(slug) {
    const filas = await ejecutarSP('sp_trabajo_obtener', [slug]);
    if (filas.length === 0) {
        throw new AppError('Trabajo no encontrado', 404);
    }
    const t = filas[0];
    return {
        id: t.trabajo_id,
        nombre: t.nombre,
        slug: t.slug,
        descripcion: t.descripcion,
        categoria: t.categoria,
        categoriaSlug: t.categoria_slug,
        imagen: grande(t.imagen_url), // 1600 px, para el zoom
        imagenMiniatura: miniatura(t.imagen_url),
        whatsapp: enlaceDeTrabajo(t.nombre, t.slug)
    };
}

// ---------------------------------------------------------------------
//  Panel de administración
// ---------------------------------------------------------------------

// Todos los trabajos, también los ocultos
async function listarTrabajosAdmin() {
    const filas = await ejecutarSP('sp_trabajos_admin_listar');
    return filas.map((t) => ({
        id: t.trabajo_id,
        categoriaId: t.categoria_id,
        categoria: t.categoria,
        nombre: t.nombre,
        slug: t.slug,
        descripcion: t.descripcion,
        imagen: miniatura(t.imagen_url),
        destacado: t.destacado,
        orden: t.orden,
        activo: t.activo
    }));
}


async function crearTrabajo(datos, archivo) {
    const base = generarSlug(datos.nombre, 90);
    if (!base) {
        throw new AppError('El nombre debe tener al menos una letra o un número', 400);
    }

    const imagen = await subirImagen(archivo.buffer, base);

    try {
        for (let n = 1; n <= 20; n++) {
            const slug = n === 1 ? base : conSufijo(base, n);
            try {
                const filas = await ejecutarSP('sp_trabajo_crear', [
                    datos.categoriaId,
                    datos.nombre,
                    slug,
                    datos.descripcion,
                    imagen.url,
                    imagen.publicId,
                    datos.destacado,
                    datos.orden
                ]);
                return { id: filas[0].sp_trabajo_crear, slug };
            } catch (err) {
                if (err.code === '23503') {
                    throw new AppError('La categoría seleccionada no existe', 400);
                }
                if (err.code !== '23505') throw err; // 23505 = slug repetido: se prueba el siguiente
            }
        }
        throw new AppError('No se pudo generar una dirección única para el trabajo', 409);
    } catch (err) {
        await eliminarImagen(imagen.publicId);
        throw err;
    }
}


async function actualizarTrabajo(id, datos, archivo) {
    let nueva = null;
    if (archivo) {
        nueva = await subirImagen(archivo.buffer, generarSlug(datos.nombre, 90) || 'trabajo');
    }

    try {
        const filas = await ejecutarSP('sp_trabajo_actualizar', [
            id,
            datos.categoriaId,
            datos.nombre,
            datos.descripcion,
            datos.destacado,
            datos.orden,
            datos.activo,
            nueva ? nueva.url : null,
            nueva ? nueva.publicId : null
        ]);
        if (filas.length === 0) {
            throw new AppError('Trabajo no encontrado', 404);
        }
        if (nueva) {
            await eliminarImagen(filas[0].imagen_public_id_anterior);
        }
    } catch (err) {
        if (nueva) await eliminarImagen(nueva.publicId);
        if (err.code === '23503') {
            throw new AppError('La categoría seleccionada no existe', 400);
        }
        throw err;
    }
}

// Borra el trabajo y su imagen de Cloudinary (los pedidos que lo mencionaban se conservan)
async function eliminarTrabajo(id) {
    const filas = await ejecutarSP('sp_trabajo_eliminar', [id]);
    if (filas.length === 0) {
        throw new AppError('Trabajo no encontrado', 404);
    }
    await eliminarImagen(filas[0].imagen_public_id);
}

module.exports = {
    listarCategorias,
    listarTrabajos,
    obtenerTrabajo,
    listarTrabajosAdmin,
    crearTrabajo,
    actualizarTrabajo,
    eliminarTrabajo
};