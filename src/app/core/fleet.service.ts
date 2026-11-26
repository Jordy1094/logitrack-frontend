import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Camion, CamionRequest, Conductor, ConductorRequest, EstadoCamion, EstadoRuta, Mantenimiento,
  MantenimientoRequest, Pagina, ReporteRequest, ResumenDashboard, Ruta, RutaRequest
} from './models';

// FleetService (Tabla 7): unico punto de la aplicacion que conoce las URL de la API REST.
// Los componentes solo llaman a estos metodos y reciben objetos tipados (seccion 4.3).
@Injectable({ providedIn: 'root' })
export class FleetService {
  private readonly http = inject(HttpClient);
  private readonly api = `${environment.apiUrl}/api`;

  // ---- Camiones (Tabla 34) ----
  listarCamiones(filtro?: { estado?: EstadoCamion | ''; placa?: string }): Observable<Camion[]> {
    let params = new HttpParams();
    if (filtro?.estado) { params = params.set('estado', filtro.estado); }
    if (filtro?.placa) { params = params.set('placa', filtro.placa.trim().toUpperCase()); }
    return this.http.get<Camion[]>(`${this.api}/camiones`, { params });
  }
  // RNF-17: la tabla de camiones se carga por paginas, con el buscador y el filtro de RF-05.
  paginaCamiones(filtro: { estado?: EstadoCamion | ''; placa?: string }, pagina: number, tamano: number): Observable<Pagina<Camion>> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (filtro.estado) { params = params.set('estado', filtro.estado); }
    if (filtro.placa?.trim()) { params = params.set('placa', filtro.placa.trim().toUpperCase()); }
    return this.http.get<Pagina<Camion>>(`${this.api}/camiones`, { params });
  }
  listarCamionesDisponibles(): Observable<Camion[]> {
    return this.http.get<Camion[]>(`${this.api}/camiones/disponibles`);
  }
  registrarCamion(datos: CamionRequest): Observable<Camion> {
    return this.http.post<Camion>(`${this.api}/camiones`, datos);
  }
  actualizarCamion(id: number, datos: CamionRequest): Observable<Camion> {
    return this.http.put<Camion>(`${this.api}/camiones/${id}`, datos);
  }
  darDeBajaCamion(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/camiones/${id}`);
  }

  // ---- Conductores (Tabla 34) ----
  listarConductores(disponible?: boolean): Observable<Conductor[]> {
    let params = new HttpParams();
    if (disponible !== undefined) { params = params.set('disponible', String(disponible)); }
    return this.http.get<Conductor[]>(`${this.api}/conductores`, { params });
  }
  // RNF-17: la tabla de conductores se carga por paginas, con buscador por nombre o DNI.
  paginaConductores(filtro: { texto?: string; disponible?: boolean }, pagina: number, tamano: number): Observable<Pagina<Conductor>> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (filtro.texto?.trim()) { params = params.set('texto', filtro.texto.trim()); }
    if (filtro.disponible !== undefined) { params = params.set('disponible', String(filtro.disponible)); }
    return this.http.get<Pagina<Conductor>>(`${this.api}/conductores`, { params });
  }
  registrarConductor(datos: ConductorRequest): Observable<Conductor> {
    return this.http.post<Conductor>(`${this.api}/conductores`, datos);
  }
  actualizarConductor(id: number, datos: ConductorRequest): Observable<Conductor> {
    return this.http.put<Conductor>(`${this.api}/conductores/${id}`, datos);
  }
  darDeBajaConductor(id: number): Observable<void> {
    return this.http.delete<void>(`${this.api}/conductores/${id}`);
  }

  // ---- Rutas (Tabla 35) ----
  listarRutas(estado?: EstadoRuta): Observable<Ruta[]> {
    const params = estado ? new HttpParams().set('estado', estado) : new HttpParams();
    return this.http.get<Ruta[]>(`${this.api}/rutas`, { params });
  }
  // RNF-17: la tabla de rutas en curso del Dashboard se carga por paginas.
  paginaRutas(estado: EstadoRuta | undefined, pagina: number, tamano: number): Observable<Pagina<Ruta>> {
    let params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    if (estado) { params = params.set('estado', estado); }
    return this.http.get<Pagina<Ruta>>(`${this.api}/rutas`, { params });
  }
  asignarRuta(datos: RutaRequest): Observable<Ruta> {
    return this.http.post<Ruta>(`${this.api}/rutas`, datos);
  }
  finalizarRuta(id: number): Observable<Ruta> {
    return this.http.put<Ruta>(`${this.api}/rutas/${id}/finalizar`, {});
  }

  // ---- Mantenimiento (Tabla 35) ----
  programarMantenimiento(camionId: number, datos: MantenimientoRequest): Observable<Mantenimiento> {
    return this.http.post<Mantenimiento>(`${this.api}/camiones/${camionId}/mantenimientos`, datos);
  }
  historialMantenimientos(camionId: number): Observable<Mantenimiento[]> {
    return this.http.get<Mantenimiento[]>(`${this.api}/camiones/${camionId}/mantenimientos`);
  }
  registrarIngresoTaller(mantenimientoId: number): Observable<Mantenimiento> {
    return this.http.put<Mantenimiento>(`${this.api}/mantenimientos/${mantenimientoId}/ingreso`, {});
  }
  cerrarMantenimiento(mantenimientoId: number): Observable<Mantenimiento> {
    return this.http.put<Mantenimiento>(`${this.api}/mantenimientos/${mantenimientoId}/cierre`, {});
  }

  // ---- Dashboard y vista del conductor (Tabla 36) ----
  resumenDashboard(): Observable<ResumenDashboard> {
    return this.http.get<ResumenDashboard>(`${this.api}/dashboard/resumen`);
  }
  // Devuelve la ruta vigente o {"mensaje": "No tiene una ruta vigente"}.
  miRuta(): Observable<Ruta | { mensaje: string }> {
    return this.http.get<Ruta | { mensaje: string }>(`${this.api}/rutas/mia`);
  }
  reportarEstado(camionId: number, datos: ReporteRequest): Observable<Camion> {
    return this.http.post<Camion>(`${this.api}/camiones/${camionId}/reportes`, datos);
  }
}
