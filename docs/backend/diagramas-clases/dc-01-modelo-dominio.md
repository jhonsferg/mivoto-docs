---
id: dc-01-modelo-dominio
title: DC-01 - Modelo de Dominio
sidebar_label: DC-01 Modelo de Dominio
---

# DC-01: Modelo de Dominio

Diagrama de clases del modelo de dominio de MiVoto. Incluye las 7 entidades principales (`User`, `Election`, `Candidate`, `Vote`, `VoteRecord`, `VotingSession`, `District`, `AuditLog`), sus value objects y las 5 enumeraciones del sistema.

## Diagrama de Clases (PlantUML)

```plantuml
@startuml
skinparam classAttributeIconSize 0
skinparam linetype ortho

' Entidades Principales
class User <<entity>> {
  - id: Long
  - documentNumber: String
  - firstName: String
  - lastName: String
  - email: String
  - password: String
  - role: UserRole
  - active: Boolean
  - createdAt: LocalDateTime
  - lastLogin: LocalDateTime
  --
  + getFullName(): String
  + isAdmin(): Boolean
  + isVoter(): Boolean
}

class Election <<entity>> {
  - id: Long
  - name: String
  - description: String
  - type: ElectionType
  - status: ElectionStatus
  - startDate: LocalDateTime
  - endDate: LocalDateTime
  - totalVotes: Long
  - districtId: Long
  - createdAt: LocalDateTime
  --
  + isActive(): Boolean
  + canAcceptVotes(): Boolean
  + incrementVoteCount(): void
}

class Candidate <<entity>> {
  - id: Long
  - documentNumber: String
  - firstName: String
  - lastName: String
  - politicalParty: String
  - photoUrl: String
  - biography: String
  - proposals: String
  - voteCount: Long
  - active: Boolean
  - electionId: Long
  --
  + getFullName(): String
  + incrementVoteCount(): void
}

class Vote <<entity>> {
  - id: Long
  - userId: Long
  - electionId: Long
  - candidateId: Long
  - voteHash: String
  - timestamp: LocalDateTime
  - ipAddress: String
  --
  + generateHash(): String
  + verify(): Boolean
}

class VoteRecord <<value object>> {
  - voteId: Long
  - voteHash: String
  - electionId: Long
  - timestamp: LocalDateTime
  - verified: Boolean
  --
  + toDto(): VoteRecordDto
}

class VotingSession <<entity>> {
  - id: Long
  - userId: Long
  - electionId: Long
  - startTime: LocalDateTime
  - endTime: LocalDateTime
  - ipAddress: String
  - userAgent: String
  --
  + isActive(): Boolean
  + getDuration(): Duration
}

class District <<entity>> {
  - id: Long
  - name: String
  - code: String
  - level: DistrictLevel
  - parentDistrictId: Long
  - population: Long
  --
  + getEligibleVoters(): Long
}

class AuditLog <<entity>> {
  - id: Long
  - userId: Long
  - action: AuditAction
  - entityType: String
  - entityId: Long
  - details: String
  - ipAddress: String
  - timestamp: LocalDateTime
  --
  + toJson(): String
}

' Enumeraciones
enum UserRole {
  VOTER
  ADMIN
  SUPERVISOR
}

enum ElectionType {
  PRESIDENTIAL
  CONGRESSIONAL
  REGIONAL
  LOCAL
}

enum ElectionStatus {
  SCHEDULED
  ACTIVE
  CLOSED
  CANCELLED
}

enum DistrictLevel {
  NATIONAL
  REGIONAL
  PROVINCIAL
  DISTRICT
}

enum AuditAction {
  LOGIN
  LOGOUT
  VOTE_CAST
  VOTE_VERIFIED
  ELECTION_CREATED
  CANDIDATE_REGISTERED
}

' Relaciones
User "1" -- "0..*" Vote : emite >
User "1" -- "0..*" VotingSession : tiene >
User "1" -- "0..*" AuditLog : genera >

Election "1" -- "0..*" Candidate : contiene >
Election "1" -- "0..*" Vote : recibe >
Election "1" -- "0..*" VotingSession : permite >
Election "*" -- "0..1" District : se realiza en >

Candidate "1" -- "0..*" Vote : recibe >

Vote "1" -- "1" VoteRecord : genera >

District "1" -- "0..*" District : contiene >

' Composiciones
User *-- UserRole
Election *-- ElectionType
Election *-- ElectionStatus
District *-- DistrictLevel
AuditLog *-- AuditAction

note right of Vote
  El voto es anonimo:
  No se almacena relacion
  directa user-candidate.
  Solo se usa para validacion.
end note

note right of VoteRecord
  Value Object inmutable
  para verificacion publica
  sin revelar identidad.
end note

@enduml
```

## Diagrama de Clases (Mermaid)

```mermaid
classDiagram
    class User {
        -Long id
        -String documentNumber
        -String firstName
        -String lastName
        -String email
        -String password
        -UserRole role
        -Boolean active
        -LocalDateTime createdAt
        -LocalDateTime lastLogin
        +getFullName() String
        +isAdmin() Boolean
        +isVoter() Boolean
    }

    class Election {
        -Long id
        -String name
        -String description
        -ElectionType type
        -ElectionStatus status
        -LocalDateTime startDate
        -LocalDateTime endDate
        -Long totalVotes
        -Long districtId
        +isActive() Boolean
        +canAcceptVotes() Boolean
        +incrementVoteCount() void
    }

    class Candidate {
        -Long id
        -String documentNumber
        -String firstName
        -String lastName
        -String politicalParty
        -String photoUrl
        -Long voteCount
        -Boolean active
        -Long electionId
        +getFullName() String
        +incrementVoteCount() void
    }

    class Vote {
        -Long id
        -Long userId
        -Long electionId
        -Long candidateId
        -String voteHash
        -LocalDateTime timestamp
        -String ipAddress
        +generateHash() String
        +verify() Boolean
    }

    class VoteRecord {
        -Long voteId
        -String voteHash
        -Long electionId
        -LocalDateTime timestamp
        -Boolean verified
        +toDto() VoteRecordDto
    }

    class VotingSession {
        -Long id
        -Long userId
        -Long electionId
        -LocalDateTime startTime
        -LocalDateTime endTime
        -String ipAddress
        -String userAgent
        +isActive() Boolean
        +getDuration() Duration
    }

    class District {
        -Long id
        -String name
        -String code
        -DistrictLevel level
        -Long parentDistrictId
        -Long population
        +getEligibleVoters() Long
    }

    class AuditLog {
        -Long id
        -Long userId
        -AuditAction action
        -String entityType
        -Long entityId
        -String details
        -LocalDateTime timestamp
        +toJson() String
    }

    class UserRole {
        <<enumeration>>
        VOTER
        ADMIN
        SUPERVISOR
    }

    class ElectionStatus {
        <<enumeration>>
        SCHEDULED
        ACTIVE
        CLOSED
        CANCELLED
    }

    class ElectionType {
        <<enumeration>>
        PRESIDENTIAL
        CONGRESSIONAL
        REGIONAL
        LOCAL
    }

    class AuditAction {
        <<enumeration>>
        LOGIN
        LOGOUT
        VOTE_CAST
        VOTE_VERIFIED
        ELECTION_CREATED
        CANDIDATE_REGISTERED
    }

    User "1" --> "0..*" Vote : emite
    User "1" --> "0..*" VotingSession : tiene
    User "1" --> "0..*" AuditLog : genera
    Election "1" --> "0..*" Candidate : contiene
    Election "1" --> "0..*" Vote : recibe
    Election "*" --> "0..1" District : se realiza en
    Candidate "1" --> "0..*" Vote : recibe
    Vote "1" --> "1" VoteRecord : genera
    District "1" --> "0..*" District : contiene

    User ..> UserRole
    Election ..> ElectionStatus
    Election ..> ElectionType
    AuditLog ..> AuditAction
```

---

## Entidades Principales

### User - Usuario

Representa a los usuarios del sistema con sus credenciales y rol asignado.

| Campo | Tipo | Descripcion |
|---|---|---|
| documentNumber | String | DNI o documento de identidad unico |
| role | UserRole | VOTER, ADMIN o SUPERVISOR |
| active | Boolean | Controla el acceso al sistema |
| lastLogin | LocalDateTime | Timestamp del ultimo acceso |

### Election - Eleccion

Representa un proceso electoral con su ciclo de vida completo.

| Estado | Descripcion |
|---|---|
| SCHEDULED | Creada, pendiente de inicio |
| ACTIVE | En curso, acepta votos |
| CLOSED | Finalizada, resultados disponibles |
| CANCELLED | Cancelada por el administrador |

### Candidate - Candidato

Candidato registrado en una eleccion especifica. Mantiene un contador de votos que se incrementa atomicamente.

### Vote - Voto

Registro del acto de votacion. El campo `voteHash` (SHA-256) permite verificacion posterior sin revelar la identidad del votante. El campo `candidateId` solo se usa para conteos, no para rastrear quien voto por quien desde el exterior.

### VoteRecord - Registro de Voto

Value Object inmutable que encapsula los datos minimos necesarios para la verificacion publica de un voto. Se almacena en `VoteRecordList` (lista enlazada en memoria).

### VotingSession - Sesion de Votacion

Rastrea las sesiones activas de votacion para deteccion de anomalias y auditoria de acceso.

### District - Distrito

Organizacion territorial jerarquica con auto-referencia (un distrito puede contener sub-distritos). Los niveles van de NATIONAL a DISTRICT.

### AuditLog - Registro de Auditoria

Registro inmutable de todas las acciones criticas del sistema. No se modifica ni elimina una vez creado.

## Enumeraciones

| Enum | Valores |
|---|---|
| UserRole | VOTER, ADMIN, SUPERVISOR |
| ElectionType | PRESIDENTIAL, CONGRESSIONAL, REGIONAL, LOCAL |
| ElectionStatus | SCHEDULED, ACTIVE, CLOSED, CANCELLED |
| DistrictLevel | NATIONAL, REGIONAL, PROVINCIAL, DISTRICT |
| AuditAction | LOGIN, LOGOUT, VOTE_CAST, VOTE_VERIFIED, ELECTION_CREATED, CANDIDATE_REGISTERED |

## Reglas de Integridad

1. **Unicidad de voto**: Un usuario solo puede votar una vez por eleccion (restriccion UNIQUE en BD)
2. **Anonimato**: No se almacena relacion directa usuario-candidato accesible desde el exterior
3. **Inmutabilidad**: Los votos no pueden modificarse una vez emitidos
4. **Verificabilidad**: Todo voto genera un hash unico para verificacion publica
5. **Auditoria**: Todas las acciones criticas se registran en `AuditLog`
