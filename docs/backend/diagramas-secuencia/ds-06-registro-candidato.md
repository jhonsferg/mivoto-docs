---
id: ds-06-registro-candidato
title: DS-06 - Registro de Candidato
sidebar_label: DS-06 Registro de Candidato
---

# DS-06: Registro de Candidato

Flujo de registro de un candidato por un Administrador. Valida el estado de la eleccion, los datos del candidato, verifica duplicados por documento en la misma eleccion, persiste en PostgreSQL e inserta el candidato en `CandidateSearchTree` con complejidad O(log n).

## Diagrama de Secuencia (PlantUML)

```plantuml
@startuml
autonumber
actor "Administrador" as admin
participant "Controller\nCandidateController" as controller
participant "Service\nCandidateService" as service
participant "Repository\nCandidateRepository" as repo
participant "Repository\nElectionRepository" as electionRepo
participant "DataStructure\nCandidateSearchTree" as bst
participant "Validator\nCandidateValidator" as validator
participant "Audit\nAuditService" as audit
database "PostgreSQL" as db

== Registro de Candidato ==
admin -> controller: POST /api/candidates\n{electionId, documentNumber, ...}
activate controller

controller -> controller: validateJwtToken()
controller -> controller: checkAdminRole()

alt No es ADMIN
    controller --> admin: 403 Forbidden
else Es ADMIN
    controller -> service: registerCandidate(CreateCandidateRequest)
    activate service

    == Validar Eleccion ==
    service -> electionRepo: findById(electionId)
    activate electionRepo
    electionRepo -> db: SELECT * FROM elections WHERE id = ?
    db --> electionRepo: Election entity
    electionRepo --> service: Optional<Election>
    deactivate electionRepo

    alt Eleccion no encontrada
        service --> controller: throw ElectionNotFoundException
        controller --> admin: 404 Not Found
    else Eleccion encontrada
        service -> service: checkElectionStatus()

        alt Eleccion cerrada o cancelada
            service --> controller: throw InvalidElectionStateException
            controller --> admin: 400 Bad Request
        else Estado valido
            == Validar Candidato ==
            service -> validator: validateCandidateData(request)
            activate validator
            validator -> validator: validateDocumentNumber()
            validator -> validator: validateNames()
            validator --> service: void
            deactivate validator

            service -> repo: existsByDocumentAndElection(doc, electionId)
            activate repo
            repo -> db: SELECT COUNT(*) FROM candidates\nWHERE document = ? AND election_id = ?
            db --> repo: count
            repo --> service: boolean
            deactivate repo

            alt Candidato duplicado
                service --> controller: throw DuplicateCandidateException
                controller --> admin: 409 Conflict
            else No existe duplicado
                == Crear Candidato ==
                service -> service: buildCandidate(request)
                note right: active = true\nvoteCount = 0

                service -> repo: save(candidate)
                activate repo
                repo -> db: INSERT INTO candidates VALUES (...)
                db --> repo: Candidate entity
                repo --> service: Candidate
                deactivate repo

                == Insertar en BST ==
                service -> bst: insert(candidate)
                activate bst
                bst -> bst: findInsertPosition(candidateId)
                note right: Busqueda O(log n)\nen arbol balanceado
                bst -> bst: createNode(candidate)
                bst -> bst: insertNode(node)
                bst --> service: void
                deactivate bst

                == Auditoria ==
                service -> audit: logCandidateRegistered(candidate)
                activate audit
                audit -> db: INSERT INTO audit_logs\n(action='CANDIDATE_REGISTERED')
                db --> audit: OK
                audit --> service: void
                deactivate audit

                service --> controller: CandidateDto
            end
        end
    end
end

controller --> admin: 201 Created\n{id, fullName, electionName, active}
deactivate service
deactivate controller

@enduml
```

## Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor A as Administrador
    participant CTRL as CandidateController
    participant SVC as CandidateService
    participant EREPO as ElectionRepository
    participant VAL as CandidateValidator
    participant REPO as CandidateRepository
    participant BST as CandidateSearchTree
    participant AUDIT as AuditService
    participant DB as PostgreSQL

    A->>CTRL: POST /api/candidates {electionId, documentNumber, ...}
    CTRL->>CTRL: validateJwtToken() + checkAdminRole()

    alt No es ADMIN
        CTRL-->>A: 403 Forbidden
    else Es ADMIN
        CTRL->>SVC: registerCandidate(CreateCandidateRequest)
        SVC->>EREPO: findById(electionId)
        EREPO->>DB: SELECT * FROM elections WHERE id=?
        DB-->>EREPO: Election entity
        EREPO-->>SVC: Optional<Election>

        alt Eleccion no encontrada o en estado invalido
            SVC-->>CTRL: throw Exception
            CTRL-->>A: 400/404 Error
        else Eleccion aceptando candidatos
            SVC->>VAL: validateCandidateData(request)
            VAL->>VAL: validateDocumentNumber()
            VAL->>VAL: validateNames()
            VAL-->>SVC: void

            SVC->>REPO: existsByDocumentAndElection(doc, electionId)
            REPO->>DB: SELECT COUNT(*) FROM candidates WHERE document=? AND election_id=?
            DB-->>REPO: count
            REPO-->>SVC: boolean

            alt Candidato duplicado
                SVC-->>CTRL: throw DuplicateCandidateException
                CTRL-->>A: 409 Conflict
            else No existe duplicado
                SVC->>REPO: save(candidate)
                REPO->>DB: INSERT INTO candidates VALUES (...)
                DB-->>REPO: Candidate entity
                REPO-->>SVC: Candidate

                SVC->>BST: insert(candidate)
                Note over BST: findInsertPosition(id) - O(log n)
                BST-->>SVC: void

                SVC->>AUDIT: logCandidateRegistered(candidate)
                AUDIT->>DB: INSERT INTO audit_logs (action='CANDIDATE_REGISTERED')
                DB-->>AUDIT: OK

                SVC-->>CTRL: CandidateDto
                CTRL-->>A: 201 Created {id, fullName, electionName, active}
            end
        end
    end
```

---

## Actores y Componentes

| Componente | Responsabilidad |
|---|---|
| CandidateController | Verifica JWT y rol ADMIN |
| CandidateService | Orquesta validaciones y creacion del candidato |
| ElectionRepository | Verifica existencia y estado de la eleccion |
| CandidateValidator | Valida formato de documento y nombres |
| CandidateRepository | Guarda el candidato y verifica duplicados |
| CandidateSearchTree | BST donde se inserta el candidato para busqueda eficiente |
| AuditService | Registra el evento de registro |

## Pasos del Flujo

1. El administrador envia `POST /api/candidates` con los datos del candidato
2. El controller valida el JWT y verifica el rol ADMIN
3. Se verifica que la eleccion exista en PostgreSQL
4. Se verifica que la eleccion no este en estado `CLOSED` o `CANCELLED`
5. El validador comprueba el formato del numero de documento y los nombres
6. Se verifica que no exista otro candidato con el mismo documento en la misma eleccion
7. Se construye la entidad `Candidate` con `active = true` y `voteCount = 0`
8. Se persiste el candidato en PostgreSQL
9. Se inserta el candidato en `CandidateSearchTree` con operacion O(log n)
10. Se registra el evento en `audit_logs`
11. Se retorna el candidato creado con `201 Created`

## Estructura de Datos: CandidateSearchTree

Insercion de candidatos ordenados por ID:

```
Antes de insertar ID=4:    Despues de insertar ID=4:
        [5]                        [5]
       /   \                      /   \
     [3]   [7]                  [3]   [7]
                                   \
                                   [4]
```

| Operacion | Complejidad promedio | Complejidad peor caso |
|---|---|---|
| `insert(candidate)` | O(log n) | O(n) arbol degenerado |
| `findById(id)` | O(log n) | O(n) |
| `inOrderTraversal()` | O(n) | O(n) |
| `delete(id)` | O(log n) | O(n) |

## Validaciones Aplicadas

**Numero de documento:**
- Formato valido segun tipo (DNI, CE, etc.)
- Longitud correcta
- Solo digitos

**Nombres:**
- No vacios
- Longitud minima: 2 caracteres
- Solo letras y espacios

## Reglas de Negocio Aplicadas

| ID | Regla |
|---|---|
| RN-33 | Un candidato no puede estar registrado dos veces en la misma eleccion |
| RN-34 | Los candidatos se organizan en BST para busqueda eficiente O(log n) |
| RN-35 | No se pueden agregar candidatos a elecciones cerradas o canceladas |
| RN-36 | El numero de candidato debe ser unico por eleccion |
