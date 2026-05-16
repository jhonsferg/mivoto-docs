---
id: overview
title: Integración- Visión General
sidebar_label: Visión General
---

# Integración Frontend-Backend

Esta sección describe cómo el frontend Angular y el backend Spring Boot interactúan para implementar las funcionalidades del sistema de votación.

## Arquitectura de Integración

```mermaid
graph TB
    subgraph Browser["Navegador del Usuario"]
        SPA[Angular SPA]
        LS[localStorage\nauth_token\nrefresh_token]
        INTER[apiInterceptor\nAdjunta Bearer token]
        SPA <--> LS
        SPA --> INTER
    end

    subgraph Backend["Backend Spring Boot :8080"]
        FILTER[JwtAuthenticationFilter]
        SEC[Spring Security]
        CTRL[Controllers REST]
        SERV[Services]
        DB[(PostgreSQL)]
        REDIS[(Redis)]
    end

    INTER -->|HTTP + Bearer Token JWT| FILTER
    FILTER --> SEC
    SEC --> CTRL
    CTRL --> SERV
    SERV --> DB & REDIS
    CTRL -->|JSON Response| SPA
```

## Contrato de Comunicación

### URL Base

| Entorno | URL |
|---|---|
| Local | `http://localhost:8080/api` |
| Dev | `https://api-dev.mivoto.pe/api` |
| QA | `https://api-qa.mivoto.pe/api` |
| Prod | `https://api.mivoto.pe/api` |

### Formato de Request

```http
POST /api/elections HTTP/1.1
Host: localhost:8080
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
Content-Type: application/json
Accept: application/json

{
  "title": "Elección Municipal 2025",
  "startDate": "2025-11-01T08:00:00",
  "endDate": "2025-11-01T18:00:00"
}
```

### Formato de Response

Todas las respuestas siguen el mismo contrato:

```json
{
  "success": true,
  "message": "Elección creada exitosamente",
  "data": {
    "id": 1,
    "title": "Elección Municipal 2025",
    "status": "DRAFT"
  },
  "errors": null
}
```

**En error:**
```json
{
  "success": false,
  "message": "Error de validación",
  "data": null,
  "errors": {
    "title": ["El título es requerido"],
    "endDate": ["La fecha fin debe ser posterior a la fecha inicio"]
  }
}
```

## Mapa de Servicios Angular ↔ Endpoints Backend

```mermaid
graph LR
    subgraph Angular["Angular Services"]
        AS[AuthService]
        SS[SessionService]
        ELS[ElectionService]
        VS[VotingService]
        CS[CandidateService]
        US[UserService]
        AUS[AuditService]
        STS[StatisticsService]
    end

    subgraph Backend["Backend Controllers"]
        AC[AuthController\n/api/auth]
        EC[ElectionController\n/api/elections]
        VC[VotingController\n/api/votes]
        CC[CandidateController\n/api/candidates]
        UC[UserController\n/api/users]
        AUC[AuditController\n/api/audit]
        STC[StatisticsController\n/api/statistics]
    end

    AS --> AC
    SS --> AC
    ELS --> EC
    VS --> VC
    CS --> CC
    US --> UC
    AUS --> AUC
    STS --> STC
```

## Gestión de Errores End-to-End

```mermaid
sequenceDiagram
    participant COMP as Componente Angular
    participant SVC as Service Angular
    participant INTER as errorInterceptor
    participant API as Backend Spring Boot

    COMP->>SVC: Llama método del servicio
    SVC->>API: HTTP Request
    API-->>SVC: 422 Unprocessable Entity
    Note over API: { success: false, errors: {...} }
    SVC-->>INTER: Error propagado
    INTER->>INTER: Identifica tipo de error
    INTER->>COMP: Muestra DialogService.showError(msg)
    COMP->>COMP: Maneja error localmente si necesario
```

## Estrategia de Caché

El sistema implementa dos niveles de caché:

### Caché en Backend (Redis)

- **Elecciones activas**- TTL: 10 minutos
- **Lista completa de elecciones**- TTL: 10 minutos
- Invalidación automática al cambiar el estado de una elección

### Caché en Frontend (Signals)

No hay caché explícito en el frontend. Los datos se re-fetchen en cada navegación entre componentes para garantizar datos actualizados.

## Flujo de Datos por Feature

### Flujo de Votación

```mermaid
sequenceDiagram
    actor V as Votante
    participant FE as Angular Frontend
    participant BE as Spring Boot Backend
    participant DB as PostgreSQL

    V->>FE: Navega a /voting
    FE->>BE: GET /api/elections/active
    BE->>DB: SELECT elections WHERE status='ACTIVE'
    DB-->>BE: Lista de elecciones
    BE-->>FE: ApiResponse<Election[]>
    FE-->>V: Muestra lista de elecciones

    V->>FE: Selecciona elección y candidato
    FE->>V: Muestra confirmación modal
    V->>FE: Confirma voto

    FE->>BE: POST /api/votes { electionId, candidateId }
    BE->>DB: INSERT INTO votes + UPDATE candidates.vote_count
    BE->>DB: INSERT INTO audit_logs
    DB-->>BE: OK
    BE-->>FE: ApiResponse<VoteResponse> { voteHash, ... }
    FE-->>V: Navega a /voting/confirmation con recibo
```

### Flujo de Gestión de Elección

```mermaid
sequenceDiagram
    actor A as Administrador
    participant FE as Angular Frontend
    participant BE as Spring Boot Backend
    participant CACHE as Redis

    A->>FE: Crea nueva elección
    FE->>BE: POST /api/elections
    BE->>BE: Valida datos
    BE->>DB: INSERT INTO elections
    BE->>CACHE: Invalida caché de elecciones
    BE-->>FE: ApiResponse<Election>
    FE-->>A: Muestra confirmación

    A->>FE: Inicia la elección
    FE->>BE: POST /api/elections/{id}/start
    BE->>DB: UPDATE elections SET status='ACTIVE'
    BE->>CACHE: Invalida caché
    BE-->>FE: ApiResponse<Election>
    FE-->>A: Actualiza UI con nuevo estado
```

## Seguridad en la Integración

### CORS

El backend configura CORS para permitir requests desde el frontend:

```yaml
cors:
  allowed-origins:
    - "http://localhost:4200"    # Desarrollo local
    - "https://app.mivoto.pe"   # Producción
  allowed-methods: [GET, POST, PUT, DELETE, OPTIONS]
  allowed-headers: ["Authorization", "Content-Type"]
  allow-credentials: true
```

### Preflight Requests

Angular envía automáticamente requests OPTIONS antes de requests con Authorization header. Spring Security está configurado para responder correctamente a estos preflight requests.

### Token Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NoAuth: App inicia
    NoAuth --> Authenticated: Login exitoso
    Authenticated --> Authenticated: Token válido (< 8h)
    Authenticated --> Refreshing: Token expirado, refresh disponible
    Refreshing --> Authenticated: Refresh exitoso
    Refreshing --> NoAuth: Refresh fallido
    Authenticated --> NoAuth: Logout
```
