import { Component, inject } from '@angular/core';
import { ToastService } from '../core/toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    <div class="lt-toasts" aria-live="polite">
      @for (t of toastService.toasts(); track t.id) {
        <div class="alert shadow-sm d-flex align-items-start gap-2 mb-2"
             [class.alert-success]="t.tipo === 'exito'" [class.alert-danger]="t.tipo === 'error'"
             [class.alert-info]="t.tipo === 'info'" role="alert">
          <i class="bi mt-1" [class.bi-check-circle-fill]="t.tipo === 'exito'"
             [class.bi-exclamation-triangle-fill]="t.tipo === 'error'" [class.bi-info-circle-fill]="t.tipo === 'info'"></i>
          <div class="flex-grow-1">{{ t.mensaje }}</div>
          <button type="button" class="btn-close" aria-label="Cerrar" (click)="toastService.cerrar(t.id)"></button>
        </div>
      }
    </div>
  `
})
export class ToastContainerComponent {
  readonly toastService = inject(ToastService);
}
