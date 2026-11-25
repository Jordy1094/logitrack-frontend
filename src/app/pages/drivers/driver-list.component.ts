import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { erroresPorCampo, mensajeDeError } from '../../core/api-error';
import { Conductor } from '../../core/models';

// DriverListComponent (Tabla 7, pantalla secundaria): el Administrador registra
// conductores (HU-03) y el Supervisor consulta los disponibles (Tabla 8).
@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './driver-list.component.html'
})
export class DriverListComponent implements OnInit {
  private readonly fleet = inject(FleetService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  readonly auth = inject(AuthService);

  readonly conductores = signal<Conductor[]>([]);
  readonly disponiblesIds = signal<Set<number>>(new Set());
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly mostrarForm = signal(false);
  readonly guardando = signal(false);
  readonly erroresServidor = signal<Record<string, string>>({});
  readonly busqueda = signal('');
  soloDisponibles = false;

  readonly esAdmin = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toLowerCase();
    return this.conductores().filter(c =>
      !texto || `${c.nombres} ${c.apellidos} ${c.dni}`.toLowerCase().includes(texto));
  });

  readonly form = this.fb.nonNullable.group({
    dni: ['', [Validators.required, Validators.pattern(/^\d{8}$/)]],
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    nroLicencia: ['', Validators.required],
    telefono: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    // Se consulta la lista completa y la de disponibles (GET /api/conductores?disponible=true)
    // para mostrar en cada fila si el conductor tiene una ruta activa.
    this.fleet.listarConductores(true).subscribe({
      next: disponibles => {
        this.disponiblesIds.set(new Set(disponibles.map(c => c.id)));
        if (this.soloDisponibles) {
          this.conductores.set(disponibles);
          this.cargando.set(false);
          return;
        }
        this.fleet.listarConductores().subscribe({
          next: todos => { this.conductores.set(todos); this.cargando.set(false); },
          error: err => { this.error.set(mensajeDeError(err)); this.cargando.set(false); }
        });
      },
      error: err => { this.error.set(mensajeDeError(err)); this.cargando.set(false); }
    });
  }

  estaDisponible(c: Conductor): boolean {
    return this.disponiblesIds().has(c.id);
  }

  abrirForm(): void {
    this.form.reset();
    this.erroresServidor.set({});
    this.mostrarForm.set(true);
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.fleet.registrarConductor(this.form.getRawValue()).subscribe({
      next: c => {
        this.toast.exito(`Conductor ${c.nombres} ${c.apellidos} registrado y disponible para nuevas rutas.`);
        this.guardando.set(false);
        this.mostrarForm.set(false);
        this.cargar();
      },
      error: err => {
        // HU-03 CA2: DNI repetido o con formato invalido: se marca el campo y no se guarda.
        const porCampo = erroresPorCampo(err);
        const mensaje = mensajeDeError(err);
        this.erroresServidor.set(Object.keys(porCampo).length ? porCampo : (mensaje.includes('DNI') ? { dni: mensaje } : {}));
        this.toast.error(mensaje);
        this.guardando.set(false);
      }
    });
  }
}
