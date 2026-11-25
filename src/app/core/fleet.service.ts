import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  Camion, CamionRequest, Conductor, ConductorRequest, EstadoCamion, EstadoRuta, Mantenimiento,
  MantenimientoRequest, ReporteRequest, ResumenDashboard, Ruta, RutaRequest
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
  registrarConductor(datos: ConductorRequest): Observable<Conductor> {
    return this.http.post<Conductor>(`${this.api}/conductores`, datos);
  }

  // ---- Rutas (Tabla 35) ----
  listarRutas(estado?: EstadoRuta): Observable<Ruta[]> {
    const params = estado ? new HttpParams().set('estado', estado) : new HttpParams();
    return this.http.get<Ruta[]>(`${this.api}/rutas`, { params });
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
