import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { Rol } from '../core/models';

interface OpcionMenu { ruta: string; texto: string; icono: string; roles: Rol[]; }

// SidebarComponent (Tabla 7, Figura 7): menu lateral colapsable con las opciones del rol,
// boton (≡) para ocultarlo y "Cerrar sesion" al final.
@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="lt-sidebar" [class.colapsado]="colapsado()" aria-label="Menú principal">
      <div class="marca">
        LogiTrack
        <button class="btn-menu" type="button" (click)="alternar.emit()" aria-label="Ocultar menú">
          <i class="bi bi-list"></i>
        </button>
      </div>
      <ul class="nav flex-column">
        @for (opcion of opciones(); track opcion.ruta) {
          <li class="nav-item">
            <a class="nav-link" [routerLink]="opcion.ruta" routerLinkActive="active" (click)="navegar.emit()">
              <i class="bi me-2" [class]="opcion.icono"></i>{{ opcion.texto }}
            </a>
          </li>
        }
      </ul>
      <div class="salir mt-auto">
        <button type="button" (click)="auth.logout()"><i class="bi bi-box-arrow-left me-2"></i>Cerrar sesión</button>
      </div>
    </nav>
  `
})
export class SidebarComponent {
  readonly auth = inject(AuthService);
  readonly colapsado = input(false);
  readonly navegar = output<void>();
  readonly alternar = output<void>();

  // Mismo orden que el wireframe del Dashboard (Figura 7) y roles de la Tabla 8.
  private readonly todas: OpcionMenu[] = [
    { ruta: '/dashboard', texto: 'Dashboard', icono: 'bi-speedometer2', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { ruta: '/camiones', texto: 'Camiones', icono: 'bi-truck-front', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { ruta: '/conductores', texto: 'Conductores', icono: 'bi-person-vcard', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { ruta: '/rutas/nueva', texto: 'Nueva ruta', icono: 'bi-signpost-split', roles: ['ADMINISTRADOR', 'SUPERVISOR'] },
    { ruta: '/dashboard', texto: 'Mi ruta asignada', icono: 'bi-geo-alt', roles: ['CONDUCTOR'] }
  ];

  readonly opciones = computed(() => {
    const rol = this.auth.rol();
    return rol ? this.todas.filter(o => o.roles.includes(rol)) : [];
  });
}
