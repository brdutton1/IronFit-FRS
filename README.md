# IronFit Movement Mirror (v1)

A mobile-first web app that helps IronFit clients rehearse Functional Range
Systems movements between sessions. Lee (FRC/FRA certified) records reference
videos; the app extracts joint-angle data from them, then gives clients live,
joint-by-joint feedback while they perform the same movement in front of their
phone camera.

> **It's a mirror with a memory, not a coach.** Lee defines what correct looks
> like. The app helps the client rehearse it accurately. It does not invent
> movements, prescribe loads, or progress anyone. Lee does that.

**IronFit Movement Mirror is a coaching tool. It does not diagnose injury or
replace in-person assessment by a qualified practitioner.**

---

## Table of contents

1. [What works in v1](#what-works-in-v1)
2. [For Lee — recording a good reference (5 minutes)](#for-lee--recording-a-good-reference-5-minutes)
3. [For developers — setup](#for-developers--setup)
4. [Supabase setup](#supabase-setup)
5. [Architecture](#architecture)
6. [Testing](#testing)
7. [Accessibility](#accessibility)
8. [What I expect to break — read this](#what-i-expect-to-break--read-this)
9. [Thresholds (all tunable, with reasoning)](#thresholds-all-tunable-with-reasoning)

---

## What works in v1

- **Trainer:** magic-link sign-in, movement list, full movement editor, video
  upload (resumable), **in-browser reference extraction**, reference review with
  trajectory plots and per-joint confidence, publish/unpublish.
- **Client:** magic-link sign-in, filterable movement library, movement detail
  with reference video + cues, **live performance screen** (skeleton overlay,
  colored joints, ROM meter, compensation banners, frame-rate warning), summary
  screen (your curve vs Lee's, ROM %, compensations, drift, confidence notes),
  and a local last-10 history.
- **Honest confidence** on every joint, and explicit "rotation is approximate"
  labelling for shoulder/hip rotation seen from the front.
- **Privacy:** no client video or pose data ever leaves the device. Attempt
  records store only ROM % + compensation flags.

---

## For Lee — recording a good reference (5 minutes)

The whole app is only as good as your reference video. Spend the five minutes.

**1. Frame the whole body.** Stand the phone up (a small tripod or lean it on
something solid) so your **entire body** is in the shot — head to feet — with a
hand-width of space around you. If a joint leaves the frame, the app can't see it.

**2. Use the recommended angle for the movement.**
- **Front-on** is best for things that open out to the side (shoulder/hip
  abduction, most CARs you want to see symmetrically).
- **Side-on** is best for flexion/extension and for **anything that rotates**
  (shoulder or hip internal/external rotation). A single camera can't see
  rotation well from the front — see the honesty note below.
- Set the angle in the movement form so the app knows what to expect.

**3. Light it from the front.** Face a window or a light. Avoid a bright window
*behind* you (you'll be a silhouette and the tracking gets noisy).

**4. Wear something the camera can read.** Fitted clothing in a color that
contrasts with the background. Baggy clothes hide where your joints actually are.

**5. Move at the speed you want the client to move.** Do the movement cleanly,
the way you'd demo it in person. For a CAR, one slow, controlled rotation is
plenty. If the clip shows several reps, tick **"multiple reps"** before uploading
so the app counts them.

**6. Keep it short.** Up to 60 seconds, up to 100 MB, MP4. 10–20 seconds is
usually ideal.

**After upload:** the app analyzes the video frame by frame (this runs on your
phone/laptop and takes a little while — watch the progress bar). Then you'll see:
- the joint-angle **curves** it extracted,
- the **peak ROM** for each target joint,
- a **confidence** badge per joint.

If any target joint says **low confidence** (or the banner says reference
quality is low), re-shoot: better light, the recommended angle, full body in
frame. Then **Publish** to make it live for your clients.

### Setting up roles (one-time, with the developer)

By default everyone who signs in is a **client**. To make your own account the
**trainer**, and to attach clients to you, run two small SQL snippets (the
developer can do this in the Supabase dashboard → SQL editor):

```sql
-- Make Lee a trainer:
update profiles set role = 'trainer' where user_id =
  (select id from auth.users where email = 'lee@example.com');

-- Attach a client to Lee:
update profiles set trainer_id =
  (select id from auth.users where email = 'lee@example.com')
  where user_id = (select id from auth.users where email = 'client@example.com');
```

---

## For developers — setup

Requirements: **Node 20+** and **npm**.

```bash
npm install
cp .env.example .env        # then fill in your Supabase values (see below)
npm run dev                 # starts Vite on 0.0.0.0:5173
```

Vite prints a **Network** URL (e.g. `http://192.168.1.50:5173`). Open that on a
phone on the same Wi-Fi to test the camera. Note iOS Safari requires **HTTPS**
for `getUserMedia` except on `localhost` — see [camera on a phone](#camera-on-a-phone-https).

Scripts:

| command | what it does |
| --- | --- |
| `npm run dev` | dev server, `--host 0.0.0.0` |
| `npm run build` | typecheck + production build to `dist/` |
| `npm run preview` | serve the production build |
| `npm test` | Vitest unit/logic suite (geometry, extraction, comparison) |
| `npm run test:e2e` | Playwright smoke tests (needs `npx playwright install` first) |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc` only |

### Camera on a phone (HTTPS)

`getUserMedia` only works over HTTPS or on `localhost`. To test the live screen
on a phone over your LAN, either deploy to Vercel (HTTPS) or tunnel the dev
server (e.g. `npx localtunnel --port 5173` / `ngrok http 5173`) and open the
HTTPS URL on the phone.

---

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. **Run the migration.** Either paste `supabase/migrations/0001_init.sql` into
   the dashboard SQL editor, or use the CLI:
   ```bash
   supabase link --project-ref <ref>
   supabase db push
   ```
   This creates `profiles`, `movements`, `client_attempts`, the two private
   storage buckets, all **row-level security** policies, and the trigger that
   auto-creates a profile on signup.
3. **Auth:** Authentication → Providers → Email → enable **magic links**. Add
   your dev URL and Vercel URL to Authentication → URL Configuration →
   Redirect URLs.
4. **Env:** copy `Project Settings → API` values into `.env`:
   ```
   VITE_SUPABASE_URL=...
   VITE_SUPABASE_ANON_KEY=...
   VITE_SITE_URL=http://localhost:5173   # or your LAN/Vercel URL
   ```
5. Set roles as shown in [Setting up roles](#setting-up-roles-one-time-with-the-developer).

The app degrades gracefully if env is missing — the sign-in screen shows a
"configure your .env" notice instead of crashing.

### Deploying to Vercel

`vercel.json` is included (Vite framework, SPA rewrites). Add the three `VITE_*`
env vars in the Vercel project settings, set `VITE_SITE_URL` to your Vercel
domain, add that domain to Supabase redirect URLs, and deploy.

---

## Architecture

```
src/
  lib/
    pose/        detector (MediaPipe wrapper), landmarks, angle math, confidence
    reference/   extractor (video → ReferenceDataset), cycle/rep detection, smoothing
    compare/     liveCompare (per-frame scoring), thresholds, compensation detection
    calibration/ camera-angle estimate, body-scale normalization
    supabase/    client, auth, movements, attempts, storage (tus resumable)
    movementOptions.ts, localHistory.ts, session.tsx (auth context)
  components/
    common/ (AppShell, AuthGate, MagicLinkForm, TrajectoryPlot)
    trainer/ (Dashboard, MovementList, MovementEditor, ReferenceUploader, ReferenceReview)
    client/  (Dashboard, MovementLibrary, MovementDetail, PerformanceScreen, SummaryScreen, HistoryList)
    overlay/ (SkeletonOverlay, JointHighlight, RomMeter, CompensationBanner, ConfidenceIndicator)
  types/      movement, reference, attempt, profile
supabase/migrations/0001_init.sql
tests/        pose, reference, compare (Vitest) + fixtures + e2e (Playwright)
```

**Key design choice:** the same MediaPipe model + the same angle math run on
both sides. Reference extraction (trainer) and live comparison (client) compute
identical angle keys, so they're directly comparable. There is **no server-side
ML pipeline in v1** — extraction happens in the browser.

**One deviation from the brief's file list:** routing lives in `src/App.tsx`
(react-router) rather than a `src/routes/` tree — simpler for this size, same
behaviour.

### How live comparison works (and what it deliberately doesn't do)

v1 does **not** try to time-sync the client to Lee's tempo (that's brittle).
Instead each joint locks a **baseline** on the client's first good frame, tracks
their **running peak**, and compares the **range achieved** to the reference
range. A client moving at half Lee's speed still gets honest end-range feedback.
The summary says this out loud.

---

## Testing

`npm test` runs the Vitest suite (55 tests):

- **`tests/pose/angles.test.ts`** — vector geometry + every joint-angle formula
  against hand-computed poses, plus confidence-from-visibility.
- **`tests/reference/`** — smoothing/variance, rep detection, and full reference
  extraction (peak/ROM/variance/confidence/rep count) from synthetic poses.
- **`tests/compare/`** — comparison band boundaries, and three **synthetic
  performances** against fixture references: a perfect match (~100%, green), a
  25%-under performance (~75%, yellow), and a compensating one (target green but
  stillness joint red). Plus compensation mapping + debounce.
- **`tests/fixtures/references/`** — `shoulder-car-clean`, `shoulder-car-compensating`,
  `hip-car-clean` reference datasets.

### End-to-end tests

`tests/e2e/` holds Playwright smoke tests (auth screen renders, route guards
redirect, disclaimer present, accessibility). The deep trainer/client flows are
marked `test.fixme` with the exact steps to enable once a Supabase test project
and a pre-minted session are wired in. Run with:

```bash
npx playwright install     # one-time, downloads browsers
npm run test:e2e
```

### Manual device checklist (iOS Safari + Android Chrome)

Run this on a real 3-year-old phone over HTTPS:

- [ ] Camera permission prompt appears and, once granted, shows live preview
- [ ] Positioning guidance updates as you turn ("turn ~90° to your side")
- [ ] 3-2-1 countdown then live overlay
- [ ] Frame rate holds **≥ 24fps**; if it drops below 15 the warning shows
- [ ] Target joints turn green/yellow/red; stillness joints blue/red
- [ ] Compensation banner fires on a deliberate lumbar/scapular cheat
- [ ] ROM meter fills toward 100% as you reach end range
- [ ] Summary shows your curve vs Lee's, ROM %, and any compensation/drift
- [ ] Backgrounding the app mid-rep (notification) pauses and resumes cleanly
- [ ] Rotation movements from the front show the "approximate" note

---

## Accessibility

Targeting **WCAG 2.1 AA**:

- **Color is never the only signal.** Every colored joint has a text label in
  the live panel ("Right shoulder flexion — moving correctly · 92%") and the ROM
  meter shows a number, not just an arc.
- Keyboard-accessible controls, visible focus rings, a skip-to-content link.
- `prefers-reduced-motion` respected globally.
- Compensation banner uses `role="alert"` / `aria-live` so it's announced.
- The reference video element includes a `<track kind="captions">` slot for the
  captions Lee provides (auto-caption generation is **not** in v1 — see below).
- Color palette chosen for AA contrast on the dark background.

**Audio cues** (speaking Lee's cues aloud) are scoped but **not implemented in
v1** — see edge cases.

---

## What I expect to break — read this

You asked me to tell you what breaks before you have to. Here it is, honestly.

### Movements MediaPipe (2D) will handle poorly

- **Anything rotation-dominant: shoulder IR/ER, hip IR/ER, forearm
  pronation/supination.** 2D pose sees joint *positions*, not twist around a
  limb's long axis. From the front these are guesses. The app **flags them
  approximate** and never shows a confident reading; it nudges the user to also
  film from the side. Forearm pro/sup we don't even attempt to score — the hand
  landmarks aren't reliable enough.
- **Ankle dorsiflexion / anything depending on foot landmarks.** Feet are the
  noisiest landmarks; I cap ankle confidence at "reduced" even when MediaPipe
  claims the foot is visible. Treat ankle numbers as directional, not precise.
- **Deep spinal segmentation (thoracic vs lumbar).** We only have a single
  shoulder-line-to-hip-line proxy. We can tell the trunk is flexing/rotating; we
  **cannot** separate "thoracic flexion" from "lumbar flexion." Compensation
  tags for lumbar vs thoracic both map to the same spinal proxy. Lee should read
  a "spinal" flag as "the trunk moved," not as a segment-specific claim.
- **Cervical rotation** has the same long-axis problem as shoulder rotation;
  flagged approximate.
- **Overhead / behind camera angles** can't be auto-validated from body
  geometry (shoulders look the same width facing toward or away). The app says
  so instead of guessing the angle.
- **Occlusion-heavy positions** (deep squats, anything where a limb crosses the
  torso, ground-based Kinstretch on the floor) will drop confidence or lose
  landmarks. Side-lying floor work is the worst case for a phone on the ground.

### Where in-browser extraction will be too slow → move to serverless

Extraction seeks the video frame by frame and runs the **full** pose model on
each frame. On a recent laptop that's fine for a 10–20s clip. It will get
painful when:

- The clip is long (40–60s) **and** sampled at 30fps → 1,200–1,800 model
  inferences on the main thread. Expect tens of seconds, and jank.
- Lee uploads from an **older phone** rather than a laptop — mobile GPUs run the
  full model far slower, and Safari throttles background work.
- You add more target joints (more angle math per frame — minor) or bump sample
  fps.

**Recommendation:** keep extraction in-browser for v1 (no server ML needed), but
the moment Lee is processing many/long clips, move extraction to a **Supabase
Edge Function** (or a small serverless worker) that runs the same model on
frames decoded server-side and writes back the `ReferenceDataset`. The extractor
core (`extractReferenceDataset`) is already pure and decoupled from the
browser/video glue, so it can be lifted into a worker with the frame decode
swapped out. Until then, mitigations: cap sample fps to native or 24, run the
seek/inference loop in a Web Worker with `OffscreenCanvas`, and show the (already
present) progress bar.

The **client live loop** is fine in-browser by design — it must be — and targets
24fps; the screen warns below 15fps.

### Edge cases handled

No person in frame (prompt to reposition), camera angle wrong (guidance +
override that flags the session reduced-confidence), fps < 15 (warning),
low-confidence reference (quality flag + re-shoot banner), backgrounding
mid-movement (pause/resume), dropped upload (tus resumable), trainer edits a
movement after attempts exist (old attempts stay, new ones use the new
reference).

### Edge cases / gaps you should know about

- **Closed captions are a slot, not auto-generated.** v1 renders an empty
  `<track>`; Lee can attach a caption file, but we don't transcribe. Auto-caption
  needs a speech-to-text pass (another serverless job).
- **Audio cues (TTS of Lee's cues) are not implemented.** The plumbing (cues per
  movement, compensation→cue mapping) exists; wiring `speechSynthesis` to fire at
  the right moment is a follow-up.
- **Client invitation is manual.** Supabase magic-link signup can't pre-assign a
  client to a trainer, so a new signup defaults to `client` with no trainer until
  Lee/you set `trainer_id` (SQL above). A proper invite flow (signed invite
  token → trainer_id on first login) is a v1.1 item.
- **Multi-rep tempo / per-rep breakdown** isn't computed for the client; we
  report best ROM across the attempt, not rep-by-rep.
- **Bilateral movements** are scored per named angle key; we don't yet compute a
  left/right symmetry score.
- **Thumbnails** are best-effort (generated from the first frame on upload);
  a failure there is non-fatal.
- **Web Worker:** extraction currently runs on the main thread. Fine for short
  clips, see above.

---

## Thresholds (all tunable, with reasoning)

I did **not** invent numbers and dress them up as standards. FRS does not
publish numeric app tolerances, so these are **defensible defaults for Lee to
review**, all centralized in `src/lib/compare/thresholds.ts` (and a couple in
`pose/confidence.ts` / `calibration/cameraAngle.ts`).

| threshold | value | reasoning | confidence |
| --- | --- | --- | --- |
| Target GREEN | ≤ 15% short of reference ROM | ~day-to-day ROM variation for an able mover | medium |
| Target YELLOW | 15–30% short | beyond this is a meaningful miss | **low — please tune** |
| Wrong-direction flag | < −8° from start | distinguishes "traveling back" from noise | medium |
| Stillness STILL | < 5° drift | within 2D jitter on a well-seen joint | medium |
| Stillness COMPENSATING | > 15° drift | a visible, intentional-looking shift | **low — please tune** |
| Visibility high / low | 0.7 / 0.5 | MediaPipe visibility bands, conventional | medium |
| Rep prominence | 30% of range | rejects jitter as a "rep" | medium |
| Rep min absolute range | 10° | a rep has more ROM than sensor noise | **low — depends on movement** |
| Camera-angle tolerance | 30° | generous; override always allowed | medium |
| Front shoulder:torso ratio | 0.60 | ~adult biacromial width vs torso | **low — varies by person** |
| Compensation debounce | 3 frames | one jittery frame shouldn't alert | medium |
| Target fps / floor | 24 / 15 | from the brief | n/a |

**The ones I'm least confident in**, in order:
1. **Front shoulder:torso ratio (0.60)** for camera-angle estimation — it varies
   a lot by body type and by how the person stands. It only drives a soft
   "adjust your angle" hint with an override, so the blast radius is small, but
   expect false "turn to your side" nudges. Per-user calibration would fix it.
2. **Stillness "compensating" at 15°** — for a small joint (cervical) 15° is a
   lot; for the trunk it may be too sensitive. Consider per-joint thresholds.
3. **Rep min absolute range (10°)** — too high for subtle movements, too low for
   big ones. Should arguably scale with the reference ROM.
4. **Target YELLOW at 30% short** — the green/red boundary matters more for
   client morale than for accuracy; tune with Lee watching real clients.

Change any of them in one file and re-run `npm test`.
