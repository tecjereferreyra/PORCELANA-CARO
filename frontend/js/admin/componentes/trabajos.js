
import { apiAdmin } from '../apiAdmin.js';
import { el, crearMensaje, textoDeError } from '../dom.js';

const TIPOS_ACEPTADOS = ['image/jpeg', 'image/png', 'image/webp'];
const LADO_MAXIMO = 1600;
const MAX_BYTES = 5 * 1024 * 1024; // mismo límite que el servidor

// ---------- Imagen: reducir y previsualizar ----------

async function prepararImagen(archivo) {
    if (!TIPOS_ACEPTADOS.includes(archivo.type)) {
        throw new Error('La imagen tiene que ser JPG, PNG o WebP.');
    }

    let mapa;
    try {
        mapa = await createImageBitmap(archivo, { imageOrientation: 'from-image' });
    } catch {
        throw new Error('No se pudo leer esa imagen. Probá con otra foto.');
    }

    const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
    const ancho = Math.round(mapa.width * escala);
    const alto = Math.round(mapa.height * escala);

    const lienzo = document.createElement('canvas');
    lienzo.width = ancho;
    lienzo.height = alto;
    const ctx = lienzo.getContext('2d');
    ctx.fillStyle = '#ffffff'; // los PNG con transparencia quedan sobre fondo blanco
    ctx.fillRect(0, 0, ancho, alto);
    ctx.drawImage(mapa, 0, 0, ancho, alto);
    if (mapa.close) mapa.close();

    const blob = await new Promise((resolver) => lienzo.toBlob(resolver, 'image/jpeg', 0.88));
    if (!blob) throw new Error('No se pudo preparar la imagen.');
    if (blob.size > MAX_BYTES) throw new Error('La imagen sigue siendo demasiado pesada.');

    return new File([blob], 'trabajo.jpg', { type: 'image/jpeg' });
}

function comoDataUrl(archivo) {
    return new Promise((resolver, rechazar) => {
        const lector = new FileReader();
        lector.onload = () => resolver(lector.result);
        lector.onerror = () => rechazar(new Error('No se pudo mostrar la vista previa.'));
        lector.readAsDataURL(archivo);
    });
}

// ---------- Formulario (sirve para crear y para editar) ----------

function envolver(id, etiqueta, control, ayuda) {
    const grupo = el('div', 'campo');
    const rotulo = el('label', null, etiqueta);
    rotulo.htmlFor = id;
    control.id = id;
    grupo.append(rotulo, control);
    if (ayuda) grupo.append(el('small', null, ayuda));
    return grupo;
}

function crearFormulario({ categorias, trabajo = null, alTerminar, alCancelar }) {
    const editando = trabajo !== null;
    const p = `t-${editando ? trabajo.id : 'nuevo'}`;
    const mensaje = crearMensaje();
    let archivoListo = null;

    const form = el('form', 'formulario-trabajo');
    form.noValidate = true;

    // Categoría
    const selector = el('select');
    function opciones(lista) {
        const items = lista.map((c) => {
            const o = el('option', null, c.activo ? c.nombre : `${c.nombre} (oculta)`);
            o.value = String(c.id);
            return o;
        });
        if (!editando) {
            const vacia = el('option', null, 'Elegí una categoría');
            vacia.value = '';
            items.unshift(vacia);
        }
        return items;
    }
    selector.append(...opciones(categorias));
    selector.value = editando ? String(trabajo.categoriaId) : '';

    // Texto
    const nombre = el('input');
    nombre.type = 'text';
    nombre.maxLength = 80;
    nombre.value = editando ? trabajo.nombre : '';

    const descripcion = el('textarea');
    descripcion.rows = 3;
    descripcion.maxLength = 300;
    descripcion.value = editando ? trabajo.descripcion : '';

    const orden = el('input');
    orden.type = 'number';
    orden.min = '0';
    orden.max = '100000';
    orden.inputMode = 'numeric';
    orden.value = editando ? String(trabajo.orden) : '0';

    // Casillas
    function casilla(id, texto, marcada) {
        const grupo = el('div', 'campo campo--check');
        const input = el('input');
        input.type = 'checkbox';
        input.id = id;
        input.checked = marcada;
        const rotulo = el('label', null, texto);
        rotulo.htmlFor = id;
        grupo.append(input, rotulo);
        return { grupo, input };
    }
    const destacado = casilla(`${p}-destacado`, 'Destacado (aparece primero)', editando && trabajo.destacado);
    const visible = editando ? casilla(`${p}-activo`, 'Visible en el sitio', trabajo.activo) : null;

    // Imagen
    const archivo = el('input');
    archivo.type = 'file';
    archivo.accept = TIPOS_ACEPTADOS.join(',');

    const previa = el('img', 'previa');
    previa.alt = 'Vista previa de la imagen';
    previa.width = 160;
    previa.height = 200;
    if (editando) previa.src = trabajo.imagen;
    else previa.hidden = true;

    archivo.addEventListener('change', async () => {
        const elegido = archivo.files[0];
        if (!elegido) {
            archivoListo = null;
            if (editando) previa.src = trabajo.imagen;
            else previa.hidden = true;
            return;
        }
        mensaje.decir('Preparando la imagen…');
        try {
            archivoListo = await prepararImagen(elegido);
            previa.src = await comoDataUrl(archivoListo);
            previa.hidden = false;
            mensaje.decir('');
        } catch (error) {
            archivoListo = null;
            archivo.value = '';
            mensaje.decir(error.message, 'error');
        }
    });

    const ayudaImagen = editando
        ? 'Elegí una foto solo si querés reemplazar la actual.'
        : 'JPG, PNG o WebP. Se ajusta sola para que cargue rápido.';

    // Botones
    const guardar = el('button', 'boton', editando ? 'Guardar cambios' : 'Subir trabajo');
    guardar.type = 'submit';
    const acciones = el('div', 'formulario-trabajo__acciones');
    acciones.append(guardar);
    if (editando) {
        const cancelar = el('button', 'boton boton--suave', 'Cancelar');
        cancelar.type = 'button';
        cancelar.addEventListener('click', alCancelar);
        acciones.append(cancelar);
    }

    const columnaDatos = el('div');
    columnaDatos.append(
        envolver(`${p}-categoria`, 'Categoría', selector),
        envolver(`${p}-nombre`, 'Nombre', nombre),
        envolver(`${p}-descripcion`, 'Descripción breve', descripcion, 'Hasta 300 caracteres.'),
        envolver(`${p}-orden`, 'Orden', orden, 'Los números más bajos aparecen primero.'),
        destacado.grupo
    );
    if (visible) columnaDatos.append(visible.grupo);

    const columnaImagen = el('div');
    columnaImagen.append(envolver(`${p}-imagen`, 'Foto', archivo, ayudaImagen), previa);

    const cuerpo = el('div', 'formulario-trabajo__cuerpo');
    cuerpo.append(columnaDatos, columnaImagen);
    form.append(cuerpo, acciones, mensaje.nodo);

    // Para refrescar las categorías sin perder lo que se escribió
    form.actualizarCategorias = (lista) => {
        const actual = selector.value;
        selector.replaceChildren(...opciones(lista));
        selector.value = actual;
    };

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        const datos = {
            categoriaId: selector.value,
            nombre: nombre.value.trim(),
            descripcion: descripcion.value.trim(),
            orden: Number(orden.value)
        };

        let problema = null;
        if (!datos.categoriaId) {
            problema = categorias.length
                ? 'Elegí una categoría.'
                : 'Primero creá una categoría en la pestaña Categorías.';
        } else if (datos.nombre.length < 2 || datos.nombre.length > 80) {
            problema = 'El nombre debe tener entre 2 y 80 caracteres.';
        } else if (datos.descripcion.length < 5) {
            problema = 'Escribí una descripción breve (mínimo 5 caracteres).';
        } else if (!Number.isInteger(datos.orden) || datos.orden < 0 || datos.orden > 100000) {
            problema = 'El orden debe ser un número entre 0 y 100000.';
        } else if (!editando && !archivoListo) {
            problema = 'Elegí la foto del trabajo.';
        }
        if (problema) {
            mensaje.decir(problema, 'error');
            return;
        }

        const envio = new FormData();
        envio.append('categoriaId', datos.categoriaId);
        envio.append('nombre', datos.nombre);
        envio.append('descripcion', datos.descripcion);
        envio.append('orden', String(datos.orden));
        envio.append('destacado', String(destacado.input.checked));
        if (visible) envio.append('activo', String(visible.input.checked));
        if (archivoListo) envio.append('imagen', archivoListo);

        guardar.disabled = true;
        guardar.textContent = 'Guardando…';
        mensaje.decir('');

        try {
            if (editando) await apiAdmin.actualizarTrabajo(trabajo.id, envio);
            else await apiAdmin.crearTrabajo(envio);
            await alTerminar({ nombre: datos.nombre, accion: editando ? 'actualizado' : 'creado' });
        } catch (error) {
            mensaje.decir(textoDeError(error), 'error');
            guardar.disabled = false;
            guardar.textContent = editando ? 'Guardar cambios' : 'Subir trabajo';
        }
    });

    return form;
}

// ---------- Pestaña ----------

export async function iniciar(raiz) {
    let categorias = [];
    let trabajos = [];

    // "Agregar un trabajo" (se abre y se cierra)
    const nuevo = el('details', 'nuevo');
    const resumen = el('summary', 'boton', 'Agregar un trabajo');
    const cuerpoNuevo = el('div', 'nuevo__cuerpo');
    nuevo.append(resumen, cuerpoNuevo);

    // Barra: filtro por categoría y cantidad
    const barra = el('div', 'barra');
    const grupoFiltro = el('div', 'barra__grupo');
    const etiquetaFiltro = el('label', null, 'Categoría');
    etiquetaFiltro.htmlFor = 'filtro-categoria-trabajos';
    const filtro = el('select', 'control');
    filtro.id = 'filtro-categoria-trabajos';
    grupoFiltro.append(etiquetaFiltro, filtro);
    const cantidad = el('p', 'barra__resumen');
    cantidad.setAttribute('role', 'status');
    barra.append(grupoFiltro, cantidad);

    const lista = el('div', 'lista');
    const mensaje = crearMensaje();

    raiz.replaceChildren(nuevo, barra, lista, mensaje.nodo);

    function armarFormularioNuevo() {
        cuerpoNuevo.replaceChildren(
            crearFormulario({
                categorias,
                alTerminar: async ({ nombre }) => {
                    nuevo.open = false;
                    armarFormularioNuevo();
                    await cargar();
                    mensaje.decir(`Trabajo "${nombre}" creado.`, 'ok');
                }
            })
        );
    }

    // Al abrir el formulario se refrescan las categorías (por si se creó alguna recién)
    nuevo.addEventListener('toggle', async () => {
        if (!nuevo.open) return;
        try {
            categorias = await apiAdmin.categorias();
            const form = cuerpoNuevo.firstElementChild;
            if (form && form.actualizarCategorias) form.actualizarCategorias(categorias);
        } catch {
            // se sigue con las que ya estaban
        }
    });

    // ---------- Una fila de la lista ----------
    function crearFila(trabajo) {
        const fila = el('article', 'fila-trabajo');

        function mostrarNormal() {
            const imagen = el('img', 'fila-trabajo__imagen');
            imagen.src = trabajo.imagen;
            imagen.alt = '';
            imagen.width = 96;
            imagen.height = 120;
            imagen.loading = 'lazy';
            imagen.decoding = 'async';

            const titulo = el('h3', null, trabajo.nombre);
            if (trabajo.destacado) titulo.append(' ', el('span', 'etiqueta', 'Destacado'));
            if (!trabajo.activo) titulo.append(' ', el('span', 'etiqueta etiqueta--gris', 'Oculto'));

            const datos = el('div', 'fila-trabajo__datos');
            datos.append(
                titulo,
                el('p', 'fila-trabajo__meta', `${trabajo.categoria} · /trabajo/${trabajo.slug}`),
                el('p', 'fila-trabajo__texto', trabajo.descripcion)
            );

            const acciones = el('div', 'fila-trabajo__acciones');
            const ver = el('a', null, 'Ver en el sitio');
            ver.href = `/trabajo/${encodeURIComponent(trabajo.slug)}`;
            ver.target = '_blank';
            ver.rel = 'noopener';

            const editar = el('button', 'boton boton--suave', 'Editar');
            editar.type = 'button';
            editar.addEventListener('click', mostrarEdicion);

            const eliminar = el('button', 'boton boton--suave boton--peligro', 'Eliminar');
            eliminar.type = 'button';
            eliminar.addEventListener('click', borrar);

            acciones.append(ver, editar, eliminar);
            fila.classList.remove('fila-trabajo--edicion');
            fila.replaceChildren(imagen, datos, acciones);
        }

        async function mostrarEdicion() {
            try {
                categorias = await apiAdmin.categorias(); // lista al día
            } catch (error) {
                mensaje.decir(error.message, 'error');
                return;
            }
            fila.classList.add('fila-trabajo--edicion');
            fila.replaceChildren(
                crearFormulario({
                    categorias,
                    trabajo,
                    alCancelar: mostrarNormal,
                    alTerminar: async ({ nombre }) => {
                        await cargar();
                        mensaje.decir(`Trabajo "${nombre}" actualizado.`, 'ok');
                    }
                })
            );
            fila.querySelector('input[type="text"]').focus();
        }

        async function borrar() {
            const seguro = window.confirm(
                `¿Eliminar "${trabajo.nombre}"?\n\nSe borra la pieza y su foto, y no se puede deshacer. Los pedidos que la mencionaban se conservan.`
            );
            if (!seguro) return;
            mensaje.decir('');
            try {
                await apiAdmin.eliminarTrabajo(trabajo.id);
                await cargar();
                mensaje.decir(`Trabajo "${trabajo.nombre}" eliminado.`, 'ok');
            } catch (error) {
                mensaje.decir(error.message, 'error');
            }
        }

        mostrarNormal();
        return fila;
    }

    // ---------- Dibujo de la lista ----------
    function dibujar() {
        const elegida = filtro.value;
        const visibles = elegida
            ? trabajos.filter((t) => String(t.categoriaId) === elegida)
            : trabajos;

        lista.replaceChildren(...visibles.map(crearFila));
        cantidad.textContent = visibles.length === 1 ? '1 trabajo' : `${visibles.length} trabajos`;

        if (trabajos.length === 0) {
            mensaje.decir('Todavía no hay trabajos. Agregá el primero con el botón de arriba.');
        } else if (visibles.length === 0) {
            mensaje.decir('No hay trabajos en esa categoría.');
        }
    }

    async function cargar() {
        [trabajos, categorias] = await Promise.all([apiAdmin.trabajos(), apiAdmin.categorias()]);

        const elegida = filtro.value;
        const todas = el('option', null, 'Todas');
        todas.value = '';
        filtro.replaceChildren(
            todas,
            ...categorias.map((c) => {
                const o = el('option', null, c.nombre);
                o.value = String(c.id);
                return o;
            })
        );
        filtro.value = elegida;

        mensaje.decir('');
        dibujar();
    }

    filtro.addEventListener('change', () => {
        mensaje.decir('');
        dibujar();
    });

    try {
        await cargar();
        armarFormularioNuevo();
    } catch (error) {
        mensaje.decir(error.message, 'error');
    }
}