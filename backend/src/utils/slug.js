

function generarSlug(texto, maximo = 100) {
    return String(texto)
        .normalize('NFD')                 // separa letra y tilde: "é" -> "e" + "´"
        .replace(/[\u0300-\u036f]/g, '')  // quita las tildes (y la eñe queda "n")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')      // todo lo que no sea letra/número -> guion
        .replace(/^-+|-+$/g, '')          // sin guiones al inicio ni al final
        .slice(0, maximo)
        .replace(/-+$/, '');              // por si el corte dejó un guion al final
}

// Agrega un número al final respetando el largo máximo: "pescador" -> "pescador-2"
function conSufijo(slug, numero, maximo = 100) {
    const sufijo = `-${numero}`;
    return slug.slice(0, maximo - sufijo.length).replace(/-+$/, '') + sufijo;
}

module.exports = { generarSlug, conSufijo };