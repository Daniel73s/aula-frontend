# AulaFrontend

Frontend en **Angular 21** (standalone + Signals) con **Tailwind CSS v4** para la aplicación "Aula en Tiempo Real".

## Requisitos

- Node.js 18+
- Yarn 1.x

## Instalación

```bash
yarn install
```

## Ejecución en desarrollo

Primero inicia el backend (`../aula-backend`). Luego:

```bash
yarn start
```

Abre `http://localhost:4200/`. El proxy de desarrollo (`proxy.conf.json`) reenvía `/api` y `/socket.io` a `http://localhost:3000`.

## Build de producción

```bash
yarn build
```

Genera los artefactos en `dist/aula-frontend`.

## Pruebas

```bash
yarn test
```

Usa [Vitest](https://vitest.dev/).

## Rutas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `StudentHomeComponent` | Alumno: alias y lista de ejercicios activos |
| `/ejercicio/:id` | `StudentExerciseComponent` | Alumno: ejercicio y selector de estado |
| `/login` | `LoginComponent` | Docente: inicio de sesión |
| `/panel` | `TeacherPanelComponent` | Docente: panel de control (protegido por `authGuard`) |

## Configuración

`src/environments/environment.ts` y `environment.prod.ts`:

| Campo | Descripción |
|---|---|
| `apiUrl` | Base de la API HTTP (`/api` en desarrollo, vía proxy) |
| `socketUrl` | URL del servidor Socket.IO (`''` = mismo origen) |

## Estructura

```
src/app/
├── models/index.ts              # Interfaces TypeScript
├── services/
│   ├── auth.service.ts          # Login del docente y token
│   ├── socket.service.ts        # Cliente Socket.IO
│   └── student.service.ts       # Estado del alumno (Signals)
├── guards/auth.guard.ts         # Protección del panel del docente
└── pages/
    ├── login/                   # Inicio de sesión del docente
    ├── teacher-panel/           # Panel del docente
    ├── student-home/            # Inicio del alumno
    └── student-exercise/        # Ejercicio del alumno
```

## Notas

- El token del docente se guarda en `localStorage`; la identidad del alumno (alias + token temporal) en `sessionStorage`.
- La lógica de permisos reside en el backend; el frontend solo refleja el estado recibido por Socket.IO.
