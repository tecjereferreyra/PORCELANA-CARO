
const { ejecutarSP } = require('../config/db');
const { AppError } = require('../middlewares/errores');
const { generarSlug } = require('../utils/slug');

const mapear = (c) => ({
    id: c.categoria_id,
    nombre: c.nombre,
    slug: c.slug,
    orden: c.orden,
    activo: c.activo,
    cantidadTrabajos: Number(c.cantidad_trabajos) // count() llega como texto (bigint)
});

// Todas, también las ocultas, con la cantidad de trabajos de cada una
async function listarCategorias() {
    const filas = await ejecutarSP('sp_categorias_admin_listar');
    return filas.map(mapear);
}

async function crearCategoria({ nombre, orden }) {
    const slug = generarSlug(nombre, 60);
    if (!slug) {
        throw new AppError('El nombre debe tener al menos una letra o un número', 400);
    }
    try {
        const filas = await ejecutarSP('sp_categoria_crear', [nombre, slug, orden]);
        return { id: filas[0].sp_categoria_crear, slug };
    } catch (err) {
        if (err.code === '23505') {
            throw new AppError('Ya existe una categoría con ese nombre', 409);
        }
        throw err;
    }
}

async function actualizarCategoria(id, { nombre, orden, activo }) {
    try {
        const filas = await ejecutarSP('sp_categoria_actualizar', [id, nombre, orden, activo]);
        if (!filas[0].sp_categoria_actualizar) {
            throw new AppError('Categoría no encontrada', 404);
        }
    } catch (err) {
        if (err.code === '23505') {
            throw new AppError('Ya existe una categoría con ese nombre', 409);
        }
        throw err;
    }
}

module.exports = { listarCategorias, crearCategoria, actualizarCategoria };