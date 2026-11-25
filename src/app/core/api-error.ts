import { HttpErrorResponse } from '@angular/common/http';

// Traduce cualquier error del backend (Tabla 38) a un mensaje en lenguaje del usuario (RNF-08).
// El backend responde {"mensaje": "..."} o, en errores de @Valid, {"errores": {campo: mensaje}}.
export function mensajeDeError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return 'Ocurrió un error inesperado.';
  }
  if (error.status === 0) {
    return 'No se pudo conectar con el servidor. Verifica tu conexión o inténtalo en unos segundos.';
  }
  const cuerpo = error.error as { mensaje?: string; errores?: Record<string, string> } | null;
  if (cuerpo?.mensaje) {
    return conTildes(cuerpo.mensaje);
  }
  if (cuerpo?.errores) {
    return Object.values(cuerpo.errores).map(conTildes).join(' · ');
  }
  switch (error.status) {
    case 401: return 'Correo o contraseña incorrectos.';
    case 403: return 'No tienes permisos para esta acción.';
    case 404: return 'El registro ya no existe.';
    case 409: return 'La operación no es posible con el estado actual.';
    default:  return 'El servidor no pudo completar la operación.';
  }
}

// Errores de validacion campo por campo, para marcar cada control del formulario.
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse && error.status === 400) {
    const errores = (error.error as { errores?: Record<string, string> } | null)?.errores;
    if (errores) {
      return Object.fromEntries(Object.entries(errores).map(([k, v]) => [k, conTildes(v)]));
    }
  }
  return {};
}

// El backend escribe sus mensajes sin tildes; aqui se corrigen para mostrarlos bien.
const CORRECCIONES: [RegExp, string][] = [
  [/\bcamion\b/gi, 'camión'], [/\besta\b/g, 'está'], [/\bcontrasena\b/gi, 'contraseña'],
  [/\bdescripcion\b/gi, 'descripción'], [/\banio\b/gi, 'año'], [/\bdigitos\b/gi, 'dígitos'],
  [/\bnumero\b/gi, 'número'], [/\btelefono\b/gi, 'teléfono'], [/\baccion\b/gi, 'acción'],
  [/\binvalido\b/gi, 'inválido']
];
function conTildes(texto: string): string {
  let resultado = texto;
  for (const [patron, reemplazo] of CORRECCIONES) {
    resultado = resultado.replace(patron, (encontrado) =>
      encontrado[0] === encontrado[0].toUpperCase() ? reemplazo[0].toUpperCase() + reemplazo.slice(1) : reemplazo);
  }
  return resultado;
}
