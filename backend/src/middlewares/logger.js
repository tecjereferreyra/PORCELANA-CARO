
const fs = require('fs');
const path = require('path');

const enProduccion = process.env.NODE_ENV === 'production';
const dirLogs = path.join(__dirname, '../../logs');

if (!enProduccion) {
    fs.mkdirSync(dirLogs, { recursive: true });
}

const ahora = () => new Date().toISOString();

// Evita que alguien inyecte saltos de línea para falsear el log
const limpiar = (texto) => String(texto).replace(/[\r\n]+/g, ' ');

function guardar(archivo, linea) {
    if (enProduccion) return;
    fs.appendFile(path.join(dirLogs, archivo), linea + '\n', () => {});
}

function info(mensaje) {
    console.log(`[${ahora()}] INFO  ${limpiar(mensaje)}`);
}

function error(mensaje, err) {
    const detalle = err && err.stack ? `\n${err.stack}` : '';
    const linea = `[${ahora()}] ERROR ${limpiar(mensaje)}${detalle}`;
    console.error(linea);
    guardar('errores.log', linea);
}

// Middleware: una línea por petición terminada
function registrarAcceso(req, res, next) {
    const inicio = Date.now();
    res.on('finish', () => {
        const ms = Date.now() - inicio;
        const linea =
            `[${ahora()}] ${req.method} ${limpiar(req.originalUrl)} ` +
            `${res.statusCode} ${ms}ms ip=${req.ip}`;
        console.log(linea);
        guardar('acceso.log', linea);
    });
    next();
}

module.exports = { info, error, registrarAcceso };