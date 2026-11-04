// Contador global de "cosas cargando" (peticiones al servidor, páginas descargándose).
// La barra de progreso superior se suscribe a este contador.

type Listener = (activos: number) => void;

let activos = 0;
const listeners = new Set<Listener>();

const notificar = () => listeners.forEach((l) => l(activos));

export const loadingBus = {
  start() {
    activos++;
    notificar();
  },
  done() {
    activos = Math.max(0, activos - 1);
    notificar();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(activos);
    return () => {
      listeners.delete(listener);
    };
  },
};
