import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

// Agrega "Authorization: Bearer <token>" a cada peticion (seccion 4.3) y, si el
// backend responde 401 (token vencido, RNF-01), cierra la sesion y vuelve al login.
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const toast = inject(ToastService);
  const token = auth.getToken();

  const peticion = token ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : req;

  return next(peticion).pipe(
    catchError((error: HttpErrorResponse) => {
      const esLogin = req.url.endsWith('/api/auth/login');
      if (error.status === 401 && !esLogin && token) {
        toast.error('Tu sesión expiró. Vuelve a iniciar sesión.');
        auth.logout();
      }
      return throwError(() => error);
    })
  );
};
