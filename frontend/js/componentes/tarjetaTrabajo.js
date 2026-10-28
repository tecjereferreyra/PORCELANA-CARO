

function elemento(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

export function crearTarjeta(trabajo) {
    const tarjeta = elemento('article', 'tarjeta');

    // Lleva a la ficha (con zoom y botón para encargar) en la misma pestaña
    const enlace = elemento('a', 'tarjeta__enlace');
    enlace.href = `/trabajo/${encodeURIComponent(trabajo.slug)}`;
    enlace.setAttribute('aria-label', trabajo.nombre);

    const marco = elemento('div', 'tarjeta__marco');
    const imagen = elemento('img', 'tarjeta__imagen');
    imagen.src = trabajo.imagen;
    imagen.alt = trabajo.nombre;
    imagen.width = 800; // reservan el espacio y evitan saltos al cargar
    imagen.height = 1000;
    imagen.loading = 'lazy';
    imagen.decoding = 'async';
    marco.append(imagen);

    if (trabajo.destacado) {
        marco.append(elemento('span', 'tarjeta__sello', 'Destacado'));
    }

    const cuerpo = elemento('div', 'tarjeta__cuerpo');
    cuerpo.append(
        elemento('span', 'tarjeta__categoria', trabajo.categoria),
        elemento('h3', 'tarjeta__titulo', trabajo.nombre),
        elemento('p', 'tarjeta__texto', trabajo.descripcion)
    );

    enlace.append(marco, cuerpo);
    tarjeta.append(enlace);
    return tarjeta;
}