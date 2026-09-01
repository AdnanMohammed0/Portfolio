import type {
  ContactMessage,
  IntegrationSettings,
  Experience,
  MediaItem,
  PortfolioData,
  Project,
  ProjectDraft,
  ProjectImage,
  SiteContent,
  SiteContentKey,
  Skill,
} from '@/types';
import { slugify, uid } from '@/lib/utils';
import {
  DEFAULT_CONTENT,
  DEFAULT_INTEGRATIONS,
  DEFAULT_EXPERIENCE,
  DEFAULT_PROJECTS,
  DEFAULT_SKILLS,
} from './defaults';
import type { ContentProvider } from './types';

/**
 * Development-only content provider.
 *
 * It exists so the portfolio is runnable and reviewable before Supabase
 * credentials are wired up. It is NOT the production content system: the admin
 * dashboard shows a persistent warning while it is active, and media uploads
 * are held in memory only. Connect Supabase for real persistence.
 */

const STORE_KEY = 'portfolio:local-content:v1';

interface LocalStore {
  content: SiteContent;
  projects: Project[];
  skills: Skill[];
  experience: Experience[];
  media: MediaItem[];
  messages: ContactMessage[];
  integrations: IntegrationSettings;
}

function seed(): LocalStore {
  return {
    content: structuredClone(DEFAULT_CONTENT),
    projects: structuredClone(DEFAULT_PROJECTS),
    skills: structuredClone(DEFAULT_SKILLS),
    experience: structuredClone(DEFAULT_EXPERIENCE),
    media: [],
    messages: [],
    integrations: structuredClone(DEFAULT_INTEGRATIONS),
  };
}

let memory: LocalStore | null = null;

function read(): LocalStore {
  if (memory) return memory;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalStore>;
      memory = { ...seed(), ...parsed };
      return memory;
    }
  } catch {
    /* storage unavailable — fall through to in-memory seed */
  }
  memory = seed();
  return memory;
}

function write(store: LocalStore): void {
  memory = store;
  try {
    // Object URLs and blobs are intentionally not persisted.
    const persistable: LocalStore = {
      ...store,
      media: store.media.filter((m) => !m.url.startsWith('blob:')),
    };
    localStorage.setItem(STORE_KEY, JSON.stringify(persistable));
  } catch {
    /* quota or privacy mode — keep the in-memory copy */
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 60));
}

function bySort<T extends { sort_order: number }>(a: T, b: T): number {
  return a.sort_order - b.sort_order;
}

export const localProvider: ContentProvider = {
  name: 'local',

  async loadPublic(): Promise<PortfolioData> {
    const store = read();
    return delay({
      content: store.content,
      projects: store.projects.filter((p) => p.published).sort(bySort),
      skills: [...store.skills].sort(bySort),
      experience: [...store.experience].sort(bySort),
    });
  },

  async listProjects() {
    return delay([...read().projects].sort(bySort));
  },

  async getProjectBySlug(slug) {
    return delay(read().projects.find((p) => p.slug === slug) ?? null);
  },

  async getProject(id) {
    return delay(read().projects.find((p) => p.id === id) ?? null);
  },

  async createProject(draft: ProjectDraft) {
    const store = read();
    const stamp = new Date().toISOString();
    const created: Project = {
      ...draft,
      id: uid('project'),
      slug: draft.slug || slugify(draft.title) || uid('project'),
      created_at: stamp,
      updated_at: stamp,
      images: draft.images ?? [],
    };
    store.projects = [created, ...store.projects];
    write(store);
    return delay(created);
  },

  async updateProject(id, patch) {
    const store = read();
    const index = store.projects.findIndex((p) => p.id === id);
    if (index === -1) throw new Error('Project not found');
    const updated: Project = {
      ...store.projects[index],
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    store.projects[index] = updated;
    write(store);
    return delay(updated);
  },

  async deleteProject(id) {
    const store = read();
    store.projects = store.projects.filter((p) => p.id !== id);
    write(store);
    await delay(null);
  },

  async reorderProjects(orderedIds) {
    const store = read();
    store.projects = store.projects.map((p) => {
      const index = orderedIds.indexOf(p.id);
      return index === -1 ? p : { ...p, sort_order: index };
    });
    write(store);
    await delay(null);
  },

  async setProjectImages(projectId, images) {
    const store = read();
    const index = store.projects.findIndex((p) => p.id === projectId);
    if (index === -1) return;
    const withParent: ProjectImage[] = images.map((image, i) => ({
      ...image,
      project_id: projectId,
      sort_order: i,
    }));
    store.projects[index] = {
      ...store.projects[index],
      images: withParent,
      updated_at: new Date().toISOString(),
    };
    write(store);
    await delay(null);
  },

  async listSkills() {
    return delay([...read().skills].sort(bySort));
  },

  async saveSkills(skills) {
    const store = read();
    store.skills = skills.map((s, i) => ({ ...s, sort_order: i }));
    write(store);
    return delay(store.skills);
  },

  async listExperience() {
    return delay([...read().experience].sort(bySort));
  },

  async saveExperience(entries) {
    const store = read();
    store.experience = entries.map((e, i) => ({ ...e, sort_order: i }));
    write(store);
    return delay(store.experience);
  },

  async getContent() {
    return delay(read().content);
  },

  async saveContentSection<K extends SiteContentKey>(key: K, value: SiteContent[K]) {
    const store = read();
    store.content = { ...store.content, [key]: value };
    write(store);
    await delay(null);
  },

  async listMedia() {
    return delay([...read().media].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  },

  async uploadMedia(file) {
    const store = read();
    const item: MediaItem = {
      id: uid('media'),
      url: URL.createObjectURL(file),
      path: file.name,
      name: file.name,
      type: file.type.startsWith('video') ? 'video' : 'image',
      size: file.size,
      created_at: new Date().toISOString(),
    };
    store.media = [item, ...store.media];
    write(store);
    return delay(item);
  },

  async deleteMedia(item) {
    const store = read();
    if (item.url.startsWith('blob:')) URL.revokeObjectURL(item.url);
    store.media = store.media.filter((m) => m.id !== item.id);
    write(store);
    await delay(null);
  },

  async getIntegrationSettings() {
    return delay(read().integrations);
  },

  async saveIntegrationSettings(value) {
    const store = read();
    store.integrations = value;
    write(store);
    await delay(null);
  },

  async submitMessage(input) {
    const store = read();
    store.messages = [
      {
        id: uid('message'),
        ...input,
        read: false,
        created_at: new Date().toISOString(),
      },
      ...store.messages,
    ];
    write(store);
    await delay(null);
  },

  async listMessages() {
    return delay([...read().messages]);
  },

  async markMessageRead(id, isRead) {
    const store = read();
    store.messages = store.messages.map((m) => (m.id === id ? { ...m, read: isRead } : m));
    write(store);
    await delay(null);
  },

  async deleteMessage(id) {
    const store = read();
    store.messages = store.messages.filter((m) => m.id !== id);
    write(store);
    await delay(null);
  },
};
