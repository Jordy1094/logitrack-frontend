import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';
import { Rol } from './models';

// authGuard (Tabla 7): sin sesion no se entra a ninguna pantalla protegida.
export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? true : inject(Router).createUrlTree(['/login']);
};

// roleGuard: ademas de la sesion, exige uno de los roles de la Tabla 8. Si un conductor
// escribe /camiones en la barra, vuelve a su pantalla (HU-01 CA3). El backend igual
// rechaza la peticion con 403 (RNF-02): la interfaz no es la unica barrera.
export function roleGuard(roles: Rol[]): CanActivateFn {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    if (!auth.autenticado()) {
      return router.createUrlTree(['/login']);
    }
    return auth.tieneRol(...roles) ? true : router.createUrlTree([auth.rutaInicial()]);
  };
}
