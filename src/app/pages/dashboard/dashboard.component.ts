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

// DashboardComponent (Tabla 7, Figura 7, HU-06, HU-10, RF-14): tarjetas por estado, rutas en
// curso con la opcion de finalizarlas y novedades reportadas por los conductores. Para el
// conductor muestra su ruta asignada (Tabla 8).
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [DatePipe, RouterLink, DriverHomeComponent],
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
      },
      error: (err) => {
        this.error.set(mensajeDeError(err));
        this.cargando.set(false);
      }
    });
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
