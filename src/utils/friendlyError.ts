import axios from 'axios';

/**
 * Convierte cualquier error (de conexión, del servidor o inesperado) en un mensaje
 * claro y amable para personas sin conocimientos técnicos.
 *
 * - Si el servidor manda un mensaje propio y entendible en español (p. ej. "No hay
 *   suficiente stock"), se respeta.
 * - Si el mensaje es técnico (inglés, SQL, nombres de clases, HTML...), se reemplaza.
 */

const MENSAJES = {
  sinConexion: 'No pudimos conectarnos. Revisa tu conexión a internet e inténtalo de nuevo.',
  tardando: 'El sistema está tardando más de lo normal en responder. Espera un momento e inténtalo de nuevo.',
  iniciando: 'El sistema se está iniciando. Espera unos segundos e inténtalo de nuevo.',
  sesion: 'Tu sesión terminó. Vuelve a iniciar sesión para continuar.',
  permiso: 'No tienes permiso para ver o realizar esta acción. Si lo necesitas, pídeselo al administrador.',
  noEncontrado: 'No encontramos lo que buscas. Es posible que se haya eliminado o que ya no exista.',
  archivoGrande: 'El archivo es demasiado grande. Intenta con una imagen más pequeña.',
  muchosIntentos: 'Se hicieron demasiados intentos seguidos. Espera un momento e inténtalo de nuevo.',
  datosInvalidos: 'Algunos datos no son correctos. Revísalos e inténtalo de nuevo.',
  general: 'Algo salió mal y no pudimos completar la acción. Por favor, inténtalo de nuevo. Si el problema continúa, avisa al administrador.',
};

// Pistas de que un texto es técnico y no debe mostrarse a la persona usuaria
const PATRONES_TECNICOS = [
  /SQLSTATE/i, /exception/i, /stack ?trace/i, /\.php\b/i, /\bline \d+/i, /<\/?[a-z][\s\S]*>/i,
  /\b(undefined|null|NaN|object|array|function)\b/, /server error/i, /internal/i,
  /unauthenticated/i, /unauthorized/i, /forbidden/i, /not found/i, /could not/i,
  /csrf/i, /token/i, /timeout/i, /network/i, /status code/i, /request failed/i,
  /database|base de datos/i, /servidor/i, /query/i, /column|table|constraint/i,
  /App\\|Illuminate\\|Symfony\\/, /\[\w+\]/, /[{}]/,
];

// Palabras en inglés frecuentes en mensajes de error de frameworks
const PALABRAS_INGLES = /\b(the|is|was|are|not|failed|invalid|error|must|cannot|could|field|required|given|expected|attempt|more)\b/i;

// Solo se muestran mensajes que claramente estén en español
const PARECE_ESPANOL = /[áéíóúñ¿¡]|\b(el|la|los|las|de|del|al|no|se|para|por|con|un|una|es|que|tu|su|ya|hay|esta|este)\b/i;

const esTecnico = (msg: string) =>
  PATRONES_TECNICOS.some((p) => p.test(msg)) || PALABRAS_INGLES.test(msg) || !PARECE_ESPANOL.test(msg);

const esMensajeAmigable = (msg: unknown): msg is string =>
  typeof msg === 'string' && msg.trim().length > 0 && msg.length < 300 && !esTecnico(msg);

/**
 * Devuelve el mensaje amable para un error.
 * @param error   El error atrapado en el catch.
 * @param accion  Opcional: qué se intentaba hacer, p. ej. "No se pudo guardar el producto."
 *                Se usa cuando no hay un mensaje más específico.
 */
export function getFriendlyErrorMessage(error: unknown, accion?: string): string {
  const generico = accion ? `${accion} Por favor, inténtalo de nuevo.` : MENSAJES.general;

  if (!axios.isAxiosError(error)) {
    return generico;
  }

  // Sin respuesta: sin internet, servidor apagado o tiempo de espera agotado
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') return MENSAJES.tardando;
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return MENSAJES.sinConexion;
    return MENSAJES.sinConexion;
  }

  const { status } = error.response;
  const data = error.response.data as { message?: unknown; errors?: Record<string, unknown> } | undefined;

  // Validación: preferir el primer mensaje de campo (más concreto que el resumen)
  if (status === 422) {
    const primerCampo = data?.errors && Object.values(data.errors)[0];
    const msgCampo = Array.isArray(primerCampo) ? primerCampo[0] : primerCampo;
    if (esMensajeAmigable(msgCampo)) return msgCampo;
    if (esMensajeAmigable(data?.message)) return data.message;
    return MENSAJES.datosInvalidos;
  }

  // Mensajes propios del sistema (ya en español y claros) se respetan
  if (status < 500 && esMensajeAmigable(data?.message)) {
    return data.message;
  }

  switch (status) {
    case 401:
    case 419:
      return MENSAJES.sesion;
    case 403:
      return MENSAJES.permiso;
    case 404:
      return MENSAJES.noEncontrado;
    case 413:
      return MENSAJES.archivoGrande;
    case 429:
      return MENSAJES.muchosIntentos;
    case 502:
    case 503:
    case 504:
      return MENSAJES.iniciando;
  }

  // Errores 5xx: el backend ya manda un mensaje amable; si no, el genérico
  if (status >= 500) {
    const msg = data?.message;
    // Los mensajes amables del backend mencionan "inténtalo de nuevo"
    if (typeof msg === 'string' && /inténtalo de nuevo/i.test(msg) && !/SQLSTATE|exception/i.test(msg)) {
      return msg;
    }
    return generico;
  }

  return generico;
}

/**
 * Para errores de validación por campo: devuelve { campo: mensaje } solo con
 * mensajes amables (los técnicos se reemplazan por uno general).
 */
export function getFriendlyFieldErrors(error: unknown): Record<string, string> | null {
  if (!axios.isAxiosError(error) || error.response?.status !== 422) return null;
  const errors = (error.response.data as { errors?: Record<string, unknown> } | undefined)?.errors;
  if (!errors) return null;
  const resultado: Record<string, string> = {};
  for (const [campo, valor] of Object.entries(errors)) {
    const msg = Array.isArray(valor) ? valor[0] : valor;
    resultado[campo] = esMensajeAmigable(msg) ? msg : 'Revisa este dato.';
  }
  return resultado;
}

/**
 * Avisa con un mensaje amable que no se pudo cargar una lista o pantalla.
 * No avisa si la petición fue cancelada (p. ej. al cambiar de mes rápido) ni si la
 * sesión terminó (en ese caso ya se redirige al inicio de sesión).
 * @param que  Qué se estaba cargando, p. ej. "los productos".
 */
export function avisarErrorDeCarga(error: unknown, que: string) {
  if (axios.isCancel(error)) return;
  if (axios.isAxiosError(error) && error.response?.status === 401) return;
  const mensaje = getFriendlyErrorMessage(error, `No pudimos cargar ${que}.`);
  window.alert(mensaje);
}
