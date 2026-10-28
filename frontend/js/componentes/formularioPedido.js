
import { api, ErrorApi } from '../api.js';

// Mismas reglas que el servidor (utils/whatsapp.js): 10 dígitos, código de
// área sin 0 y número sin 15. Tolera +54, 54 9 y 0 iniciales.
function telefonoValido(texto) {
    let d = String(texto || '').replace(/\D/g, '');
    if (d.length > 10 && d.startsWith('54')) d = d.slice(2);
    if (d.length === 11 && d.startsWith('9')) d = d.slice(1);
    if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
    return /^[1-3]\d{9}$/.test(d);
}

const REGEX_EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function fechaLocal(diasDesdeHoy = 0) {
    const f = new Date();
    f.setDate(f.getDate() + diasDesdeHoy);
    return f.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

export function iniciarFormulario() {
    const form = document.getElementById('form-pedido');
    if (!form) return;

    const boton = document.getElementById('boton-pedido');
    const estado = document.getElementById('estado-form');

    // La fecha deseada tiene que ser posterior a hoy
    form.elements.fechaNecesaria.min = fechaLocal(1);

    // ---------- Errores por campo ----------

    function limpiarError(campo) {
        const envoltorio = campo.parentElement;
        envoltorio.classList.remove('campo--error');
        const mensaje = envoltorio.querySelector(`#error-${campo.name}`);
        if (mensaje) mensaje.remove();
        campo.removeAttribute('aria-invalid');
        const ids = (campo.getAttribute('aria-describedby') || '')
            .split(' ')
            .filter((id) => id && id !== `error-${campo.name}`);
        if (ids.length) {
            campo.setAttribute('aria-describedby', ids.join(' '));
        } else {
            campo.removeAttribute('aria-describedby');
        }
    }

    function marcarError(campo, texto) {
        limpiarError(campo);
        const envoltorio = campo.parentElement;
        envoltorio.classList.add('campo--error');

        const mensaje = document.createElement('span');
        mensaje.className = 'campo__error';
        mensaje.id = `error-${campo.name}`;
        mensaje.textContent = texto;
        envoltorio.append(mensaje);

        campo.setAttribute('aria-invalid', 'true');
        const ids = (campo.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
        campo.setAttribute('aria-describedby', [...ids, mensaje.id].join(' '));
    }

    // Al escribir en un campo se le quita el aviso
    form.addEventListener('input', (e) => {
        if (e.target.name && e.target.name !== 'sitioWeb') limpiarError(e.target);
    });

    // ---------- Validación en el navegador ----------

    function validar() {
        const campos = form.elements;
        const errores = [];

        const nombre = campos.nombre.value.trim();
        if (nombre.length < 2) errores.push([campos.nombre, 'Escribí tu nombre']);

        if (!telefonoValido(campos.telefono.value)) {
            errores.push([
                campos.telefono,
                'Ingresá el código de área sin 0 y el número sin 15 (ej: 3573404315)'
            ]);
        }

        const email = campos.email.value.trim();
        if (email && !REGEX_EMAIL.test(email)) {
            errores.push([campos.email, 'El email no parece válido']);
        }

        const cantidad = Number(campos.cantidad.value);
        if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 500) {
            errores.push([campos.cantidad, 'La cantidad debe estar entre 1 y 500']);
        }

        const fecha = campos.fechaNecesaria.value;
        if (fecha && fecha < fechaLocal(1)) {
            errores.push([campos.fechaNecesaria, 'La fecha tiene que ser posterior a hoy']);
        }

        const descripcion = campos.descripcion.value.trim();
        if (descripcion.length < 10) {
            errores.push([campos.descripcion, 'Contanos un poco más (mínimo 10 caracteres)']);
        }

        return errores;
    }

    // ---------- Mensaje general ----------

    function decir(texto, tipo = '') {
        estado.className = `estado${tipo ? ` estado--${tipo}` : ''}`;
        estado.textContent = texto;
    }

    function ofrecerWhatsapp(url) {
        // Solo se acepta un enlace de WhatsApp (defensa extra ante datos inesperados)
        if (typeof url !== 'string' || !url.startsWith('https://wa.me/')) return;
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.target = '_blank';
        enlace.rel = 'noopener noreferrer';
        enlace.textContent = 'Abrir WhatsApp';
        estado.append(' Si no se abrió solo: ', enlace, '.');
    }

    // ---------- Envío ----------

    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        Array.from(form.elements).forEach((c) => c.name && limpiarError(c));

        const errores = validar();
        if (errores.length > 0) {
            errores.forEach(([campo, texto]) => marcarError(campo, texto));
            errores[0][0].focus();
            decir('Revisá los campos marcados.', 'error');
            return;
        }

        const datos = {
            nombre: form.elements.nombre.value,
            telefono: form.elements.telefono.value,
            email: form.elements.email.value,
            trabajo: form.elements.trabajo.value,
            cantidad: Number(form.elements.cantidad.value),
            fechaNecesaria: form.elements.fechaNecesaria.value,
            descripcion: form.elements.descripcion.value,
            sitioWeb: form.elements.sitioWeb.value // campo trampa
        };

        boton.disabled = true;
        boton.textContent = 'Enviando…';
        decir('');

        try {
            const resultado = await api.crearPedido(datos);
            form.reset();
            decir('¡Listo! Tu pedido quedó registrado. Te llevamos a WhatsApp para enviarlo.', 'ok');

            if (resultado.whatsapp) {
                ofrecerWhatsapp(resultado.whatsapp);
                window.location.assign(resultado.whatsapp);
            }
        } catch (error) {
            // El servidor señala qué campos fallaron
            if (error instanceof ErrorApi && error.detalles.length > 0) {
                error.detalles.forEach(({ campo, mensaje }) => {
                    const input = form.elements[campo];
                    if (input) marcarError(input, mensaje);
                });
                const primero = form.elements[error.detalles[0].campo];
                if (primero) primero.focus();
                decir('Revisá los campos marcados.', 'error');
            } else {
                decir(error.message, 'error');
            }
        } finally {
            boton.disabled = false;
            boton.textContent = 'Enviar pedido por WhatsApp';
        }
    });
}