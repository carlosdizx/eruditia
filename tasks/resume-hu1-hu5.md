# Contexto de implementación: HU-01 a HU-05 (Eruditia)

> Documento para la IA que redacta las historias de usuario. Resume **lo que ya está construido**, las **decisiones que se tomaron durante la implementación** (algunas difieren o amplían lo que pedían las HU) y lo **pendiente**. Úsalo como punto de partida para la HU-06 en adelante: no hace falta volver a especificar nada de lo que aparece aquí como hecho.

---

## 1. Plataforma y convenciones

- **Monorepo** (bun + turbo): `apps/api` (NestJS + Sequelize + PostgreSQL) y `apps/web` (Next.js 16 App Router, React 19, shadcn/ui sobre Base UI, Tailwind 4).
- **Multi-tenant por organización** (colegio). Todo dato académico lleva `organization_id` y la API filtra siempre por la organización de la sesión.
- **Roles globales**: `SUPER_ADMIN` (sistema, sin organización), `ADMIN`, `TEACHER`, `STUDENT`.
- **Autenticación propia** (no Better Auth): sesiones opacas en BD (`user_sessions`), login con correo y contraseña, y segundo factor opcional por código al correo. No hay registro público; los usuarios los crea el admin y reciben una contraseña temporal por correo.
- **Permisos = feature flags por organización**. El superadmin asigna permisos a cada organización (reemplazo completo de la lista). Los permisos efectivos de un usuario son **los de su organización**; cada endpoint exige además uno o varios **roles**. Ejemplo: `grade:record` + rol `ADMIN` o `TEACHER`.
- **Toda funcionalidad nueva** debe declarar un permiso (`PermissionEnum` + descripción en el catálogo) que el superadmin activa por organización. Si una HU nueva no lo menciona, se asume uno nuevo.
- **Año lectivo seleccionado**: el admin tiene un selector global de año (cookie). El profesor y el estudiante siempre trabajan sobre el **año activo**.
- **Idioma**: la interfaz y los mensajes de la API están en español; el código, en inglés.

---

## 2. Modelo de datos actual (tablas principales)

| Tabla | Para qué |
| --- | --- |
| `organizations` | Colegio. Tiene `slug` (usado en el portal público). |
| `users`, `roles`, `user_sessions`, `user_two_factor_*` | Acceso. `users` incluye documento, teléfono y activo (HU-01.1). |
| `permissions`, `organization_permissions`, `role_permissions` | Catálogo de permisos y asignación por organización. |
| `students` | Ficha académica, **independiente de `users`** (`user_id` opcional). `access_pin` guarda el **hash** del PIN de 6 dígitos. |
| `academic_years`, `academic_periods` | Año lectivo (`status` open/closed, `is_active`) y periodos con `weight_percentage` (suman 100) e `is_open_for_grading`. |
| `grade_levels` | Grados con `sequence_order` e `is_final_grade`. |
| `classrooms` | Salón por año y grado, con `homeroom_teacher_id` (director de grupo) y `capacity`. |
| `subjects`, `classroom_subjects` | Catálogo de materias. La asignación a un salón tiene `teacher_id`, `weekly_hours` y `weight_in_gpa` (peso en el promedio general). |
| `enrollments` | Matrícula por año. `status`: in_progress, promoted, failed, withdrawn, graduated, transferred. Además `final_average`, **`computed_average`**, **`average_adjusted_by`**, `promotion_notes` y `promoted_from_enrollment_id`. |
| `grading_scales` | **Una por organización**: `min_score`, `max_score`, `passing_score`, `decimal_places` (1 o 2), **`max_failed_subjects`** (por defecto 1), **`fail_by_average`** (por defecto false), **`show_rank_in_report_card`** (por defecto false). |
| `evaluation_items` | Actividades (columnas) de una materia en un periodo, con `weight_percentage` (suman 100). |
| `student_grades` | Nota por estudiante y actividad (`score`, `feedback`, `updated_by`). |
| `period_subject_summaries` | Definitiva de la materia en el periodo (`final_period_score`, `teacher_observation`, `is_passed`). Se recalcula en cada guardado y es la base de boletines y rankings. |
| `subject_recoveries` | **Nuevo (no estaba en ninguna HU)**: nota de recuperación de fin de año por estudiante y materia. Reemplaza el acumulado anual de la materia. |

Nota: `organizations.passing_grade` (de la HU-03) **se eliminó**; ahora la nota aprobatoria vive en `grading_scales`.

---

## 3. Qué se implementó por HU

### HU-01: Usuarios, ficha de estudiante y acceso
- Usuarios con documento, teléfono y estado activo.
- Ficha de estudiante sin correo obligatorio; código y documento únicos por organización.
- Importación masiva por CSV. Columnas: `documento`, `tipo_documento`, `nombres`, `apellidos` (obligatorias) y `fecha_nacimiento`, `nombre_acudiente`, `telefono_acudiente`, `correo_acudiente` (opcionales).
- **Acceso del estudiante, una sola vía a la vez**:
  - **Cuenta** (rol STUDENT, contraseña temporal por correo), o
  - **PIN de 6 dígitos** para el portal público.
  - Al vincular una cuenta, el PIN se borra; al desvincularla, la cuenta se desactiva y se genera un PIN nuevo. El PIN en claro solo se muestra al generarlo.

### HU-02: Estructura académica
- Años lectivos con periodos ponderados. Se puede activar un año, que es el que el selector muestra por defecto. Los periodos se abren o cierran para el ingreso de notas.
- Grados (con catálogo estándar precargable), salones por año y grado con director de grupo y cupo, y materias (con catálogo estándar).
- Carga académica: materia + profesor + horas + peso en el promedio. Se puede **copiar la estructura** de salones y carga de un año a otro.
- El profesor tiene la vista **"Mis clases"**.

### HU-03: Matrículas e historial
- Matrícula individual o masiva en un salón, cambio de salón, retiro o traslado, y anulación.
- Línea de tiempo del estudiante con todos sus años y salones.
- **Asistente de promoción anual**: ver la sección de cambios a la HU-03, más abajo.

### HU-04: Notas y boletines
- **04.1 Escala por organización** en `/ajustes`. Si la escala se cambia y deja notas registradas por fuera del rango o con más decimales, se rechaza. Al cambiar la aprobatoria se recalcula `is_passed`.
- **04.2 Planilla del profesor** (`/planillas/:classroomSubjectId`):
  - estudiantes por apellido, una columna por actividad, definitiva en vivo y observación,
  - navegación con teclado y pegado desde Excel,
  - guardado en lote de las filas modificadas e indicador "Guardado a las hh:mm".
  - Si no hay actividades, se crea la columna única **"Nota del periodo (100%)"**.
  - La definitiva parcial se normaliza por el peso de las actividades ya calificadas.
  - **Reglas de bloqueo**:
    - el profesor solo califica sus materias y en periodos abiertos,
    - el director de grupo ve en solo lectura las demás materias de su salón,
    - el admin puede calificar periodos cerrados,
    - nadie modifica un año cerrado,
    - las matrículas que no están cursando quedan en solo lectura.
- **04.3 Acumulado anual**: pestaña "Acumulado anual" en la planilla, con cuatro valores:
  - **Acumulado**: puntos ganados (definitiva × peso del periodo).
  - **Proyección**: nota final si el estudiante mantiene el promedio de los periodos calificados.
  - **Necesita**: promedio mínimo en los periodos que faltan para llegar a la aprobatoria.
  - **Estado**: Aprobando o Aprobada / En riesgo / Reprobada (ya no le alcanza ni con la nota máxima).
- **04.4 Boletín**:
  - **Con login**: `/boletin` para el rol STUDENT, con selector de años anteriores.
  - **Portal público**: `/consulta-notas/:org_slug`, con documento + PIN. Solo funciona si la organización tiene el permiso. Tras **5 intentos fallidos por documento** se bloquea 15 minutos. Ante cualquier fallo responde con el mismo mensaje, para no revelar qué documentos existen.
  - **Contenido**: todas las materias, nota por periodo, acumulado, estado, detalle de actividades, observaciones del profesor, promedio por periodo y promedio general (ponderado por `weight_in_gpa`).
  - El enlace del portal aparece en `/ajustes`.

### HU-05: Rankings y cuadro de honor
- Endpoint único `GET /rankings` con todos los filtros pedidos: año, periodo o acumulado, grado, salón, materia, `limit` y `onlyAllPassed`.
- **Cálculo**: acumulado anual sin redondear, comparación con 4 decimales para desempatar, puestos compartidos (1, 1, 3) ordenados alfabéticamente. En el ranking general, quien no perdió materias va antes, tal como pedía la HU. Los retirados y trasladados no compiten.
- **05.1** `/ranking`, pestaña "Por salón".
- **05.2** pestaña "Por materia" (en un salón o en todo el grado) y "Mejores por materia" (cuadrícula con el primer puesto de cada materia del salón).
- **05.3** `/cuadro-de-honor`:
  - top 3, 5, 10 o todos, agrupado por salón o por grado, con opción "sin materias perdidas",
  - tarjetas con medallas, tabla comparativa y vista imprimible.
- **Puesto en el boletín** ("Puesto en el salón: 3 de 28"), configurable en `/ajustes` con `show_rank_in_report_card`. Se calcula sobre el acumulado anual.
- **Visibilidad**: el admin ve todo; el profesor ve el ranking general de los salones que dirige y el ranking por materia de las que dicta o de las de su dirección de grupo.
- **Permiso**: se usó `ranking:view`. La HU proponía el nombre `academic_rankings_module`.

---

## 4. Cambios y ampliaciones respecto a lo que pedían las HU

1. **Promoción anual (HU-03), reglas revisadas con el colegio**:
   - **El promedio ya no se digita**: se calcula de las planillas (el mismo promedio general del boletín) y lo guarda la API.
   - **Ajustar el promedio** a mano es posible, pero con **motivo obligatorio**. Se guardan el valor calculado (`computed_average`), el ajustado (`final_average`) y quién lo ajustó (`average_adjusted_by`). El historial muestra "Ajustado (calculado X)".
   - **Regla de reprobación configurable** en `/ajustes`:
     - por defecto, **con 1 materia perdida se repite el año** (`max_failed_subjects = 1`),
     - el promedio general solo cuenta si se activa `fail_by_average`.
   - **Decidir distinto a la sugerencia** (promover a quien reprueba o al revés) exige escribir el motivo, y la fila se marca como "Decisión manual".
   - **Notas incompletas** (periodos sin definitiva): se avisa, pero se permite promover.
2. **Recuperaciones (no estaban en ninguna HU)**:
   - Menú `/recuperaciones` con el permiso nuevo `grade:recover`.
   - El profesor registra la nota de un examen de recuperación para una **materia perdida con todos los periodos calificados**.
   - **Queda la nota que saque**, que reemplaza el acumulado anual de la materia en la planilla, el boletín ("Recuperada"), la promoción y los rankings.
   - Solo con el año abierto. El admin puede registrar en cualquier materia.
3. **Escala**: se agregaron `max_failed_subjects`, `fail_by_average` y `show_rank_in_report_card` a `grading_scales`.

---

## 5. Permisos existentes (el superadmin los activa por organización)

`user:list|create|update|delete`, `role:list`, `student:list|create|update|import`, `academic-year:list|create|update|delete`, `grade-level:list|create|update|delete`, `classroom:list|create|update|delete`, `subject:list|create|update|delete`, `classroom-subject:list|assign`, `enrollment:list|create|update|delete|promote`, `grading-scale:update`, `grade:list`, `grade:record`, **`grade:recover`**, **`report-card:view`**, **`ranking:view`**.

---

## 6. Pantallas actuales (web)

- **Superadmin**: `/admin/organizaciones` (crear, editar y permisos), `/admin/perfil`.
- **Organización**: `/perfil`, `/usuarios`, `/estudiantes` (+ ficha `/estudiantes/:id`), `/anios-lectivos`, `/grados`, `/salones` (+ `/salones/:id`), `/materias`, `/promocion`, `/mis-clases` (+ `/mis-clases/:classroomId`), `/planillas/:classroomSubjectId`, `/recuperaciones`, `/ranking`, `/cuadro-de-honor`, `/ajustes`, `/boletin`.
- **Público**: `/login`, `/consulta-notas/:org_slug`.

---

## 7. Pendiente o ideas detectadas (candidatas para próximas HU)

- **Cierre de año ligado a la promoción**: hoy el promedio se calcula al promover; si después se corrigen notas, el valor guardado no se recalcula.
- **Límite de intentos del portal con PIN**: el contador vive en caché en memoria (se pierde al reiniciar y no se comparte entre instancias). Para producción haría falta Redis y `trust proxy` para limitar también por IP.
- **Boletín visible para el admin y el profesor** (hoy solo lo ven el estudiante y el portal con PIN).
- **Puesto por periodo** en el boletín (hoy solo el anual) y "mejor por materia" dentro del cuadro de honor.
- **Exportar a PDF o Excel** los boletines y el cuadro de honor (hoy solo hay impresión desde el navegador).
- Asistencia, acudientes con cuenta propia, comunicaciones o notificaciones: no existen aún.

---

## 8. Recomendaciones al redactar nuevas HU

- Indicar el **permiso** de la funcionalidad y **qué roles** la usan.
- Referenciar las tablas existentes (sección 2) en lugar de redefinirlas.
- Si la HU toca notas, aclarar si aplica a periodos cerrados, a años cerrados y a recuperaciones.
- Dividir en sub-historias (X.1, X.2…): se implementan y prueban de a una.
