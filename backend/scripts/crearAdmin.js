
const readline = require('readline');
const { cerrar } = require('../src/config/db');
const { crearAdmin } = require('../src/services/admin.service');

const REGEX_USUARIO = /^[A-Za-z0-9_.-]{3,40}$/;

function preguntar(texto, oculto = false) {
    return new Promise((resolve) => {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: true
        });

        // Mientras "oculto" está activo no se escribe nada en pantalla
        rl._writeToOutput = (cadena) => {
            if (!rl.silenciado || /[\r\n]/.test(cadena)) {
                rl.output.write(cadena);
            }
        };

        rl.question(texto, (respuesta) => {
            rl.close();
            resolve(respuesta);
        });
        rl.silenciado = oculto;
    });
}

async function main() {
    console.log('\n=== Crear administrador de Caro Porcelana ===\n');

    const usuario = (await preguntar('Usuario (3 a 40 caracteres: letras, números, _ . -): ')).trim();
    if (!REGEX_USUARIO.test(usuario)) {
        throw new Error('El usuario solo puede tener letras, números, _ . - (entre 3 y 40 caracteres)');
    }

    const clave = await preguntar('Contraseña (mínimo 10 caracteres): ', true);
    const repetida = await preguntar('Repetí la contraseña: ', true);
    if (clave !== repetida) {
        throw new Error('Las contraseñas no coinciden');
    }

    const id = await crearAdmin(usuario, clave);
    console.log(`\nListo: administrador "${usuario}" creado (id ${id}).\n`);
}

main()
    .then(() => cerrar())
    .catch(async (err) => {
        if (err.code === '23505') {
            console.error('\nERROR: ya existe un administrador con ese usuario.\n');
        } else {
            console.error(`\nERROR: ${err.message}\n`);
        }
        await cerrar();
        process.exit(1);
    });