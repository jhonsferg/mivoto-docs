---
id: configuration
title: Configuración
sidebar_label: Configuración
---

# Configuración del Backend

El backend utiliza **perfiles de Spring** para gestionar diferentes entornos. La configuración principal está en `application.yml` con archivos por perfil.

## Perfiles de Entorno

| Perfil | Archivo | Descripción |
|---|---|---|
| `local` (default) | `application-local.yml` | Desarrollo local con H2 |
| `dev` | `application-dev.yml` | Servidor de desarrollo |
| `qa` | `application-qa.yml` | Entorno de pruebas |
| `prod` | `application-prod.yml` | Producción con PostgreSQL |

**Activar un perfil:**
```bash
java -jar mivoto-service.jar --spring.profiles.active=dev
```

## Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DB_URL` | URL JDBC de PostgreSQL | `jdbc:postgresql://localhost:5432/mivoto` |
| `DB_USERNAME` | Usuario de BD | `mivoto` |
| `DB_PASSWORD` | Contraseña de BD |- |
| `REDIS_HOST` | Host de Redis | `localhost` |
| `REDIS_PORT` | Puerto de Redis | `6379` |
| `JWT_SECRET` | Secreto para firma JWT (mín. 32 chars) |- |
| `JWT_EXPIRATION` | Expiración del token en ms | `28800000` |
| `SERVER_PORT` | Puerto del servidor | `8080` |
| `CORS_ORIGINS` | Orígenes permitidos | `http://localhost:4200` |

## application.yml (Configuración Principal)

```yaml
spring:
  application:
    name: mivoto-service

  # Base de datos
  datasource:
    url: ${DB_URL:jdbc:postgresql://localhost:5432/mivoto}
    username: ${DB_USERNAME:mivoto}
    password: ${DB_PASSWORD}
    hikari:
      maximum-pool-size: 10
      minimum-idle: 5
      connection-timeout: 30000

  # JPA / Hibernate
  jpa:
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        jdbc.batch_size: 20
        format_sql: true
    open-in-view: false
    show-sql: false

  # Flyway
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true

  # Redis
  data:
    redis:
      host: ${REDIS_HOST:localhost}
      port: ${REDIS_PORT:6379}

  # Jackson
  jackson:
    serialization:
      write-dates-as-timestamps: false
    time-zone: America/Lima

# JWT
jwt:
  secret: ${JWT_SECRET}
  expiration: ${JWT_EXPIRATION:28800000}

# Servidor
server:
  port: ${SERVER_PORT:8080}
  compression:
    enabled: true

# Logging
logging:
  level:
    root: INFO
    pe.com.mivoto: DEBUG
    org.hibernate.SQL: DEBUG

# Actuator
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus
```

## Configuración de Base de Datos

### Conexión con HikariCP

El pool de conexiones HikariCP está configurado con:

| Parámetro | Valor | Descripción |
|---|---|---|
| `maximum-pool-size` | 10 | Máximo de conexiones simultáneas |
| `minimum-idle` | 5 | Mínimo de conexiones en espera |
| `connection-timeout` | 30,000 ms | Timeout al obtener conexión |

### Flyway- Migraciones

Flyway gestiona automáticamente el esquema de la base de datos:

```
src/main/resources/db/migration/
├── V1__create_users_table.sql
├── V2__create_elections_table.sql
├── V3__create_candidates_table.sql
├── V4__create_votes_table.sql
├── V5__create_vote_records_table.sql
├── V6__create_voting_sessions_table.sql
├── V7__create_audit_logs_table.sql
└── V8__create_districts_table.sql
```

Las migraciones se ejecutan automáticamente al iniciar la aplicación.

## Configuración de Redis

Redis se usa como caché para reducir la carga sobre PostgreSQL.

| Configuración | Valor | Descripción |
|---|---|---|
| TTL por defecto | 10 minutos | Tiempo de vida del caché |
| Caché `elections` | Lista completa de elecciones |
| Caché `active-elections` | Solo elecciones activas |
| Invalidación | Automática al cambiar estado de elección |

## Docker y Docker Compose

El proyecto incluye configuración Docker para facilitar el despliegue:

### `docker-compose.yaml`

```yaml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: mivoto
      POSTGRES_USER: mivoto
      POSTGRES_PASSWORD: secret
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  mivoto-service:
    build: .
    ports:
      - "8080:8080"
    environment:
      DB_URL: jdbc:postgresql://postgres:5432/mivoto
      DB_USERNAME: mivoto
      DB_PASSWORD: secret
      REDIS_HOST: redis
      JWT_SECRET: your-secret-key-here
    depends_on:
      - postgres
      - redis
```

**Iniciar con Docker:**
```bash
docker compose up -d
```

## Zona Horaria

El sistema está configurado para **America/Lima** (UTC-5). Todas las fechas se almacenan en UTC y se muestran en hora de Lima.

## Actuator y Monitoreo

Los siguientes endpoints de Spring Actuator están expuestos:

| Endpoint | URL | Descripción |
|---|---|---|
| Health | `/actuator/health` | Estado del sistema |
| Info | `/actuator/info` | Información de la aplicación |
| Metrics | `/actuator/metrics` | Métricas de la JVM |
| Prometheus | `/actuator/prometheus` | Métricas para Prometheus/Grafana |
