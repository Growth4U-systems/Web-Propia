export interface Author {
  slug: string;
  name: string;
  role: string;
  roleEn: string;
  photo: string;
  linkedin: string;
  bio: string;
  bioEn: string;
  bioLong: string;
  bioLongEn: string;
  credentials: string[];
  credentialsEn: string[];
}

export const AUTHORS: Author[] = [
  {
    slug: 'alfonso-sainz-de-baranda',
    name: 'Alfonso Sainz de Baranda',
    role: 'Founder & CEO',
    roleEn: 'Founder & CEO',
    photo: 'https://i.imgur.com/O3vyNQB.png',
    linkedin: 'https://www.linkedin.com/in/alfonsosainzdebaranda/',
    bio: 'Especialista en growth con más de diez años lanzando y escalando productos tech.',
    bioEn: 'Growth specialist with over ten years launching and scaling tech products.',
    bioLong:
      'Alfonso lleva más de 10 años diseñando estrategias de crecimiento para empresas tech en España y Latinoamérica. Ha liderado el go-to-market de fintechs como Bnext (0 → 500K usuarios) y Bit2Me (x7 usuarios, -70% CAC), especializándose en modelos de adquisición basados en confianza delegada, afiliación y growth loops. Su enfoque combina unit economics rigurosos con ejecución creativa para construir motores de crecimiento que escalan sin depender de paid media.',
    bioLongEn:
      'Alfonso has spent over 10 years designing growth strategies for tech companies in Spain and Latin America. He led the go-to-market of fintechs like Bnext (0 → 500K users) and Bit2Me (x7 users, -70% CAC), specializing in acquisition models based on delegated trust, affiliation, and growth loops. His approach combines rigorous unit economics with creative execution to build growth engines that scale without relying on paid media.',
    credentials: [
      '10+ años en growth marketing para empresas tech',
      'GTM de Bnext: 0 → 500K usuarios con CAC de €12,50',
      'GTM de Bit2Me: x7 usuarios y -70% CAC',
      'GTM de GoCardless en España y Portugal',
      'Especialista en Trust Engine y growth loops',
    ],
    credentialsEn: [
      '10+ years in growth marketing for tech companies',
      'Bnext GTM: 0 → 500K users with €12.50 CAC',
      'Bit2Me GTM: x7 users and -70% CAC',
      'GoCardless GTM in Spain and Portugal',
      'Trust Engine and growth loops specialist',
    ],
  },
  {
    slug: 'martin-fila',
    name: 'Martín Fila',
    role: 'Founder & COO',
    roleEn: 'Founder & COO',
    photo: 'https://i.imgur.com/CvKj1sd.png',
    linkedin: 'https://www.linkedin.com/in/martinfila/',
    bio: 'Especialista en growth técnico con más de diez años creando sistemas de automatización y datos que escalan operaciones.',
    bioEn: 'Technical growth specialist with over ten years building automation and data systems that scale operations.',
    bioLong:
      'Martín es el cerebro técnico detrás de la infraestructura de growth de Growth4U. Con más de 10 años de experiencia en automatización, datos y operaciones tech, ha construido los sistemas que permiten escalar campañas de adquisición, pipelines de contenido y dashboards de atribución sin fricción. Su especialidad es convertir procesos manuales en máquinas automatizadas que funcionan 24/7.',
    bioLongEn:
      'Martín is the technical brain behind Growth4U\'s growth infrastructure. With over 10 years of experience in automation, data, and tech operations, he has built the systems that enable scaling acquisition campaigns, content pipelines, and attribution dashboards frictionlessly. His specialty is turning manual processes into automated machines that run 24/7.',
    credentials: [
      '10+ años en automatización y operaciones tech',
      'Arquitecto de pipelines de datos y atribución',
      'Especialista en martech stack para fintechs',
      'Sistemas de automatización de contenido con IA',
      'Dashboards de growth y reporting en tiempo real',
    ],
    credentialsEn: [
      '10+ years in automation and tech operations',
      'Data and attribution pipeline architect',
      'Martech stack specialist for fintechs',
      'AI-powered content automation systems',
      'Real-time growth dashboards and reporting',
    ],
  },
  {
    slug: 'philippe-sainthubert',
    name: 'Philippe Sainthubert',
    role: 'Growth Strategist',
    roleEn: 'Growth Strategist',
    photo: 'https://res.cloudinary.com/dsc0jsbkz/image/upload/v1773419034/philippe-sainthubert-growth4u.jpg',
    linkedin: 'https://www.linkedin.com/in/philippesainthubert/',
    bio: 'Estratega de growth enfocado en SEO, GEO y contenido de autoridad para empresas tech.',
    bioEn: 'Growth strategist focused on SEO, GEO, and authority content for tech companies.',
    bioLong:
      'Philippe combina estrategia de contenido, SEO técnico y GEO (Generative Engine Optimization) para posicionar empresas tech donde sus clientes buscan respuestas — tanto en Google como en ChatGPT y Perplexity. Su enfoque se centra en construir activos de contenido que generan tráfico, confianza y leads de forma sostenible, sin depender de paid media.',
    bioLongEn:
      'Philippe combines content strategy, technical SEO, and GEO (Generative Engine Optimization) to position tech companies where their customers search for answers — both on Google and on ChatGPT and Perplexity. His approach focuses on building content assets that generate traffic, trust, and leads sustainably, without relying on paid media.',
    credentials: [
      'Especialista en SEO técnico y GEO',
      'Estrategia de contenido para fintechs B2B y B2C',
      'Optimización para motores generativos (ChatGPT, Perplexity)',
      'Auditorías E-E-A-T y arquitectura de autoridad',
    ],
    credentialsEn: [
      'Technical SEO and GEO specialist',
      'Content strategy for B2B and B2C fintechs',
      'Generative engine optimization (ChatGPT, Perplexity)',
      'E-E-A-T audits and authority architecture',
    ],
  },
];

/** Look up author by name (case-insensitive, partial match) */
export function getAuthorByName(name: string): Author | undefined {
  const lower = name.toLowerCase();
  return AUTHORS.find((a) => a.name.toLowerCase() === lower);
}

/** Look up author by slug */
export function getAuthorBySlug(slug: string): Author | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

/** All valid author names for admin dropdown */
export const AUTHOR_NAMES = AUTHORS.map((a) => a.name);
