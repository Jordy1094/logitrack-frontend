import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth.service';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { erroresPorCampo, mensajeDeError } from '../../core/api-error';
import { Conductor } from '../../core/models';
import { PaginadorComponent } from '../../shared/paginador.component';

// DriverListComponent (Tabla 7, pantalla secundaria): el Administrador registra, edita y
// da de baja conductores (HU-03, RF-04) y el Supervisor consulta los disponibles (Tabla 8).
@Component({
  selector: 'app-driver-list',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule, PaginadorComponent],
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
  // Conductor que se edita; null = se registra uno nuevo.
  readonly seleccionado = signal<Conductor | null>(null);
  soloDisponibles = false;

  readonly esAdmin = computed(() => this.auth.tieneRol('ADMINISTRADOR'));
  // Paginacion (RNF-17): el servidor busca por nombre o DNI y devuelve una pagina de 10.
  readonly visibles = computed(() => this.conductores());
  readonly tamano = 10;
  readonly pagina = signal(0);
  readonly totalElementos = signal(0);
  readonly totalPaginas = signal(0);
  private esperaBusqueda?: ReturnType<typeof setTimeout>;

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
    // Se consulta la pagina actual y la lista de disponibles (GET /api/conductores?disponible=true)
    // para mostrar en cada fila si el conductor tiene una ruta activa.
    const filtro = { texto: this.busqueda(), disponible: this.soloDisponibles ? true : undefined };
    forkJoin({
      disponibles: this.fleet.listarConductores(true),
      pagina: this.fleet.paginaConductores(filtro, this.pagina(), this.tamano)
    }).subscribe({
      next: ({ disponibles, pagina: p }) => {
        // Si se dio de baja el ultimo conductor de la ultima pagina, se vuelve a la anterior.
        if (p.contenido.length === 0 && p.pagina > 0) { this.pagina.set(p.pagina - 1); this.cargar(); return; }
        this.disponiblesIds.set(new Set(disponibles.map(c => c.id)));
        this.conductores.set(p.contenido);
        this.totalElementos.set(p.totalElementos);
        this.totalPaginas.set(p.totalPaginas);
        this.cargando.set(false);
      },
      error: err => { this.error.set(mensajeDeError(err)); this.cargando.set(false); }
    });
  }

  // Cambiar el filtro o la busqueda vuelve a la primera pagina.
  filtrar(): void {
    this.pagina.set(0);
    this.cargar();
  }

  buscar(texto: string): void {
    this.busqueda.set(texto);
    clearTimeout(this.esperaBusqueda);
    this.esperaBusqueda = setTimeout(() => this.filtrar(), 300);
  }

  irAPagina(p: number): void {
    this.pagina.set(p);
    this.cargar();
  }

  estaDisponible(c: Conductor): boolean {
    return this.disponiblesIds().has(c.id);
  }

  abrirForm(): void {
    this.seleccionado.set(null);
    this.form.reset();
    this.form.controls.dni.enable();
    this.erroresServidor.set({});
    this.mostrarForm.set(true);
  }

  // RF-04: editar. El DNI identifica a la persona y no se cambia (igual que la placa).
  abrirEdicion(c: Conductor): void {
    this.seleccionado.set(c);
    this.form.reset({ dni: c.dni, nombres: c.nombres, apellidos: c.apellidos, nroLicencia: c.nroLicencia, telefono: c.telefono });
    this.form.controls.dni.disable();
    this.erroresServidor.set({});
    this.mostrarForm.set(true);
  }

  // RF-04: dar de baja. El servidor lo impide si tiene una ruta en curso o rutas en su historial.
  darDeBaja(c: Conductor): void {
    if (!confirm(`¿Dar de baja al conductor ${c.nombres} ${c.apellidos}? Esta acción no se puede deshacer.`)) { return; }
    this.fleet.darDeBajaConductor(c.id).subscribe({
      next: () => { this.toast.exito(`Conductor ${c.nombres} ${c.apellidos} dado de baja.`); this.cargar(); },
      error: err => this.toast.error(mensajeDeError(err))
    });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const actual = this.seleccionado();
    const datos = this.form.getRawValue();
    const peticion = actual ? this.fleet.actualizarConductor(actual.id, datos) : this.fleet.registrarConductor(datos);
    peticion.subscribe({
      next: c => {
        this.toast.exito(actual
          ? `Datos de ${c.nombres} ${c.apellidos} actualizados.`
          : `Conductor ${c.nombres} ${c.apellidos} registrado y disponible para nuevas rutas.`);
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
