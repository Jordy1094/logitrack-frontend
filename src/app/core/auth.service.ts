import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, Rol } from './models';

const CLAVE_SESION = 'logitrack.sesion';

// AuthService (Tabla 7): inicio y cierre de sesion, almacenamiento del token y consulta del rol.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  // Estado de la sesion como signal: el menu y las pantallas reaccionan solos al login/logout.
  private readonly sesion = signal<LoginResponse | null>(this.leerSesionGuardada());

  readonly usuario = computed(() => this.sesion());
  readonly autenticado = computed(() => this.sesion() !== null);
  readonly rol = computed<Rol | null>(() => this.sesion()?.rol ?? null);

  login(datos: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/api/auth/login`, datos).pipe(
      tap(respuesta => {
        // sessionStorage: la sesion termina al cerrar la pestana (dispositivos compartidos).
        sessionStorage.setItem(CLAVE_SESION, JSON.stringify(respuesta));
        this.sesion.set(respuesta);
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem(CLAVE_SESION);
    this.sesion.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.sesion()?.token ?? null;
  }

  tieneRol(...roles: Rol[]): boolean {
    const actual = this.rol();
    return actual !== null && roles.includes(actual);
  }

  // Pantalla de inicio: todos entran a /dashboard, que muestra lo que corresponde al rol
  // (Tabla 8): resumen de la flota o, para el conductor, su ruta asignada (HU-11).
  rutaInicial(): string {
    return '/dashboard';
  }

  private leerSesionGuardada(): LoginResponse | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      return texto ? (JSON.parse(texto) as LoginResponse) : null;
    } catch {
      return null;
    }
  }
}
