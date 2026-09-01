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

/**
 * The contract every content backend implements. The Supabase provider is the
 * production implementation; the local provider is a dev-only stand-in so the
 * site is runnable before credentials exist.
 */
export interface ContentProvider {
  readonly name: 'supabase' | 'local';

  /** Everything the public site needs, in one round trip. */
  loadPublic(): Promise<PortfolioData>;

  /** Admin listing — includes unpublished projects. */
  listProjects(): Promise<Project[]>;
  getProjectBySlug(slug: string): Promise<Project | null>;
  getProject(id: string): Promise<Project | null>;
  createProject(draft: ProjectDraft): Promise<Project>;
  updateProject(id: string, patch: Partial<ProjectDraft>): Promise<Project>;
  deleteProject(id: string): Promise<void>;
  reorderProjects(orderedIds: string[]): Promise<void>;

  setProjectImages(projectId: string, images: Array<Omit<ProjectImage, 'project_id'>>): Promise<void>;

  listSkills(): Promise<Skill[]>;
  saveSkills(skills: Skill[]): Promise<Skill[]>;

  listExperience(): Promise<Experience[]>;
  saveExperience(entries: Experience[]): Promise<Experience[]>;

  getContent(): Promise<SiteContent>;
  saveContentSection<K extends SiteContentKey>(key: K, value: SiteContent[K]): Promise<void>;

  listMedia(): Promise<MediaItem[]>;
  uploadMedia(file: File): Promise<MediaItem>;
  deleteMedia(item: MediaItem): Promise<void>;

  /**
   * Admin-only. Reading these requires an authenticated administrator; the
   * database rejects the request for anyone else.
   */
  getIntegrationSettings(): Promise<IntegrationSettings>;
  saveIntegrationSettings(value: IntegrationSettings): Promise<void>;

  submitMessage(input: { name: string; email: string; message: string }): Promise<void>;
  listMessages(): Promise<ContactMessage[]>;
  markMessageRead(id: string, read: boolean): Promise<void>;
  deleteMessage(id: string): Promise<void>;
}
