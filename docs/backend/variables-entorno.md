---
id: variables-entorno
title: Variables de Entorno
sidebar_label: Variables de Entorno
---

# Variables de Entorno

Referencia completa de todas las variables de entorno del sistema. Copiar `.env.example` a `.env` en `mivoto-service-mono/` como punto de partida.

```bash
cp .env.example .env
```

---

## Base de datos (PostgreSQL)

| Variable | Tipo | Requerida | Default local | Descripcion |
|---|---|---|---|---|
| `DATABASE_URL` | string | Si | `jdbc:postgresql://localhost:5432/mivoto` | URL JDBC de conexion a PostgreSQL |
| `DATABASE_USER` | string | Si | `postgres` | Usuario de la base de datos |
| `DATABASE_PASSWORD` | string | Si | `postgres` | Contrasena de la base de datos |
| `POSTGRES_DB` | string | Si (Docker) | `mivoto` | Nombre de la base de datos creada por Docker |
| `POSTGRES_USER` | string | Si (Docker) | `postgres` | Usuario del contenedor PostgreSQL |
| `POSTGRES_PASSWORD` | string | Si (Docker) | `postgres` | Contrasena del contenedor PostgreSQL |

**Comportamiento del esquema por perfil:**

| Perfil | `ddl-auto` | Comportamiento |
|---|---|---|
| `local` | `create-drop` | Recrea el esquema en cada arranque |
| `dev` | `update` | Aplica cambios incrementales |
| `qa` | `validate` | Solo valida, no modifica |
| `prod` | `validate` | Solo valida, no modifica |

---

## Cache (Redis)

| Variable | Tipo | Requerida | Default | Descripcion |
|---|---|---|---|---|
| `REDIS_HOST` | string | Si | `localhost` | Host del servidor Redis |
| `REDIS_PORT` | integer | No | `6379` | Puerto de Redis |
| `REDIS_PASSWORD` | string | No | - | Contrasena de Redis (vacio = sin auth) |
| `spring.data.redis.timeout` | integer | No | `60000` | Timeout de conexion en milisegundos |

**Claves usadas en Redis:**

| Patron de clave | TTL | Proposito |
|---|---|---|
| `session:{userId}` | 7 dias | Datos de sesion activa |
| `vote:{userId}:{electionId}` | Sin expiracion | Control de voto unico |
| `results:{electionId}` | 5 min / 24h | Cache de resultados |
| `stats:system` | 10 min | Estadisticas globales |
| `blacklist:{token}` | Hasta expiracion del token | Tokens revocados (logout) |

---

## Autenticacion JWT

| Variable | Tipo | Requerida | Default dev | Default prod | Descripcion |
|---|---|---|---|---|---|
| `JWT_SECRET` | string | Si | `mivoto-dev-secret-key` | (sin default) | Clave secreta HMAC-SHA256, minimo 256 bits |
| `jwt.expiration` | integer | No | `28800000` (8h) | `3600000` (1h) | Duracion del access token en ms |
| `jwt.refresh-expiration` | integer | No | `604800000` (7d) | `604800000` (7d) | Duracion del refresh token en ms |

**Importante:** En produccion, `JWT_SECRET` debe ser una cadena aleatoria de al menos 32 caracteres. Nunca usar el valor de desarrollo en produccion.

---

## Spring Boot

| Variable | Tipo | Requerida | Valores posibles | Descripcion |
|---|---|---|---|---|
| `SPRING_PROFILES_ACTIVE` | string | No | `local`, `dev`, `qa`, `prod` | Perfil activo de Spring |
| `PORT` | integer | No | `8080` | Puerto del servidor HTTP |
| `spring.jpa.show-sql` | boolean | No | `true` (dev), `false` (prod) | Imprime las consultas SQL en el log |

---

## Herramientas de administracion (solo local/dev)

| Variable | Tipo | Default | Descripcion |
|---|---|---|---|
| `PGADMIN_EMAIL` | string | `admin@mivoto.com` | Email de acceso a PgAdmin |
| `PGADMIN_PASSWORD` | string | `admin` | Contrasena de PgAdmin |
| `REDIS_COMMANDER_PORT` | integer | `8081` | Puerto de Redis Commander |

Estas variables solo aplican al perfil `local`. En `qa` y `prod` no se despliegan estas herramientas.

---

## Logging

| Variable | Tipo | Default | Descripcion |
|---|---|---|---|
| `logging.level.root` | string | `INFO` (prod), `DEBUG` (dev) | Nivel de log global |
| `logging.level.pe.com.mivoto` | string | `DEBUG` (dev), `INFO` (prod) | Nivel de log del paquete del proyecto |
| `logging.file.name` | string | `logs/mivoto.log` | Ruta del archivo de log |
| `logging.file.max-size` | string | `10MB` | Tamano maximo por archivo de log |
| `logging.file.max-history` | integer | `30` | Dias de retencion de logs |

---

## Configuracion personalizada de MiVoto

| Variable | Tipo | Default | Descripcion |
|---|---|---|---|
| `mivoto.vote-processing.queue-size` | integer | `1000` | Capacidad maxima de la VoteQueue |
| `mivoto.vote-processing.batch-size` | integer | `100` | Votos procesados por lote |
| `mivoto.vote-processing.processing-interval` | integer | `5000` | Intervalo de procesamiento en ms |
| `mivoto.election.auto-close` | boolean | `false` (dev), `true` (prod) | Cierre automatico al llegar a la fecha fin |
| `mivoto.election.results-visibility` | string | `ADMIN_ONLY` | Quien puede ver resultados durante la eleccion |
| `mivoto.security.max-login-attempts` | integer | `5` | Intentos de login antes de bloquear cuenta |
| `mivoto.security.account-lock-duration` | integer | `3600` | Segundos de bloqueo de cuenta |

---

## Actuator y monitoreo

| Variable | Tipo | Default | Descripcion |
|---|---|---|---|
| `management.endpoints.web.exposure.include` | string | `health,info` (prod), `health,info,metrics,prometheus` (dev) | Endpoints de Actuator expuestos |

Endpoints disponibles:

| Endpoint | URL | Descripcion |
|---|---|---|
| Health | `GET /actuator/health` | Estado del servicio y sus dependencias |
| Info | `GET /actuator/info` | Informacion de la aplicacion |
| Metrics | `GET /actuator/metrics` | Metricas de la JVM y la aplicacion |

---

## Flyway

Flyway esta incluido en el proyecto pero actualmente desactivado. El esquema se maneja via Hibernate DDL automatico. Cuando se active para produccion:

| Variable | Default | Descripcion |
|---|---|---|
| `spring.flyway.enabled` | `false` | Activar migraciones Flyway |
| `spring.flyway.locations` | `classpath:db/migration` | Directorio de scripts SQL |
| `spring.flyway.baseline-on-migrate` | `true` | Crear baseline en BD existente |

---

## Variables del frontend (Angular)

Las variables del frontend se gestionan via `environments/` en Angular, no via `.env`. Se seleccionan en build time con `--configuration`:

| Archivo | Perfil | API URL |
|---|---|---|
| `environments/environment.ts` | default | `http://localhost:8080` |
| `environments/environment.local.ts` | local | `http://localhost:8080` |
| `environments/environment.dev.ts` | dev | URL del servidor dev |
| `environments/environment.qa.ts` | qa | URL del servidor QA |
| `environments/environment.prod.ts` | production | URL de produccion |
