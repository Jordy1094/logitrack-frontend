import { Injectable, signal } from '@angular/core';

export interface Toast { id: number; tipo: 'exito' | 'error' | 'info'; mensaje: string; }

// Avisos breves (toasts) para confirmar acciones o mostrar errores sin recargar la pagina
// (Tabla 10: "Retroalimentacion con avisos", RNF-08).
@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private siguienteId = 1;

  exito(mensaje: string): void { this.mostrar('exito', mensaje); }
  error(mensaje: string): void { this.mostrar('error', mensaje, 6000); }
  info(mensaje: string): void { this.mostrar('info', mensaje); }

  cerrar(id: number): void {
    this.toasts.update(lista => lista.filter(t => t.id !== id));
  }

  private mostrar(tipo: Toast['tipo'], mensaje: string, duracionMs = 4000): void {
    const id = this.siguienteId++;
    this.toasts.update(lista => [...lista, { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), duracionMs);
  }
}
