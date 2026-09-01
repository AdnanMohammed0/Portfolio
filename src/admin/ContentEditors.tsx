import { useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ImageIcon, Plus, Trash2 } from 'lucide-react';
import type {
  AboutContent,
  ContactContent,
  Experience,
  HeroContent,
  MediaItem,
  SettingsContent,
  SiteContent,
  TelegramSettings,
  SiteContentKey,
  Skill,
} from '@/types';
import { content } from '@/services/content';
import { usePortfolio } from '@/hooks/usePortfolio';
import { Skeleton } from '@/components/primitives';
import { reorder, uid } from '@/lib/utils';
import {
  Button,
  Field,
  IconButton,
  Notice,
  Panel,
  SaveBar,
  TextArea,
  TextInput,
  Toggle,
  useSave,
} from './ui';
import { MediaPicker } from './MediaPicker';

function PageHeader({ eyebrow, title, hint }: { eyebrow: string; title: string; hint?: string }) {
  return (
    <header>
      <p className="label-xs">{eyebrow}</p>
      <h1 className="mt-3 text-3xl tracking-tightest sm:text-4xl">{title}</h1>
      {hint && <p className="mt-2 max-w-2xl text-sm text-white/40">{hint}</p>}
    </header>
  );
}

/**
 * Shared editing shell for a single `site_content` section. Loads the current
 * value, tracks a local draft, and writes it back through the provider.
 */
function useSection<K extends SiteContentKey>(key: K) {
  const { refresh } = usePortfolio();
  const { state, error, run } = useSave();
  const [draft, setDraft] = useState<SiteContent[K] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    content
      .getContent()
      .then((all) => active && setDraft(all[key]))
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, [key]);

  function set<F extends keyof SiteContent[K]>(field: F, value: SiteContent[K][F]) {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  }

  async function save() {
    if (!draft) return;
    const ok = await run(() => content.saveContentSection(key, draft));
    if (ok) await refresh();
  }

  return { draft, set, save, state, error, loadError };
}

function EditorSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-72 w-full" />
    </div>
  );
}

/* ------------------------------------------------------------------ Hero */

export function HeroEditor() {
  const { draft, set, save, state, error, loadError } = useSection('hero');
  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!draft) return <EditorSkeleton />;

  const hero = draft as HeroContent;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Hero"
        hint="The first thing visitors read. The interactive hand is controlled by the application configuration, not by these fields."
      />

      <Panel title="Copy">
        <div className="space-y-4">
          <Field label="Label" id="h-label" hint="The small uppercase line above the heading.">
            <TextInput id="h-label" value={hero.label} onChange={(v) => set('label', v)} />
          </Field>
          <Field label="Heading" id="h-heading">
            <TextArea id="h-heading" rows={2} value={hero.heading} onChange={(v) => set('heading', v)} />
          </Field>
          <Field label="Description" id="h-desc">
            <TextArea
              id="h-desc"
              rows={3}
              value={hero.description}
              onChange={(v) => set('description', v)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="Call to action" description="Use #section for in-page links, or a full URL.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Primary button text" id="h-cta1">
            <TextInput
              id="h-cta1"
              value={hero.primary_cta_text}
              onChange={(v) => set('primary_cta_text', v)}
            />
          </Field>
          <Field label="Primary button link" id="h-cta1u">
            <TextInput
              id="h-cta1u"
              value={hero.primary_cta_url}
              onChange={(v) => set('primary_cta_url', v)}
            />
          </Field>
          <Field label="Secondary button text" id="h-cta2">
            <TextInput
              id="h-cta2"
              value={hero.secondary_cta_text}
              onChange={(v) => set('secondary_cta_text', v)}
            />
          </Field>
          <Field label="Secondary button link" id="h-cta2u">
            <TextInput
              id="h-cta2u"
              value={hero.secondary_cta_url}
              onChange={(v) => set('secondary_cta_url', v)}
            />
          </Field>
        </div>
      </Panel>

      <SaveBar state={state} error={error} onSave={() => void save()} />
    </div>
  );
}

/* ----------------------------------------------------------------- About */

export function AboutEditor() {
  const { draft, set, save, state, error, loadError } = useSection('about');
  const [picker, setPicker] = useState(false);

  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!draft) return <EditorSkeleton />;

  const about = draft as AboutContent;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Content" title="About Me" />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Panel title="Biography">
            <div className="space-y-4">
              <Field label="Heading" id="a-heading">
                <TextInput id="a-heading" value={about.heading} onChange={(v) => set('heading', v)} />
              </Field>
              <Field label="Short bio" id="a-short" hint="The large opening line.">
                <TextArea
                  id="a-short"
                  rows={3}
                  value={about.short_bio}
                  onChange={(v) => set('short_bio', v)}
                />
              </Field>
              <Field label="Long bio" id="a-long">
                <TextArea
                  id="a-long"
                  rows={7}
                  value={about.long_bio}
                  onChange={(v) => set('long_bio', v)}
                />
              </Field>
              <Field
                label="Secondary line"
                id="a-secondary"
                hint="Shown with a status dot. Leave blank to hide."
              >
                <TextInput
                  id="a-secondary"
                  value={about.secondary_info}
                  onChange={(v) => set('secondary_info', v)}
                />
              </Field>
            </div>
          </Panel>
        </div>

        <Panel title="Profile image">
          <div
            className="aspect-[4/5] overflow-hidden rounded-xl border border-white/10"
            style={{ backgroundColor: 'var(--surface-2)' }}
          >
            {about.profile_image ? (
              <img src={about.profile_image} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-white/25">
                <ImageIcon size={22} aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setPicker(true)}>
              {about.profile_image ? 'Replace' : 'Select'}
            </Button>
            {about.profile_image && (
              <Button variant="ghost" onClick={() => set('profile_image', null)}>
                Remove
              </Button>
            )}
          </div>
        </Panel>
      </div>

      <SaveBar state={state} error={error} onSave={() => void save()} />

      <MediaPicker
        open={picker}
        title="Select a profile image"
        selectedUrls={about.profile_image ? [about.profile_image] : []}
        onClose={() => setPicker(false)}
        onSelect={(item: MediaItem) => {
          set('profile_image', item.url);
          setPicker(false);
        }}
      />
    </div>
  );
}

/* --------------------------------------------------------------- Contact */

export function ContactEditor() {
  const { draft, set, save, state, error, loadError } = useSection('contact');
  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!draft) return <EditorSkeleton />;

  const contact = draft as ContactContent;

  const fields: Array<[keyof ContactContent, string, string?]> = [
    ['email', 'Email', 'you@example.com'],
    ['phone', 'Phone'],
    ['location', 'Location'],
    ['github', 'GitHub', 'https://github.com/username'],
    ['linkedin', 'LinkedIn', 'https://linkedin.com/in/username'],
    ['instagram', 'Instagram'],
    ['x', 'X'],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Contact"
        hint="Leave a field blank to hide it from the site."
      />

      <Panel title="Section copy">
        <div className="space-y-4">
          <Field label="Heading" id="c-heading">
            <TextInput id="c-heading" value={contact.heading} onChange={(v) => set('heading', v)} />
          </Field>
          <Field label="Intro" id="c-intro">
            <TextArea id="c-intro" rows={2} value={contact.intro} onChange={(v) => set('intro', v)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Details">
        <div className="grid gap-4 sm:grid-cols-2">
          {fields.map(([key, label, placeholder]) => (
            <Field key={key} label={label} id={`c-${key}`}>
              <TextInput
                id={`c-${key}`}
                value={contact[key]}
                placeholder={placeholder}
                onChange={(v) => set(key, v)}
              />
            </Field>
          ))}
        </div>
      </Panel>

      <SaveBar state={state} error={error} onSave={() => void save()} />
    </div>
  );
}

/* -------------------------------------------------------------- Settings */

export function SettingsEditor() {
  const { draft, set, save, state, error, loadError } = useSection('settings');
  const [picker, setPicker] = useState<'og' | 'favicon' | null>(null);

  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!draft) return <EditorSkeleton />;

  const settings = draft as SettingsContent;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Configuration" title="Settings" />

      <Panel title="Site">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site name" id="s-name">
            <TextInput id="s-name" value={settings.site_name} onChange={(v) => set('site_name', v)} />
          </Field>
          <Field label="Logo text" id="s-logo" hint="Shown in the navigation and footer.">
            <TextInput id="s-logo" value={settings.logo_text} onChange={(v) => set('logo_text', v)} />
          </Field>
          <Field label="Footer copyright" id="s-copy">
            <TextInput
              id="s-copy"
              value={settings.footer_copyright}
              onChange={(v) => set('footer_copyright', v)}
            />
          </Field>
          <Field label="Status text" id="s-status" hint="Small line in the footer. Blank to hide.">
            <TextInput
              id="s-status"
              value={settings.status_text}
              onChange={(v) => set('status_text', v)}
            />
          </Field>
        </div>
      </Panel>

      <Panel title="SEO" description="Used for search results and social previews.">
        <div className="space-y-4">
          <Field label="Page title" id="s-seo-title">
            <TextInput
              id="s-seo-title"
              value={settings.seo_title}
              onChange={(v) => set('seo_title', v)}
            />
          </Field>
          <Field
            label="Meta description"
            id="s-seo-desc"
            hint="Around 150–160 characters works best."
          >
            <TextArea
              id="s-seo-desc"
              rows={3}
              value={settings.seo_description}
              onChange={(v) => set('seo_description', v)}
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label-xs mb-2">Open Graph image</p>
              <div
                className="aspect-[1.91/1] overflow-hidden rounded-xl border border-white/10"
                style={{ backgroundColor: 'var(--surface-2)' }}
              >
                {settings.og_image && (
                  <img src={settings.og_image} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => setPicker('og')}>
                  Select
                </Button>
                {settings.og_image && (
                  <Button variant="ghost" onClick={() => set('og_image', null)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>

            <div>
              <p className="label-xs mb-2">Favicon</p>
              <div
                className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-white/10"
                style={{ backgroundColor: 'var(--surface-2)' }}
              >
                {settings.favicon && (
                  <img src={settings.favicon} alt="" className="h-full w-full object-contain" />
                )}
              </div>
              <div className="mt-2 flex gap-2">
                <Button variant="ghost" onClick={() => setPicker('favicon')}>
                  Select
                </Button>
                {settings.favicon && (
                  <Button variant="ghost" onClick={() => set('favicon', null)}>
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </Panel>

      <SaveBar state={state} error={error} onSave={() => void save()} />

      <TelegramPanel />

      <MediaPicker
        open={picker !== null}
        title={picker === 'og' ? 'Select an Open Graph image' : 'Select a favicon'}
        onClose={() => setPicker(null)}
        onSelect={(item: MediaItem) => {
          set(picker === 'og' ? 'og_image' : 'favicon', item.url);
          setPicker(null);
        }}
      />
    </div>
  );
}

/* --------------------------------------------------- Telegram integration */

/**
 * Credentials live in `integration_settings`, not `site_content`.
 *
 * `site_content` is publicly readable — the public site has to fetch the hero
 * copy from it — so a bot token stored there would be readable by any visitor
 * through the REST API. `integration_settings` has no anon policy at all: only
 * a signed-in administrator can read or write it, and the Edge Function reads
 * it server-side.
 */
function TelegramPanel() {
  const { state, error, run } = useSave();
  const [draft, setDraft] = useState<TelegramSettings | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reveal, setReveal] = useState(false);

  useEffect(() => {
    let active = true;
    content
      .getIntegrationSettings()
      .then((value) => active && setDraft(value.telegram))
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  if (loadError) {
    return (
      <Panel title="Telegram notifications">
        <p className="text-sm text-red-300/80">{loadError}</p>
      </Panel>
    );
  }

  if (!draft) {
    return (
      <Panel title="Telegram notifications">
        <Skeleton className="h-32 w-full" />
      </Panel>
    );
  }

  const set = <K extends keyof TelegramSettings>(key: K, value: TelegramSettings[K]) =>
    setDraft((current) => (current ? { ...current, [key]: value } : current));

  const save = () => run(() => content.saveIntegrationSettings({ telegram: draft }));

  return (
    <Panel
      title="Telegram notifications"
      description="Forward contact-form messages to a Telegram bot."
    >
      <div className="space-y-4">
        <Notice tone="info">
          These values are stored in a table only administrators can read, and are
          never sent to the public site. Messages are saved to the database first,
          so a delivery failure never loses one.
        </Notice>

        <Toggle
          label="Send notifications"
          hint="Turn off to keep the credentials but stop delivery"
          checked={draft.enabled}
          onChange={(v) => set('enabled', v)}
        />

        <Field
          label="Bot token"
          id="tg-token"
          hint="From @BotFather. Revoke and replace it if it is ever exposed."
        >
          <div className="flex gap-2">
            <TextInput
              id="tg-token"
              type={reveal ? 'text' : 'password'}
              value={draft.bot_token}
              onChange={(v) => set('bot_token', v.trim())}
              placeholder="123456789:AA…"
            />
            <Button variant="ghost" onClick={() => setReveal((v) => !v)}>
              {reveal ? 'Hide' : 'Show'}
            </Button>
          </div>
        </Field>

        <Field
          label="Chat ID"
          id="tg-chat"
          hint="Message the bot once, then read result[0].message.chat.id from /getUpdates."
        >
          <TextInput
            id="tg-chat"
            value={draft.chat_id}
            onChange={(v) => set('chat_id', v.trim())}
            placeholder="7747273064"
          />
        </Field>

        <SaveBar state={state} error={error} onSave={() => void save()} />
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- Skills */

export function SkillsEditor() {
  const { refresh } = usePortfolio();
  const { state, error, run } = useSave();
  const [skills, setSkills] = useState<Skill[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    content
      .listSkills()
      .then((list) => active && setSkills(list))
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!skills) return <EditorSkeleton />;

  const update = (id: string, patch: Partial<Skill>) =>
    setSkills((current) => current?.map((s) => (s.id === id ? { ...s, ...patch } : s)) ?? null);

  async function save() {
    const ok = await run(async () => {
      const saved = await content.saveSkills(skills ?? []);
      setSkills(saved);
    });
    if (ok) await refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Skills"
        hint="Grouped by category on the public site, in the order set here."
      />

      <Panel
        title={`${skills.length} skill${skills.length === 1 ? '' : 's'}`}
        actions={
          <Button
            variant="ghost"
            onClick={() =>
              setSkills([
                ...skills,
                { id: uid('skill'), name: '', category: 'Core', sort_order: skills.length },
              ])
            }
          >
            <Plus size={14} aria-hidden="true" />
            Add skill
          </Button>
        }
      >
        {skills.length === 0 ? (
          <p className="text-sm text-white/30">No skills yet.</p>
        ) : (
          <ul className="space-y-2">
            {skills.map((skill, index) => (
              <li key={skill.id} className="flex flex-wrap items-center gap-2">
                <input
                  value={skill.name}
                  aria-label={`Skill ${index + 1} name`}
                  placeholder="Skill name"
                  onChange={(e) => update(skill.id, { name: e.target.value })}
                  className="field flex-1 basis-48"
                />
                <input
                  value={skill.category}
                  aria-label={`Skill ${index + 1} category`}
                  placeholder="Category"
                  onChange={(e) => update(skill.id, { category: e.target.value })}
                  className="field basis-40 sm:max-w-[12rem]"
                />
                <IconButton
                  label="Move up"
                  disabled={index === 0}
                  onClick={() => setSkills(reorder(skills, index, index - 1))}
                >
                  <ArrowUp size={14} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label="Move down"
                  disabled={index === skills.length - 1}
                  onClick={() => setSkills(reorder(skills, index, index + 1))}
                >
                  <ArrowDown size={14} aria-hidden="true" />
                </IconButton>
                <IconButton
                  label={`Delete ${skill.name || 'skill'}`}
                  danger
                  onClick={() => setSkills(skills.filter((s) => s.id !== skill.id))}
                >
                  <Trash2 size={14} aria-hidden="true" />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <SaveBar state={state} error={error} onSave={() => void save()} />
    </div>
  );
}

/* ------------------------------------------------------------ Experience */

export function ExperienceEditor() {
  const { refresh } = usePortfolio();
  const { state, error, run } = useSave();
  const [entries, setEntries] = useState<Experience[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    content
      .listExperience()
      .then((list) => active && setEntries(list))
      .catch((cause: unknown) =>
        active ? setLoadError(cause instanceof Error ? cause.message : 'Failed to load') : undefined,
      );
    return () => {
      active = false;
    };
  }, []);

  if (loadError) return <p className="text-sm text-red-300/80">{loadError}</p>;
  if (!entries) return <EditorSkeleton />;

  const update = (id: string, patch: Partial<Experience>) =>
    setEntries((current) => current?.map((e) => (e.id === id ? { ...e, ...patch } : e)) ?? null);

  async function save() {
    const ok = await run(async () => {
      const saved = await content.saveExperience(entries ?? []);
      setEntries(saved);
    });
    if (ok) await refresh();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Content"
        title="Experience"
        hint="Displayed as a timeline, newest first — order them here."
      />

      <div className="space-y-4">
        {entries.length === 0 ? (
          <Panel>
            <p className="text-sm text-white/30">Add your first experience entry.</p>
          </Panel>
        ) : (
          entries.map((entry, index) => (
            <Panel
              key={entry.id}
              actions={
                <div className="flex gap-1">
                  <IconButton
                    label="Move up"
                    disabled={index === 0}
                    onClick={() => setEntries(reorder(entries, index, index - 1))}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === entries.length - 1}
                    onClick={() => setEntries(reorder(entries, index, index + 1))}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    label="Delete entry"
                    danger
                    onClick={() => setEntries(entries.filter((e) => e.id !== entry.id))}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </IconButton>
                </div>
              }
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Date range" id={`e-date-${entry.id}`}>
                  <TextInput
                    id={`e-date-${entry.id}`}
                    value={entry.date_range}
                    placeholder="2024 — Present"
                    onChange={(v) => update(entry.id, { date_range: v })}
                  />
                </Field>
                <Field label="Position" id={`e-pos-${entry.id}`}>
                  <TextInput
                    id={`e-pos-${entry.id}`}
                    value={entry.position}
                    onChange={(v) => update(entry.id, { position: v })}
                  />
                </Field>
                <Field label="Organization" id={`e-org-${entry.id}`}>
                  <TextInput
                    id={`e-org-${entry.id}`}
                    value={entry.organization}
                    onChange={(v) => update(entry.id, { organization: v })}
                  />
                </Field>
              </div>
              <div className="mt-4">
                <Field label="Description" id={`e-desc-${entry.id}`}>
                  <TextArea
                    id={`e-desc-${entry.id}`}
                    rows={3}
                    value={entry.description}
                    onChange={(v) => update(entry.id, { description: v })}
                  />
                </Field>
              </div>
            </Panel>
          ))
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          onClick={() =>
            setEntries([
              ...entries,
              {
                id: uid('exp'),
                date_range: '',
                position: '',
                organization: '',
                description: '',
                sort_order: entries.length,
              },
            ])
          }
        >
          <Plus size={14} aria-hidden="true" />
          Add entry
        </Button>
      </div>

      <SaveBar state={state} error={error} onSave={() => void save()} />
    </div>
  );
}
