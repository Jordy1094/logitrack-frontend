import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/api-error';

// LoginComponent (Tabla 7, Tabla 12): correo y contrasena obligatorios, correo con formato valido.
@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly cargando = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required]
  });

  constructor() {
    if (this.auth.autenticado()) {
      this.router.navigateByUrl(this.auth.rutaInicial());
    }
  }

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.cargando.set(false);
        this.router.navigateByUrl(this.auth.rutaInicial());
      },
      error: (err) => {
        this.cargando.set(false);
        // HU-01 CA2: mismo mensaje sin indicar cual de los dos datos fallo y sin recargar.
        this.error.set(mensajeDeError(err));
      }
    });
  }
}
