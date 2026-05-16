---
id: api-reference
title: API Reference
sidebar_label: API Reference
---

# API Reference

La API de MiVoto sigue los principios REST. Todas las respuestas tienen el formato estándar:

```json
{
  "success": true,
  "message": "Operación exitosa",
  "data": { ... },
  "errors": null
}
```

**URL base:** `http://localhost:8080/api`  
**Documentación Swagger:** `http://localhost:8080/swagger-ui/index.html`  
**OpenAPI Spec:** `http://localhost:8080/v3/api-docs`

**Rate Limiting:**
- Rutas autenticadas: 100 req/min
- Rutas públicas: 50 req/min

---

## Autenticación (`/api/auth`)

> Los endpoints de autenticación no requieren token, excepto los marcados con.

### POST `/api/auth/login`

Autentica un usuario y devuelve tokens JWT.

**Request:**
```json
{
  "username": "12345678",
  "password": "secreto123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
    "user": {
      "id": 1,
      "documentNumber": "12345678",
      "firstName": "Juan",
      "lastName": "Pérez",
      "email": "juan@example.com",
      "role": "VOTER"
    }
  }
}
```

---

### POST `/api/auth/logout`

Invalida la sesión actual.

**Headers:** `Authorization: Bearer {token}`

**Response 200:** `{ "success": true, "message": "Sesión cerrada" }`

---

### POST `/api/auth/refresh`

Renueva el access token usando el refresh token.

**Request:**
```json
{ "refreshToken": "eyJhbGciOiJIUzI1NiJ9..." }
```

**Response 200:**
```json
{
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiJ9..."
  }
}
```

---

### POST `/api/auth/change-password`

Cambia la contraseña del usuario autenticado.

**Request:**
```json
{
  "currentPassword": "actual123",
  "newPassword": "nueva456"
}
```

---

### GET `/api/auth/me`

Devuelve el perfil del usuario autenticado.

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "documentNumber": "12345678",
    "firstName": "Juan",
    "email": "juan@example.com",
    "role": "VOTER"
  }
}
```

---

## Elecciones (`/api/elections`)

### GET `/api/elections`

Lista todas las elecciones (público).

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "title": "Elección Municipal 2025",
      "status": "ACTIVE",
      "startDate": "2025-11-01T08:00:00",
      "endDate": "2025-11-01T18:00:00"
    }
  ]
}
```

---

### GET `/api/elections/active`

Lista elecciones en estado `ACTIVE` (público).

---

### GET `/api/elections/{id}`

Detalle de una elección específica (público).

**Path param:** `id`- ID de la elección

---

### POST `/api/elections` `ADMIN`

Crea una nueva elección.

**Request:**
```json
{
  "title": "Elección Municipal 2025",
  "description": "Elección para alcalde municipal",
  "startDate": "2025-11-01T08:00:00",
  "endDate": "2025-11-01T18:00:00",
  "allowsBlankVote": false,
  "requiresVerification": true
}
```

---

### PUT `/api/elections/{id}` `ADMIN`

Actualiza una elección en estado `DRAFT` o `SCHEDULED`.

---

### POST `/api/elections/{id}/schedule` `ADMIN`

Cambia el estado de `DRAFT` a `SCHEDULED`.

---

### POST `/api/elections/{id}/start` `ADMIN`

Cambia el estado de `SCHEDULED` a `ACTIVE`.

---

### POST `/api/elections/{id}/close` `ADMIN`

Cierra una elección activa (`ACTIVE` → `CLOSED`).

---

### POST `/api/elections/{id}/cancel` `ADMIN`

Cancela una elección en cualquier estado previo a `CLOSED`.

---

### GET `/api/elections/{id}/results` `ADMIN, SUPERVISOR`

Resultados completos de una elección cerrada.

**Response 200:**
```json
{
  "data": {
    "electionId": 1,
    "title": "Elección Municipal 2025",
    "totalVotes": 1500,
    "candidates": [
      {
        "candidateId": 1,
        "name": "María García",
        "party": "Partido A",
        "voteCount": 800,
        "percentage": 53.33
      }
    ],
    "winner": { "candidateId": 1, "name": "María García" }
  }
}
```

---

### GET `/api/elections/{id}/statistics` `ADMIN, SUPERVISOR`

Estadísticas detalladas de una elección.

---

### GET `/api/elections/status/{status}`

Filtra elecciones por estado (público). Valores: `DRAFT`, `SCHEDULED`, `ACTIVE`, `CLOSED`, `CANCELLED`.

---

## Candidatos (`/api/candidates`)

### POST `/api/candidates` `ADMIN`

Registra un candidato en una elección.

**Request:**
```json
{
  "electionId": 1,
  "number": 1,
  "name": "María García",
  "party": "Partido A",
  "description": "Candidata con 10 años de experiencia",
  "photoUrl": "https://storage.mivoto.pe/foto1.jpg"
}
```

---

### GET `/api/candidates/{id}`

Detalle de un candidato (público).

---

### GET `/api/candidates/election/{electionId}`

Lista todos los candidatos de una elección (público).

---

### GET `/api/candidates/election/{electionId}/active`

Lista candidatos activos de una elección (público).

---

### GET `/api/candidates/election/{electionId}/number/{number}`

Busca un candidato por número de lista (público).

---

### PUT `/api/candidates/{id}` `ADMIN`

Actualiza datos de un candidato.

---

### DELETE `/api/candidates/{id}` `ADMIN`

Elimina un candidato.

---

### POST `/api/candidates/{id}/activate` `ADMIN`

Activa un candidato desactivado.

---

### POST `/api/candidates/{id}/deactivate` `ADMIN`

Desactiva un candidato.

---

## Votos (`/api/votes`)

### POST `/api/votes` `VOTER, ADMIN`

Emite un voto en una elección activa.

**Request:**
```json
{
  "electionId": 1,
  "candidateId": 2
}
```

**Response 201:**
```json
{
  "data": {
    "voteId": 42,
    "voteHash": "a3f4b2c1...",
    "electionId": 1,
    "candidateName": "María García",
    "votedAt": "2025-11-01T10:30:00",
    "verificationCode": "VER-2025-001"
  }
}
```

**Errores posibles:**
- `409 Conflict`- El usuario ya votó en esta elección
- `400 Bad Request`- Elección no activa o candidato no válido

---

### GET `/api/votes/verify/{voteHash}`

Verifica la integridad de un voto por su hash (público).

**Path param:** `voteHash`- Hash SHA-256 del voto

**Response 200:**
```json
{
  "data": {
    "valid": true,
    "voteHash": "a3f4b2c1...",
    "electionTitle": "Elección Municipal 2025",
    "votedAt": "2025-11-01T10:30:00",
    "verified": true
  }
}
```

---

### GET `/api/votes/history` `VOTER, ADMIN`

Historial de votos del usuario autenticado.

---

### GET `/api/votes/status/{electionId}` `VOTER, ADMIN`

Verifica si el usuario ya votó en una elección específica.

**Response 200:**
```json
{ "data": { "hasVoted": true, "votedAt": "2025-11-01T10:30:00" } }
```

---

### GET `/api/votes/election/{electionId}/count` `ADMIN, SUPERVISOR`

Conteo de votos de una elección.

---

## Auditoría (`/api/audit`) `ADMIN, SUPERVISOR`

Todos los endpoints de auditoría requieren rol `ADMIN` o `SUPERVISOR`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/audit` | Todos los registros de auditoría |
| GET | `/api/audit/user/{userId}` | Registros por usuario |
| GET | `/api/audit/entity/{entity}/{entityId}` | Registros por entidad |
| GET | `/api/audit/action/{action}` | Registros por tipo de acción |
| GET | `/api/audit/date-range` | Registros por rango de fechas |
| GET | `/api/audit/critical` | Solo registros críticos |
| GET | `/api/audit/security` | Registros de seguridad (login/logout) |
| GET | `/api/audit/voting` | Registros de votación |
| GET | `/api/audit/report` | Reporte completo de auditoría |

**Parámetros de `/api/audit/date-range`:**
- `startDate`: ISO 8601 (ej. `2025-11-01T00:00:00`)
- `endDate`: ISO 8601

---

## Estadísticas (`/api/statistics`) `ADMIN, SUPERVISOR`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/statistics/system` | Estadísticas globales del sistema |
| GET | `/api/statistics/election/{id}` | Estadísticas de una elección |
| GET | `/api/statistics/election/{id}/candidates` | Estadísticas por candidato |
| GET | `/api/statistics/election/{id}/participation` | Participación por hora |

**Response de `/api/statistics/system`:**
```json
{
  "data": {
    "totalElections": 15,
    "activeElections": 2,
    "totalVotes": 45230,
    "totalCandidates": 87,
    "totalUsers": 12500,
    "dataStructureStats": {
      "voteQueueSize": 45,
      "voteRecordListSize": 45230,
      "candidateTreeSize": 87
    }
  }
}
```

---

## Salud (`/api/health`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | Público | Estado básico del sistema |
| GET | `/api/health/detailed` | Público | Estado con métricas de estructuras de datos |

**Response de `/api/health`:**
```json
{
  "status": "UP",
  "database": "UP",
  "redis": "UP",
  "timestamp": "2025-11-01T10:00:00"
}
```

## Usuarios (`/api/users`) `ADMIN`

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/users` | Lista todos los usuarios |
| GET | `/api/users/{id}` | Detalle de un usuario |
| POST | `/api/users` | Crea un usuario |
| PUT | `/api/users/{id}` | Actualiza un usuario |
| DELETE | `/api/users/{id}` | Elimina un usuario |
| POST | `/api/users/{id}/activate` | Activa un usuario |
| POST | `/api/users/{id}/deactivate` | Desactiva un usuario |

**Request de creación de usuario:**
```json
{
  "documentNumber": "87654321",
  "firstName": "Ana",
  "lastName": "López",
  "email": "ana@example.com",
  "password": "temporal123",
  "role": "VOTER"
}
```

## Códigos de Error

| Código HTTP | Descripción |
|---|---|
| `400 Bad Request` | Datos de entrada inválidos |
| `401 Unauthorized` | Token ausente o inválido |
| `403 Forbidden` | Sin permisos para la operación |
| `404 Not Found` | Recurso no encontrado |
| `409 Conflict` | Conflicto (ej. voto duplicado) |
| `422 Unprocessable Entity` | Validación de negocio fallida |
| `429 Too Many Requests` | Rate limit excedido |
| `500 Internal Server Error` | Error interno del servidor |
