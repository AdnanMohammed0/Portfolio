import type {
  Experience,
  IntegrationSettings,
  Project,
  SiteContent,
  Skill,
} from '@/types';

export const DEFAULT_CONTENT: SiteContent = {
  hero: {
    label: 'ADNAN MOHAMMED • AI ENGINEER',
    heading: 'I build intelligent digital experiences.',
    description:
      'I design and develop AI-powered products, interactive experiences, and modern digital systems.',
    primary_cta_text: 'View My Work',
    primary_cta_url: '#works',
    secondary_cta_text: 'About Me',
    secondary_cta_url: '#about',
  },
  about: {
    heading: 'About Me',
    short_bio:
      "I'm Adnan Mohammed — an AI engineer and developer focused on turning ideas into intelligent, useful digital experiences.",
    long_bio:
      'I work across artificial intelligence, machine learning, software development, and interactive digital products. I enjoy exploring new technologies, building practical systems, and transforming complex ideas into simple experiences.',
    profile_image: null,
    secondary_info: 'Available for selected freelance and collaboration work.',
  },
  contact: {
    heading: "Let's work together",
    intro:
      'Have a product, a research idea, or an interface that needs to feel alive? Tell Adnan about it.',
    email: 'hello@example.com',
    phone: '',
    github: 'https://github.com/',
    linkedin: 'https://linkedin.com/',
    instagram: '',
    x: '',
    location: 'Remote / Worldwide',
  },
  settings: {
    site_name: 'Adnan Mohammed Adnan',
    alt_names:
      'Adnan Mohammed Alzubaidy, Adnan Mohammed, Adnan M. Adnan, عدنان محمد عدنان, عدنان محمد الزبيدي, عدنان محمد',
    logo_text: 'Adnan Mohammed',
    seo_title: 'Adnan Mohammed Adnan — AI Engineer & Developer',
    seo_description:
      'I design and develop AI-powered products, interactive experiences, and modern digital systems.',
    og_image: null,
    favicon: null,
    footer_copyright:
      '© ' + new Date().getFullYear() + ' Adnan Mohammed Adnan. All rights reserved.',
    status_text: 'Open to new projects',
  },
};

const NOW = new Date().toISOString();

type ProjectSeed = Partial<Project> &
  Pick<Project, 'title' | 'slug' | 'short_description' | 'full_description'>;

function project(index: number, data: ProjectSeed): Project {
  return {
    id: 'seed-project-' + index,
    cover_image: null,
    cover_alt: data.title,
    video_url: null,
    technologies: [],
    category: 'Artificial Intelligence',
    year: String(new Date().getFullYear()),
    project_url: null,
    github_url: null,
    featured: false,
    published: true,
    sort_order: index,
    created_at: NOW,
    updated_at: NOW,
    images: [],
    ...data,
  } as Project;
}

export const DEFAULT_PROJECTS: Project[] = [
  project(0, {
    title: 'AI Student Assistant',
    slug: 'ai-student-assistant',
    short_description:
      'A retrieval-augmented assistant that turns course material into an answerable knowledge base.',
    full_description:
      'A retrieval-augmented assistant built for students. Course documents are chunked, embedded and indexed, then served through a conversational interface that cites the exact source of every answer. The system combines a vector store, a re-ranking layer and a streaming response pipeline so answers arrive as they are generated.',
    technologies: ['Python', 'RAG', 'LLMs', 'FastAPI', 'PostgreSQL'],
    category: 'Artificial Intelligence',
    year: '2025',
    featured: true,
  }),
  project(1, {
    title: 'LABRIDGE',
    slug: 'labridge',
    short_description:
      'A dental clinic and laboratory platform built around one shared order pipeline.',
    full_description:
      'LABRIDGE connects dental clinics with laboratories through a shared order lifecycle: service catalogue, tooth selection, attachments and 3D scans, real-time status tracking and delivery. Built as a Flutter client on a Postgres backend with row-level security and realtime events.',
    technologies: ['Flutter', 'Dart', 'Supabase', 'PostgreSQL', 'Realtime'],
    category: 'Product Engineering',
    year: '2025',
  }),
  project(2, {
    title: 'Neural Genetic Inheritance',
    slug: 'neural-genetic-inheritance',
    short_description:
      'Evolving neural network weights through genetic crossover instead of gradient descent.',
    full_description:
      'A research experiment where populations of small neural networks reproduce: weights are treated as genomes, recombined through crossover and mutated under selection pressure. The project compares convergence behaviour against standard gradient-based training on identical tasks.',
    technologies: ['Python', 'PyTorch', 'NumPy', 'Machine Learning'],
    category: 'Research',
    year: '2024',
  }),
  project(3, {
    title: 'Computer Vision System',
    slug: 'computer-vision-system',
    short_description: 'Real-time detection and tracking pipeline optimised for edge deployment.',
    full_description:
      'An end-to-end computer vision pipeline: capture, pre-processing, detection, multi-object tracking and event reporting. Models were quantised and profiled so the pipeline holds real-time frame rates on constrained hardware.',
    technologies: ['Computer Vision', 'PyTorch', 'OpenCV', 'ONNX'],
    category: 'Computer Vision',
    year: '2024',
  }),
  project(4, {
    title: 'AI-Powered Applications',
    slug: 'ai-powered-applications',
    short_description:
      'A collection of production interfaces where language models do real work behind a calm UI.',
    full_description:
      'A set of applications where the model is an implementation detail rather than the product: structured extraction, classification, summarisation and assisted authoring, each wrapped in an interface that stays predictable when the model is not.',
    technologies: ['React', 'TypeScript', 'LLMs', 'APIs'],
    category: 'Applications',
    year: '2025',
  }),
];

const SKILL_SEED: Array<[string, string]> = [
  ['Artificial Intelligence', 'Core'],
  ['Machine Learning', 'Core'],
  ['Python', 'Languages'],
  ['PyTorch', 'Frameworks'],
  ['TensorFlow', 'Frameworks'],
  ['Computer Vision', 'Core'],
  ['NLP', 'Core'],
  ['React', 'Frontend'],
  ['TypeScript', 'Languages'],
  ['Flutter', 'Frontend'],
  ['APIs', 'Backend'],
  ['RAG', 'Core'],
  ['LLMs', 'Core'],
];

export const DEFAULT_SKILLS: Skill[] = SKILL_SEED.map(([name, category], i) => ({
  id: 'seed-skill-' + i,
  name,
  category,
  sort_order: i,
}));

export const DEFAULT_EXPERIENCE: Experience[] = [
  {
    id: 'seed-exp-0',
    date_range: '2024 — Present',
    position: 'AI Engineer',
    organization: 'Independent',
    description:
      'Designing and shipping AI-driven products end to end: data pipelines, model integration, evaluation, and the interfaces people actually use.',
    sort_order: 0,
  },
  {
    id: 'seed-exp-1',
    date_range: '2023 — 2024',
    position: 'Software Developer',
    organization: 'Freelance',
    description:
      'Built web and mobile products for clients, from first prototype through to production deployment and maintenance.',
    sort_order: 1,
  },
  {
    id: 'seed-exp-2',
    date_range: '2021 — 2023',
    position: 'Machine Learning',
    organization: 'Research & Study',
    description:
      'Focused on machine learning fundamentals, computer vision, and applied research projects.',
    sort_order: 2,
  },
];

export const DEFAULT_INTEGRATIONS: IntegrationSettings = {
  telegram: { enabled: false, bot_token: '', chat_id: '' },
};
