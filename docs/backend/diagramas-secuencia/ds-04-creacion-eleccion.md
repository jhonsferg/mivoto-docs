---
id: ds-04-creacion-eleccion
title: DS-04 - Creacion de Eleccion
sidebar_label: DS-04 Creacion de Eleccion
---

# DS-04: Creacion de Eleccion

Flujo de creacion de una eleccion por un Administrador. Incluye validacion de fechas, verificacion de duplicados, persistencia en PostgreSQL, registro en el `ElectionGraph` para modelar jerarquias y auditoria.

## Diagrama de Secuencia (PlantUML)

```plantuml
@startuml
autonumber
actor "Administrador" as admin
participant "Controller\nElectionController" as controller
participant "Service\nElectionService" as service
participant "Repository\nElectionRepository" as repo
participant "DataStructure\nElectionGraph" as graph
participant "Validator\nElectionValidator" as validator
participant "Audit\nAuditService" as audit
database "PostgreSQL" as db

== Creacion de Eleccion ==
admin -> controller: POST /api/elections\n{name, type, dates, ...}
activate controller

controller -> controller: validateJwtToken()
controller -> controller: checkAdminRole()

alt No es ADMIN
    controller --> admin: 403 Forbidden
else Es ADMIN
    controller -> service: createElection(CreateElectionRequest)
    activate service

    == Validaciones ==
    service -> validator: validateDates(startDate, endDate)
    activate validator
    validator -> validator: checkStartDateFuture()
    validator -> validator: checkEndDateAfterStart()

    alt Fechas invalidas
        validator --> service: throw InvalidDateException
        service --> controller: ValidationException
        controller --> admin: 400 Bad Request
    else Fechas validas
        validator --> service: void
        deactivate validator

        service -> repo: existsByNameAndDates(name, dates)
        activate repo
        repo -> db: SELECT COUNT(*) FROM elections\nWHERE name = ? AND ...
        db --> repo: count
        repo --> service: boolean
        deactivate repo

        alt Eleccion duplicada
            service --> controller: throw DuplicateElectionException
            controller --> admin: 409 Conflict
        else No existe duplicado
            == Creacion de Entidad ==
            service -> service: buildElection(request)
            note right: Status = SCHEDULED\nTotalVotes = 0

            service -> repo: save(election)
            activate repo
            repo -> db: INSERT INTO elections VALUES (...)
            db --> repo: Election entity
            repo --> service: Election
            deactivate repo

            == Registro en Grafo ==
            service -> graph: addVertex(election)
            activate graph
            graph -> graph: createNode(electionId)

            alt Tiene eleccion padre
                service -> graph: addEdge(parentId, electionId)
                graph -> graph: createEdge(parent, child)
                note right: Jerarquia de elecciones\nEj: Nacional -> Regional
            end

            graph --> service: void
            deactivate graph

            == Auditoria ==
            service -> audit: logElectionCreated(election)
            activate audit
            audit -> db: INSERT INTO audit_logs\n(action='ELECTION_CREATED')
            db --> audit: OK
            audit --> service: void
            deactivate audit

            service --> controller: ElectionResponse
        end
    end
end

controller --> admin: 201 Created\n{id, name, status, dates}
deactivate service
deactivate controller

@enduml
```

## Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador
    participant CTRL as ElectionController
    participant SVC as ElectionService
    participant REPO as ElectionRepository
    participant GRAPH as ElectionGraph
    participant VAL as ElectionValidator
    participant AUDIT as AuditService
    participant DB as PostgreSQL

    A->>CTRL: POST /api/elections {name, type, dates}
    CTRL->>CTRL: validateJwtToken() + checkAdminRole()

    alt No es ADMIN
        CTRL-->>A: 403 Forbidden
    else Es ADMIN
        CTRL->>SVC: createElection(CreateElectionRequest)
        SVC->>VAL: validateDates(startDate, endDate)
        VAL->>VAL: checkStartDateFuture()
        VAL->>VAL: checkEndDateAfterStart()

        alt Fechas invalidas
            VAL-->>SVC: throw InvalidDateException
            SVC-->>CTRL: ValidationException
            CTRL-->>A: 400 Bad Request
        else Fechas validas
            SVC->>REPO: existsByNameAndDates(name, dates)
            REPO->>DB: SELECT COUNT(*) FROM elections WHERE name=? AND...
            DB-->>REPO: count
            REPO-->>SVC: boolean

            alt Eleccion duplicada
                SVC-->>CTRL: throw DuplicateElectionException
                CTRL-->>A: 409 Conflict
            else No existe duplicado
                SVC->>REPO: save(election)
                REPO->>DB: INSERT INTO elections VALUES (...)
                DB-->>REPO: Election entity
                REPO-->>SVC: Election

                SVC->>GRAPH: addVertex(election)
                Note over GRAPH: createNode(electionId) - O(1)
                SVC->>GRAPH: addEdge(parentId, electionId)
                Note over GRAPH: Solo si tiene eleccion padre

                SVC->>AUDIT: logElectionCreated(election)
                AUDIT->>DB: INSERT INTO audit_logs (action='ELECTION_CREATED')
                DB-->>AUDIT: OK

                SVC-->>CTRL: ElectionResponse
                CTRL-->>A: 201 Created {id, name, status, dates}
            end
        end
    end
```

---

## Actores y Componentes

| Componente | Responsabilidad |
|---|---|
| ElectionController | Verifica JWT y rol ADMIN antes de delegar |
| ElectionService | Orquesta validaciones, persistencia y grafo |
| ElectionRepository | Guarda la eleccion y verifica duplicados |
| ElectionGraph | Grafo dirigido para jerarquias de elecciones |
| ElectionValidator | Valida coherencia temporal de fechas |
| AuditService | Registra el evento de creacion |

## Pasos del Flujo

1. El administrador envia `POST /api/elections` con los datos de la eleccion
2. El controller valida el JWT y verifica el rol ADMIN
3. El validador comprueba que `startDate > NOW()` y `endDate > startDate`
4. Se verifica que no exista una eleccion con el mismo nombre en el mismo periodo
5. Se construye la entidad `Election` con estado inicial `SCHEDULED` y `totalVotes = 0`
6. Se persiste en PostgreSQL
7. Se registra un vertice en `ElectionGraph` para la nueva eleccion
8. Si la eleccion tiene una eleccion padre (jerarquia), se crea una arista dirigida `(parent -> child)`
9. Se registra el evento en `audit_logs`
10. Se retorna la eleccion creada con `201 Created`

## Estructura de Datos: ElectionGraph

El `ElectionGraph` es un grafo dirigido que modela jerarquias entre elecciones:

```
         [Eleccion Nacional]
                |
        +-------+-------+
        |               |
   [Regional A]    [Regional B]
        |               |
    +---+---+       +---+---+
    |       |       |       |
 [Local1][Local2][Local3][Local4]
```

| Operacion | Complejidad | Descripcion |
|---|---|---|
| `addVertex(election)` | O(1) | Agrega un nodo al grafo |
| `addEdge(parent, child)` | O(1) | Crea relacion jerarquica |
| `getChildren(electionId)` | O(V+E) | Obtiene elecciones hijas |

## Validaciones de Fechas

- `startDate` debe ser posterior a la fecha actual
- `endDate` debe ser posterior a `startDate`
- Duracion minima: 1 hora
- Duracion maxima: 30 dias
- No se permite solapamiento de fechas para el mismo tipo y distrito

## Reglas de Negocio Aplicadas

| ID | Regla |
|---|---|
| RN-24 | La fecha de inicio debe ser posterior a la fecha actual |
| RN-25 | La fecha de fin debe ser posterior a la fecha de inicio |
| RN-26 | El nombre de la eleccion debe ser unico para el mismo periodo |
| RN-27 | Las elecciones se organizan en jerarquias mediante ElectionGraph |
