
const { Router } = require('express');
const paginasController = require('../controllers/paginas.controller');

const router = Router();

router.get('/', paginasController.inicio);
router.get('/index.html', (req, res) => res.redirect(301, '/')); // una sola URL para la portada
router.get('/trabajo/:slug', paginasController.trabajo);

// Atajo al panel: /admin lleva al login (que a su vez salta al panel si ya hay sesión)
router.get('/admin', (req, res) => res.redirect('/admin/login.html'));

module.exports = router;