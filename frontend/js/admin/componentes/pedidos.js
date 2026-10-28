
import { apiAdmin } from '../apiAdmin.js';

const ID_PENDIENTE = 1;

function el(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

// ISO -> "26 oct 2026, 14:05" (hora de Argentina)
function fechaHora(iso) {
    return new Date(iso).toLocaleString('es-AR', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'America/Argentina/Cordoba'
    });
}

// "2026-11-05" -> "05/11/2026"
function fechaCorta(ymd) {
    const [anio, mes, dia] = String(ymd).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
}

export async function iniciar(raiz, { alCambiarPendientes = () => {} } = {}) {
    let estados = [];
    let pedidos = [];

    // ---------- Estructura ----------
    const barra = el('div', 'barra');

    const grupoFiltro = el('div', 'barra__grupo');
    const etiquetaFiltro = el('label', null, 'Mostrar');
    etiquetaFiltro.htmlFor = 'filtro-estado';
    const filtro = el('select', 'control');
    filtro.id = 'filtro-estado';
    grupoFiltro.append(etiquetaFiltro, filtro);

    const botonActualizar = el('button', 'boton boton--suave', 'Actualizar');
    botonActualizar.type = 'button';

    const resumen = el('p', 'barra__resumen');
    resumen.setAttribute('role', 'status');

    barra.append(grupoFiltro, botonActualizar, resumen);

    const lista = el('div', 'lista');
    const mensaje = el('p', 'estado');
    mensaje.setAttribute('role', 'status');
    mensaje.setAttribute('aria-live', 'polite');

    raiz.replaceChildren(barra, lista, mensaje);

    function decir(texto, tipo = '') {
        mensaje.className = `estado${tipo ? ` estado--${tipo}` : ''}`;
        mensaje.textContent = texto;
    }

    // ---------- Una fila de pedido ----------
    function dato(dl, nombre, valor) {
        if (valor === null || valor === undefined || valor === '') return;
        const caja = el('div');
        caja.append(el('dt', null, nombre));
        const dd = el('dd');
        if (valor instanceof Node) dd.append(valor);
        else dd.textContent = String(valor);
        caja.append(dd);
        dl.append(caja);
    }

    function crearFila(pedido) {
        const fila = el('article', 'fila');

        const cabecera = el('header', 'fila__cabecera');
        const titulo = el('h3', null, `#${pedido.id} · ${pedido.cliente}`);
        const nuevo = el('span', 'fila__nuevo', 'Nuevo');
        nuevo.hidden = pedido.estadoId !== ID_PENDIENTE;
        titulo.append(nuevo);
        cabecera.append(titulo, el('span', 'fila__fecha', fechaHora(pedido.creadoEn)));

        const datos = el('dl', 'fila__datos');
        dato(datos, 'Modelo', pedido.trabajo || 'A medida');
        dato(datos, 'Cantidad', pedido.cantidad);
        dato(datos, 'Lo necesita para', pedido.fechaNecesaria ? fechaCorta(pedido.fechaNecesaria) : null);

        const tel = el('a', null, pedido.telefono);
        tel.href = `tel:+549${pedido.telefono}`;
        dato(datos, 'Teléfono', tel);

        if (pedido.email) {
            const correo = el('a', null, pedido.email);
            correo.href = `mailto:${pedido.email}`;
            dato(datos, 'Email', correo);
        }

        const detalle = el('p', 'fila__detalle', pedido.descripcion);

        // ----- Acciones: estado + WhatsApp -----
        const acciones = el('div', 'fila__acciones');

        const grupoEstado = el('div', 'barra__grupo');
        const etiquetaEstado = el('label', null, 'Estado');
        const selectorEstado = el('select', 'control');
        const idSelector = `estado-pedido-${pedido.id}`;
        selectorEstado.id = idSelector;
        etiquetaEstado.htmlFor = idSelector;
        estados.forEach((e) => {
            const opcion = el('option', null, e.nombre);
            opcion.value = String(e.id);
            selectorEstado.append(opcion);
        });
        selectorEstado.value = String(pedido.estadoId);
        grupoEstado.append(etiquetaEstado, selectorEstado);

        selectorEstado.addEventListener('change', async () => {
            const anterior = pedido.estadoId;
            const nuevoId = Number(selectorEstado.value);
            selectorEstado.disabled = true;
            decir('');
            try {
                await apiAdmin.cambiarEstadoPedido(pedido.id, nuevoId);
                pedido.estadoId = nuevoId;
                nuevo.hidden = nuevoId !== ID_PENDIENTE;
                avisarPendientes();
                const nombre = estados.find((e) => e.id === nuevoId)?.nombre || '';
                decir(`Pedido #${pedido.id}: estado cambiado a "${nombre}".`, 'ok');
            } catch (error) {
                selectorEstado.value = String(anterior);
                decir(error.message, 'error');
            } finally {
                selectorEstado.disabled = false;
            }
        });

        acciones.append(grupoEstado);

        // El enlace lo arma el servidor; solo se acepta uno de WhatsApp
        if (typeof pedido.whatsapp === 'string' && pedido.whatsapp.startsWith('https://wa.me/')) {
            const boton = el('a', 'boton', 'Escribirle por WhatsApp');
            boton.href = pedido.whatsapp;
            boton.target = '_blank';
            boton.rel = 'noopener noreferrer';
            acciones.append(boton);
        } else {
            acciones.append(el('span', 'fila__fecha', 'No se pudo armar el enlace de WhatsApp'));
        }

        fila.append(cabecera, datos, detalle, acciones);
        return fila;
    }

    // ---------- Dibujo de la lista ----------
    function avisarPendientes() {
        alCambiarPendientes(pedidos.filter((p) => p.estadoId === ID_PENDIENTE).length);
    }

    function dibujar() {
        const elegido = filtro.value;
        const visibles = elegido ? pedidos.filter((p) => String(p.estadoId) === elegido) : pedidos;

        lista.replaceChildren(...visibles.map(crearFila));

        if (pedidos.length === 0) {
            resumen.textContent = '';
            decir('Todavía no llegó ningún pedido.');
        } else {
            resumen.textContent = visibles.length === 1 ? '1 pedido' : `${visibles.length} pedidos`;
            decir(visibles.length === 0 ? 'No hay pedidos con ese estado.' : '');
        }
        avisarPendientes();
    }

    async function cargar() {
        botonActualizar.disabled = true;
        decir('Cargando…');
        try {
            [estados, pedidos] = await Promise.all([apiAdmin.estados(), apiAdmin.pedidos()]);

            const elegido = filtro.value;
            filtro.replaceChildren(el('option', null, 'Todos'));
            filtro.firstChild.value = '';
            estados.forEach((e) => {
                const opcion = el('option', null, e.nombre);
                opcion.value = String(e.id);
                filtro.append(opcion);
            });
            filtro.value = elegido; // conserva el filtro al actualizar

            dibujar();
        } catch (error) {
            lista.replaceChildren();
            decir(error.message, 'error');
        } finally {
            botonActualizar.disabled = false;
        }
    }

    filtro.addEventListener('change', dibujar);
    botonActualizar.addEventListener('click', cargar);

    await cargar();
}