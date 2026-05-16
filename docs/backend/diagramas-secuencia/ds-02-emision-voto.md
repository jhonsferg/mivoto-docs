---
id: ds-02-emision-voto
title: DS-02 - Emision de Voto
sidebar_label: DS-02 Emision de Voto
---

# DS-02: Emision de Voto

Flujo completo de emision de voto: validaciones de elegibilidad, generacion del hash SHA-256, insercion en las estructuras de datos personalizadas (`VoteQueue`, `VoteRecordList`), actualizacion de contadores y registro de auditoria.

## Diagrama de Secuencia (PlantUML)

```plantuml
@startuml
autonumber
actor "Votante" as voter
participant "Controller\nVoteController" as controller
participant "Service\nVoteService" as service
participant "Repository\nVoteRepository" as voteRepo
participant "Repository\nElectionRepository" as electionRepo
participant "Repository\nCandidateRepository" as candidateRepo
participant "DataStructure\nVoteQueue" as queue
participant "DataStructure\nVoteRecordList" as recordList
participant "Security\nHashGenerator" as hash
participant "Audit\nAuditService" as audit
database "PostgreSQL" as db
participant "Cache\nRedis" as redis

== Emision de Voto ==
voter -> controller: POST /api/votes\n{electionId, candidateId}
activate controller

controller -> controller: validateJwtToken()
controller -> controller: extractUserId()

controller -> service: castVote(userId, VoteRequest)
activate service

== Validaciones ==
service -> electionRepo: findById(electionId)
activate electionRepo
electionRepo -> db: SELECT * FROM elections WHERE id = ?
db --> electionRepo: Election entity
electionRepo --> service: Optional<Election>
deactivate electionRepo

alt Eleccion no encontrada
    service --> controller: throw ElectionNotFoundException
    controller --> voter: 404 Not Found
else Eleccion encontrada
    service -> service: validateElectionStatus()

    alt Eleccion no activa
        service --> controller: throw ElectionNotActiveException
        controller --> voter: 400 Bad Request
    else Eleccion activa
        service -> voteRepo: existsByUserIdAndElectionId(userId, electionId)
        activate voteRepo
        voteRepo -> db: SELECT COUNT(*) FROM votes WHERE...
        db --> voteRepo: count
        voteRepo --> service: boolean
        deactivate voteRepo

        alt Usuario ya voto
            service --> controller: throw DuplicateVoteException
            controller --> voter: 409 Conflict
        else Usuario no ha votado
            service -> candidateRepo: findById(candidateId)
            activate candidateRepo
            candidateRepo -> db: SELECT * FROM candidates WHERE id = ?
            db --> candidateRepo: Candidate entity
            candidateRepo --> service: Optional<Candidate>
            deactivate candidateRepo

            alt Candidato no encontrado
                service --> controller: throw CandidateNotFoundException
                controller --> voter: 404 Not Found
            else Candidato encontrado
                service -> service: validateCandidateBelongsToElection()

                alt Candidato no pertenece a eleccion
                    service --> controller: throw InvalidCandidateException
                    controller --> voter: 400 Bad Request
                else Validacion exitosa
                    == Registro de Voto ==
                    service -> service: createVote(userId, electionId, candidateId)

                    service -> hash: generateVoteHash(vote)
                    activate hash
                    hash -> hash: SHA256(voteId + timestamp + salt)
                    hash --> service: voteHash
                    deactivate hash

                    service -> voteRepo: save(vote)
                    activate voteRepo
                    voteRepo -> db: INSERT INTO votes VALUES (...)
                    db --> voteRepo: Vote entity
                    voteRepo --> service: Vote
                    deactivate voteRepo

                    == Estructuras de Datos ==
                    service -> queue: enqueue(vote)
                    activate queue
                    queue -> queue: addLast(vote)
                    queue --> service: void
                    deactivate queue

                    service -> recordList: addFirst(voteRecord)
                    activate recordList
                    recordList -> recordList: insertAtHead(voteRecord)
                    recordList --> service: void
                    deactivate recordList

                    == Actualizacion de Contadores ==
                    service -> candidateRepo: incrementVoteCount(candidateId)
                    activate candidateRepo
                    candidateRepo -> db: UPDATE candidates\nSET vote_count = vote_count + 1
                    db --> candidateRepo: OK
                    candidateRepo --> service: void
                    deactivate candidateRepo

                    service -> electionRepo: incrementVoteCount(electionId)
                    activate electionRepo
                    electionRepo -> db: UPDATE elections\nSET total_votes = total_votes + 1
                    db --> electionRepo: OK
                    electionRepo --> service: void
                    deactivate electionRepo

                    == Cache y Auditoria ==
                    service -> redis: set("vote:" + userId + ":" + electionId, true)
                    activate redis
                    redis --> service: OK
                    deactivate redis

                    service -> audit: logVoteCast(vote)
                    activate audit
                    audit -> db: INSERT INTO audit_logs
                    db --> audit: OK
                    audit --> service: void
                    deactivate audit

                    service --> controller: VoteResponse(voteHash, details)
                end
            end
        end
    end
end

controller --> voter: 201 Created\n{voteHash, timestamp, verificationUrl}
deactivate service
deactivate controller

@enduml
```

## Diagrama de Secuencia (Mermaid)

```mermaid
sequenceDiagram
    autonumber
    actor V as Votante
    participant CTRL as VoteController
    participant SVC as VoteService
    participant EREPO as ElectionRepository
    participant VREPO as VoteRepository
    participant CREPO as CandidateRepository
    participant HASH as HashGenerator
    participant QUEUE as VoteQueue
    participant LIST as VoteRecordList
    participant REDIS as Redis
    participant AUDIT as AuditService
    participant DB as PostgreSQL

    V->>CTRL: POST /api/votes {electionId, candidateId}
    CTRL->>SVC: castVote(userId, VoteRequest)

    SVC->>EREPO: findById(electionId)
    EREPO->>DB: SELECT * FROM elections WHERE id=?
    DB-->>EREPO: Election entity
    EREPO-->>SVC: Optional<Election>

    alt Eleccion no activa o no encontrada
        SVC-->>CTRL: throw Exception
        CTRL-->>V: 400/404 Error
    else Eleccion activa
        SVC->>VREPO: existsByUserIdAndElectionId(userId, electionId)
        VREPO->>DB: SELECT COUNT(*) FROM votes WHERE...
        DB-->>VREPO: count
        VREPO-->>SVC: boolean

        alt Usuario ya voto
            SVC-->>CTRL: throw DuplicateVoteException
            CTRL-->>V: 409 Conflict
        else Usuario no ha votado
            SVC->>CREPO: findById(candidateId)
            CREPO->>DB: SELECT * FROM candidates WHERE id=?
            DB-->>CREPO: Candidate entity
            CREPO-->>SVC: Optional<Candidate>

            SVC->>HASH: generateVoteHash(vote)
            HASH-->>SVC: SHA256(voteId+timestamp+salt)

            SVC->>VREPO: save(vote)
            VREPO->>DB: INSERT INTO votes VALUES (...)
            DB-->>VREPO: Vote entity

            SVC->>QUEUE: enqueue(vote)
            Note over QUEUE: addLast - O(1)
            SVC->>LIST: addFirst(voteRecord)
            Note over LIST: insertAtHead - O(1)

            SVC->>CREPO: incrementVoteCount(candidateId)
            SVC->>EREPO: incrementVoteCount(electionId)
            SVC->>REDIS: set("vote:{userId}:{electionId}", true)
            SVC->>AUDIT: logVoteCast(vote)
            AUDIT->>DB: INSERT INTO audit_logs

            SVC-->>CTRL: VoteResponse(voteHash, details)
            CTRL-->>V: 201 Created {voteHash, verificationUrl}
        end
    end
```

---

## Actores y Componentes

| Componente | Responsabilidad |
|---|---|
| VoteController | Recibe la peticion, valida el JWT, extrae el userId |
| VoteService | Orquesta todas las validaciones y el registro del voto |
| ElectionRepository | Verifica existencia y estado de la eleccion |
| VoteRepository | Guarda el voto y verifica duplicados |
| CandidateRepository | Valida candidato e incrementa contadores |
| HashGenerator | Genera el hash SHA-256 del voto |
| VoteQueue | Cola FIFO para procesamiento ordenado de votos |
| VoteRecordList | Lista enlazada para historial cronologico inverso |
| Redis | Marca que el usuario ya voto (previene duplicados rapidos) |
| AuditService | Registra el evento de voto |

## Pasos del Flujo

1. El votante envia `POST /api/votes` con `{ electionId, candidateId }`
2. El controller valida el JWT y extrae el `userId`
3. Se verifica que la eleccion exista y este en estado `ACTIVE`
4. Se verifica que el usuario no haya votado ya en esa eleccion (tabla `votes`)
5. Se verifica que el candidato exista y pertenezca a esa eleccion
6. Se crea el objeto `Vote` con timestamp e IP del cliente
7. Se genera el hash SHA-256: `SHA256(voteId + timestamp + salt)`
8. Se persiste el voto en PostgreSQL
9. Se encola el voto en `VoteQueue` - operacion O(1)
10. Se inserta el registro en `VoteRecordList` al inicio - operacion O(1)
11. Se incrementa `vote_count` del candidato y `total_votes` de la eleccion
12. Se marca en Redis: `vote:{userId}:{electionId} = true`
13. Se registra el evento en `audit_logs`
14. Se retorna el recibo con el hash de verificacion

## Estructuras de Datos Utilizadas

| Estructura | Operacion | Complejidad | Proposito |
|---|---|---|---|
| VoteQueue | `enqueue(vote)` | O(1) | Procesamiento FIFO de votos |
| VoteRecordList | `addFirst(voteRecord)` | O(1) | Historial cronologico inverso |

## Reglas de Negocio Aplicadas

| ID | Regla |
|---|---|
| RN-11 | Un usuario solo puede votar una vez por eleccion |
| RN-12 | El voto es anonimo - no se almacena relacion directa usuario-candidato |
| RN-13 | El hash permite verificacion sin revelar identidad |
| RN-14 | Los votos se procesan en orden FIFO mediante VoteQueue |
| RN-15 | Todos los votos deben ser auditados |
