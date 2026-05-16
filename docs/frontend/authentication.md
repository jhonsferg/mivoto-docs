---
id: authentication
title: Autenticación
sidebar_label: Autenticación
---

# Autenticación en el Frontend

El frontend implementa autenticación JWT con renovación automática de tokens y persistencia de sesión en localStorage.

## Flujo de Login

```mermaid
sequenceDiagram
    actor U as Usuario
    participant LC as LoginComponent
    participant AS as AuthService
    participant SS as SessionService
    participant STOR as localStorage
    participant API as Backend API

    U->>LC: Ingresa usuario y contraseña
    LC->>AS: login(credentials)
    AS->>API: POST /api/auth/login
    API-->>AS: { accessToken, refreshToken, user }
    AS->>SS: setSession(token, user)
    SS->>STOR: setItem('auth_token', token)
    SS->>SS: _currentUser.set(user) [Signal]
    SS->>SS: _token.set(token) [Signal]
    AS-->>LC: LoginResponse
    LC->>LC: Navegar según rol del usuario
    Note over LC: ADMIN → /admin, VOTER → /voting, SUPERVISOR → /supervisor
```

## SessionService

El `SessionService` es el núcleo del manejo de sesión. Usa **Angular Signals** para estado reactivo:

```typescript
@Injectable({ providedIn: 'root' })
export class SessionService {
  private _currentUser = signal<User | null>(null);
  private _token = signal<string | null>(null);

  // Computed signals- actualizados automáticamente
  isAuthenticated = computed(() => !!this._token());
  userRole = computed(() => this._currentUser()?.role ?? null);
  currentUser = this._currentUser.asReadonly();

  setSession(token: string, user: User): void {
    this._token.set(token);
    this._currentUser.set(user);
    this.storage.setItem('auth_token', token);
  }

  clearSession(): void {
    this._token.set(null);
    this._currentUser.set(null);
    this.storage.removeItem('auth_token');
  }

  async renewToken(): Promise<boolean> {
    const refreshToken = this.storage.getItem('refresh_token');
    if (!refreshToken) return false;
    // Llama al backend para renovar y actualiza la sesión
    ...
  }
}
```

## apiInterceptor- Adjuntar Token

Todos los requests HTTP incluyen automáticamente el token Bearer:

```typescript
export const apiInterceptor: HttpInterceptorFn = (req, next) => {
  const session = inject(SessionService);
  const token = session.currentToken();

  if (token) {
    req = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        // Intenta renovar el token automáticamente
        return session.renewToken().pipe(
          switchMap(success => success ? next(reqWithNewToken) : redirectToLogin())
        );
      }
      return throwError(() => error);
    })
  );
};
```

## Flujo de Renovación de Token

```mermaid
sequenceDiagram
    participant INTER as apiInterceptor
    participant SS as SessionService
    participant API as Backend API
    participant ROUTER as Angular Router

    INTER->>API: Request con token expirado
    API-->>INTER: 401 Unauthorized
    INTER->>SS: renewToken()
    SS->>API: POST /api/auth/refresh { refreshToken }
    alt Refresh exitoso
        API-->>SS: { accessToken, refreshToken }
        SS->>SS: setSession(newToken, user)
        INTER->>API: Retry request original
        API-->>INTER: 200 OK
    else Refresh fallido
        API-->>SS: 401 Unauthorized
        SS->>SS: clearSession()
        SS->>ROUTER: navigate(['/auth/login'])
    end
```

## errorInterceptor- Manejo Global de Errores

El `errorInterceptor` convierte errores HTTP en mensajes amigables para el usuario:

```typescript
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Saltar ciertos endpoints (ej. /auth/refresh para evitar bucles)
      if (shouldSkip(req.url)) return throwError(() => error);

      const message = getHumanReadableMessage(error);
      inject(DialogService).showError(message);
      return throwError(() => error);
    })
  );
};
```

**Mensajes por código HTTP:**
- `400` → "Los datos ingresados no son válidos"
- `401` → "Tu sesión ha expirado, por favor inicia sesión"
- `403` → "No tienes permisos para realizar esta acción"
- `404` → "El recurso solicitado no fue encontrado"
- `409` → "Ya has votado en esta elección"
- `500` → "Error interno del servidor, inténtalo más tarde"

## Persistencia de Sesión

| Clave en localStorage | Contenido |
|---|---|
| `auth_token` | JWT de acceso |
| `refresh_token` | JWT de refresco |

Al recargar la aplicación:
1. `SessionService` lee `auth_token` de localStorage
2. Verifica que el token no esté expirado
3. Si expiró, intenta renovar con `refresh_token`
4. Si la renovación falla, redirige a `/auth/login`

## Directiva HasRole

Oculta/muestra elementos del DOM según el rol del usuario:

```html
<!-- Solo visible para ADMIN -->
<button *appHasRole="['ADMIN']">Gestionar Elecciones</button>

<!-- Visible para ADMIN y SUPERVISOR -->
<a *appHasRole="['ADMIN', 'SUPERVISOR']">Ver Resultados</a>
```

```typescript
@Directive({ selector: '[appHasRole]', standalone: true })
export class HasRoleDirective {
  @Input('appHasRole') roles: string[] = [];

  constructor(private session: SessionService, private template: TemplateRef<any>,
              private viewContainer: ViewContainerRef) {
    effect(() => {
      const userRole = this.session.userRole();
      if (this.roles.includes(userRole ?? '')) {
        this.viewContainer.createEmbeddedView(this.template);
      } else {
        this.viewContainer.clear();
      }
    });
  }
}
```

## Logout

```mermaid
sequenceDiagram
    actor U as Usuario
    participant AS as AuthService
    participant API as Backend API
    participant SS as SessionService
    participant ROUTER as Angular Router

    U->>AS: logout()
    AS->>API: POST /api/auth/logout
    Note over AS,API: Si falla, se ignora y se limpia local
    API-->>AS: 200 OK (o error)
    AS->>SS: clearSession()
    SS->>SS: _token.set(null), _currentUser.set(null)
    SS->>SS: localStorage.clear()
    AS->>ROUTER: navigate(['/auth/login'])
```

El logout funciona incluso si el backend no responde, ya que la limpieza local es independiente de la respuesta del servidor.
