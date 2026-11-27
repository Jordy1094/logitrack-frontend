import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AuthService } from './core/auth.service';
import { SidebarComponent } from './shared/sidebar.component';
import { ToastContainerComponent } from './shared/toast-container.component';


// AppComponent (Tabla 7): contiene el menu lateral y el area donde se cargan las pantallas.
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, ToastContainerComponent],
  template: `
    <app-toast-container />
    @if (auth.autenticado()) {
      <div class="lt-shell">
        <app-sidebar [colapsado]="menuColapsado()" (alternar)="alternarMenu()" (navegar)="cerrarEnMovil()" />
        @if (!menuColapsado()) { <div class="lt-velo d-md-none" (click)="menuColapsado.set(true)"></div> }
        <div class="lt-main">
          <header class="lt-topbar">
            <!-- En el celular: barra oscura con la marca y el boton del menu (Figura 10) -->
            <span class="fw-bold fs-5 d-md-none">LogiTrack</span>
            @if (menuColapsado()) {
              <button class="btn-menu order-md-first ms-auto ms-md-0" type="button" (click)="alternarMenu()" aria-label="Mostrar menú">
                <i class="bi bi-list"></i>
              </button>
            }
            <div class="ms-auto d-none d-md-flex align-items-center gap-2" [title]="nombre()">
              <i class="bi bi-person-fill"></i><span>{{ rolLegible() }}</span>
            </div>
          </header>
          <main class="lt-content"><router-outlet /></main>
        </div>
      </div>
    } @else {
      <router-outlet />
    }
  `
})
export class AppComponent {
  readonly auth = inject(AuthService);
  readonly menuColapsado = signal(window.innerWidth < 768);
  readonly nombre = computed(() => this.auth.usuario()?.nombre ?? '');
  readonly rolLegible = computed(() => {
    switch (this.auth.rol()) {
      case 'ADMINISTRADOR': return 'Administrador';
      case 'SUPERVISOR': return 'Supervisor de flota';
      case 'CONDUCTOR': return 'Conductor';
      default: return '';
    }
  });

  constructor() {
    // Al pasar a tamano celular (o volver a escritorio) el menu se oculta o se muestra solo,
    // para que en el celular no tape la pantalla (Figura 10).
    const movil = window.matchMedia('(max-width: 767.98px)');
    movil.addEventListener('change', e => this.menuColapsado.set(e.matches));
  }

  alternarMenu(): void {
    this.menuColapsado.set(!this.menuColapsado());
  }

  cerrarEnMovil(): void {
    if (window.innerWidth < 768) { this.menuColapsado.set(true); }
  }
  
}
