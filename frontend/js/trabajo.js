
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
const imagen = marco ? marco.querySelector('.visor__imagen') : null;

if (visor && marco && imagen) {
    const ESCALA_TOQUE = 2.4; // zoom al tocar / hacer clic
    const ESCALA_MAX = 5; // tope al pellizcar
    const UMBRAL_MOVIMIENTO = 8; // px: menos que esto sigue siendo un "toque"

    let escala = 1;
    let tx = 0; // desplazamiento de la imagen en px (respecto del centro del marco)
    let ty = 0;

    // Se vuelve operable con teclado y lectores de pantalla
    marco.tabIndex = 0;
    marco.setAttribute('role', 'button');
    marco.setAttribute('aria-pressed', 'false');
    marco.setAttribute('aria-label', 'Acercar imagen');

    const limitar = (n, min, max) => Math.min(max, Math.max(min, n));

    // Posición de un punto de la pantalla respecto del centro del marco
    function relativo(clientX, clientY) {
        const caja = marco.getBoundingClientRect();
        return {
            x: clientX - caja.left - caja.width / 2,
            y: clientY - caja.top - caja.height / 2
        };
    }

    // Dibuja el estado actual (nunca deja ver fuera de la imagen)
    function aplicar() {
        const maxX = ((escala - 1) * marco.clientWidth) / 2;
        const maxY = ((escala - 1) * marco.clientHeight) / 2;
        tx = limitar(tx, -maxX, maxX);
        ty = limitar(ty, -maxY, maxY);

        const acercada = escala > 1.001;
        imagen.style.transform = acercada
            ? `translate(${tx}px, ${ty}px) scale(${escala})`
            : '';
        visor.classList.toggle('visor--zoom', acercada);
        marco.setAttribute('aria-pressed', String(acercada));
        marco.setAttribute('aria-label', acercada ? 'Alejar imagen' : 'Acercar imagen');
        if (ayuda) {
            ayuda.textContent = acercada
                ? 'Mové el mouse o arrastrá con un dedo para recorrerla. Tocá de nuevo para alejarla.'
                : 'Tocá la imagen para acercarla, o pellizcá con dos dedos.';
        }
    }

    // Zoom que deja fijo el punto (x, y): el que está bajo el cursor o el dedo
    function acercarEn(x, y, nueva) {
        escala = nueva;
        tx = x * (1 - nueva);
        ty = y * (1 - nueva);
        aplicar();
    }

    function alejar() {
        escala = 1;
        tx = 0;
        ty = 0;
        aplicar();
    }

    // ---------- Mouse y teclado ----------

    let vinoDeGesto = false; // un arrastre o pellizco no debe contar como "toque"

    marco.addEventListener('click', (evento) => {
        if (vinoDeGesto) {
            vinoDeGesto = false;
            return;
        }
        if (escala > 1.001) {
            alejar();
        } else if (evento.detail === 0) {
            acercarEn(0, 0, ESCALA_TOQUE); // activado con teclado: centro
        } else {
            const p = relativo(evento.clientX, evento.clientY);
            acercarEn(p.x, p.y, ESCALA_TOQUE);
        }
    });

    // Con mouse, la imagen sigue al cursor (igual que antes)
    marco.addEventListener('pointermove', (evento) => {
        if (evento.pointerType !== 'mouse' || escala <= 1.001) return;
        const p = relativo(evento.clientX, evento.clientY);
        tx = p.x * (1 - escala);
        ty = p.y * (1 - escala);
        aplicar();
    });

    marco.addEventListener('keydown', (evento) => {
        if (evento.key === 'Enter' || evento.key === ' ') {
            evento.preventDefault();
            if (escala > 1.001) alejar();
            else acercarEn(0, 0, ESCALA_TOQUE);
        } else if (evento.key === 'Escape' && escala > 1.001) {
            alejar();
        }
    });

    // ---------- Celulares y tablets: pellizco + arrastre ----------

    let ancla = null; // punto de la imagen que acompaña a los dedos
    let inicio = null; // dónde empezó el primer dedo
    let hubo2Dedos = false;
    let seMovio = false;

    // Centro y separación de los dedos (1 dedo: su posición, separación 0)
    function dedos(evento) {
        const t = evento.touches;
        if (t.length >= 2) {
            const a = relativo(t[0].clientX, t[0].clientY);
            const b = relativo(t[1].clientX, t[1].clientY);
            return {
                x: (a.x + b.x) / 2,
                y: (a.y + b.y) / 2,
                dist: Math.hypot(a.x - b.x, a.y - b.y)
            };
        }
        const u = relativo(t[0].clientX, t[0].clientY);
        return { x: u.x, y: u.y, dist: 0 };
    }

    // Se fija qué punto de la imagen está bajo los dedos; al sumar o quitar un
    // dedo se vuelve a fijar para que no haya saltos
    function anclar(evento) {
        const d = dedos(evento);
        ancla = {
            qx: (d.x - tx) / escala,
            qy: (d.y - ty) / escala,
            escala0: escala,
            dist0: d.dist,
            n: evento.touches.length
        };
    }

    marco.addEventListener('touchstart', (evento) => {
        if (evento.touches.length === 1) {
            hubo2Dedos = false;
            seMovio = false;
            vinoDeGesto = false;
            inicio = { x: evento.touches[0].clientX, y: evento.touches[0].clientY };
        } else {
            hubo2Dedos = true;
        }
        visor.classList.add('visor--tactil'); // sin animación mientras hay dedos
        anclar(evento);
    }, { passive: true });

    marco.addEventListener('touchmove', (evento) => {
        if (!ancla || evento.touches.length === 0) return;
        if (ancla.n !== evento.touches.length) anclar(evento);

        const d = dedos(evento);

        if (evento.touches.length >= 2 && ancla.dist0 > 0) {
            escala = limitar(ancla.escala0 * (d.dist / ancla.dist0), 1, ESCALA_MAX);
            seMovio = true;
        } else if (inicio) {
            const dx = evento.touches[0].clientX - inicio.x;
            const dy = evento.touches[0].clientY - inicio.y;
            if (Math.hypot(dx, dy) > UMBRAL_MOVIMIENTO) seMovio = true;
        }

        // Sin zoom y con un dedo se deja que la página haga scroll normalmente
        if (evento.touches.length === 1 && escala <= 1.001) return;

        if (evento.cancelable) evento.preventDefault();
        tx = d.x - escala * ancla.qx;
        ty = d.y - escala * ancla.qy;
        aplicar();
    }, { passive: false });

    function terminarToque(evento) {
        if (evento.touches.length > 0) {
            anclar(evento);
            return;
        }
        ancla = null;
        inicio = null;
        visor.classList.remove('visor--tactil');
        if (escala < 1.05) alejar();
        else aplicar();

        // El navegador manda un "click" después de soltar: si fue un arrastre o
        // un pellizco hay que ignorarlo
        if (hubo2Dedos || seMovio) {
            vinoDeGesto = true;
            setTimeout(() => { vinoDeGesto = false; }, 400);
        }
    }

    marco.addEventListener('touchend', terminarToque);
    marco.addEventListener('touchcancel', terminarToque);

    // Safari de iPhone/iPad: evita que el pellizco haga zoom a toda la página
    ['gesturestart', 'gesturechange'].forEach((nombre) => {
        marco.addEventListener(nombre, (evento) => evento.preventDefault());
    });

    // Al girar el celular cambian las medidas del marco
    window.addEventListener('resize', aplicar);
}