

function escapar(texto) {
    return String(texto ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * @param {string} html       plantilla con marcas %%CLAVE%%
 * @param {object} valores    { CLAVE: valor }
 * @param {string[]} crudos   claves cuyo valor es HTML propio (no se escapa)
 */
function completar(html, valores, crudos = []) {
    return html.replace(/%%([A-Z_]+)%%/g, (marca, clave) => {
        if (!(clave in valores)) return marca;
        return crudos.includes(clave) ? valores[clave] : escapar(valores[clave]);
    });
}

module.exports = { escapar, completar };