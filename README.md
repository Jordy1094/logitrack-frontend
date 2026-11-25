# LogiTrack Frontend

Aplicación Angular de LogiTrack (gestión de flota y asignación de rutas para TransRápido). Consume la API REST del repositorio [logitrack-backend](https://github.com/Jordy1094/logitrack-backend). Corresponde a los Capítulos 2 y 6 del informe.

## Requisitos

- Node.js 20 o superior y npm
- Backend de LogiTrack corriendo en `http://localhost:8080` (ver su README)

## Ejecución en local

```bash
npm install
npm start
```

Abrir `http://localhost:4200`.

## Cuentas de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@logitrack.com | Admin123! |
| Supervisor | supervisor@logitrack.com | Supervisor123! |
| Conductor | conductor@logitrack.com | Conductor123! |

## Pantallas

| Ruta | Pantalla | Roles |
|---|---|---|
| `/login` | Inicio de sesión | Todos |
| `/dashboard` | Resumen de la flota, rutas en curso y novedades | Administrador, Supervisor |
| `/camiones` | Lista con semáforo, registro, mantenimiento e historial | Administrador, Supervisor |
| `/rutas/nueva` | Asignación de ruta | Administrador, Supervisor |
| `/conductores` | Lista y registro de conductores | Administrador, Supervisor |
| `/mi-ruta` | Ruta asignada y reporte del vehículo (vista móvil) | Conductor |

## Estructura

```
src/app/
  core/      AuthService, FleetService, jwtInterceptor, authGuard/roleGuard, modelos, manejo de errores
  shared/    Menú lateral, avisos (toasts) y semáforo de estado
  pages/     login, dashboard, trucks, drivers, route-form, driver-home
```

## Despliegue en Vercel

1. Editar `src/environments/environment.ts` y poner en `apiUrl` la URL del backend en Render.
2. En Vercel: **Add New → Project**, importar este repositorio. `vercel.json` ya define el comando de build y la carpeta de salida.
3. Agregar la URL de Vercel a la variable `CORS_ALLOWED_ORIGINS` del backend en Render.
