# Orocash · Dashboard de Control de Inventario POP

Dashboard interno para administrar inventario POP, joyerías, eventos, solicitudes de reposición/adquisición y usuarios, con control de acceso por rol (Administrador / Jefe Zonal).

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase (PostgreSQL, Auth, RLS).

## Puesta en marcha

1. **Crear proyecto en Supabase** (https://supabase.com) y copiar `Project URL`, `anon key` y `service_role key`.
2. **Variables de entorno**: copiar `.env.example` a `.env.local` y completar los 3 valores.
3. **Base de datos**: en el SQL Editor de Supabase, ejecutar en orden los archivos de `supabase/`:
   1. `00_schema.sql` — tablas, enums, índices
   2. `01_functions.sql` — triggers, funciones auxiliares, alta automática de perfil
   3. `02_policies.sql` — Row Level Security
   4. `03_seed.sql` — datos reales: 10 zonas, 101 agencias/joyerías (código, ciudad, provincia, correo, celular, compañía) y el catálogo real de 16 materiales POP en 8 categorías (Volantes, Dípticos, Sobres, Tarjetas, Certificados, Institucional, Acrílicos y Habladores, Rompetráficos)
   5. `04_operations.sql` — funciones transaccionales (asignar, devolver, dar de baja, entregar reposición)
   6. `05_distribution.sql` — distribución real de material instalado por agencia (incluye los materiales nuevos LETRERO y PINTURA) con su condición real: buen estado, desgastado o dañado, tomada de la hoja "material pop por agencia" del Excel
4. **Crear usuarios** (admin + 10 jefes zonales reales: Ivan Dario, Pablo Hernandez, Efren Londoño, Jorge Higuita, Alfredo Segura, Wilmar Sanchez, Atilio Manzano, Harold Bedoya, Oswaldo Rincon y Jefferson Luna):
   ```bash
   npm install
   npx tsx supabase/scripts/seed-users.ts
   ```
   Esto crea `admin@orocash.ec` y `jefe.zona1@orocash.ec` … `jefe.zona10@orocash.ec`, todos con contraseña temporal `CambiarEnProduccion123!` (cámbiala en producción desde **Configuración → Mi cuenta**).
5. **Ejecutar en desarrollo**:
   ```bash
   npm run dev
   ```

## Estructura del proyecto

```
app/                    Rutas (App Router)
  login/                Página de inicio de sesión
  (dashboard)/           Rutas protegidas (requieren sesión)
    dashboard/            Inicio / resumen (vista admin y jefe zonal)
    inventario/           Inventario POP (catálogo, detalle, alta, carga masiva)
    joyerias/             Joyerías
    eventos/              Eventos + calendario
    reposicion/           Solicitudes de reposición
    adquisicion/          Solicitudes de adquisición
    usuarios/ zonas/       Usuarios y zonas (solo admin)
    reportes/             Generador de reportes exportables
    historial/            Auditoría (solo admin)
    configuracion/        Cuenta y categorías POP
actions/                Server Actions (mutaciones + auditoría)
components/             Componentes de UI por módulo + kit base (components/ui)
lib/                    Clientes Supabase, auth, permisos, validaciones (zod), import/export
supabase/               Esquema SQL, RLS, funciones transaccionales, seed
middleware.ts           Protección de rutas + refresco de sesión
```

## Notas de arquitectura

- **Autenticación**: Supabase Auth (email + password). El perfil de aplicación (`public.users`) se crea automáticamente vía trigger al registrar el usuario en `auth.users`.
- **Autorización**: aplicada en dos capas — Row Level Security en Postgres (capa de datos, no se puede saltar) y helpers de UI en `lib/permissions.ts` (para ocultar acciones que igualmente rechazaría la base de datos).
- **Operaciones críticas de inventario** (asignar, devolver, dar de baja, entregar reposición) están implementadas como funciones `SECURITY DEFINER` en Postgres (`supabase/04_operations.sql`) para garantizar atomicidad y evitar condiciones de carrera.
- **Auditoría**: cada Server Action relevante llama a `logAudit()`, que inserta en `audit_logs` vía la función `log_audit()`.
- **Carga masiva**: los componentes `BulkUpload*` parsean CSV/Excel en el navegador (`papaparse` / `xlsx`), validan campo por campo, muestran una vista previa con errores y solo envían al servidor las filas válidas.

## Próximos pasos hacia producción

Ver la sección "Recomendaciones para producción" del documento de arquitectura adjunto (`orocash-pop-dashboard-arquitectura.html`).
