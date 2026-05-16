---
id: glosario
title: Glosario
sidebar_label: Glosario
---

# Glosario

Definicion de los terminos del dominio y tecnicos usados en MiVoto.

---

## Terminos del dominio

### Eleccion

Proceso electoral gestionado por el sistema. Tiene un nombre, fechas de inicio y fin, un tipo (presidencial, regional, local, etc.) y un ciclo de vida con los estados: `SCHEDULED` -> `ACTIVE` -> `CLOSED` / `CANCELLED`.

### Candidato

Persona registrada en una eleccion especifica que puede recibir votos. Pertenece a un partido politico y tiene un numero de lista unico dentro de la eleccion. No puede tener votos registrados para ser eliminado.

### Voto

Acto de seleccion de un candidato por parte de un votante dentro de una eleccion activa. El sistema garantiza que un usuario solo puede votar una vez por eleccion (`RN-11`). El voto es **anonimo**: no se almacena una relacion directa entre el votante y el candidato seleccionado.

### Hash de voto

Identificador criptografico unico generado con SHA-256 para cada voto emitido:

```
SHA256(voteId + timestamp + electionId + salt)
```

Permite verificar la integridad de un voto sin revelar la identidad del votante. Es inmutable una vez generado.

### Recibo de voto

Documento digital entregado al votante tras emitir su voto. Contiene el `voteHash` y una URL de verificacion. No contiene informacion sobre el candidato elegido.

### Verificacion de voto

Proceso publico (sin autenticacion) que permite comprobar que un voto existe y no ha sido alterado, usando su `voteHash`. El sistema recalcula el hash y lo compara con el almacenado.

### Participacion

Metrica que indica el porcentaje de votantes elegibles que emitieron su voto en una eleccion:

```
participacionRate = (totalVotes / eligibleVoters) * 100
```

### Ganador

Candidato con la mayor cantidad de votos en una eleccion cerrada. En caso de empate, se usa el timestamp del ultimo voto como criterio de desempate.

### Distrito

Unidad territorial a la que pertenece una eleccion. Tiene una jerarquia de cuatro niveles: `NATIONAL` -> `REGIONAL` -> `PROVINCIAL` -> `DISTRICT`. Un distrito puede contener sub-distritos.

### Sesion de votacion

Registro de la actividad de un usuario en el sistema durante un periodo determinado. Incluye IP, user agent, hora de inicio y fin. Se usa para deteccion de anomalias y auditoria.

### Registro de auditoria

Entrada inmutable en la tabla `audit_logs` que registra cada accion critica del sistema: login, logout, emision de voto, verificacion de voto, creacion de eleccion, registro de candidato, etc.

---

## Roles del sistema

### VOTER

Usuario registrado con derecho a voto. Puede:
- Consultar elecciones activas y sus candidatos
- Emitir un voto por eleccion
- Consultar su historial de votaciones
- Verificar la integridad de su voto

### ADMIN

Administrador del sistema. Puede:
- Crear y gestionar elecciones (ciclo de vida completo)
- Registrar y eliminar candidatos
- Consultar resultados y estadisticas
- Consultar los logs de auditoria
- Gestionar usuarios

### SUPERVISOR

Observador de procesos electorales. Puede:
- Consultar resultados y estadisticas de elecciones
- Acceder a reportes de participacion

### AUDITOR

Rol de solo lectura para auditoria externa. Tiene acceso a los registros de `audit_logs` sin poder modificar nada.

---

## Estados de una eleccion

| Estado | Descripcion | Transiciones posibles |
|---|---|---|
| `DRAFT` | Creada pero aun no programada | -> `SCHEDULED`, `CANCELLED` |
| `SCHEDULED` | Programada, en espera de inicio | -> `ACTIVE`, `CANCELLED` |
| `ACTIVE` | En curso, acepta votos | -> `CLOSED`, `CANCELLED` |
| `CLOSED` | Finalizada, resultados disponibles | Estado terminal |
| `CANCELLED` | Cancelada por el administrador | Estado terminal |

---

## Estructuras de datos

### VoteQueue

Cola FIFO (First-In-First-Out) implementada con nodos enlazados. Almacena los votos en orden de llegada para su procesamiento en el mismo orden. Operaciones `enqueue` y `dequeue` en O(1).

### VoteRecordList

Lista doblemente enlazada que mantiene un registro cronologico inverso de todos los votos emitidos. Usada para verificacion publica de votos via `findByHash(hash)` en O(n). La insercion al inicio es O(1).

### CandidateSearchTree

Arbol Binario de Busqueda (BST) que organiza los candidatos de una eleccion por ID para busqueda eficiente en O(log n). El recorrido in-order (`inOrderTraversal`) devuelve los candidatos ordenados en O(n).

### ElectionGraph

Grafo dirigido que modela jerarquias entre elecciones (ej. `Nacional -> Regional -> Local`). Usa lista de adyacencia. Permite recorridos BFS/DFS para obtener elecciones relacionadas.

---

## Terminos tecnicos

### JWT (JSON Web Token)

Token estandar (RFC 7519) usado para autenticacion stateless. En MiVoto se usan dos tipos:
- **Access Token**: Duracion de 8 horas (1h en prod). Se envia en el header `Authorization: Bearer <token>`.
- **Refresh Token**: Duracion de 7 dias. Se usa para renovar el access token sin re-autenticacion.

### BCrypt

Algoritmo de hash de contrasenas con factor de costo configurable. MiVoto usa factor 12. Resistente a ataques de fuerza bruta por su naturaleza lenta intencional.

### SHA-256

Funcion hash criptografica de 256 bits usada para generar el identificador unico de cada voto. Produce una cadena hexadecimal de 64 caracteres.

### Redis

Base de datos en memoria usada como cache. En MiVoto almacena sesiones de usuario, resultados de elecciones (con TTL), marcas de voto emitido y la lista negra de tokens revocados.

### Flyway

Herramienta de migraciones de base de datos. Esta incluida en el proyecto pero actualmente inactiva; el esquema se gestiona via Hibernate DDL automatico. Se activara en el ciclo de vida de produccion.

### MapStruct

Generador de mappers Java en tiempo de compilacion. Se usa para convertir entre entidades JPA y DTOs de la API sin reflexion en runtime.

### Lombok

Libreria de procesamiento de anotaciones que genera automaticamente getters, setters, constructores, `equals`, `hashCode` y `toString` para las entidades y DTOs.

### Hexagonal Architecture

Patron arquitectonico (tambien llamado Ports and Adapters) que aísla el nucleo de negocio (Domain + Application) de los detalles tecnologicos (Infrastructure). Las dependencias fluyen siempre hacia adentro.

### DDL auto

Propiedad de Hibernate (`spring.jpa.hibernate.ddl-auto`) que controla como se gestiona el esquema de la base de datos al arrancar la aplicacion. En MiVoto: `create-drop` (local), `update` (dev), `validate` (qa/prod).

### Stateless

Caracter de la API REST de MiVoto donde el servidor no mantiene estado de sesion HTTP entre peticiones. Toda la informacion de autenticacion viaja en el JWT de cada peticion.

### RBAC (Role-Based Access Control)

Modelo de control de acceso donde los permisos se asignan a roles y los usuarios reciben uno o mas roles. En MiVoto los roles son: `VOTER`, `ADMIN`, `SUPERVISOR`, `AUDITOR`.
