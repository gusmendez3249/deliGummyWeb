// Contador global de "cosas cargando" (peticiones al servidor, páginas descargándose).
// La barra de progreso superior se suscribe a este contador.
//
// Además lleva una lista de "tareas" con nombre (guardar, eliminar, exportar...) que
// muestra la tarjeta flotante de progreso.

type Listener = (activos: number) => void;
export interface Tarea {
  id: number;
  label: string;
}
type TareasListener = (tareas: Tarea[]) => void;

let activos = 0;
const listeners = new Set<Listener>();

let tareas: Tarea[] = [];
let siguienteId = 1;
const tareasListeners = new Set<TareasListener>();

const notificar = () => listeners.forEach((l) => l(activos));
const notificarTareas = () => tareasListeners.forEach((l) => l(tareas));

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

  /** Registra una tarea visible (p. ej. "Guardando cambios..."). Devuelve su id. */
  startTask(label: string) {
    const id = siguienteId++;
    tareas = [...tareas, { id, label }];
    notificarTareas();
    return id;
  },
  doneTask(id: number) {
    tareas = tareas.filter((t) => t.id !== id);
    notificarTareas();
  },
  subscribeTasks(listener: TareasListener) {
    tareasListeners.add(listener);
    listener(tareas);
    return () => {
      tareasListeners.delete(listener);
    };
  },
};
