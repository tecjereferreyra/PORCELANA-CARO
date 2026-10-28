
require('dotenv').config();

const NEGOCIO = 'Caro Porcelana';
const NUMERO_CARO = (process.env.WHATSAPP_NUMERO || '').replace(/\D/g, '');
const SITIO_URL = (process.env.SITIO_URL || '').replace(/\/+$/, '');

// Enlace a la ficha de una pieza. WhatsApp lo muestra con la foto, el nombre y
// la descripción en la vista previa (la foto no se puede adjuntar desde un enlace).
function urlTrabajo(slug) {
    return `${SITIO_URL}/trabajo/${encodeURIComponent(slug)}`;
}


function normalizarTelefonoAR(texto) {
    let d = String(texto || '').replace(/\D/g, '');

    if (d.length > 10 && d.startsWith('54')) d = d.slice(2); // código de país
    if (d.length === 11 && d.startsWith('9')) d = d.slice(1); // marca de celular
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1); // 0 de larga distancia

    // Los códigos de área argentinos empiezan con 1, 2 o 3
    return /^[1-3]\d{9}$/.test(d) ? d : null;
}

// 3573404315 -> 5493573404315 (formato que exige wa.me)
function aInternacional(telefono10) {
    return `549${telefono10}`;
}

function enlace(numeroInternacional, mensaje) {
    return `https://wa.me/${numeroInternacional}?text=${encodeURIComponent(mensaje)}`;
}

// "2026-11-05" -> "05/11/2026"
function formatearFecha(fecha) {
    if (!fecha) return null;
    const [anio, mes, dia] = String(fecha).slice(0, 10).split('-');
    return `${dia}/${mes}/${anio}`;
}

const unir = (...lineas) => lineas.filter((l) => l !== null && l !== undefined).join('\n');


function enlaceParaCliente(pedido) {
    const telefono = normalizarTelefonoAR(pedido.telefono);
    if (!telefono) return null;

    const fecha = formatearFecha(pedido.fecha_necesaria);

    const mensaje = unir(
        `¡Hola ${pedido.cliente}! Te escribo de ${NEGOCIO} por tu pedido *#${pedido.pedido_id}*:`,
        '',
        pedido.trabajo ? `• Modelo: ${pedido.trabajo}` : null,
        `• Cantidad: ${pedido.cantidad}`,
        fecha ? `• Fecha deseada: ${fecha}` : null,
        `• Detalles: ${pedido.descripcion}`,
        '',
        'Quería coordinar con vos los detalles y confirmarte si puedo realizarlo. ¡Gracias por tu consulta!'
    );

    return enlace(aInternacional(telefono), mensaje);
}


function enlaceDePedido(datos) {
    const fecha = formatearFecha(datos.fechaNecesaria);

    const mensaje = unir(
        `¡Hola! Soy ${datos.nombre} y quisiera hacer un pedido (*#${datos.pedidoId}*):`,
        '',
        datos.trabajo ? `• Modelo: ${datos.trabajo}` : null,
        datos.trabajoSlug ? `• Foto: ${urlTrabajo(datos.trabajoSlug)}` : null,
        `• Cantidad: ${datos.cantidad}`,
        fecha ? `• Lo necesito para el: ${fecha}` : null,
        `• Detalles: ${datos.descripcion}`,
        '',
        `Mi teléfono: ${datos.telefono}`,
        '¿Podrías confirmarme si es posible? ¡Muchas gracias!'
    );

    return enlace(NUMERO_CARO, mensaje);
}

// ---------------------------------------------------------------------
// 3) Botón "Encargar" de la ficha de un trabajo
// ---------------------------------------------------------------------
function enlaceDeTrabajo(nombreTrabajo, slug) {
    const mensaje = unir(
        `¡Hola! Me gustaría encargar *${nombreTrabajo}*.`,
        slug ? urlTrabajo(slug) : null,
        '¿Me podés pasar más información?'
    );
    return enlace(NUMERO_CARO, mensaje);
}

module.exports = {
    normalizarTelefonoAR,
    enlaceParaCliente,
    enlaceDePedido,
    enlaceDeTrabajo
};