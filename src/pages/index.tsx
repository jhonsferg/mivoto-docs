import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';
import styles from './index.module.css';

type SectionCard = {
  title: string;
  description: string;
  to: string;
  label: string;
  items: string[];
  iconClass: string;
  iconText: string;
};

const sections: SectionCard[] = [
  {
    title: 'Backend',
    description:
      'API REST con Spring Boot 3, arquitectura hexagonal, seguridad JWT, PostgreSQL y Redis.',
    to: '/docs/backend/overview',
    label: 'Ver documentacion de Backend',
    iconClass: styles.iconBackend,
    iconText: 'SB',
    items: [
      'Arquitectura hexagonal (Puertos y Adaptadores)',
      'Base de datos y diagrama ERD',
      'API Reference completa',
      'Seguridad JWT y RBAC',
      'Estructuras de datos personalizadas',
    ],
  },
  {
    title: 'Frontend',
    description:
      'SPA con Angular 20, componentes standalone, Angular Signals y carga diferida por ruta.',
    to: '/docs/frontend/overview',
    label: 'Ver documentacion de Frontend',
    iconClass: styles.iconFrontend,
    iconText: 'NG',
    items: [
      'Arquitectura Angular 20 standalone',
      'Enrutamiento y guards por rol',
      'Autenticacion y renovacion de tokens',
      'Componentes y utilidades compartidas',
      'Funcionalidades por rol',
    ],
  },
  {
    title: 'Integracion',
    description:
      'Comunicacion HTTP entre frontend y backend: contratos, interceptores, flujos de autenticacion.',
    to: '/docs/integration/overview',
    label: 'Ver documentacion de Integracion',
    iconClass: styles.iconIntegration,
    iconText: 'INT',
    items: [
      'Contrato de la API REST',
      'Flujo de autenticacion end-to-end',
      'Mapa de servicios Angular y endpoints',
      'Pipeline de interceptores HTTP',
      'Estrategia de cache frontend y backend',
    ],
  },
];

type TechBadge = {
  name: string;
  category: string;
};

const techStack: TechBadge[] = [
  {name: 'Spring Boot 3.2', category: 'Backend'},
  {name: 'Java 17', category: 'Backend'},
  {name: 'PostgreSQL', category: 'Base de datos'},
  {name: 'Redis', category: 'Cache'},
  {name: 'Flyway', category: 'Migraciones'},
  {name: 'Spring Security', category: 'Seguridad'},
  {name: 'JWT (JJWT)', category: 'Autenticacion'},
  {name: 'Angular 20', category: 'Frontend'},
  {name: 'TypeScript 5', category: 'Frontend'},
  {name: 'Angular Signals', category: 'Estado'},
  {name: 'RxJS 7', category: 'Reactividad'},
  {name: 'Docker', category: 'Infraestructura'},
];

type QuickCard = {
  step: string;
  title: string;
  description: string;
};

const quickStart: QuickCard[] = [
  {
    step: 'Paso 1',
    title: 'Levantar el Backend',
    description:
      'Ejecuta docker compose up -d en mivoto-service-mono para iniciar PostgreSQL, Redis y el servicio Spring Boot.',
  },
  {
    step: 'Paso 2',
    title: 'Iniciar el Frontend',
    description:
      'Ejecuta ng serve en mivoto-web-app. La app queda disponible en http://localhost:4200.',
  },
  {
    step: 'Paso 3',
    title: 'Explorar la API',
    description:
      'Accede a la documentacion Swagger en http://localhost:8080/swagger-ui/index.html para probar los endpoints.',
  },
];

function Hero() {
  return (
    <header className={styles.hero}>
      <div className="container">
        <div className={styles.heroBadge}>Documentacion Tecnica</div>
        <Heading as="h1" className={styles.heroTitle}>
          Mi<span className={styles.heroAccent}>Voto</span>
        </Heading>
        <p className={styles.heroSubtitle}>
          Sistema de votacion electronica. Documentacion tecnica de backend,
          frontend y la integracion entre ambos.
        </p>
        <div className={styles.heroButtons}>
          <Link className={styles.btnPrimary} to="/docs/backend/overview">
            Backend
          </Link>
          <Link className={styles.btnPrimary} to="/docs/frontend/overview">
            Frontend
          </Link>
          <Link className={styles.btnOutline} to="/docs/integration/overview">
            Integracion
          </Link>
        </div>
      </div>
    </header>
  );
}

function Sections() {
  return (
    <section className={styles.sectionsWrapper}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">Secciones de la Documentacion</Heading>
          <p>Explora la documentacion organizada por capa del sistema.</p>
        </div>
        <div className={styles.sectionGrid}>
          {sections.map((s) => (
            <div key={s.title} className={styles.sectionCard}>
              <div className={clsx(styles.sectionIcon, s.iconClass)}>
                <strong>{s.iconText}</strong>
              </div>
              <h3>{s.title}</h3>
              <p>{s.description}</p>
              <ul className={styles.sectionItems}>
                {s.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
              <Link className={styles.sectionLink} to={s.to}>
                {s.label}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TechStack() {
  return (
    <section className={styles.techWrapper}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">Stack Tecnologico</Heading>
          <p>Tecnologias utilizadas en el sistema.</p>
        </div>
        <div className={styles.techGrid}>
          {techStack.map((t) => (
            <div key={t.name} className={styles.techBadge}>
              <span>{t.name}</span>
              <span className={styles.techCategory}>{t.category}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function QuickStart() {
  return (
    <section className={styles.quickWrapper}>
      <div className="container">
        <div className={styles.sectionHeading}>
          <Heading as="h2">Como Empezar</Heading>
          <p>Levanta el sistema en entorno local en tres pasos.</p>
        </div>
        <div className={styles.quickGrid}>
          {quickStart.map((q) => (
            <div key={q.step} className={styles.quickCard}>
              <div className={styles.quickStep}>{q.step}</div>
              <h4>{q.title}</h4>
              <p>{q.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  return (
    <Layout
      title="Documentacion Tecnica"
      description="Documentacion tecnica del sistema de votacion electronica MiVoto - Backend Spring Boot, Frontend Angular e integracion.">
      <Hero />
      <main>
        <Sections />
        <TechStack />
        <QuickStart />
      </main>
    </Layout>
  );
}
