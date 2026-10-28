
import { apiAdmin } from '../apiAdmin.js';
import { el, campo, crearMensaje, textoDeError } from '../dom.js';

export async function iniciar(raiz) {
    let categorias = [];

    const intro = el(
        'p',
        'intro',
        'Las categorías ordenan la galería. Una categoría oculta, o sin trabajos, no aparece en el sitio.'
    );

    // ---------- Formulario: nueva categoría ----------
    const nueva = el('section', 'nueva');
    nueva.append(el('h2', 'nueva__titulo', 'Nueva categoría'));

    const formNueva = el('form', 'linea');
    formNueva.noValidate = true;
    const nombreNueva = campo({ id: 'cat-nueva-nombre', etiqueta: 'Nombre', maxlength: '60', required: '' });
    nombreNueva.grupo.classList.add('linea__ancho');
    const ordenNueva = campo({
        id: 'cat-nueva-orden',
        etiqueta: 'Orden',
        tipo: 'number',
        min: '0',
        max: '1000',
        inputmode: 'numeric'
    });
    const botonNueva = el('button', 'boton', 'Agregar');
    botonNueva.type = 'submit';
    formNueva.append(nombreNueva.grupo, ordenNueva.grupo, botonNueva);
    nueva.append(formNueva);

    // ---------- Lista y mensajes ----------
    const lista = el('div', 'lista');
    const mensaje = crearMensaje();

    raiz.replaceChildren(intro, nueva, lista, mensaje.nodo);

    // ---------- Validación en el navegador (el servidor vuelve a validar) ----------
    function validar(nombre, orden) {
        if (nombre.length < 2 || nombre.length > 60) {
            return 'El nombre debe tener entre 2 y 60 caracteres.';
        }
        if (!Number.isInteger(orden) || orden < 0 || orden > 1000) {
            return 'El orden debe ser un número entre 0 y 1000.';
        }
        return null;
    }

    // ---------- Una fila editable ----------
    function crearFila(categoria) {
        const fila = el('form', 'fila-categoria');
        fila.noValidate = true;

        const linea = el('div', 'linea');
        const nombre = campo({
            id: `cat-${categoria.id}-nombre`,
            etiqueta: 'Nombre',
            maxlength: '60',
            required: ''
        });
        nombre.grupo.classList.add('linea__ancho');
        nombre.control.value = categoria.nombre;

        const orden = campo({
            id: `cat-${categoria.id}-orden`,
            etiqueta: 'Orden',
            tipo: 'number',
            min: '0',
            max: '1000',
            inputmode: 'numeric'
        });
        orden.control.value = String(categoria.orden);

        const grupoVisible = el('div', 'barra__grupo barra__grupo--check');
        const casilla = el('input');
        casilla.type = 'checkbox';
        casilla.id = `cat-${categoria.id}-activo`;
        casilla.checked = categoria.activo;
        const rotuloVisible = el('label', null, 'Visible en el sitio');
        rotuloVisible.htmlFor = casilla.id;
        grupoVisible.append(casilla, rotuloVisible);

        const guardar = el('button', 'boton', 'Guardar');
        guardar.type = 'submit';

        linea.append(nombre.grupo, orden.grupo, grupoVisible, guardar);

        const trabajos =
            categoria.cantidadTrabajos === 1 ? '1 trabajo' : `${categoria.cantidadTrabajos} trabajos`;
        const meta = el('p', 'fila-categoria__meta', `${trabajos} · dirección: /${categoria.slug}`);

        fila.append(linea, meta);

        fila.addEventListener('submit', async (evento) => {
            evento.preventDefault();

            const datos = {
                nombre: nombre.control.value.trim(),
                orden: Number(orden.control.value),
                activo: casilla.checked
            };

            const problema = validar(datos.nombre, datos.orden);
            if (problema) {
                mensaje.decir(problema, 'error');
                return;
            }

            // Ocultar una categoría con trabajos los saca de la galería: se confirma
            if (categoria.activo && !datos.activo && categoria.cantidadTrabajos > 0) {
                const seguro = window.confirm(
                    `Si ocultás "${categoria.nombre}", sus ${categoria.cantidadTrabajos} trabajos dejan de verse en la galería. ¿Continuar?`
                );
                if (!seguro) {
                    casilla.checked = true;
                    return;
                }
            }

            guardar.disabled = true;
            mensaje.decir('');
            try {
                await apiAdmin.actualizarCategoria(categoria.id, datos);
                await cargar();
                mensaje.decir(`Categoría "${datos.nombre}" guardada.`, 'ok');
            } catch (error) {
                mensaje.decir(textoDeError(error), 'error');
                guardar.disabled = false;
            }
        });

        return fila;
    }

    // ---------- Carga ----------
    async function cargar() {
        categorias = await apiAdmin.categorias();
        lista.replaceChildren(...categorias.map(crearFila));

        // Orden sugerido para la próxima: una más que la mayor
        const mayor = categorias.reduce((m, c) => Math.max(m, c.orden), 0);
        ordenNueva.control.value = String(Math.min(mayor + 1, 1000));

        if (categorias.length === 0) {
            mensaje.decir('Todavía no hay categorías. Creá la primera arriba.');
        }
    }

    formNueva.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const nombre = nombreNueva.control.value.trim();
        const orden = Number(ordenNueva.control.value);

        const problema = validar(nombre, orden);
        if (problema) {
            mensaje.decir(problema, 'error');
            nombreNueva.control.focus();
            return;
        }

        botonNueva.disabled = true;
        mensaje.decir('');
        try {
            await apiAdmin.crearCategoria({ nombre, orden });
            nombreNueva.control.value = '';
            await cargar();
            mensaje.decir(`Categoría "${nombre}" creada.`, 'ok');
        } catch (error) {
            mensaje.decir(textoDeError(error), 'error');
        } finally {
            botonNueva.disabled = false;
        }
    });

    try {
        await cargar();
    } catch (error) {
        mensaje.decir(error.message, 'error');
    }
}