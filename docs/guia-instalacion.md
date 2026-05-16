---
id: guia-instalacion
title: Guia de Instalacion
sidebar_label: Guia de Instalacion
---

# Guia de Instalacion

Pasos para levantar el entorno completo de MiVoto en local: base de datos, backend y frontend.

## Requisitos previos

| Herramienta | Version minima | Uso |
|---|---|---|
| Java | 17 | Backend Spring Boot |
| Maven | 3.8+ | Build del backend |
| Node.js | 18.13.0 (recomendado v20 LTS) | Frontend Angular |
| npm | 8.x+ | Gestor de dependencias frontend |
| Angular CLI | 20.x | Herramienta de desarrollo Angular |
| Docker Desktop | 24+ | Contenedores de servicios |
| Git | 2.x | Control de versiones |

Verificar instalaciones:

```bash
java -version
mvn -version
node -v
npm -v
ng version
docker -v
```

---

## Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd mivoto
```

El proyecto contiene tres subproyectos:

```
mivoto/
  mivoto-service-mono/   # Backend Spring Boot
  mivoto-web-app/        # Frontend Angular
  mivoto-docs/           # Documentacion Docusaurus
```

---

## Backend - Configuracion local

### 1. Configurar variables de entorno

```bash
cd mivoto-service-mono
cp .env.example .env
```

Editar `.env` con los valores locales (los valores por defecto del perfil `local` ya son compatibles con el Docker Compose local):

```env
# Base de datos
DATABASE_URL=jdbc:postgresql://localhost:5432/mivoto
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# JWT
JWT_SECRET=mivoto-secret-key-local-development-256bits

# Perfil activo
SPRING_PROFILES_ACTIVE=local
```

### 2. Levantar servicios con Docker

El perfil `local` incluye PostgreSQL, Redis, PgAdmin y Redis Commander:

```bash
docker compose -f docker/local/docker-compose.yml up -d
```

Servicios disponibles tras el arranque:

| Servicio | URL | Credenciales |
|---|---|---|
| PostgreSQL | `localhost:5432` | `postgres / postgres` |
| Redis | `localhost:6379` | - |
| PgAdmin | `http://localhost:5050` | `admin@mivoto.com / admin` |
| Redis Commander | `http://localhost:8081` | - |

### 3. Inicializar la base de datos

El esquema se genera automaticamente al arrancar la aplicacion gracias a Hibernate DDL (`ddl-auto: create-drop` en local). Si se requieren datos de prueba:

```bash
# Los datos seed se cargan desde:
src/main/resources/init.sql
```

### 4. Ejecutar el backend

```bash
# Con Maven Wrapper
./mvnw spring-boot:run -Plocal

# Con Maven instalado
mvn spring-boot:run -Plocal
```

El backend queda disponible en `http://localhost:8080`.

### 5. Verificar el arranque

```bash
# Health check
curl http://localhost:8080/actuator/health

# Swagger UI
# Abrir en navegador: http://localhost:8080/swagger-ui.html
```

---

## Frontend - Configuracion local

### 1. Instalar dependencias

```bash
cd mivoto-web-app
npm install
```

### 2. Ejecutar en modo desarrollo

```bash
# Apunta al backend local (localhost:8080)
ng serve --configuration=local

# O simplemente
npm start
```

La aplicacion queda disponible en `http://localhost:4200`.

---

## Perfiles de entorno disponibles

### Backend (perfiles Maven + Spring)

| Perfil | Comando | Backend URL | DDL | Herramientas admin |
|---|---|---|---|---|
| `local` | `-Plocal` | `:8080` | `create-drop` | PgAdmin, Redis Commander |
| `dev` | `-Pdev` | `:8080` | `update` | PgAdmin |
| `qa` | `-Pqa` | `:8082` | `validate` | - |
| `prod` | `-Pprod` | `:8080` | `validate` | - |

```bash
# Levantar servicios por ambiente
docker compose -f docker/dev/docker-compose.yml up -d
docker compose -f docker/qa/docker-compose.yml up -d
docker compose -f docker/prod/docker-compose.yml up -d
```

### Frontend (configuraciones Angular)

| Comando | Ambiente | API Base URL |
|---|---|---|
| `ng serve` | default | `http://localhost:8080` |
| `ng serve --configuration=local` | local | `http://localhost:8080` |
| `ng serve --configuration=dev` | dev | URL de dev |
| `ng serve --configuration=qa` | qa | URL de QA |
| `ng serve --configuration=production` | prod | URL de produccion |

---

## Builds de produccion

### Backend

```bash
mvn clean package -Pprod -DskipTests
java -jar target/mivoto-service-mono-*.jar
```

### Frontend

```bash
ng build --configuration=production
# Artefactos en: dist/mivoto/
```

---

## Comandos utiles

```bash
# Backend - ejecutar solo los tests
mvn test

# Backend - reporte de cobertura JaCoCo
mvn verify
# Reporte en: target/site/jacoco/index.html

# Frontend - ejecutar tests
ng test

# Frontend - linting
ng lint

# Frontend - formatear codigo
npm run format

# Detener todos los contenedores Docker del proyecto
docker compose -f docker/local/docker-compose.yml down
```

---

## Solucion de problemas comunes

| Problema | Causa probable | Solucion |
|---|---|---|
| `Connection refused` en `:5432` | Docker no esta corriendo | Ejecutar `docker compose up -d` |
| `JWT signature invalid` | JWT_SECRET no configurado | Revisar variable en `.env` |
| `Port 8080 already in use` | Proceso previo corriendo | Matar proceso con `kill -9 $(lsof -ti:8080)` |
| `CORS error` en frontend | Backend no acepta el origen | Verificar `ALLOWED_ORIGINS` en `.env` |
| `Flyway error` en arranque | Schema desactualizado | Usar `ddl-auto: create-drop` en local |
| `ng: command not found` | Angular CLI no instalado | `npm install -g @angular/cli` |
