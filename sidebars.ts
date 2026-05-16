import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  mainSidebar: [
    'intro',
  ],
  backendSidebar: [
    {
      type: 'category',
      label: 'Backend',
      collapsed: false,
      items: [
        'backend/overview',
        'backend/database',
        'backend/api-reference',
        'backend/security',
        'backend/data-structures',
        'backend/configuration',
        {
          type: 'category',
          label: 'Casos de Uso',
          collapsed: false,
          items: [
            'backend/casos-de-uso/cu-01-autenticacion',
            'backend/casos-de-uso/cu-02-gestion-elecciones',
            'backend/casos-de-uso/cu-03-gestion-candidatos',
            'backend/casos-de-uso/cu-04-emision-voto',
            'backend/casos-de-uso/cu-05-verificacion-voto',
            'backend/casos-de-uso/cu-06-consulta-resultados',
          ],
        },
        {
          type: 'category',
          label: 'Diagramas de Secuencia',
          collapsed: false,
          items: [
            'backend/diagramas-secuencia/ds-01-autenticacion-jwt',
            'backend/diagramas-secuencia/ds-02-emision-voto',
            'backend/diagramas-secuencia/ds-03-verificacion-voto',
            'backend/diagramas-secuencia/ds-04-creacion-eleccion',
            'backend/diagramas-secuencia/ds-05-consulta-resultados',
            'backend/diagramas-secuencia/ds-06-registro-candidato',
          ],
        },
        {
          type: 'category',
          label: 'Diagramas de Clases',
          collapsed: false,
          items: [
            'backend/diagramas-clases/dc-01-modelo-dominio',
            'backend/diagramas-clases/dc-02-arquitectura-hexagonal',
            'backend/diagramas-clases/dc-03-estructuras-datos',
            'backend/diagramas-clases/dc-04-seguridad-autenticacion',
          ],
        },
      ],
    },
  ],
  frontendSidebar: [
    {
      type: 'category',
      label: 'Frontend',
      collapsed: false,
      items: [
        'frontend/overview',
        'frontend/routing',
        'frontend/authentication',
        'frontend/components',
        'frontend/features',
      ],
    },
  ],
  integrationSidebar: [
    {
      type: 'category',
      label: 'Integracion',
      collapsed: false,
      items: [
        'integration/overview',
        'integration/auth-flow',
        'integration/api-communication',
      ],
    },
  ],
};

export default sidebars;
