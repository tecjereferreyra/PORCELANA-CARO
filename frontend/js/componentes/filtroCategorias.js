
/**
 * @param {HTMLElement} contenedor  donde se dibujan los botones
 * @param {Array<{slug:string, nombre:string}>} categorias
 * @param {string|null} activa      slug seleccionado al inicio (null = todas)
 * @param {(slug:string|null) => void} alElegir
 */
export function crearFiltros(contenedor, categorias, activa, alElegir) {
    const botones = [];

    function marcar(slug) {
        botones.forEach(({ boton, valor }) => {
            boton.setAttribute('aria-pressed', String(valor === slug));
        });
    }

    function agregar(texto, valor) {
        const boton = document.createElement('button');
        boton.type = 'button';
        boton.className = 'filtro';
        boton.textContent = texto;
        boton.addEventListener('click', () => {
            marcar(valor);
            alElegir(valor);
        });
        botones.push({ boton, valor });
        return boton;
    }

    contenedor.replaceChildren(
        agregar('Todos', null),
        ...categorias.map((c) => agregar(c.nombre, c.slug))
    );
    marcar(activa);
}