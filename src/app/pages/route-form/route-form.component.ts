import { Component, OnInit, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { erroresPorCampo, mensajeDeError } from '../../core/api-error';
import { Camion, Conductor } from '../../core/models';

type CampoRuta = 'camionId' | 'conductorId' | 'origen' | 'destino' | 'fechaSalida';

// Fecha y hora local en el formato del input datetime-local: 2026-11-25T14:30
function ahoraLocal(): string {
  const d = new Date();
  d.setSeconds(0, 0);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

// HU-05 CA3: no se permiten fechas de salida pasadas.
function noEnElPasado(control: AbstractControl<string>): ValidationErrors | null {
  return control.value && control.value < ahoraLocal() ? { pasado: true } : null;
}

// RouteFormComponent (Tabla 7, Tabla 13): asignacion de ruta. La lista de camiones solo
// muestra unidades disponibles (RF-06) y el servidor vuelve a validar al guardar (RF-08).
@Component({
  selector: 'app-route-form',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './route-form.component.html'
})
export class RouteFormComponent implements OnInit {
  private readonly fleet = inject(FleetService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  // Llega desde la lista de camiones: /rutas/nueva?camionId=3 (withComponentInputBinding).
  readonly camionId = input<string>();

  readonly camiones = signal<Camion[]>([]);
  readonly conductores = signal<Conductor[]>([]);
  readonly cargando = signal(true);
  readonly guardando = signal(false);
  // Mensaje 409 del servidor, mostrado debajo del campo que provoco el conflicto (Figura 9).
  readonly conflictoCamion = signal<string | null>(null);
  readonly conflictoConductor = signal<string | null>(null);
  readonly erroresServidor = signal<Record<string, string>>({});
  readonly minimo = ahoraLocal();

  readonly form = this.fb.group({
    camionId: [null as number | null, Validators.required],
    conductorId: [null as number | null, Validators.required],
    origen: ['', [Validators.required, Validators.maxLength(120)]],
    destino: ['', [Validators.required, Validators.maxLength(120)]],
    fechaSalida: ['', [Validators.required, noEnElPasado]]
  });

  ngOnInit(): void {
    this.cargarOpciones(true);
    // Al elegir otra opcion, el mensaje de conflicto de ese campo desaparece.
    this.form.controls.camionId.valueChanges.subscribe(() => this.conflictoCamion.set(null));
    this.form.controls.conductorId.valueChanges.subscribe(() => this.conflictoConductor.set(null));
  }

  // Solo camiones en Verde y conductores sin ruta activa (RF-06).
  // conservar: camion o conductor elegido que dejo de estar disponible; se mantiene en la lista
  // para que el formulario siga mostrando lo que el usuario escribio junto con el motivo.
  cargarOpciones(preseleccionar = false, conservar?: { camion?: Camion; conductor?: Conductor }): void {
    this.cargando.set(true);
    forkJoin({
      camiones: this.fleet.listarCamionesDisponibles(),
      conductores: this.fleet.listarConductores(true)
    }).subscribe({
      next: ({ camiones, conductores }) => {
        const camionConservado = conservar?.camion;
        const conductorConservado = conservar?.conductor;
        this.camiones.set(camionConservado && !camiones.some(c => c.id === camionConservado.id)
          ? [camionConservado, ...camiones] : camiones);
        this.conductores.set(conductorConservado && !conductores.some(c => c.id === conductorConservado.id)
          ? [conductorConservado, ...conductores] : conductores);
        const id = Number(this.camionId());
        if (preseleccionar && id && camiones.some(c => c.id === id)) {
          this.form.controls.camionId.setValue(id);
        }
        this.cargando.set(false);
      },
      error: err => { this.toast.error(mensajeDeError(err)); this.cargando.set(false); }
    });
  }

  guardar(): void {
    this.conflictoCamion.set(null);
    this.conflictoConductor.set(null);
    this.erroresServidor.set({});
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }

    const v = this.form.getRawValue();
    this.guardando.set(true);
    this.fleet.asignarRuta({
      camionId: v.camionId!,
      conductorId: v.conductorId!,
      origen: v.origen!.trim(),
      destino: v.destino!.trim(),
      fechaSalida: `${v.fechaSalida}:00`
    }).subscribe({
      next: ruta => {
        this.guardando.set(false);
        this.toast.exito(`Ruta asignada: ${ruta.camion.placa} sale de ${ruta.origen} hacia ${ruta.destino}. El camión pasa a En ruta.`);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.guardando.set(false);
        if (err.status === 409) {
          // Prueba funcional principal del Capitulo 6 (HU-05 CA2): el camion o el conductor
          // dejaron de estar disponibles. Se explica el motivo debajo del campo, se conservan
          // los datos escritos y se recargan las listas, sin recargar la pagina.
          const mensaje = mensajeDeError(err);
          const camion = this.camiones().find(c => c.id === v.camionId);
          const conductor = this.conductores().find(c => c.id === v.conductorId);
          if (/conductor/i.test(mensaje)) {
            this.conflictoConductor.set(mensaje);
            this.cargarOpciones(false, { conductor });
          } else {
            this.conflictoCamion.set(mensaje);
            this.cargarOpciones(false, { camion });
          }
          this.toast.error(mensaje);
          return;
        }
        this.erroresServidor.set(erroresPorCampo(err));
        this.toast.error(mensajeDeError(err));
      }
    });
  }

  invalido(campo: CampoRuta): boolean {
    const control = this.form.controls[campo];
    return (control.touched && control.invalid) || !!this.erroresServidor()[campo];
  }
}
