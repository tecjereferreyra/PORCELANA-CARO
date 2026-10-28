
const volver = document.querySelector('.migas a');
if (volver && document.referrer) {
    try {
        const origen = new URL(document.referrer);
        if (origen.origin === window.location.origin && origen.pathname === '/') {
            volver.addEventListener('click', (evento) => {
                evento.preventDefault();
                history.back();
            });
        }
    } catch {
        // referrer inválido: el enlace funciona como un enlace común
    }
}

const visor = document.getElementById('visor');
const marco = document.getElementById('visor-marco');
const ayuda = document.getElementById('visor-ayuda');

if (visor && marco) {
    let acercada = false;

    // Se vuelve operable con teclado y lectores de pantalla
    marco.tabIndex = 0;
    marco.setAttribute('role', 'button');
    marco.setAttribute('aria-pressed', 'false');
    marco.setAttribute('aria-label', 'Acercar imagen');

    const limitar = (n) => Math.min(100, Math.max(0, n));

    // El punto bajo el cursor (o el dedo) es el centro del zoom
    function mover(evento) {
        const caja = marco.getBoundingClientRect();
        const x = limitar(((evento.clientX - caja.left) / caja.width) * 100);
        const y = limitar(((evento.clientY - caja.top) / caja.height) * 100);
        visor.style.setProperty('--x', `${x}%`);
        visor.style.setProperty('--y', `${y}%`);
    }

    function cambiar(activar) {
        acercada = activar;
        visor.classList.toggle('visor--zoom', activar);
        marco.setAttribute('aria-pressed', String(activar));
        marco.setAttribute('aria-label', activar ? 'Alejar imagen' : 'Acercar imagen');
        if (ayuda) {
            ayuda.textContent = activar
                ? 'Mové el mouse o el dedo para recorrerla. Tocá de nuevo para alejarla.'
                : 'Tocá la imagen para acercarla.';
        }
    }

    marco.addEventListener('click', (evento) => {
        if (!acercada) mover(evento);
        cambiar(!acercada);
    });

    marco.addEventListener('pointermove', (evento) => {
        if (acercada) mover(evento);
    });

    marco.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            cambiar(!acercada);
        } else if (evento.key === 'Escape' && acercada) {
            cambiar(false);
        }
    });
}