-- Stretching module: a built-in stretch library + client soreness reports.
--
-- A client taps where they're sore (FOCUS_AREAS body areas) and the app surfaces
-- stretches for those areas. Trainers get a built-in starter library to rely on,
-- can author their own (trainer_id set), and gain visibility into client soreness.
-- Ownership/RLS mirror `videos` (0010) + the owner tier (0009).

create table if not exists public.stretches (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid references public.profiles(user_id) on delete cascade,
  name text not null,
  regions text[] not null default '{}',          -- FOCUS_AREAS keys this stretch helps
  instructions text not null,
  steps text[],                                   -- optional ordered steps
  hold_seconds int,                               -- optional hold/duration
  video_id uuid references public.videos(id) on delete set null,
  sort_order int not null default 0,
  status text not null default 'live' check (status in ('draft', 'live', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists stretches_trainer_idx on public.stretches(trainer_id);

alter table public.stretches enable row level security;

create policy "trainer manages own stretches"
  on public.stretches for all
  using (trainer_id = auth.uid())
  with check (trainer_id = auth.uid());

create policy "read live built-in stretches"
  on public.stretches for select
  using (trainer_id is null and status = 'live');

create policy "client reads their trainer's live stretches"
  on public.stretches for select
  using (
    status = 'live'
    and trainer_id = (select trainer_id from public.profiles where user_id = auth.uid())
  );

create policy "owner reads all stretches"
  on public.stretches for select
  using (public.is_owner());

-- ─────────────────────────────────────────────────────────────────────────
-- soreness_reports — a client logs where they're sore; their trainer sees it.
-- Mirrors client_attempts (0001): client owns their rows, trainer reads theirs.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.soreness_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(user_id) on delete cascade,
  trainer_id uuid references public.profiles(user_id) on delete set null,
  regions text[] not null default '{}',
  severity text check (severity is null or severity in ('mild', 'moderate', 'strong')),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists soreness_trainer_idx on public.soreness_reports(trainer_id, created_at desc);
create index if not exists soreness_client_idx on public.soreness_reports(client_id, created_at desc);

alter table public.soreness_reports enable row level security;

create policy "client manages own soreness"
  on public.soreness_reports for all
  using (client_id = auth.uid())
  with check (client_id = auth.uid());

create policy "trainer reads client soreness"
  on public.soreness_reports for select
  using (trainer_id = auth.uid());

create policy "owner reads all soreness"
  on public.soreness_reports for select
  using (public.is_owner());

-- ─────────────────────────────────────────────────────────────────────────
-- Built-in starter stretch library (trainer_id null = platform-provided).
-- Gentle mobility suggestions, not medical advice.
-- ─────────────────────────────────────────────────────────────────────────
insert into public.stretches (name, regions, instructions, hold_seconds, sort_order) values
('Doorway pec stretch', '{shoulder}',
 'Stand in a doorway with your forearms on the frame at shoulder height. Step one foot through until you feel a gentle stretch across the chest and front of the shoulders. Keep your ribs down.', 30, 10),
('Cross-body shoulder stretch', '{shoulder}',
 'Bring one arm straight across your chest. Use the other hand to gently draw it closer until you feel a stretch in the back of the shoulder.', 30, 20),
('Wall slides', '{shoulder,spine}',
 'Stand with your back against a wall, arms up in a goal-post position. Slowly slide your arms up and down, keeping wrists and elbows lightly in contact with the wall.', null, 30),
('Wrist flexor stretch', '{elbow}',
 'Extend one arm, palm up. With the other hand, gently pull the fingers back and down until you feel a stretch through the forearm and inner elbow.', 20, 40),
('Wrist extensor stretch', '{elbow}',
 'Extend one arm, palm down. Gently draw the back of the hand toward you until you feel a stretch along the top of the forearm.', 20, 50),
('Figure-4 glute stretch', '{hip}',
 'Lie on your back. Cross one ankle over the opposite knee, then draw that thigh toward your chest until you feel a stretch in the glute and outer hip.', 30, 60),
('Kneeling hip flexor stretch', '{hip}',
 'Half-kneel with one knee down. Gently tuck your pelvis and shift forward until you feel a stretch at the front of the hip of the down leg.', 30, 70),
('90/90 hip switch', '{hip}',
 'Sit with both knees bent at 90 degrees, one shin in front and one out to the side. Stay tall and rotate slowly from side to side to open the hips.', 20, 80),
('Standing quad stretch', '{knee}',
 'Stand tall, holding a wall for balance. Bend one knee and hold that ankle behind you, knees together, until you feel a stretch in the front of the thigh.', 30, 90),
('Seated hamstring stretch', '{knee}',
 'Sit with one leg extended. Hinge gently from the hips with a long back until you feel a stretch behind the thigh and knee.', 30, 100),
('Calf stretch (upper)', '{ankle}',
 'In a staggered stance, keep the back leg straight with the heel down and lean into a wall until you feel a stretch in the upper calf.', 30, 110),
('Calf stretch (lower)', '{ankle}',
 'From the same staggered stance, bend the back knee slightly with the heel down to shift the stretch lower toward the ankle.', 30, 120),
('Ankle circles', '{ankle}',
 'Lift one foot and slowly draw large circles with your toes in both directions to mobilize the ankle.', 20, 130),
('Cat-cow', '{spine}',
 'On hands and knees, slowly alternate between gently rounding your spine toward the ceiling and softly arching it, moving with your breath.', null, 140),
('Child''s pose', '{spine}',
 'From hands and knees, sit your hips back toward your heels and reach your arms forward, letting your back and shoulders relax.', 45, 150),
('Open-book thoracic rotation', '{spine}',
 'Lie on your side with knees bent and arms stacked in front. Open the top arm toward the floor behind you, following it with your eyes, then return.', 20, 160),
('Seated spinal twist', '{spine}',
 'Sit tall and cross one knee over the other. Gently rotate your torso toward the top knee, using your arm for a light assist.', 30, 170),
('Neck side-bend stretch', '{cervical}',
 'Sitting tall, gently tilt one ear toward that shoulder until you feel a stretch along the side of the neck. Keep both shoulders relaxed.', 20, 180),
('Levator scapulae stretch', '{cervical}',
 'Turn your head about 45 degrees toward your armpit, then gently nod downward until you feel a stretch in the back and side of the neck.', 20, 190),
('Chin tucks', '{cervical}',
 'Sitting tall, gently draw your chin straight back to make a light "double chin" without tipping your head. Hold briefly, then release.', 10, 200);
