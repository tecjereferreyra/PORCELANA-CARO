

// el('p', 'estado', 'Hola')  ->  <p class="estado">Hola</p>
export function el(etiqueta, clase, texto) {
    const nodo = document.createElement(etiqueta);
    if (clase) nodo.className = clase;
    if (texto !== undefined) nodo.textContent = texto;
    return nodo;
}

// Un campo con su etiqueta: devuelve { grupo, control }
export function campo({ id, etiqueta, tipo = 'text', clase = 'control', ...atributos }) {
    const grupo = el('div', 'barra__grupo');
    const rotulo = el('label', null, etiqueta);
    rotulo.htmlFor = id;
    const control = el('input', clase);
    control.id = id;
    control.type = tipo;
    Object.entries(atributos).forEach(([nombre, valor]) => control.setAttribute(nombre, valor));
    grupo.append(rotulo, control);
    return { grupo, control };
}

// Un mensaje de estado con aria-live
export function crearMensaje() {
    const nodo = el('p', 'estado');
    nodo.setAttribute('role', 'status');
    nodo.setAttribute('aria-live', 'polite');
    return {
        nodo,
        decir(texto, tipo = '') {
            nodo.className = `estado${tipo ? ` estado--${tipo}` : ''}`;
            nodo.textContent = texto;
        }
    };
}

// El primer detalle de validación del servidor (o el mensaje general)
export function textoDeError(error) {
    return (error.detalles && error.detalles[0] && error.detalles[0].mensaje) || error.message;
}