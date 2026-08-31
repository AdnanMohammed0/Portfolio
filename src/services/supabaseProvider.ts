import type {
  ContactMessage,
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
import { MEDIA_BUCKET, requireSupabase } from '@/lib/supabase';
import { slugify, uid } from '@/lib/utils';
import { DEFAULT_CONTENT } from './defaults';
import type { ContentProvider } from './types';

const PROJECT_COLUMNS =
  'id,title,slug,short_description,full_description,cover_image,cover_alt,video_url,technologies,category,year,project_url,github_url,featured,published,sort_order,created_at,updated_at';

const PROJECT_WITH_IMAGES = `${PROJECT_COLUMNS},project_images(id,project_id,url,alt,sort_order)`;

type RawProject = Omit<Project, 'images'> & { project_images?: ProjectImage[] };

function normalizeProject(raw: RawProject): Project {
  const { project_images, ...rest } = raw;
  return {
    ...rest,
    technologies: rest.technologies ?? [],
    images: (project_images ?? []).slice().sort((a, b) => a.sort_order - b.sort_order),
  };
}

function fail(context: string, error: { message: string } | null): void {
  if (error) throw new Error(`${context}: ${error.message}`);
}

/** Merge stored rows over defaults so a missing key never blanks the site. */
function mergeContent(rows: Array<{ key: string; value: unknown }>): SiteContent {
  const merged = structuredClone(DEFAULT_CONTENT);
  for (const row of rows) {
    const key = row.key as SiteContentKey;
    if (key in merged && row.value && typeof row.value === 'object') {
      Object.assign(merged[key], row.value as object);
    }
  }
  return merged;
}

export const supabaseProvider: ContentProvider = {
  name: 'supabase',

  async loadPublic(): Promise<PortfolioData> {
    const db = requireSupabase();
    const [projects, skills, experience, content] = await Promise.all([
      db
        .from('projects')
        .select(PROJECT_WITH_IMAGES)
        .eq('published', true)
        .order('sort_order', { ascending: true }),
      db.from('skills').select('*').order('sort_order', { ascending: true }),
      db.from('experience').select('*').order('sort_order', { ascending: true }),
      db.from('site_content').select('key,value'),
    ]);

    fail('Failed to load projects', projects.error);
    fail('Failed to load skills', skills.error);
    fail('Failed to load experience', experience.error);
    fail('Failed to load site content', content.error);

    return {
      projects: ((projects.data ?? []) as RawProject[]).map(normalizeProject),
      skills: (skills.data ?? []) as Skill[],
      experience: (experience.data ?? []) as Experience[],
      content: mergeContent((content.data ?? []) as Array<{ key: string; value: unknown }>),
    };
  },

  async listProjects() {
    const db = requireSupabase();
    const { data, error } = await db
      .from('projects')
      .select(PROJECT_WITH_IMAGES)
      .order('sort_order', { ascending: true });
    fail('Failed to list projects', error);
    return ((data ?? []) as RawProject[]).map(normalizeProject);
  },

  async getProjectBySlug(slug) {
    const db = requireSupabase();
    const { data, error } = await db
      .from('projects')
      .select(PROJECT_WITH_IMAGES)
      .eq('slug', slug)
      .maybeSingle();
    fail('Failed to load project', error);
    return data ? normalizeProject(data as RawProject) : null;
  },

  async getProject(id) {
    const db = requireSupabase();
    const { data, error } = await db
      .from('projects')
      .select(PROJECT_WITH_IMAGES)
      .eq('id', id)
      .maybeSingle();
    fail('Failed to load project', error);
    return data ? normalizeProject(data as RawProject) : null;
  },

  async createProject(draft: ProjectDraft) {
    const db = requireSupabase();
    const { images, ...row } = draft;
    void images;
    const { data, error } = await db
      .from('projects')
      .insert({ ...row, slug: row.slug || slugify(row.title) || uid('project') })
      .select(PROJECT_WITH_IMAGES)
      .single();
    fail('Failed to create project', error);
    return normalizeProject(data as RawProject);
  },

  async updateProject(id, patch) {
    const db = requireSupabase();
    const { images, ...row } = patch;
    void images;
    const { data, error } = await db
      .from('projects')
      .update({ ...row, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(PROJECT_WITH_IMAGES)
      .single();
    fail('Failed to update project', error);
    return normalizeProject(data as RawProject);
  },

  async deleteProject(id) {
    const db = requireSupabase();
    const { error } = await db.from('projects').delete().eq('id', id);
    fail('Failed to delete project', error);
  },

  async reorderProjects(orderedIds) {
    const db = requireSupabase();
    await Promise.all(
      orderedIds.map((id, index) =>
        db.from('projects').update({ sort_order: index }).eq('id', id),
      ),
    );
  },

  async setProjectImages(projectId, images) {
    const db = requireSupabase();
    const { error: clearError } = await db
      .from('project_images')
      .delete()
      .eq('project_id', projectId);
    fail('Failed to clear project images', clearError);

    if (images.length === 0) return;

    const rows = images.map((image, index) => ({
      project_id: projectId,
      url: image.url,
      alt: image.alt,
      sort_order: index,
    }));
    const { error } = await db.from('project_images').insert(rows);
    fail('Failed to save project images', error);
  },

  async listSkills() {
    const db = requireSupabase();
    const { data, error } = await db
      .from('skills')
      .select('*')
      .order('sort_order', { ascending: true });
    fail('Failed to load skills', error);
    return (data ?? []) as Skill[];
  },

  async saveSkills(skills) {
    const db = requireSupabase();
    const { error: clearError } = await db.from('skills').delete().neq('id', uid('never'));
    fail('Failed to reset skills', clearError);
    if (skills.length === 0) return [];
    const rows = skills.map((skill, index) => ({
      name: skill.name,
      category: skill.category,
      sort_order: index,
    }));
    const { data, error } = await db.from('skills').insert(rows).select('*');
    fail('Failed to save skills', error);
    return ((data ?? []) as Skill[]).sort((a, b) => a.sort_order - b.sort_order);
  },

  async listExperience() {
    const db = requireSupabase();
    const { data, error } = await db
      .from('experience')
      .select('*')
      .order('sort_order', { ascending: true });
    fail('Failed to load experience', error);
    return (data ?? []) as Experience[];
  },

  async saveExperience(entries) {
    const db = requireSupabase();
    const { error: clearError } = await db.from('experience').delete().neq('id', uid('never'));
    fail('Failed to reset experience', clearError);
    if (entries.length === 0) return [];
    const rows = entries.map((entry, index) => ({
      date_range: entry.date_range,
      position: entry.position,
      organization: entry.organization,
      description: entry.description,
      sort_order: index,
    }));
    const { data, error } = await db.from('experience').insert(rows).select('*');
    fail('Failed to save experience', error);
    return ((data ?? []) as Experience[]).sort((a, b) => a.sort_order - b.sort_order);
  },

  async getContent() {
    const db = requireSupabase();
    const { data, error } = await db.from('site_content').select('key,value');
    fail('Failed to load site content', error);
    return mergeContent((data ?? []) as Array<{ key: string; value: unknown }>);
  },

  async saveContentSection<K extends SiteContentKey>(key: K, value: SiteContent[K]) {
    const db = requireSupabase();
    const { error } = await db
      .from('site_content')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    fail('Failed to save content', error);
  },

  async listMedia() {
    const db = requireSupabase();
    const { data, error } = await db
      .from('media')
      .select('*')
      .order('created_at', { ascending: false });
    fail('Failed to load media', error);
    return (data ?? []) as MediaItem[];
  },

  async uploadMedia(file) {
    const db = requireSupabase();
    const extension = file.name.split('.').pop() ?? 'bin';
    const path = `${new Date().getFullYear()}/${uid('file')}.${extension}`;

    const { error: uploadError } = await db.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, { cacheControl: '31536000', upsert: false });
    fail('Upload failed', uploadError);

    const { data: publicUrl } = db.storage.from(MEDIA_BUCKET).getPublicUrl(path);

    const row = {
      url: publicUrl.publicUrl,
      path,
      name: file.name,
      type: file.type.startsWith('video') ? 'video' : 'image',
      size: file.size,
    };
    const { data, error } = await db.from('media').insert(row).select('*').single();
    if (error) {
      // Do not leave an orphan object behind if the row insert fails.
      await db.storage.from(MEDIA_BUCKET).remove([path]);
      throw new Error(`Failed to record media: ${error.message}`);
    }
    return data as MediaItem;
  },

  async deleteMedia(item) {
    const db = requireSupabase();
    const { error: storageError } = await db.storage.from(MEDIA_BUCKET).remove([item.path]);
    fail('Failed to remove file', storageError);
    const { error } = await db.from('media').delete().eq('id', item.id);
    fail('Failed to remove media record', error);
  },

  async submitMessage(input) {
    const db = requireSupabase();
    const { error } = await db.from('messages').insert(input);
    fail('Failed to send message', error);
  },

  async listMessages() {
    const db = requireSupabase();
    const { data, error } = await db
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });
    fail('Failed to load messages', error);
    return (data ?? []) as ContactMessage[];
  },

  async markMessageRead(id, read) {
    const db = requireSupabase();
    const { error } = await db.from('messages').update({ read }).eq('id', id);
    fail('Failed to update message', error);
  },

  async deleteMessage(id) {
    const db = requireSupabase();
    const { error } = await db.from('messages').delete().eq('id', id);
    fail('Failed to delete message', error);
  },
};
