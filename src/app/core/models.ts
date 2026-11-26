// Interfaces TypeScript que coinciden con el JSON que devuelve la API (seccion 4.3):
// si el contrato del backend cambia, el error aparece al compilar y no en produccion.

export type Rol = 'ADMINISTRADOR' | 'SUPERVISOR' | 'CONDUCTOR';
export type EstadoCamion = 'DISPONIBLE' | 'EN_RUTA' | 'EN_MANTENIMIENTO';
export type EstadoRuta = 'EN_CURSO' | 'FINALIZADA';
export type EstadoMantenimiento = 'PROGRAMADO' | 'EN_TALLER' | 'CERRADO';
export type TipoMantenimiento = 'PREVENTIVO' | 'CORRECTIVO';

export interface LoginRequest { correo: string; contrasena: string; }
export interface LoginResponse { token: string; rol: Rol; nombre: string; }

export interface Camion {
  id: number;
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  capacidad: number;
  estado: EstadoCamion;
  conNovedad: boolean;
  descripcionNovedad: string | null;
}
export interface CamionRequest {
  placa: string; marca: string; modelo: string; anio: number; capacidad: number;
}

export interface Conductor {
  id: number;
  dni: string;
  nombres: string;
  apellidos: string;
  nroLicencia: string;
  telefono: string;
}
export interface ConductorRequest {
  dni: string; nombres: string; apellidos: string; nroLicencia: string; telefono: string;
}

export interface Ruta {
  id: number;
  origen: string;
  destino: string;
  fechaSalida: string;
  estado: EstadoRuta;
  camion: Camion;
  conductor: Conductor;
}
export interface RutaRequest {
  camionId: number; conductorId: number; origen: string; destino: string; fechaSalida: string;
}

export interface Mantenimiento {
  id: number;
  tipo: TipoMantenimiento;
  fechaProgramada: string;
  motivo: string;
  taller: string;
  fechaIngreso: string | null;
  fechaCierre: string | null;
  estado: EstadoMantenimiento;
}
export interface MantenimientoRequest {
  tipo: TipoMantenimiento; fechaProgramada: string; motivo: string; taller: string;
}

// RNF-17: respuesta de las listas por paginas (GET ...?pagina=0&tamano=10).
export interface Pagina<T> {
  contenido: T[];
  pagina: number;
  tamano: number;
  totalElementos: number;
  totalPaginas: number;
}

export interface ReporteRequest { conNovedad: boolean; descripcion: string | null; }

export interface ResumenDashboard {
  camionesPorEstado: Partial<Record<EstadoCamion, number>>;
  rutasEnCurso: number;
  novedadesReportadas: number;
}
