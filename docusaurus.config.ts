import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const remarkSimplePlantUML = require('@akebifiky/remark-simple-plantuml');

const config: Config = {
  title: 'MiVoto Docs',
  tagline: 'Sistema de Votación Electrónica- Documentación Técnica',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://docs.mivoto.pe',
  baseUrl: '/',

  organizationName: 'mivoto',
  projectName: 'mivoto-docs',

  onBrokenLinks: 'warn',

  markdown: {
    mermaid: true,
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  themes: ['@docusaurus/theme-mermaid'],

  i18n: {
    defaultLocale: 'es',
    locales: ['es'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          remarkPlugins: [
            [remarkSimplePlantUML, {baseUrl: 'https://www.plantuml.com/plantuml/svg'}],
          ],
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'MiVoto',
      logo: {
        alt: 'MiVoto Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Documentación',
        },
        {
          type: 'docSidebar',
          sidebarId: 'backendSidebar',
          position: 'left',
          label: 'Backend',
        },
        {
          type: 'docSidebar',
          sidebarId: 'frontendSidebar',
          position: 'left',
          label: 'Frontend',
        },
        {
          type: 'docSidebar',
          sidebarId: 'integrationSidebar',
          position: 'left',
          label: 'Integración',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Backend',
          items: [
            {label: 'Arquitectura', to: '/docs/backend/overview'},
            {label: 'Base de Datos', to: '/docs/backend/database'},
            {label: 'API Reference', to: '/docs/backend/api-reference'},
            {label: 'Seguridad', to: '/docs/backend/security'},
          ],
        },
        {
          title: 'Frontend',
          items: [
            {label: 'Arquitectura', to: '/docs/frontend/overview'},
            {label: 'Enrutamiento', to: '/docs/frontend/routing'},
            {label: 'Autenticación', to: '/docs/frontend/authentication'},
            {label: 'Funcionalidades', to: '/docs/frontend/features'},
          ],
        },
        {
          title: 'Integración',
          items: [
            {label: 'Visión General', to: '/docs/integration/overview'},
            {label: 'Flujo de Autenticación', to: '/docs/integration/auth-flow'},
            {label: 'Comunicación API', to: '/docs/integration/api-communication'},
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} MiVoto. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['java', 'typescript', 'bash', 'yaml', 'json'],
    },
    mermaid: {
      theme: {light: 'neutral', dark: 'dark'},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
