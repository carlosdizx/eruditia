# Instrucciones de Implementación: Autenticación y Autorización Multi-Tenant en NestJS con Better Auth

## 1. Contexto del Proyecto
Se requiere implementar el sistema de autenticación y autorización para un backend desarrollado en **NestJS**, utilizando **Better Auth** como proveedor principal.

El modelo de negocio es un **B2B SaaS (Software as a Service Multi-inquilino)**. Existen Organizaciones (clientes/compañías) y cada Organización tiene sus propios Usuarios.

## 2. Requerimientos Core (Reglas de Negocio)

Debes respetar estrictamente las siguientes 5 reglas al generar el código:

1. **Cero Endpoints Públicos (Por defecto):** Todos los endpoints de la API deben estar protegidos por autenticación. Solo deben ser accesibles si el usuario tiene una sesión válida.
2. **Super Administrador (Sistema):** El registro de "Organizaciones" (Compañías) está restringido. Solo un usuario con el rol de "Super Admin" (administrador del sistema global) puede crear y registrar nuevas organizaciones.
3. **Gestión Interna de Usuarios (No registro público):** Las personas no pueden registrarse libremente en la aplicación. La creación de usuarios se hace exclusivamente desde el panel de control de cada compañía. Solo los usuarios con permisos administrativos dentro de una compañía pueden crear/invitar a otros usuarios a su misma organización.
4. **Roles y Permisos (RBAC por Organización):** Deben existir diferentes roles dentro de las organizaciones (ej. `admin`, `supervisor`, `member`). Un usuario puede tener un rol en la Organización A y solo debe existir ese usuario en toda la app, no se comparten usuarios.
5. **Control de Acceso a Nivel de Organización (Feature Flags):** No todas las compañías tienen acceso a las mismas funcionalidades o APIs, sin importar el rol del usuario. Por ejemplo, aunque un usuario sea `admin` en su organización, si su organización no tiene contratado el "módulo de reportes", el acceso a las APIs de reportes debe ser denegado.

## 3. Especificaciones Técnicas y Arquitectura sugerida

Para implementar esto en NestJS con Better Auth, sigue esta arquitectura:

### A. Configuración de Better Auth
- Utiliza el plugin `organization()` de Better Auth para el manejo multi-tenant y roles internos.
- Utiliza la propiedad `metadata` de las Organizaciones para almacenar un array de `allowedModules` o `features` (ej. `["reports:advanced", "api:external"]`) que definirá qué APIs tiene permitidas esa compañía.
- Configura una forma de identificar al "Super Admin" (puede ser mediante una propiedad en la tabla de usuarios `isSuperAdmin: boolean` o usando el plugin `admin()` global de Better Auth).

### B. Elementos de NestJS a desarrollar
Genera el código para los siguientes elementos en NestJS:

1. **AuthGuard (Global):**
    - Un Guard que valide la sesión de Better Auth inyectada en los headers/cookies. Si no hay sesión, arroja `401 Unauthorized`.
2. **SuperAdminGuard:**
    - Un Guard para los endpoints de creación de Organizaciones. Valida que el usuario autenticado sea el dueño/admin del sistema.
3. **RolesGuard (Nivel de Organización):**
    - Un Guard y un Decorador (ej. `@RequireRoles('admin', 'supervisor')`) que valide el rol del usuario basándose en el `activeOrganizationId` actual de su sesión.
4. **FeatureGuard / OrganizationPermissionGuard (Nivel de Suscripción):**
    - Un Guard y un Decorador (ej. `@RequireFeature('reports:advanced')`) que inspeccione el `metadata` de la organización activa del usuario y valide si la compañía tiene habilitada dicha funcionalidad. Si no la tiene, arroja `403 Forbidden` indicando que la compañía no posee ese recurso.

### C. Controladores solicitados (Endpoints de ejemplo)
Genera el cascarón y la lógica de los siguientes endpoints para demostrar que la lógica de Guards funciona:

- `POST /system/organizations` -> Protegido por `SuperAdminGuard`. Crea la compañía y le asigna sus *features* en la metadata.
- `POST /organizations/users` -> Protegido por `RolesGuard('admin')`. Permite al administrador de la compañía crear a un empleado.
- `GET /reports/financial` -> Protegido por `FeatureGuard('finance_module')` y `RolesGuard('admin', 'supervisor')`.

## 4. Plan de Ejecución

Por favor, actúa como un desarrollador experto en NestJS y TypeScript. Escribe el código paso a paso:
1. Muestra cómo quedaría la configuración de `betterAuth` (instanciación y plugins).
2. Genera los Decoradores de metadatos (`@Roles`, `@RequireFeature`).
3. Genera los Guards necesarios (`AuthGuard`, `SuperAdminGuard`, `RolesGuard`, `FeatureGuard`).
4. Muestra un ejemplo de un `Controller` aplicando estos Guards.
5. Todo debe ser a nivel atomico, osea que cada archivo, service, controlador se encarga de una tarea especifica, tal cual como este proyecto.
6. Prueba unitarias para validar que todo este bien.


Asegúrate de que el código sea limpio, siga los principios SOLID y maneje correctamente los errores de HTTP propios de NestJS (`UnauthorizedException`, `ForbiddenException`).