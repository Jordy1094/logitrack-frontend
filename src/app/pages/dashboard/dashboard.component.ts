import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { mensajeDeError } from '../../core/api-error';
import { Camion, ResumenDashboard, Ruta } from '../../core/models';
import { DriverHomeComponent } from '../driver-home/driver-home.component';
import { PaginadorComponent } from '../../shared/paginador.component';

// DashboardComponent (Tabla 7, Figura 7, HU-06, HU-10, RF-14): tarjetas por estado, rutas en
// curso con la opcion de finalizarlas y novedades reportadas por los conductores. Para el
// conductor muestra su ruta asignada (Tabla 8).
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, DriverHomeComponent, PaginadorComponent],
  templateUrl: './dashboard.component.html'
})
export class DashboardComponent implements OnInit {
  private readonly fleet = inject(FleetService);
  private readonly toast = inject(ToastService);
  readonly auth = inject(AuthService);

  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly camiones = signal<Camion[]>([]);
  readonly rutasEnCurso = signal<Ruta[]>([]);
  readonly resumen = signal<ResumenDashboard | null>(null);
  readonly finalizandoId = signal<number | null>(null);

  // Tabla de rutas en curso por paginas de 5 (RNF-17).
  readonly rutasTabla = signal<Ruta[]>([]);
  readonly tamanoRutas = 5;
  readonly paginaRutas = signal(0);
  readonly totalRutas = signal(0);
  readonly totalPaginasRutas = signal(0);

  // Las tarjetas usan el resumen del backend (GET /api/dashboard/resumen) cuando el rol
  // lo permite (Administrador); para el Supervisor se calculan con la lista de camiones.
  readonly conteo = computed(() => {
    const r = this.resumen();
    const lista = this.camiones();
    const contar = (estado: Camion['estado']) => lista.filter(c => c.estado === estado).length;
    return {
      disponibles: r?.camionesPorEstado.DISPONIBLE ?? contar('DISPONIBLE'),
      enRuta: r?.camionesPorEstado.EN_RUTA ?? contar('EN_RUTA'),
      enMantenimiento: r?.camionesPorEstado.EN_MANTENIMIENTO ?? contar('EN_MANTENIMIENTO'),
      novedades: r?.novedadesReportadas ?? lista.filter(c => c.conNovedad).length
    };
  });

  readonly esConductor = computed(() => this.auth.rol() === 'CONDUCTOR');

  // Mejora: total de camiones registrados, visible junto al titulo del resumen.
  readonly totalCamiones = computed(() => this.camiones().length);

  // Cada novedad muestra la placa, la descripcion y, si el camion esta en ruta, el conductor.
  readonly novedades = computed(() => this.camiones()
    .filter(c => c.conNovedad)
    .map(camion => {
      const ruta = this.rutasEnCurso().find(r => r.camion.id === camion.id);
      return { camion, conductor: ruta ? `${ruta.conductor.nombres} ${ruta.conductor.apellidos}` : null };
    }));

  ngOnInit(): void {
    if (this.esConductor()) { return; } // la vista del conductor carga sus propios datos
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const esAdmin = this.auth.tieneRol('ADMINISTRADOR');
    forkJoin({
      camiones: this.fleet.listarCamiones(),
      rutas: this.fleet.listarRutas('EN_CURSO'),
      resumen: esAdmin ? this.fleet.resumenDashboard() : of(null)
    }).subscribe({
      next: ({ camiones, rutas, resumen }) => {
        this.camiones.set(camiones);
        this.rutasEnCurso.set(rutas);
        this.resumen.set(resumen);
        this.cargando.set(false);
        this.cargarRutas();
      },
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      }
    });
  }

  cargarRutas(): void {
    this.fleet.paginaRutas('EN_CURSO', this.paginaRutas(), this.tamanoRutas).subscribe({
      next: p => {
        // Si se finalizo la ultima ruta de la ultima pagina, se vuelve a la anterior.
        if (p.contenido.length === 0 && p.pagina > 0) { this.paginaRutas.set(p.pagina - 1); this.cargarRutas(); return; }
        this.rutasTabla.set(p.contenido);
        this.totalRutas.set(p.totalElementos);
        this.totalPaginasRutas.set(p.totalPaginas);
      },
      error: err => this.error.set(mensajeDeError(err))
    });
  }

  irAPaginaRutas(p: number): void {
    this.paginaRutas.set(p);
    this.cargarRutas();
  }

  
  // HU-06: finalizar la ruta devuelve el camion a Verde y el conductor queda disponible.
  finalizar(ruta: Ruta): void {
    if (!confirm(`¿Finalizar la ruta ${ruta.origen} → ${ruta.destino} del camión ${ruta.camion.placa}?`)) {
      return;
    }
    this.finalizandoId.set(ruta.id);
    this.fleet.finalizarRuta(ruta.id).subscribe({
      next: () => {
        this.toast.exito(`Ruta finalizada. El camión ${ruta.camion.placa} vuelve a estar disponible.`);
        this.finalizandoId.set(null);
        this.cargar();
      },
      error: (err) => {
        this.toast.error(mensajeDeError(err));
        this.finalizandoId.set(null);
      }
    });
  }
}
