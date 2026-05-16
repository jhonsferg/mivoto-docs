---
id: ds-01-autenticacion-jwt
title: DS-01 - Autenticacion JWT
sidebar_label: DS-01 Autenticacion JWT
---

# DS-01: Autenticacion JWT

Flujo completo de inicio de sesion, incluyendo validacion de credenciales con BCrypt, generacion de tokens JWT de acceso (1h) y refresco (7d), almacenamiento de sesion en Redis y registro de auditoria.

## Diagrama de Secuencia (PlantUML)

```plantuml
@startuml
autonumber
actor "Usuario" as user
participant "Controller\nAuthController" as controller
participant "Service\nAuthService" as service
participant "Repository\nUserRepository" as repo
participant "Security\nJwtTokenProvider" as jwt
participant "Security\nPasswordEncoder" as encoder
participant "Cache\nRedis" as redis
participant "Audit\nAuditService" as audit
database "PostgreSQL" as db

== Inicio de Sesion ==
user -> controller: POST /api/auth/login\n{username, password}
activate controller

controller -> service: login(LoginRequest)
activate service

service -> repo: findByUsernameOrEmail(username)
activate repo
repo -> db: SELECT * FROM users WHERE...
db --> repo: User entity
repo --> service: Optional<User>
deactivate repo

alt Usuario no encontrado
    service --> controller: throw UserNotFoundException
    controller --> user: 404 Not Found
else Usuario encontrado
    service -> encoder: matches(rawPassword, encodedPassword)
    activate encoder
    encoder --> service: boolean
    deactivate encoder

    alt Contrasena incorrecta
        service -> audit: logFailedLogin(username)
        service --> controller: throw InvalidCredentialsException
        controller --> user: 401 Unauthorized
    else Contrasena correcta
        service -> service: checkUserActive()

        alt Usuario inactivo
            service --> controller: throw UserInactiveException
            controller --> user: 403 Forbidden
        else Usuario activo
            service -> jwt: generateAccessToken(user)
            activate jwt
            jwt -> jwt: createToken(claims, expiration=1h)
            jwt --> service: accessToken
            deactivate jwt

            service -> jwt: generateRefreshToken(user)
            activate jwt
            jwt -> jwt: createToken(claims, expiration=7d)
            jwt --> service: refreshToken
            deactivate jwt

            service -> redis: set("session:" + userId, sessionData, TTL=7d)
            activate redis
            redis --> service: OK
            deactivate redis

            service -> repo: updateLastLogin(userId)
            activate repo
            repo -> db: UPDATE users SET last_login = NOW()
            db --> repo: OK
            repo --> service: void
            deactivate repo

            service -> audit: logSuccessfulLogin(user)
            activate audit
            audit -> db: INSERT INTO audit_logs
            db --> audit: OK
            audit --> service: void
            deactivate audit

            service --> controller: LoginResponse(tokens, user)
        end
    end
end

controller --> user: 200 OK\n{accessToken, refreshToken, user}
deactivate service
deactivate controller

@enduml
```

## Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant CTRL as AuthController
    participant SVC as AuthService
    participant REPO as UserRepository
    participant JWT as JwtTokenProvider
    participant ENC as PasswordEncoder
    participant REDIS as Redis
    participant AUDIT as AuditService
    participant DB as PostgreSQL

    U->>CTRL: POST /api/auth/login {username, password}
    CTRL->>SVC: login(LoginRequest)
    SVC->>REPO: findByUsernameOrEmail(username)
    REPO->>DB: SELECT * FROM users WHERE...
    DB-->>REPO: User entity
    REPO-->>SVC: Optional<User>

    alt Usuario no encontrado
        SVC-->>CTRL: throw UserNotFoundException
        CTRL-->>U: 404 Not Found
    else Usuario encontrado
        SVC->>ENC: matches(rawPassword, encodedPassword)
        ENC-->>SVC: boolean

        alt Contrasena incorrecta
            SVC->>AUDIT: logFailedLogin(username)
            SVC-->>CTRL: throw InvalidCredentialsException
            CTRL-->>U: 401 Unauthorized
        else Contrasena correcta
            SVC->>JWT: generateAccessToken(user)
            JWT-->>SVC: accessToken (TTL=1h)
            SVC->>JWT: generateRefreshToken(user)
            JWT-->>SVC: refreshToken (TTL=7d)
            SVC->>REDIS: set("session:{userId}", sessionData, TTL=7d)
            REDIS-->>SVC: OK
            SVC->>REPO: updateLastLogin(userId)
            REPO->>DB: UPDATE users SET last_login = NOW()
            DB-->>REPO: OK
            SVC->>AUDIT: logSuccessfulLogin(user)
            AUDIT->>DB: INSERT INTO audit_logs
            DB-->>AUDIT: OK
            SVC-->>CTRL: LoginResponse(tokens, user)
            CTRL-->>U: 200 OK {accessToken, refreshToken, user}
        end
    end
```

---

## Actores y Componentes

| Componente | Responsabilidad |
|---|---|
| AuthController | Controlador REST que recibe la peticion HTTP |
| AuthService | Orquesta la logica de autenticacion |
| UserRepository | Acceso a datos de usuarios en PostgreSQL |
| JwtTokenProvider | Genera y valida tokens JWT (HS256) |
| PasswordEncoder | Verifica contrasenas con BCrypt (factor 12) |
| Redis | Cache de sesiones con TTL |
| AuditService | Registra todos los eventos de autenticacion |

## Pasos del Flujo

1. El usuario envia username y password al endpoint `POST /api/auth/login`
2. El servicio busca el usuario por username o email en PostgreSQL
3. Si no existe, se retorna `404 Not Found`
4. Se compara la contrasena enviada contra el hash BCrypt almacenado
5. Si falla, se audita el intento fallido y se retorna `401 Unauthorized`
6. Se verifica que el usuario este en estado activo (`active = true`)
7. Se genera el **access token** JWT con expiracion de 1 hora
8. Se genera el **refresh token** JWT con expiracion de 7 dias
9. Se almacena la sesion en Redis con clave `session:{userId}` y TTL de 7 dias
10. Se actualiza `last_login` en la base de datos
11. Se registra el login exitoso en `audit_logs`
12. Se retornan los tokens y datos basicos del usuario

## Estructura de Claims JWT

```json
{
  "sub": "userId",
  "username": "string",
  "role": "VOTER|ADMIN|SUPERVISOR",
  "iat": "timestamp",
  "exp": "timestamp"
}
```

## Estructura de Sesion en Redis

```json
{
  "userId": 1,
  "username": "string",
  "role": "VOTER",
  "loginTime": "2025-11-01T08:00:00",
  "lastActivity": "2025-11-01T08:00:00"
}
```

## Consideraciones de Seguridad

- Las contrasenas se almacenan con BCrypt factor 12
- Los tokens JWT estan firmados con HMAC-SHA256
- Las sesiones tienen TTL automatico en Redis
- Los intentos de login fallidos quedan auditados en PostgreSQL
- Rate limiting aplicado en el controller para prevenir fuerza bruta
