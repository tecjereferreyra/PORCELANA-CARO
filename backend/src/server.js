require('dotenv').config();
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const logger = require('./middlewares/logger');
const asyncHandler = require('./middlewares/asyncHandler');
const { noEncontrado, manejadorErrores } = require('./middlewares/errores');
const { probarConexion, cerrar } = require('./config/db');

const trabajosRoutes = require('./routes/trabajos.routes');
const pedidosRoutes = require('./routes/pedidos.routes');
const adminRoutes = require('./routes/admin.routes');
const paginasRoutes = require('./routes/paginas.routes');

const enProduccion = process.env.NODE_ENV === 'production';
const PUERTO = Number(process.env.PORT) || 3000;
const DIR_FRONTEND = path.join(__dirname, '../../frontend');

const app = express();

// Render (y casi cualquier hosting) pone un proxy delante: sin esto Express
// vería siempre la misma IP y las cookies "Secure" y el límite de peticiones fallarían.
if (enProduccion) {
    app.set('trust proxy', 1);
}


app.use(
    helmet({
        contentSecurityPolicy: {
            useDefaults: true,
            directives: {
                'default-src': ["'self'"],
                'script-src': ["'self'"],
                'style-src': ["'self'", 'https://fonts.googleapis.com'],
                'font-src': ["'self'", 'https://fonts.gstatic.com'],
                'img-src': ["'self'", 'data:', 'https://res.cloudinary.com'],
                'connect-src': ["'self'"],
                'object-src': ["'none'"],
                'frame-ancestors': ["'none'"],
                'form-action': ["'self'"],
                // En local (http) esta directiva rompe la carga de recursos
                'upgrade-insecure-requests': enProduccion ? [] : null
            }
        }
    })
);

app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
app.use(logger.registrarAcceso);


app.get(
    '/api/salud',
    asyncHandler(async (req, res) => {
        await probarConexion();
        res.json({ ok: true });
    })
);

const limitadorApi = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300, // peticiones por IP cada 15 minutos
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({ ok: false, mensaje: 'Demasiadas peticiones, esperá unos minutos' });
    }
});

app.use('/api', limitadorApi);
app.use('/api', trabajosRoutes);
app.use('/api', pedidosRoutes);
app.use('/api/admin', adminRoutes);

// Rutas de /api que no existen -> 404 en JSON
app.use('/api', noEncontrado);

// Páginas con SEO dinámico (portada y ficha de cada trabajo).
// Van ANTES del express.static para que sirvan ellas el HTML.
// El panel de administración no debe aparecer en Google
app.use('/admin', (req, res, next) => {
    res.set('X-Robots-Tag', 'noindex, nofollow');
    next();
});

app.use(paginasRoutes);

// ---------------------------------------------------------------------
// Front estático
// ---------------------------------------------------------------------
app.use(express.static(DIR_FRONTEND, { index: false, maxAge: enProduccion ? '1d' : 0 }));

// Cualquier otra ruta
app.use((req, res) => {
    res.status(404).type('text').send('Página no encontrada');
});

app.use(manejadorErrores);

// ---------------------------------------------------------------------
// Arranque y cierre ordenado
// ---------------------------------------------------------------------
async function iniciar() {
    try {
        await probarConexion();
        logger.info('Conexión a la base de datos OK');
    } catch (err) {
        logger.error('No se pudo conectar a la base de datos', err);
        process.exit(1);
    }

    const servidor = app.listen(PUERTO, () => {
        logger.info(`Servidor escuchando en http://localhost:${PUERTO}`);
    });

    const apagar = (senal) => {
        logger.info(`${senal} recibido, cerrando el servidor...`);
        servidor.close(async () => {
            await cerrar();
            process.exit(0);
        });
        setTimeout(() => process.exit(1), 10000).unref();
    };
    process.on('SIGTERM', () => apagar('SIGTERM'));
    process.on('SIGINT', () => apagar('SIGINT'));
}

process.on('unhandledRejection', (motivo) => {
    logger.error(
        'Promesa rechazada sin manejar',
        motivo instanceof Error ? motivo : new Error(String(motivo))
    );
});

iniciar();