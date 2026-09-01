export interface ProjectImage {
  id: string;
  project_id: string;
  url: string;
  alt: string;
  sort_order: number;
}

export interface Project {
  id: string;
  title: string;
  slug: string;
  short_description: string;
  full_description: string;
  cover_image: string | null;
  cover_alt: string;
  video_url: string | null;
  technologies: string[];
  category: string;
  year: string;
  project_url: string | null;
  github_url: string | null;
  featured: boolean;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  images?: ProjectImage[];
}

export interface Skill {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

export interface Experience {
  id: string;
  date_range: string;
  position: string;
  organization: string;
  description: string;
  sort_order: number;
}

export interface MediaItem {
  id: string;
  url: string;
  path: string;
  name: string;
  type: 'image' | 'video';
  size: number;
  created_at: string;
}

export interface HeroContent {
  label: string;
  heading: string;
  description: string;
  primary_cta_text: string;
  primary_cta_url: string;
  secondary_cta_text: string;
  secondary_cta_url: string;
}

export interface AboutContent {
  heading: string;
  short_bio: string;
  long_bio: string;
  profile_image: string | null;
  secondary_info: string;
}

export interface ContactContent {
  heading: string;
  intro: string;
  email: string;
  phone: string;
  github: string;
  linkedin: string;
  instagram: string;
  x: string;
  location: string;
}

export interface SettingsContent {
  site_name: string;
  logo_text: string;
  seo_title: string;
  seo_description: string;
  og_image: string | null;
  favicon: string | null;
  footer_copyright: string;
  status_text: string;
}

export interface SiteContent {
  hero: HeroContent;
  about: AboutContent;
  contact: ContactContent;
  settings: SettingsContent;
}

export type SiteContentKey = keyof SiteContent;

export interface PortfolioData {
  content: SiteContent;
  projects: Project[];
  skills: Skill[];
  experience: Experience[];
}

/**
 * Credentials for outbound integrations.
 *
 * Kept apart from SiteContent on purpose: SiteContent is publicly readable, and
 * these values are not. They are only ever fetched by a signed-in administrator
 * or by the Edge Function server-side.
 */
export interface TelegramSettings {
  enabled: boolean;
  bot_token: string;
  chat_id: string;
}

export interface IntegrationSettings {
  telegram: TelegramSettings;
}

export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

export type ProjectDraft = Omit<Project, 'id' | 'created_at' | 'updated_at'>;
