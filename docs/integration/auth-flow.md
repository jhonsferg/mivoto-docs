---
id: auth-flow
title: Flujo de Autenticación End-to-End
sidebar_label: Flujo de Autenticación
---

# Flujo de Autenticación End-to-End

Descripción completa del flujo de autenticación entre el frontend Angular y el backend Spring Boot.

## Diagrama General de Autenticación

```mermaid
sequenceDiagram
    actor U as Usuario
    participant LC as LoginComponent (Angular)
    participant AS as AuthService (Angular)
    participant INTER as apiInterceptor (Angular)
    participant FILT as JwtAuthenticationFilter (Spring)
    participant AUTH as AuthController (Spring)
    participant SVC as AuthUseCase (Spring)
    participant JWT as JwtTokenProvider (Spring)
    participant DB as PostgreSQL

    U->>LC: Ingresa credenciales
    LC->>AS: login({ username, password })
    AS->>AUTH: POST /api/auth/login
    Note over AUTH: Sin token requerido

    AUTH->>SVC: execute(LoginRequest)
    SVC->>DB: findByDocumentNumber(username)
    DB-->>SVC: UserEntity

    alt Credenciales válidas
        SVC->>SVC: BCrypt.verify(password, hash)
        SVC->>JWT: generateToken(user)
        JWT-->>SVC: accessToken (8h) + refreshToken
        SVC->>DB: INSERT INTO voting_sessions
        SVC->>DB: INSERT INTO audit_logs (LOGIN)
        AUTH-->>AS: { accessToken, refreshToken, user }
        AS->>AS: session.setSession(token, user)
        AS->>AS: localStorage.setItem('auth_token', token)
        AS-->>LC: LoginResponse
        LC->>LC: router.navigate([roleDashboard])
    else Credenciales inválidas
        SVC->>DB: INSERT INTO audit_logs (FAILED_LOGIN)
        AUTH-->>AS: 401 Unauthorized
        AS-->>LC: Error
        LC-->>U: "Credenciales incorrectas"
    end
```

## Verificación de Token en Cada Request

```mermaid
sequenceDiagram
    participant COMP as Componente Angular
    participant API_SVC as ApiService (Angular)
    participant INTER as apiInterceptor (Angular)
    participant FILT as JwtAuthenticationFilter (Spring)
    participant JWT as JwtTokenProvider (Spring)
    participant CTRL as Controller (Spring)

    COMP->>API_SVC: get('/api/elections')
    API_SVC->>INTER: Intercepta el request
    INTER->>INTER: Lee token del SessionService
    INTER->>INTER: Clona request con header Authorization

    INTER->>FILT: GET /api/elections\nAuthorization: Bearer {token}
    FILT->>FILT: Extrae token del header
    FILT->>JWT: validateToken(token)

    alt Token válido
        JWT-->>FILT: Claims { userId, role, email }
        FILT->>FILT: Crea UsernamePasswordAuthenticationToken
        FILT->>FILT: SecurityContextHolder.setContext(auth)
        FILT->>CTRL: Pasa request al controller
        CTRL-->>INTER: 200 OK + datos
        INTER-->>API_SVC: Response
        API_SVC-->>COMP: Observable<ApiResponse<Election[]>>
    else Token expirado
        JWT-->>FILT: ExpiredJwtException
        FILT-->>INTER: 401 Unauthorized
        INTER->>INTER: Intenta renovar token
        Note over INTER: Ver flujo de renovación
    end
```

## Renovación de Token (Token Refresh)

```mermaid
sequenceDiagram
    participant INTER as apiInterceptor (Angular)
    participant SS as SessionService (Angular)
    participant LS as localStorage (Angular)
    participant AUTH as AuthController (Spring)
    participant JWT as JwtTokenProvider (Spring)
    participant DB as PostgreSQL

    INTER->>INTER: Recibe 401 del backend
    INTER->>SS: renewToken()
    SS->>LS: getItem('refresh_token')
    LS-->>SS: refreshToken

    SS->>AUTH: POST /api/auth/refresh { refreshToken }
    AUTH->>DB: findByRefreshToken(token)
    DB-->>AUTH: VotingSession

    alt Session activa y no expirada
        AUTH->>JWT: generateToken(user)
        JWT-->>AUTH: nuevo accessToken + refreshToken
        AUTH->>DB: UPDATE voting_sessions
        AUTH-->>SS: { accessToken, refreshToken }
        SS->>LS: setItem('auth_token', newToken)
        SS->>LS: setItem('refresh_token', newRefreshToken)
        SS->>SS: _token.set(newToken) [Signal actualizado]
        SS-->>INTER: true (renovación exitosa)
        INTER->>INTER: Retry request original con nuevo token
    else Session expirada o inválida
        AUTH-->>SS: 401 Unauthorized
        SS->>SS: clearSession()
        SS->>LS: removeAll()
        SS->>SS: _token.set(null), _currentUser.set(null)
        SS-->>INTER: false
        INTER->>INTER: router.navigate(['/auth/login'])
    end
```

## Flujo de Logout

```mermaid
sequenceDiagram
    actor U as Usuario
    participant COMP as Componente (Angular)
    participant AS as AuthService (Angular)
    participant SS as SessionService (Angular)
    participant AUTH as AuthController (Spring)
    participant DB as PostgreSQL

    U->>COMP: Click "Cerrar sesión"
    COMP->>AS: logout()
    AS->>AUTH: POST /api/auth/logout
    Note over AUTH: Authorization: Bearer {token}

    AUTH->>DB: UPDATE voting_sessions SET active=false
    AUTH->>DB: INSERT INTO audit_logs (LOGOUT)
    AUTH-->>AS: 200 OK

    Note over AS: Si el backend falla, igual limpia local
    AS->>SS: clearSession()
    SS->>SS: _token.set(null)
    SS->>SS: _currentUser.set(null)
    SS->>SS: localStorage.clear()
    AS->>AS: router.navigate(['/auth/login'])
```

## Cambio de Contraseña

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SC as UserSettingsComponent
    participant AS as AuthService
    participant AUTH as AuthController
    participant SVC as AuthUseCase
    participant DB as PostgreSQL

    U->>SC: Ingresa contraseña actual y nueva
    SC->>AS: changePassword({ currentPassword, newPassword })
    AS->>AUTH: POST /api/auth/change-password
    AUTH->>SVC: execute(request)
    SVC->>DB: findUser(userId from JWT)
    DB-->>SVC: User
    SVC->>SVC: BCrypt.verify(currentPassword, hash)

    alt Contraseña actual correcta
        SVC->>SVC: BCrypt.hash(newPassword)
        SVC->>DB: UPDATE users SET password=newHash
        SVC->>DB: INSERT INTO audit_logs (PASSWORD_CHANGED)
        AUTH-->>AS: 200 OK
        AS-->>SC: Éxito
        SC-->>U: "Contraseña cambiada exitosamente"
    else Contraseña actual incorrecta
        AUTH-->>AS: 400 Bad Request
        AS-->>SC: Error
        SC-->>U: "La contraseña actual no es correcta"
    end
```

## Inicialización de la Aplicación

Cuando el usuario recarga la página:

```mermaid
flowchart TD
    START[App inicia] --> READ_LS[Lee auth_token de localStorage]
    READ_LS --> HAS_TOKEN{¿Token encontrado?}
    HAS_TOKEN -->|No| GOTO_LOGIN[Redirige a /auth/login]
    HAS_TOKEN -->|Sí| DECODE[Decodifica JWT con @auth0/angular-jwt]
    DECODE --> EXPIRED{¿Token expirado?}
    EXPIRED -->|No| SET_SESSION[session.setSession\nSignals actualizados]
    SET_SESSION --> NAVIGATE[Navega a ruta solicitada]
    EXPIRED -->|Sí| HAS_REFRESH{¿Hay refresh token?}
    HAS_REFRESH -->|No| CLEAR[Limpia localStorage]
    CLEAR --> GOTO_LOGIN
    HAS_REFRESH -->|Sí| REFRESH[POST /api/auth/refresh]
    REFRESH --> OK{¿Exitoso?}
    OK -->|Sí| SET_SESSION
    OK -->|No| CLEAR
```

## Seguridad del Almacenamiento de Tokens

| Aspecto | Decisión | Justificación |
|---|---|---|
| Almacenamiento | localStorage | Persistencia entre recargas de página |
| Tipo de token | JWT stateless | No requiere estado en servidor |
| Duración access token | 8 horas | Balance entre seguridad y UX |
| HTTPS | Requerido en producción | Previene intercepción del token |
| Scope del token | Solo backend MiVoto | No compartir con terceros |

:::warning Nota de Seguridad
Los tokens JWT en localStorage son vulnerables a XSS. El frontend debe sanitizar todo contenido dinámico y evitar usar `innerHTML` con datos del servidor.
:::
