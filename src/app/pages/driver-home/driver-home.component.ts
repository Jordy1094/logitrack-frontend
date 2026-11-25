import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { mensajeDeError } from '../../core/api-error';
import { Ruta } from '../../core/models';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';

// Vista del conductor (Figura 10, HU-11, HU-12): ve solo su ruta asignada desde el celular
// y reporta el estado de su vehiculo, que aparece como novedad en el Dashboard.
@Component({
  selector: 'app-driver-home',
  standalone: true,
  imports: [DatePipe, ReactiveFormsModule, EstadoBadgeComponent],
  templateUrl: './driver-home.component.html'
})
export class DriverHomeComponent implements OnInit {
  private readonly fleet = inject(FleetService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly cargando = signal(true);
  readonly ruta = signal<Ruta | null>(null);
  readonly sinRuta = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly enviando = signal(false);
  // Ultimo reporte enviado, para que el conductor vea que su reporte llego (HU-12).
  readonly ultimoReporte = signal<{ conNovedad: boolean; descripcion: string | null; hora: Date } | null>(null);

  readonly form = this.fb.nonNullable.group({
    conNovedad: [false],
    descripcion: ['']
  });

  constructor() {
    // HU-12 CA2: la descripcion es obligatoria solo cuando hay novedad.
    this.form.controls.conNovedad.valueChanges.subscribe(conNovedad => {
      const descripcion = this.form.controls.descripcion;
      descripcion.setValidators(conNovedad ? [Validators.required, Validators.minLength(5)] : []);
      descripcion.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.fleet.miRuta().subscribe({
      next: respuesta => {
        if ('mensaje' in respuesta) {
          this.ruta.set(null);
          this.sinRuta.set('No tienes una ruta asignada');
        } else {
          this.ruta.set(respuesta);
          this.sinRuta.set(null);
        }
        this.cargando.set(false);
      },
      error: err => { this.error.set(mensajeDeError(err)); this.cargando.set(false); }
    });
  }

  reportar(): void {
    const ruta = this.ruta();
    if (!ruta) { return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { conNovedad, descripcion } = this.form.getRawValue();
    this.enviando.set(true);
    this.fleet.reportarEstado(ruta.camion.id, { conNovedad, descripcion: descripcion.trim() || null }).subscribe({
      next: () => {
        this.enviando.set(false);
        this.ultimoReporte.set({ conNovedad, descripcion: descripcion.trim() || null, hora: new Date() });
        this.toast.exito(conNovedad ? 'Novedad enviada al supervisor.' : 'Reporte enviado: vehículo sin novedad.');
        this.form.reset({ conNovedad: false, descripcion: '' });
      },
      error: err => { this.enviando.set(false); this.toast.error(mensajeDeError(err)); }
    });
  }
}
