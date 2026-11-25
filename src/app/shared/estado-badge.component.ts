import { Component, computed, input } from '@angular/core';
import { EstadoCamion } from '../core/models';

// Semaforo del camion: Verde (disponible), Amarillo (en ruta), Rojo (en mantenimiento),
// siempre con punto + texto ademas del color (Tabla 10, RNF-08).
@Component({
  selector: 'app-estado-badge',
  standalone: true,
  template: `<span class="estado" [class]="'estado estado-' + estado()"><span class="punto"></span>{{ texto() }}</span>`
})
export class EstadoBadgeComponent {
  readonly estado = input.required<EstadoCamion>();
  readonly texto = computed(() => ({
    DISPONIBLE: 'Disponible',
    EN_RUTA: 'En ruta',
    EN_MANTENIMIENTO: 'En mantenimiento'
  })[this.estado()]);
}
