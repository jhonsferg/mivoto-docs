---
id: components
title: Componentes y Utilidades Compartidas
sidebar_label: Componentes Compartidos
---

# Componentes y Utilidades Compartidas

Los elementos en `src/app/shared/` son reutilizables a lo largo de toda la aplicación. Todos son standalone.

## Componentes UI

### `BtnComponent`

Botón reutilizable con variantes de color y estados de carga.

```html
<app-btn color="primary" [loading]="isLoading" (clicked)="onSubmit()">
  Guardar
</app-btn>
```

| Input | Tipo | Descripción |
|---|---|---|
| `color` | `'primary' \| 'secondary' \| 'danger' \| 'success'` | Variante de color |
| `loading` | `boolean` | Muestra spinner y deshabilita el botón |
| `disabled` | `boolean` | Deshabilita el botón |
| `type` | `'button' \| 'submit'` | Tipo HTML del botón |

| Output | Tipo | Descripción |
|---|---|---|
| `clicked` | `EventEmitter<void>` | Click del botón |

---

### `CardComponent`

Contenedor con estilos de tarjeta.

```html
<app-card [title]="'Estadísticas'" [subtitle]="'Últimas 24 horas'">
  <p>Contenido de la tarjeta</p>
</app-card>
```

---

### `LoaderComponent`

Spinner de carga para indicar operaciones en progreso.

```html
<app-loader [visible]="isLoading" />
```

---

### `AlertComponent`

Muestra mensajes de alerta con tipos: `info`, `success`, `warning`, `error`.

```html
<app-alert type="success" message="Voto registrado exitosamente" />
<app-alert type="error" [message]="errorMessage" [dismissible]="true" />
```

---

### `InputtextComponent`

Campo de texto con validación integrada y manejo de errores.

```html
<app-inputtext
  label="Número de documento"
  formControlName="documentNumber"
  placeholder="Ingresa tu DNI"
  [errorMessage]="'El documento es requerido'"
/>
```

---

### `InputpasswordComponent`

Campo de contraseña con toggle de visibilidad.

```html
<app-inputpassword
  label="Contraseña"
  formControlName="password"
/>
```

---

### `CheckboxComponent`

Checkbox accesible con label integrado.

```html
<app-checkbox
  label="Acepto los términos y condiciones"
  formControlName="accepted"
/>
```

---

### `SwitchComponent`

Toggle switch para opciones booleanas.

```html
<app-switch
  label="Permitir voto en blanco"
  formControlName="allowsBlankVote"
/>
```

---

### `DialogComponent`

Diálogo modal genérico creado dinámicamente por `DialogService`. No se instancia directamente en templates.

## DialogService

Gestiona la creación dinámica de diálogos:

```typescript
@Injectable({ providedIn: 'root' })
export class DialogService {
  showSuccess(message: string): void { ... }
  showError(message: string): void { ... }
  showWarning(message: string): void { ... }
  showInfo(message: string): void { ... }
  showConfirm(config: DialogConfig): Observable<boolean> { ... }
}
```

**Uso típico:**

```typescript
// Confirmación antes de una acción destructiva
this.dialog.showConfirm({
  title: '¿Cerrar elección?',
  message: 'Esta acción no se puede deshacer.',
  confirmLabel: 'Cerrar',
  cancelLabel: 'Cancelar',
  type: 'warning',
}).subscribe(confirmed => {
  if (confirmed) this.closeElection(id);
});
```

---

## Directivas

### `HasRoleDirective`- `*appHasRole`

Muestra u oculta un elemento según el rol del usuario. Usa `effect()` de Angular para reactuar a cambios del signal `userRole`.

```html
<!-- Visible solo para ADMIN -->
<div *appHasRole="['ADMIN']">Panel de administración</div>

<!-- Visible para ADMIN y SUPERVISOR -->
<a *appHasRole="['ADMIN', 'SUPERVISOR']">Ver estadísticas</a>
```

---

### `ImgFallbackDirective`- `appImgFallback`

Muestra una imagen de respaldo cuando la imagen principal falla al cargar.

```html
<img [src]="candidate.photoUrl"
     appImgFallback="assets/images/no-photo.png"
     [alt]="candidate.name" />
```

---

### `ClickOutsideDirective`- `(appClickOutside)`

Emite un evento cuando el usuario hace clic fuera del elemento. Útil para cerrar dropdowns o menús.

```html
<div class="dropdown" (appClickOutside)="closeDropdown()">
  <!-- Contenido del dropdown -->
</div>
```

---

## Pipes

### `DateFormatPipe`- `dateFormat`

Formatea fechas usando `dayjs` con soporte de timezone.

```html
<!-- Output: "01/11/2025 10:30" -->
{{ election.startDate | dateFormat:'DD/MM/YYYY HH:mm' }}

<!-- Output: "1 de noviembre de 2025" -->
{{ election.startDate | dateFormat:'D [de] MMMM [de] YYYY' }}
```

---

### `ElectionStatusPipe`- `electionStatus`

Convierte el estado interno de una elección a una etiqueta legible en español.

```html
{{ 'ACTIVE' | electionStatus }}     → "En curso"
{{ 'SCHEDULED' | electionStatus }}  → "Programada"
{{ 'DRAFT' | electionStatus }}      → "Borrador"
{{ 'CLOSED' | electionStatus }}     → "Cerrada"
{{ 'CANCELLED' | electionStatus }}  → "Cancelada"
```

---

### `RoleLabelPipe`- `roleLabel`

Convierte roles internos a etiquetas de usuario amigables.

```html
{{ 'ADMIN' | roleLabel }}       → "Administrador"
{{ 'VOTER' | roleLabel }}       → "Votante"
{{ 'SUPERVISOR' | roleLabel }}  → "Supervisor"
{{ 'AUDITOR' | roleLabel }}     → "Auditor"
```

---

### `DateAgoPipe`- `dateAgo`

Muestra tiempo relativo ("hace X minutos/horas/días").

```html
{{ auditLog.timestamp | dateAgo }}  → "hace 5 minutos"
{{ user.lastLogin | dateAgo }}      → "hace 2 días"
```

---

### `EmptyValuePipe`- `emptyValue`

Muestra un placeholder cuando el valor es `null` o `undefined`.

```html
{{ candidate.party | emptyValue:'Sin partido' }}
{{ user.email | emptyValue:'-' }}
```

---

## Modelos e Interfaces Principales

### `User`

```typescript
interface User {
  id: number;
  documentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  role: 'ADMIN' | 'VOTER' | 'SUPERVISOR' | 'AUDITOR';
  active: boolean;
}
```

### `Election`

```typescript
interface Election {
  id: number;
  title: string;
  description: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'CLOSED' | 'CANCELLED';
  startDate: string;
  endDate: string;
  candidates?: Candidate[];
  allowsBlankVote: boolean;
  requiresVerification: boolean;
}
```

### `Candidate`

```typescript
interface Candidate {
  id: number;
  electionId: number;
  number: number;
  name: string;
  party: string;
  description?: string;
  photoUrl?: string;
  active: boolean;
  voteCount: number;
}
```

### `ApiResponse<T>`

Wrapper estándar para todas las respuestas de la API:

```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  errors?: Record<string, string[]> | null;
}
```
