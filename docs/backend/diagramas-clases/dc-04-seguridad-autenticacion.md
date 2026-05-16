---
id: dc-04-seguridad-autenticacion
title: DC-04 - Seguridad y Autenticacion
sidebar_label: DC-04 Seguridad y Autenticacion
---

# DC-04: Seguridad y Autenticacion

Diagrama de clases del subsistema de seguridad. Muestra como `SecurityConfiguration`, `JwtAuthenticationFilter`, `JwtTokenProvider`, `CustomUserDetailsService` y `UserPrincipal` colaboran para autenticar cada peticion HTTP y adaptar la entidad `User` del dominio al modelo de Spring Security.

## Diagrama de Clases (PlantUML)

```plantuml
@startuml
skinparam classAttributeIconSize 0

package "Spring Security Config" {
    class SecurityConfiguration {
        + filterChain(http: HttpSecurity): SecurityFilterChain
        + authenticationManager(config: AuthenticationConfiguration): AuthenticationManager
        + passwordEncoder(): PasswordEncoder
    }

    class JwtAuthenticationFilter {
        - jwtTokenProvider: JwtTokenProvider
        - userDetailsService: CustomUserDetailsService
        + doFilterInternal(request, response, chain): void
    }

    class JwtTokenProvider {
        - secretKey: String
        - validityInMilliseconds: long
        + createToken(authentication: Authentication): String
        + getUserIdFromJWT(token: String): Long
        + validateToken(token: String): boolean
    }
}

package "User Details Service" {
    interface UserDetailsService {
        + loadUserByUsername(username: String): UserDetails
    }

    class CustomUserDetailsService {
        - userRepository: UserRepository
        + loadUserByUsername(usernameOrEmail: String): UserDetails
        + loadUserById(id: Long): UserDetails
    }

    class UserPrincipal {
        - id: Long
        - name: String
        - username: String
        - email: String
        - password: String
        - authorities: Collection~GrantedAuthority~
        + create(user: User): UserPrincipal
    }

    UserDetailsService <|.. CustomUserDetailsService
    UserDetails <|.. UserPrincipal
}

package "Domain" {
    class User <<entity>> {
        - id: Long
        - username: String
        - password: String
        - roles: Set~Role~
    }
}

SecurityConfiguration --> JwtAuthenticationFilter
JwtAuthenticationFilter --> JwtTokenProvider
JwtAuthenticationFilter --> CustomUserDetailsService

CustomUserDetailsService --> UserPrincipal : creates
CustomUserDetailsService --> User : retrieves

JwtTokenProvider ..> UserPrincipal : uses claims from

note right of JwtAuthenticationFilter
  Intercepta cada peticion HTTP,
  extrae el token JWT del header Authorization,
  lo valida y establece la autenticacion
  en el SecurityContextHolder.
end note

note right of UserPrincipal
  Implementacion de UserDetails de Spring Security.
  Adapta la entidad User del dominio
  al modelo de seguridad.
end note

@enduml
```

## Diagrama de Clases (Mermaid)

```mermaid
classDiagram
    class SecurityConfiguration {
        +filterChain(http HttpSecurity) SecurityFilterChain
        +authenticationManager(config AuthenticationConfiguration) AuthenticationManager
        +passwordEncoder() PasswordEncoder
    }

    class JwtAuthenticationFilter {
        -JwtTokenProvider jwtTokenProvider
        -CustomUserDetailsService userDetailsService
        +doFilterInternal(request, response, chain) void
    }

    class JwtTokenProvider {
        -String secretKey
        -long validityInMilliseconds
        +createToken(authentication Authentication) String
        +getUserIdFromJWT(token String) Long
        +validateToken(token String) boolean
    }

    class UserDetailsService {
        <<interface>>
        +loadUserByUsername(username String) UserDetails
    }

    class CustomUserDetailsService {
        -UserRepository userRepository
        +loadUserByUsername(usernameOrEmail String) UserDetails
        +loadUserById(id Long) UserDetails
    }

    class UserPrincipal {
        -Long id
        -String name
        -String username
        -String email
        -String password
        -Collection~GrantedAuthority~ authorities
        +create(user User) UserPrincipal
    }

    class User {
        <<entity>>
        -Long id
        -String username
        -String password
        -Set~Role~ roles
    }

    SecurityConfiguration --> JwtAuthenticationFilter : configures
    JwtAuthenticationFilter --> JwtTokenProvider : validates token
    JwtAuthenticationFilter --> CustomUserDetailsService : loads user

    UserDetailsService <|.. CustomUserDetailsService : implements
    CustomUserDetailsService --> UserPrincipal : creates
    CustomUserDetailsService --> User : retrieves

    JwtTokenProvider ..> UserPrincipal : uses claims
```

---

## Componentes del Subsistema de Seguridad

### SecurityConfiguration

Clase de configuracion central de Spring Security (anotada con `@EnableWebSecurity`).

Responsabilidades:
- Define la cadena de filtros de seguridad (`SecurityFilterChain`)
- Establece reglas de autorizacion por endpoint segun el rol requerido
- Configura el manejo de sesiones como **stateless** (sin estado HTTP en servidor)
- Expone el bean `PasswordEncoder` con BCrypt
- Registra `JwtAuthenticationFilter` en la cadena de filtros

**Reglas de acceso configuradas:**

| Patron de URL | Roles permitidos |
|---|---|
| `POST /api/auth/**` | Publico (sin autenticacion) |
| `GET /api/votes/verify/**` | Publico |
| `GET /api/elections/active` | Publico |
| `POST /api/votes` | VOTER |
| `POST /api/elections/**` | ADMIN |
| `GET /api/elections/{id}/results` | ADMIN, SUPERVISOR |
| `GET /api/statistics/**` | ADMIN, SUPERVISOR |
| `GET /api/audit/**` | ADMIN, AUDITOR |

### JwtAuthenticationFilter

Filtro personalizado que extiende `OncePerRequestFilter`. Se ejecuta exactamente una vez por cada peticion HTTP.

Flujo de ejecucion:
1. Extrae el token del header `Authorization: Bearer <token>`
2. Llama a `JwtTokenProvider.validateToken(token)` para verificar firma y expiracion
3. Si es valido, extrae el `userId` del token
4. Llama a `CustomUserDetailsService.loadUserById(userId)`
5. Crea un `UsernamePasswordAuthenticationToken` y lo establece en `SecurityContextHolder`
6. Pasa la peticion al siguiente filtro

### JwtTokenProvider

Componente utilitario para operaciones sobre tokens JWT.

| Metodo | Descripcion |
|---|---|
| `createToken(authentication)` | Genera JWT firmado con HMAC-SHA256, incluye userId, username, role, iat y exp |
| `getUserIdFromJWT(token)` | Extrae el claim `sub` (userId) del token |
| `validateToken(token)` | Verifica firma y que no este expirado; retorna `false` para tokens en blacklist Redis |

**Configuracion de tokens:**

| Token | Duracion | Uso |
|---|---|---|
| Access Token | 8 horas | Autenticar peticiones a la API |
| Refresh Token | 7 dias | Renovar el access token sin re-login |

### CustomUserDetailsService

Implementa la interfaz estandar de Spring Security `UserDetailsService`. Su unica responsabilidad es cargar datos del usuario desde PostgreSQL y adaptarlos al modelo de seguridad.

- `loadUserByUsername(usernameOrEmail)` - usado en el flujo de login inicial
- `loadUserById(id)` - usado en `JwtAuthenticationFilter` para validar tokens en peticiones subsiguientes

### UserPrincipal

Implementa `UserDetails` de Spring Security. Es un adaptador (patron Adapter) que convierte la entidad de dominio `User` en el objeto que Spring Security entiende.

Implementa los metodos de estado de cuenta basandose en el campo `active` de la entidad `User`:
- `isEnabled()` - retorna `user.isActive()`
- `isAccountNonLocked()` - retorna `user.isActive()`
- `isCredentialsNonExpired()` - retorna `true`
- `isAccountNonExpired()` - retorna `true`

## Flujo de Autenticacion en Cada Peticion

```mermaid
flowchart TD
    REQ[Peticion HTTP entrante] --> FILTER[JwtAuthenticationFilter]
    FILTER --> EXTRACT[Extraer Bearer token del header]
    EXTRACT --> HAS{Tiene token?}
    HAS -->|No| ANON[Continuar como anonimo]
    HAS -->|Si| VALIDATE[JwtTokenProvider.validateToken]
    VALIDATE --> VALID{Token valido?}
    VALID -->|No| REJECT[401 Unauthorized]
    VALID -->|Si| LOAD[CustomUserDetailsService.loadUserById]
    LOAD --> AUTH[Establecer en SecurityContextHolder]
    AUTH --> CHAIN[Pasar al siguiente filtro]
    CHAIN --> AUTHZ{Tiene permiso para el endpoint?}
    AUTHZ -->|No| FORBID[403 Forbidden]
    AUTHZ -->|Si| HANDLER[Controlador REST]
```
