# MiVoto Docs

Sitio de documentacion tecnica del sistema de votacion electronica **MiVoto**. Construido con [Docusaurus 3](https://docusaurus.io/), incluye diagramas renderizados con Mermaid y PlantUML, y busqueda local full-text.

## Contenido

- **Backend** - Arquitectura hexagonal (Spring Boot 3.2 / Java 17), base de datos, API REST, seguridad JWT, estructuras de datos, configuracion, casos de uso, diagramas de secuencia y clases
- **Frontend** - Arquitectura Angular 20, enrutamiento, autenticacion con Signals, componentes y funcionalidades por rol
- **Integracion** - Flujo end-to-end entre Angular y Spring Boot, comunicacion HTTP e interceptores
- **Guia de instalacion** - Pasos para levantar el entorno local completo
- **Glosario** - Terminos del dominio y tecnicos del sistema

## Requisitos

- Node.js >= 18.13.0
- pnpm >= 8

## Instalacion

```bash
pnpm install
```

## Desarrollo local

```bash
pnpm start
```

Abre el sitio en `http://localhost:3000` con recarga automatica al editar.

## Build de produccion

```bash
pnpm run build
```

Genera los archivos estaticos en `build/`. El build incluye:
- Compilacion de diagramas Mermaid
- Renderizado de diagramas PlantUML via `plantuml.com`
- Generacion del indice de busqueda (`search-index.json`)

Para previsualizar el build generado:

```bash
pnpm run serve
```

## Estructura del proyecto

```
mivoto-docs/
  docs/
    intro.md                        # Vision general del sistema
    guia-instalacion.md             # Setup local del entorno completo
    glosario.md                     # Terminos del dominio y tecnicos
    backend/
      overview.md                   # Arquitectura y stack
      database.md                   # Esquema de BD y ERD
      api-reference.md              # Referencia REST completa
      security.md                   # JWT, RBAC, seguridad
      data-structures.md            # VoteQueue, BST, Graph, LinkedList
      configuration.md              # Perfiles Spring y Docker
      variables-entorno.md          # Referencia de variables de entorno
      manejo-errores.md             # Catalogo de excepciones y formatos
      pruebas.md                    # Estrategia de pruebas y cobertura
      casos-de-uso/                 # CU-01 a CU-06
      diagramas-secuencia/          # DS-01 a DS-06
      diagramas-clases/             # DC-01 a DC-04
    frontend/
      overview.md                   # Angular 20, standalone components
      routing.md                    # Guards y lazy-loaded routes
      authentication.md             # Signals, interceptores, sesion
      components.md                 # Componentes, directivas y pipes
      features.md                   # Funcionalidades por rol
    integration/
      overview.md                   # Arquitectura de integracion
      auth-flow.md                  # Flujo de autenticacion E2E
      api-communication.md          # Mapeo de servicios y HTTP pipeline
  src/
    pages/index.tsx                 # Pagina de inicio personalizada
    css/custom.css                  # Estilos globales
  docusaurus.config.ts              # Configuracion principal
  sidebars.ts                       # Estructura de navegacion
```

## Plugins instalados

| Plugin | Proposito |
|---|---|
| `@docusaurus/theme-mermaid` | Renderizado nativo de diagramas Mermaid |
| `@akebifiky/remark-simple-plantuml` | Convierte bloques PlantUML en imagenes SVG |
| `@easyops-cn/docusaurus-search-local` | Busqueda local full-text sin Algolia |

## Subproyectos relacionados

| Proyecto | Tecnologia | Descripcion |
|---|---|---|
| `mivoto-service-mono` | Spring Boot 3.2 / Java 17 | Backend REST con arquitectura hexagonal |
| `mivoto-web-app` | Angular 20 | Frontend SPA con Signals y componentes standalone |
| `mivoto-docs` | Docusaurus 3 | Este sitio de documentacion |
