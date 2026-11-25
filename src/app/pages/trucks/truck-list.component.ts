import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../../core/auth.service';
import { FleetService } from '../../core/fleet.service';
import { ToastService } from '../../core/toast.service';
import { erroresPorCampo, mensajeDeError } from '../../core/api-error';
import { Camion, EstadoCamion, Mantenimiento } from '../../core/models';
import { EstadoBadgeComponent } from '../../shared/estado-badge.component';

type Modal = 'ninguno' | 'camion' | 'mantenimiento' | 'historial';

// Mantenimiento vigente de cada camion: el que esta en el taller o el proximo programado.
interface MantenimientoVigente { enTaller: Mantenimiento | null; programado: Mantenimiento | null; }
const SIN_MANTENIMIENTO: MantenimientoVigente = { enTaller: null, programado: null };

// TruckListComponent (Tabla 7, Figura 8): lista con semaforo, proximo mantenimiento,
// buscador por placa y filtro por estado
// (HU-04, RF-05); registro y edicion de camiones (HU-02); programacion, ingreso, cierre e
// historial de mantenimientos (HU-07, HU-08, HU-09).
@Component({
  selector: 'app-truck-list',
  standalone: true,
  imports: [DatePipe, DecimalPipe, FormsModule, ReactiveFormsModule, EstadoBadgeComponent],
  templateUrl: './truck-list.component.html'
})
export class TruckListComponent implements OnInit {
  private readonly fleet = inject(FleetService);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  readonly auth = inject(AuthService);

  // Llega desde "Ver" en las novedades del Dashboard: /camiones?placa=ABC-123
  readonly placa = input<string>();

  readonly camiones = signal<Camion[]>([]);
  readonly mantenimientos = signal<Record<number, MantenimientoVigente>>({});
  readonly cargando = signal(true);
  readonly error = signal<string | null>(null);
  readonly guardando = signal(false);

  // Filtros (RF-05): el estado se filtra en el servidor; la placa se busca en la lista cargada.
  filtroEstado: EstadoCamion | '' = '';
  readonly busqueda = signal('');
  readonly visibles = computed(() => {
    const texto = this.busqueda().trim().toUpperCase();
    return texto ? this.camiones().filter(c => c.placa.includes(texto)) : this.camiones();
  });

  readonly modal = signal<Modal>('ninguno');
  readonly seleccionado = signal<Camion | null>(null);
  readonly historial = signal<Mantenimiento[]>([]);
  readonly cargandoHistorial = signal(false);
  readonly erroresServidor = signal<Record<string, string>>({});
  readonly hoy = new Date().toISOString().slice(0, 10);

  readonly esAdmin = computed(() => this.auth.tieneRol('ADMINISTRADOR'));

  readonly formCamion = this.fb.nonNullable.group({
    placa: ['', [Validators.required, Validators.pattern(/^[A-Z]{3}-\d{3}$/)]],
    marca: ['', Validators.required],
    modelo: ['', Validators.required],
    anio: [new Date().getFullYear(), [Validators.required, Validators.min(1980), Validators.max(new Date().getFullYear() + 1)]],
    capacidad: [10, [Validators.required, Validators.min(0.5)]]
  });

  readonly formMantenimiento = this.fb.nonNullable.group({
    tipo: ['PREVENTIVO' as 'PREVENTIVO' | 'CORRECTIVO', Validators.required],
    fechaProgramada: [this.hoy, Validators.required],
    motivo: ['', Validators.required],
    taller: ['', Validators.required]
  });

  ngOnInit(): void {
    const placa = this.placa();
    if (placa) { this.busqueda.set(placa); }
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.fleet.listarCamiones({ estado: this.filtroEstado }).subscribe({
      next: lista => { this.camiones.set(lista); this.cargando.set(false); this.cargarMantenimientos(lista); },
      error: err => { this.error.set(mensajeDeError(err)); this.cargando.set(false); }
    });
  }

  // "Proximo mantenimiento" de cada camion (Figura 8), a partir de su historial (HU-09).
  private cargarMantenimientos(lista: Camion[]): void {
    if (lista.length === 0) { this.mantenimientos.set({}); return; }
    forkJoin(lista.map(c => this.fleet.historialMantenimientos(c.id).pipe(catchError(() => of([] as Mantenimiento[])))))
      .subscribe(historiales => {
        const mapa: Record<number, MantenimientoVigente> = {};
        lista.forEach((camion, i) => {
          const h = historiales[i];
          const programados = h.filter(m => m.estado === 'PROGRAMADO')
            .sort((a, b) => a.fechaProgramada.localeCompare(b.fechaProgramada));
          mapa[camion.id] = {
            enTaller: h.find(m => m.estado === 'EN_TALLER') ?? null,
            programado: programados[0] ?? null
          };
        });
        this.mantenimientos.set(mapa);
      });
  }

  mantenimientoDe(camionId: number): MantenimientoVigente {
    return this.mantenimientos()[camionId] ?? SIN_MANTENIMIENTO;
  }

  // ---------- Registro y edicion (HU-02, solo Administrador) ----------
  abrirNuevo(): void {
    this.seleccionado.set(null);
    this.erroresServidor.set({});
    this.formCamion.reset({ placa: '', marca: '', modelo: '', anio: new Date().getFullYear(), capacidad: 10 });
    this.formCamion.controls.placa.enable();
    this.modal.set('camion');
  }

  abrirEdicion(camion: Camion): void {
    this.seleccionado.set(camion);
    this.erroresServidor.set({});
    this.formCamion.reset({ placa: camion.placa, marca: camion.marca, modelo: camion.modelo, anio: camion.anio, capacidad: camion.capacidad });
    this.formCamion.controls.placa.disable(); // la placa identifica al camion: no se edita
    this.modal.set('camion');
  }

  normalizarPlaca(): void {
    const control = this.formCamion.controls.placa;
    control.setValue(control.value.toUpperCase());
  }

  guardarCamion(): void {
    if (this.formCamion.invalid) { this.formCamion.markAllAsTouched(); return; }
    const datos = this.formCamion.getRawValue();
    const actual = this.seleccionado();
    this.guardando.set(true);
    const peticion = actual ? this.fleet.actualizarCamion(actual.id, datos) : this.fleet.registrarCamion(datos);
    peticion.subscribe({
      next: camion => {
        this.toast.exito(actual ? `Camión ${camion.placa} actualizado.` : `Camión ${camion.placa} registrado como Disponible.`);
        this.guardando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: err => {
        // HU-02 CA2: "La placa ya está registrada" se muestra sin cerrar el formulario.
        const mensaje = mensajeDeError(err);
        const porCampo = erroresPorCampo(err);
        // "La placa ya esta registrada" (400) tambien marca el campo Placa en rojo (HU-02 CA2).
        if (err instanceof HttpErrorResponse && /placa/i.test(mensaje)) {
          porCampo['placa'] = mensaje;
        }
        this.erroresServidor.set(porCampo);
        this.toast.error(mensaje);
        this.guardando.set(false);
      }
    });
  }

  darDeBaja(camion: Camion): void {
    if (!confirm(`¿Dar de baja el camión ${camion.placa}? Esta acción no se puede deshacer.`)) { return; }
    this.fleet.darDeBajaCamion(camion.id).subscribe({
      next: () => { this.toast.exito(`Camión ${camion.placa} dado de baja.`); this.cargar(); },
      // HU-02 CA3: un camion en ruta no se puede dar de baja (409).
      error: err => this.toast.error(mensajeDeError(err))
    });
  }

  // ---------- Mantenimiento (HU-07, HU-08, HU-09) ----------
  abrirMantenimiento(camion: Camion): void {
    this.seleccionado.set(camion);
    this.formMantenimiento.reset({ tipo: 'PREVENTIVO', fechaProgramada: this.hoy, motivo: '', taller: '' });
    this.modal.set('mantenimiento');
  }

  guardarMantenimiento(): void {
    const camion = this.seleccionado();
    if (!camion) { return; }
    if (this.formMantenimiento.invalid) { this.formMantenimiento.markAllAsTouched(); return; }
    this.guardando.set(true);
    this.fleet.programarMantenimiento(camion.id, this.formMantenimiento.getRawValue()).subscribe({
      next: () => {
        this.toast.exito(`Mantenimiento programado para el camión ${camion.placa}.`);
        this.guardando.set(false);
        this.cerrarModal();
        this.cargar();
      },
      error: err => { this.toast.error(mensajeDeError(err)); this.guardando.set(false); }
    });
  }

  verHistorial(camion: Camion): void {
    this.seleccionado.set(camion);
    this.modal.set('historial');
    this.cargandoHistorial.set(true);
    this.fleet.historialMantenimientos(camion.id).subscribe({
      next: lista => { this.historial.set(lista); this.cargandoHistorial.set(false); },
      error: err => { this.toast.error(mensajeDeError(err)); this.cargandoHistorial.set(false); }
    });
  }

  registrarIngreso(m: Mantenimiento): void {
    this.fleet.registrarIngresoTaller(m.id).subscribe({
      next: () => { this.toast.exito('Ingreso al taller registrado: el camión pasa a Rojo.'); this.refrescarTrasMantenimiento(); },
      // HU-08 CA2: si el camion esta en ruta, el backend responde 409 y se muestra el motivo.
      error: err => this.toast.error(mensajeDeError(err))
    });
  }

  cerrarMantenimiento(m: Mantenimiento): void {
    this.fleet.cerrarMantenimiento(m.id).subscribe({
      next: () => { this.toast.exito('Mantenimiento cerrado: el camión vuelve a estar disponible.'); this.refrescarTrasMantenimiento(); },
      error: err => this.toast.error(mensajeDeError(err))
    });
  }

  asignarRuta(camion: Camion): void {
    this.router.navigate(['/rutas/nueva'], { queryParams: { camionId: camion.id } });
  }

  cerrarModal(): void {
    this.modal.set('ninguno');
    this.seleccionado.set(null);
  }

  // Si el historial esta abierto se actualiza; la lista se recarga para mostrar el nuevo color.
  private refrescarTrasMantenimiento(): void {
    const camion = this.modal() === 'historial' ? this.seleccionado() : null;
    this.cargar();
    if (camion) { this.verHistorial(camion); }
  }
}
