// =====================================================================
//  js/app.js  |  Página principal: galería (y, enseguida, formulario)
// =====================================================================
import { api } from './api.js';
import { crearTarjeta } from './componentes/tarjetaTrabajo.js';
import { crearFiltros } from './componentes/filtroCategorias.js';
import { iniciarFormulario } from './componentes/formularioPedido.js';

const contenedorFiltros = document.getElementById('filtros');
const grilla = document.getElementById('grilla');
const estadoGaleria = document.getElementById('estado-galeria');
const selectorModelo = document.getElementById('trabajo');
let trabajos = [];

// Cuántas tarjetas se muestran por tanda (y cuántos esqueletos se dibujan)
const POR_PAGINA = 8;
let categoriaActual = null;
let visibles = POR_PAGINA;

const botonVerMas = document.getElementById('ver-mas');

const CLAVE_SCROLL = 'galeriaScroll';
const CLAVE_VISIBLES = 'galeriaVisibles';

grilla.addEventListener('click', (evento) => {
    if (!evento.target.closest('a')) return;
    try {
        sessionStorage.setItem(CLAVE_SCROLL, String(window.scrollY));
        sessionStorage.setItem(CLAVE_VISIBLES, String(visibles));
    } catch {
        // sin almacenamiento disponible: simplemente no se restaura
    }
});

function volviendoAtras() {
    const navegacion = performance.getEntriesByType('navigation')[0];
    return Boolean(navegacion) && navegacion.type === 'back_forward';
}

// Al volver con "atrás" se recupera cuántas tarjetas había abiertas
function recuperarVisibles() {
    if (!volviendoAtras()) return POR_PAGINA;
    try {
        const n = Number(sessionStorage.getItem(CLAVE_VISIBLES));
        return n >= POR_PAGINA ? n : POR_PAGINA;
    } catch {
        return POR_PAGINA;
    }
}

function restaurarScroll() {
    if (!volviendoAtras()) return;
    try {
        const y = Number(sessionStorage.getItem(CLAVE_SCROLL));
        sessionStorage.removeItem(CLAVE_SCROLL);
        sessionStorage.removeItem(CLAVE_VISIBLES);
        if (y > 0) window.scrollTo({ top: y, behavior: 'instant' });
    } catch {
        // nada para restaurar
    }
}

// Cuando se llega con un ancla (/#pedido), la galería todavía estaba vacía al
// hacer el salto y después crece: se vuelve a posicionar ya con todo dibujado.
function irAlAncla() {
    if (volviendoAtras()) return;
    let id = window.location.hash.slice(1);
    if (!id) return;
    try {
        id = decodeURIComponent(id);
    } catch {
        return;
    }
    const destino = document.getElementById(id);
    if (!destino) return;


    const raiz = document.documentElement;
    const posicionar = () => destino.scrollIntoView({ block: 'start' });
    raiz.style.scrollBehavior = 'auto';
    posicionar();
    requestAnimationFrame(posicionar);
    setTimeout(posicionar, 100);
    setTimeout(() => {
        posicionar();
        raiz.style.scrollBehavior = '';
    }, 300);
}

// ---------- Galería ----------

function mostrarCargando() {
    grilla.setAttribute('aria-busy', 'true');
    estadoGaleria.textContent = '';
    estadoGaleria.className = 'estado';
        const esqueletos = Array.from({ length: POR_PAGINA }, () => {
        const caja = document.createElement('div');
        caja.className = 'tarjeta--cargando';
        return caja;
    });
    grilla.replaceChildren(...esqueletos);
}

function mostrarTrabajos(categoriaSlug, cantidad = POR_PAGINA) {
    categoriaActual = categoriaSlug;
    visibles = cantidad;

    const lista = categoriaSlug
        ? trabajos.filter((t) => t.categoriaSlug === categoriaSlug)
        : trabajos;

    grilla.setAttribute('aria-busy', 'false');
    grilla.replaceChildren(...lista.slice(0, visibles).map(crearTarjeta));
    actualizarVerMas(lista.length);

    estadoGaleria.className = 'estado';
    estadoGaleria.textContent =
        lista.length === 0 ? 'Todavía no hay piezas en esta categoría.' : '';

    // Deja la categoría en la URL (?categoria=flores) para poder compartirla
    const url = new URL(window.location.href);
    if (categoriaSlug) {
        url.searchParams.set('categoria', categoriaSlug);
    } else {
        url.searchParams.delete('categoria');
    }
    history.replaceState(null, '', url);
}
function actualizarVerMas(total) {
    if (botonVerMas) botonVerMas.hidden = visibles >= total;
}

// Agrega la tanda siguiente sin redibujar lo que ya se ve (no salta el scroll)
function verMas() {
    const lista = categoriaActual
        ? trabajos.filter((t) => t.categoriaSlug === categoriaActual)
        : trabajos;
    const desde = visibles;
    visibles += POR_PAGINA;
    grilla.append(...lista.slice(desde, visibles).map(crearTarjeta));
    actualizarVerMas(lista.length);
}

if (botonVerMas) botonVerMas.addEventListener('click', verMas);
function mostrarErrorGaleria(error) {
    grilla.setAttribute('aria-busy', 'false');
    grilla.replaceChildren();
    estadoGaleria.className = 'estado estado--error';
    estadoGaleria.textContent = `${error.message} `;

    const reintentar = document.createElement('button');
    reintentar.type = 'button';
    reintentar.className = 'boton boton--suave';
    reintentar.textContent = 'Reintentar';
    reintentar.addEventListener('click', iniciar);
    estadoGaleria.append(reintentar);
}

// ---------- Selector de modelo del formulario ----------

function llenarSelectorModelo() {
    if (!selectorModelo) return;
    // Se conserva la primera opción ("A medida") y se agregan los trabajos
    const opciones = trabajos.map((t) => {
        const opcion = document.createElement('option');
        opcion.value = t.slug;
        opcion.textContent = t.nombre;
        return opcion;
    });
    selectorModelo.append(...opciones);
}
// ---------- Vista previa del modelo elegido ----------

const vistaModelo = document.getElementById('modelo-vista');
const imagenModelo = document.getElementById('modelo-imagen');
const nombreModelo = document.getElementById('modelo-nombre');

function actualizarVistaModelo() {
    if (!selectorModelo || !vistaModelo) return;
    const elegido = trabajos.find((t) => t.slug === selectorModelo.value);
    vistaModelo.hidden = !elegido;
    if (!elegido) {
        imagenModelo.removeAttribute('src');
        return;
    }
    imagenModelo.src = elegido.imagen;
    imagenModelo.alt = elegido.nombre;
    nombreModelo.textContent = elegido.nombre;
}

if (selectorModelo) {
    selectorModelo.addEventListener('change', actualizarVistaModelo);
    // Al enviar el pedido el formulario se vacía: la foto también tiene que irse
    selectorModelo.form?.addEventListener('reset', () => setTimeout(actualizarVistaModelo));
}
// ---------- Inicio ----------

async function iniciar() {
    mostrarCargando();
    try {
        const [categorias, lista] = await Promise.all([api.categorias(), api.trabajos()]);
        trabajos = lista;

        if (trabajos.length === 0) {
            contenedorFiltros.replaceChildren();
            grilla.setAttribute('aria-busy', 'false');
            grilla.replaceChildren();
                       estadoGaleria.textContent = 'Pronto vamos a subir nuevos trabajos.';
            if (botonVerMas) botonVerMas.hidden = true;
            return;
        }

        // Solo se ofrecen categorías que tienen piezas
        const conPiezas = categorias.filter((c) =>
            trabajos.some((t) => t.categoriaSlug === c.slug)
        );

        const pedida = new URLSearchParams(window.location.search).get('categoria');
        const inicial = conPiezas.some((c) => c.slug === pedida) ? pedida : null;

        if (conPiezas.length > 1) {
            crearFiltros(contenedorFiltros, conPiezas, inicial, mostrarTrabajos);
        } else {
            contenedorFiltros.replaceChildren();
        }

               mostrarTrabajos(inicial, recuperarVisibles());
        restaurarScroll();

        if (selectorModelo && selectorModelo.options.length === 1) {
            llenarSelectorModelo();
        }
       } catch (error) {
        if (botonVerMas) botonVerMas.hidden = true;
        mostrarErrorGaleria(error);
    } finally {
        irAlAncla();
    }
}

iniciarFormulario();
iniciar();