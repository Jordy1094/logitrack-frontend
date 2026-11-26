import { Component, computed, input, output } from '@angular/core';

// Paginador de las tablas (RNF-17): "Mostrando 11–20 de 80" y los botones de pagina.
// La pagina empieza en 0, igual que en la API (GET ...?pagina=0&tamano=10).
@Component({
  selector: 'app-paginador',
  standalone: true,
  template: `
    <div class="d-flex flex-wrap align-items-center gap-2 mt-2">
      <span class="small text-muted me-auto">
        @if (totalElementos() === 0) { Sin resultados }
        @else { Mostrando {{ desde() }}–{{ hasta() }} de {{ totalElementos() }} {{ etiqueta() }} }
      </span>
      @if (totalPaginas() > 1) {
        <nav aria-label="Paginación">
          <ul class="pagination pagination-sm mb-0">
            <li class="page-item" [class.disabled]="pagina() === 0">
              <button class="page-link" type="button" (click)="ir(pagina() - 1)" aria-label="Página anterior">&laquo;</button>
            </li>
            @for (p of paginas(); track $index) {
              @if (p === -1) {
                <li class="page-item disabled"><span class="page-link">…</span></li>
              } @else {
                <li class="page-item" [class.active]="p === pagina()">
                  <button class="page-link" type="button" (click)="ir(p)" [attr.aria-current]="p === pagina() ? 'page' : null">{{ p + 1 }}</button>
                </li>
              }
            }
            <li class="page-item" [class.disabled]="pagina() >= totalPaginas() - 1">
              <button class="page-link" type="button" (click)="ir(pagina() + 1)" aria-label="Página siguiente">&raquo;</button>
            </li>
          </ul>
        </nav>
      }
    </div>`,
  styles: [`
    .page-link { color: #2C2C2A; }
    .page-item.active .page-link { background-color: #2C2C2A; border-color: #2C2C2A; color: #fff; }
  `]
})
export class PaginadorComponent {
  readonly pagina = input.required<number>();
  readonly tamano = input.required<number>();
  readonly totalElementos = input.required<number>();
  readonly totalPaginas = input.required<number>();
  readonly etiqueta = input('registros');
  readonly cambiar = output<number>();

  readonly desde = computed(() => this.pagina() * this.tamano() + 1);
  readonly hasta = computed(() => Math.min((this.pagina() + 1) * this.tamano(), this.totalElementos()));

  // Primera, ultima y las vecinas de la actual; -1 marca un salto ("…").
  readonly paginas = computed(() => {
    const total = this.totalPaginas();
    const actual = this.pagina();
    const lista: number[] = [];
    for (let p = 0; p < total; p++) {
      if (p === 0 || p === total - 1 || Math.abs(p - actual) <= 1) {
        lista.push(p);
      } else if (lista[lista.length - 1] !== -1) {
        lista.push(-1);
      }
    }
    return lista;
  });

  ir(p: number): void {
    if (p < 0 || p >= this.totalPaginas() || p === this.pagina()) { return; }
    this.cambiar.emit(p);
  }
}
