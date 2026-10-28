
require('dotenv').config();
const { Pool, types } = require('pg');


types.setTypeParser(1082, (valor) => valor);

if (!process.env.DATABASE_URL) {
    throw new Error('Falta DATABASE_URL en el archivo .env');
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    // Supabase exige SSL
    ssl: { rejectUnauthorized: false },
    // El plan gratis tiene pocas conexiones: pool chico
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000
});

// Un error en una conexión ociosa no debe tirar abajo el servidor
pool.on('error', (err) => {
    console.error('Error inesperado en el pool de PostgreSQL:', err.message);
});

// Solo se permiten nombres como sp_trabajos_listar (nunca viene del usuario,
// pero se valida igual para que sea imposible armar SQL a partir de un nombre)
const NOMBRE_SP = /^sp_[a-z_]+$/;


async function ejecutarSP(nombre, parametros = []) {
    if (!NOMBRE_SP.test(nombre)) {
        throw new Error(`Nombre de procedimiento inválido: ${nombre}`);
    }
    const marcadores = parametros.map((_, i) => `$${i + 1}`).join(', ');
    const resultado = await pool.query(`select * from ${nombre}(${marcadores})`, parametros);
    return resultado.rows;
}

async function probarConexion() {
    const { rows } = await pool.query('select now() as ahora');
    return rows[0].ahora;
}

async function cerrar() {
    await pool.end();
}

module.exports = { pool, ejecutarSP, probarConexion, cerrar };