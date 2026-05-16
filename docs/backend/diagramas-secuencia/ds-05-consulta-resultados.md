---
id: ds-05-consulta-resultados
title: DS-05 - Consulta de Resultados
sidebar_label: DS-05 Consulta de Resultados
---

# DS-05: Consulta de Resultados

Flujo de consulta de resultados electorales para roles ADMIN y SUPERVISOR. Implementa una estrategia cache-first con Redis (TTL de 5 minutos para elecciones activas, 24 horas para cerradas). Cuando no hay cache, obtiene los candidatos via `CandidateSearchTree.inOrderTraversal()` y calcula porcentajes y ganador.

## Diagrama de Secuencia (PlantUML)

```plantuml
@startuml
autonumber
actor "Administrador" as admin
participant "Controller\nElectionController" as controller
participant "Service\nElectionService" as service
participant "Repository\nElectionRepository" as electionRepo
participant "Repository\nCandidateRepository" as candidateRepo
participant "DataStructure\nCandidateSearchTree" as bst
participant "Service\nResultCalculator" as calculator
participant "Audit\nAuditService" as audit
participant "Cache\nRedis" as redis
database "PostgreSQL" as db

== Consulta de Resultados ==
admin -> controller: GET /api/elections/{id}/results
activate controller

controller -> controller: validateJwtToken()
controller -> controller: checkPermissions()
note right: Requiere rol\nADMIN o SUPERVISOR

alt Sin permisos
    controller --> admin: 403 Forbidden
else Con permisos
    controller -> service: getElectionResults(electionId)
    activate service

    == Verificar Cache ==
    service -> redis: get("results:" + electionId)
    activate redis

    alt Resultados en cache
        redis --> service: cachedResults
        deactivate redis
        service --> controller: ElectionResultsResponse
        controller --> admin: 200 OK (from cache)
    else No hay cache
        redis --> service: null
        deactivate redis

        == Obtener Eleccion ==
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
            == Obtener Candidatos ==
            service -> bst: findByElection(electionId)
            activate bst
            bst -> bst: inOrderTraversal()
            note right: Recorrido in-order\ndel BST O(n)
            bst --> service: List<Candidate>
            deactivate bst

            == Calcular Resultados ==
            service -> calculator: calculateResults(election, candidates)
            activate calculator

            loop Para cada candidato
                calculator -> candidateRepo: getVoteCount(candidateId)
                activate candidateRepo
                candidateRepo -> db: SELECT vote_count FROM candidates\nWHERE id = ?
                db --> candidateRepo: voteCount
                candidateRepo --> calculator: long
                deactivate candidateRepo

                calculator -> calculator: calculatePercentage(voteCount, totalVotes)
            end

            calculator -> calculator: sortByVoteCount(results)
            calculator -> calculator: determineWinner()
            calculator -> calculator: calculateParticipation()

            calculator --> service: ElectionResults
            deactivate calculator

            == Guardar en Cache ==
            service -> redis: set("results:" + electionId, results, TTL=5min)
            activate redis
            note right: Cache con TTL\npara elecciones activas
            redis --> service: OK
            deactivate redis

            == Auditoria ==
            service -> audit: logResultsQuery(electionId, userId)
            activate audit
            audit -> db: INSERT INTO audit_logs\n(action='RESULTS_QUERY')
            db --> audit: OK
            audit --> service: void
            deactivate audit

            service --> controller: ElectionResultsResponse
        end
    end
end

controller --> admin: 200 OK\n{results, winner, statistics}
deactivate service
deactivate controller

@enduml
```

## Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin/Supervisor
    participant CTRL as ElectionController
    participant SVC as ElectionService
    participant REDIS as Redis
    participant EREPO as ElectionRepository
    participant BST as CandidateSearchTree
    participant CALC as ResultCalculator
    participant CREPO as CandidateRepository
    participant AUDIT as AuditService
    participant DB as PostgreSQL

    A->>CTRL: GET /api/elections/{id}/results
    CTRL->>CTRL: validateJwtToken() + checkPermissions()

    alt Sin permisos (no es ADMIN ni SUPERVISOR)
        CTRL-->>A: 403 Forbidden
    else Con permisos
        CTRL->>SVC: getElectionResults(electionId)
        SVC->>REDIS: get("results:{electionId}")

        alt Resultados en cache
            REDIS-->>SVC: cachedResults
            SVC-->>CTRL: ElectionResultsResponse
            CTRL-->>A: 200 OK (desde cache)
        else Sin cache
            REDIS-->>SVC: null
            SVC->>EREPO: findById(electionId)
            EREPO->>DB: SELECT * FROM elections WHERE id=?
            DB-->>EREPO: Election entity
            EREPO-->>SVC: Optional<Election>

            SVC->>BST: findByElection(electionId)
            BST->>BST: inOrderTraversal()
            Note over BST: Recorrido in-order - O(n)
            BST-->>SVC: List<Candidate>

            SVC->>CALC: calculateResults(election, candidates)
            loop Para cada candidato
                CALC->>CREPO: getVoteCount(candidateId)
                CREPO->>DB: SELECT vote_count FROM candidates WHERE id=?
                DB-->>CREPO: voteCount
                CREPO-->>CALC: long
                CALC->>CALC: calculatePercentage()
            end
            CALC->>CALC: sortByVoteCount() + determineWinner() + calculateParticipation()
            CALC-->>SVC: ElectionResults

            SVC->>REDIS: set("results:{electionId}", results, TTL=5min)
            REDIS-->>SVC: OK
            SVC->>AUDIT: logResultsQuery(electionId, userId)
            AUDIT->>DB: INSERT INTO audit_logs (action='RESULTS_QUERY')

            SVC-->>CTRL: ElectionResultsResponse
            CTRL-->>A: 200 OK {results, winner, statistics}
        end
    end
```

---

## Actores y Componentes

| Componente | Responsabilidad |
|---|---|
| ElectionController | Verifica JWT y permisos ADMIN/SUPERVISOR |
| ElectionService | Orquesta la consulta con estrategia cache-first |
| Redis | Cache de resultados con TTL variable |
| ElectionRepository | Obtiene datos de la eleccion |
| CandidateSearchTree | Proporciona candidatos via inOrderTraversal() |
| ResultCalculator | Calcula porcentajes, ganador y tasa de participacion |
| CandidateRepository | Obtiene el conteo de votos por candidato |
| AuditService | Registra todas las consultas de resultados |

## Pasos del Flujo

1. El admin/supervisor consulta `GET /api/elections/{id}/results`
2. El controller valida el JWT y verifica que el rol sea ADMIN o SUPERVISOR
3. El servicio consulta Redis con la clave `results:{electionId}`
4. Si hay cache, se retorna directamente (respuesta rapida)
5. Si no hay cache, se busca la eleccion en PostgreSQL
6. Se obtienen los candidatos via `CandidateSearchTree.inOrderTraversal()` - O(n)
7. Para cada candidato, se obtiene su `vote_count` de la base de datos
8. Se calculan los porcentajes: `(voteCount / totalVotes) * 100`
9. Se ordenan los resultados por votos de forma descendente
10. Se determina el ganador (candidato con mas votos)
11. Se calcula la tasa de participacion: `(totalVotes / eligibleVoters) * 100`
12. Se guardan los resultados en Redis con TTL segun el estado de la eleccion
13. Se registra la consulta en `audit_logs`
14. Se retornan los resultados completos

## Estructura de Datos: CandidateSearchTree

```
           [Candidato C]
          /             \
    [Candidato A]    [Candidato E]
         \               /
      [Candidato B] [Candidato D]
```

- **Operacion**: `inOrderTraversal()` - O(n), retorna candidatos en orden
- El BST permite busqueda individual en O(log n) para candidatos especificos

## Estrategia de Cache

| Tipo de eleccion | TTL | Clave Redis |
|---|---|---|
| Activa | 5 minutos | `results:{electionId}` |
| Cerrada | 24 horas | `results:{electionId}` |
| Estadisticas sistema | 10 minutos | `stats:system` |

La cache se invalida automaticamente cuando se registra un nuevo voto en la eleccion.

## Metricas Calculadas

```
percentage = (voteCount / totalVotes) * 100
participationRate = (totalVotes / eligibleVoters) * 100
winner = candidate with max(voteCount)
```

## Reglas de Negocio Aplicadas

| ID | Regla |
|---|---|
| RN-39 | Solo ADMIN y SUPERVISOR pueden consultar resultados |
| RN-40 | Los resultados se ordenan por cantidad de votos (descendente) |
| RN-41 | El ganador es el candidato con mas votos |
| RN-42 | Todas las consultas de resultados deben ser auditadas |
