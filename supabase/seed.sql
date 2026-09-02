-- =====================================================================
--  Portfolio — starting content
--  Run after schema.sql. Safe to re-run: it only fills in what is missing.
--  Every value here is editable from the dashboard afterwards.
-- =====================================================================

-- ---------------------------------------------------------------------
--  Site content
-- ---------------------------------------------------------------------

insert into public.site_content (key, value) values
('hero', jsonb_build_object(
  'label',              'ADNAN MOHAMMED • AI ENGINEER',
  'heading',            'I build intelligent digital experiences.',
  'description',        'I design and develop AI-powered products, interactive experiences, and modern digital systems.',
  'primary_cta_text',   'View My Work',
  'primary_cta_url',    '#works',
  'secondary_cta_text', 'About Me',
  'secondary_cta_url',  '#about'
)),
('about', jsonb_build_object(
  'heading',        'About Me',
  'short_bio',      'I''m Adnan Mohammed — an AI engineer and developer focused on turning ideas into intelligent, useful digital experiences.',
  'long_bio',       'I work across artificial intelligence, machine learning, software development, and interactive digital products. I enjoy exploring new technologies, building practical systems, and transforming complex ideas into simple experiences.',
  'profile_image',  null,
  'secondary_info', 'Available for selected freelance and collaboration work.'
)),
('contact', jsonb_build_object(
  'heading',   'Let''s work together',
  'intro',     'Have a product, a research idea, or an interface that needs to feel alive? Tell Adnan about it.',
  'email',     'hello@example.com',
  'phone',     '',
  'github',    'https://github.com/',
  'linkedin',  'https://linkedin.com/',
  'instagram', '',
  'x',         '',
  'location',  'Remote / Worldwide'
)),
('settings', jsonb_build_object(
  'site_name',        'Adnan Mohammed Adnan',
  'alt_names',        'Adnan Mohammed Alzubaidy, Adnan Mohammed, Adnan M. Adnan, عدنان محمد عدنان, عدنان محمد الزبيدي, عدنان محمد',
  'logo_text',        'Adnan Mohammed',
  'seo_title',        'Adnan Mohammed Adnan — AI Engineer & Developer',
  'seo_description',  'I design and develop AI-powered products, interactive experiences, and modern digital systems.',
  'og_image',         null,
  'favicon',          null,
  'footer_copyright', '© ' || extract(year from now())::text || ' Adnan Mohammed. All rights reserved.',
  'status_text',      'Open to new projects'
))
on conflict (key) do nothing;

-- ---------------------------------------------------------------------
--  Skills
-- ---------------------------------------------------------------------

insert into public.skills (name, category, sort_order)
select * from (values
  ('Artificial Intelligence', 'Core',       0),
  ('Machine Learning',        'Core',       1),
  ('Python',                  'Languages',  2),
  ('PyTorch',                 'Frameworks', 3),
  ('TensorFlow',              'Frameworks', 4),
  ('Computer Vision',         'Core',       5),
  ('NLP',                     'Core',       6),
  ('React',                   'Frontend',   7),
  ('TypeScript',              'Languages',  8),
  ('Flutter',                 'Frontend',   9),
  ('APIs',                    'Backend',   10),
  ('RAG',                     'Core',      11),
  ('LLMs',                    'Core',      12)
) as seed(name, category, sort_order)
where not exists (select 1 from public.skills);

-- ---------------------------------------------------------------------
--  Experience
-- ---------------------------------------------------------------------

insert into public.experience (date_range, position, organization, description, sort_order)
select * from (values
  ('2024 — Present', 'AI Engineer',      'Independent',
   'Designing and shipping AI-driven products end to end: data pipelines, model integration, evaluation, and the interfaces people actually use.', 0),
  ('2023 — 2024',    'Software Developer', 'Freelance',
   'Built web and mobile products for clients, from first prototype through to production deployment and maintenance.', 1),
  ('2021 — 2023',    'Machine Learning', 'Research & Study',
   'Focused on machine learning fundamentals, computer vision, and applied research projects.', 2)
) as seed(date_range, position, organization, description, sort_order)
where not exists (select 1 from public.experience);

-- ---------------------------------------------------------------------
--  Example projects — delete these once real work is in place.
-- ---------------------------------------------------------------------

insert into public.projects (
  title, slug, short_description, full_description,
  technologies, category, year, featured, published, sort_order
)
select * from (values
  ('AI Student Assistant', 'ai-student-assistant',
   'A retrieval-augmented assistant that turns course material into an answerable knowledge base.',
   'A retrieval-augmented assistant built for students. Course documents are chunked, embedded and indexed, then served through a conversational interface that cites the exact source of every answer. The system combines a vector store, a re-ranking layer and a streaming response pipeline so answers arrive as they are generated.',
   array['Python','RAG','LLMs','FastAPI','PostgreSQL'], 'Artificial Intelligence', '2025', true, true, 0),

  ('LABRIDGE', 'labridge',
   'A dental clinic and laboratory platform built around one shared order pipeline.',
   'LABRIDGE connects dental clinics with laboratories through a shared order lifecycle: service catalogue, tooth selection, attachments and 3D scans, real-time status tracking and delivery. Built as a Flutter client on a Postgres backend with row-level security and realtime events.',
   array['Flutter','Dart','Supabase','PostgreSQL','Realtime'], 'Product Engineering', '2025', false, true, 1),

  ('Neural Genetic Inheritance', 'neural-genetic-inheritance',
   'Evolving neural network weights through genetic crossover instead of gradient descent.',
   'A research experiment where populations of small neural networks reproduce: weights are treated as genomes, recombined through crossover and mutated under selection pressure. The project compares convergence behaviour against standard gradient-based training on identical tasks.',
   array['Python','PyTorch','NumPy','Machine Learning'], 'Research', '2024', false, true, 2),

  ('Computer Vision System', 'computer-vision-system',
   'Real-time detection and tracking pipeline optimised for edge deployment.',
   'An end-to-end computer vision pipeline: capture, pre-processing, detection, multi-object tracking and event reporting. Models were quantised and profiled so the pipeline holds real-time frame rates on constrained hardware.',
   array['Computer Vision','PyTorch','OpenCV','ONNX'], 'Computer Vision', '2024', false, true, 3),

  ('AI-Powered Applications', 'ai-powered-applications',
   'A collection of production interfaces where language models do real work behind a calm UI.',
   'A set of applications where the model is an implementation detail rather than the product: structured extraction, classification, summarisation and assisted authoring, each wrapped in an interface that stays predictable when the model is not.',
   array['React','TypeScript','LLMs','APIs'], 'Applications', '2025', false, true, 4)
) as seed(title, slug, short_description, full_description,
          technologies, category, year, featured, published, sort_order)
where not exists (select 1 from public.projects);

-- ---------------------------------------------------------------------
--  Grant yourself admin
--
--  1. Create the account first: Authentication → Users → Add user.
--  2. Replace the email below and run this statement.
-- ---------------------------------------------------------------------

-- insert into public.admin_users (user_id, email)
-- select id, email from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;
