# 🎸 DeNote

Paste a YouTube link, choose a section of up to 30 seconds, and DeNote turns
the guitar line into string + fret positions. Then play the clip back and
watch each note light up as it sounds.

> 🚧 **In progress.** The app hasn't been built yet. Below is the MVP spec I
> wrote *before* writing any code, including the reasoning behind each
> decision (the 💭 notes).

**Status:** M0 — Setup & skeleton deploy (see [Milestones](#9-milestones))

## Contents

1. [Overview](#1-overview)
2. [Scope](#2-scope)
3. [User Stories](#3-user-stories)
4. [Technical Risks & Spikes](#4-technical-risks--spikes)
5. [Architecture & Stack](#5-architecture--stack)
6. [Data Model](#6-data-model)
7. [API Design](#7-api-design)
8. [Screens & UX](#8-screens--ux)
9. [Milestones](#9-milestones)
10. [Definition of Done](#10-definition-of-done)
11. [Decision Log](#decision-log)

---

## 1. Overview

### The problem
Learning a song by ear is slow and hard, especially for beginners. Tabs
found online are often wrong or incomplete, and for less popular songs they
may not exist at all. Even a correct tab is just a static page: it doesn't
show *when* each note happens in the recording.

### The idea
Paste a YouTube link, choose the section you want to learn, and pick an
instrument. The app listens to that section, works out the notes, and turns
them into string + fret positions. You can then play the section back and
watch each note light up as it's played.

### Who it's for
- Beginner and intermediate guitarists learning songs by ear
- Players who want to learn a specific riff or solo, not a whole song
- Anyone whose song has no good tab online

### Core flow
1. User pastes a YouTube URL
2. User sets a start and end time (e.g. `1:12 → 1:34`)
3. User picks an instrument (MVP: electric guitar, standard tuning E-A-D-G-B-E)
4. The app pulls the audio for that section and detects the notes in it
5. The app turns each note into a **string + fret** position
6. The result is saved as a **Lesson**
7. In the Lesson view, the user plays the clip and each note highlights at
   the moment it sounds

### Key terms
- **Lesson**: one saved transcription. It holds the source URL, the time
  range, the instrument, and the detected notes.
- **Note event**: one detected note: pitch, start time, duration → mapped
  to (string, fret).
- **Note strip**: the note events shown in order as `string · fret` cards.

> 💭 **Why I started here:** before choosing a stack or designing a
> database, I wanted the user flow written down in one place. Every later
> decision should trace back to one of these 7 steps. If a feature doesn't
> serve one of them, it isn't in the MVP.

---

## 2. Scope

### ✅ In scope (MVP)

**Access**
- Sign in with Google OAuth
- Only `@acts2.network` email accounts can sign in; any other domain is
  rejected
- Each user sees and manages only their own lessons

**Creating a lesson**
- Paste a YouTube URL
- Set a start and end time; the clip can be **30 seconds at most**
- Preview the selected range before submitting
- Instrument: electric guitar, standard tuning (E-A-D-G-B-E) only
- Give the lesson a title (default: the video's title)
- **1 lesson per user per 24 hours** (failed lessons don't count)

**Transcription**
- Detects **single notes only**: riffs, melodies and solos played one note
  at a time
- Each note is mapped to a string and fret using a simple fingering rule:
  stay near the current hand position, prefer lower frets
- Shows processing status: queued → processing → ready / failed

**Lesson playback**
- The clip plays with the YouTube embedded player
- Notes are shown as a strip of `string · fret` cards that scrolls in time
  with playback, with the current note highlighted
- Play, pause, restart, click a note to jump to it, keyboard shortcuts

**Lesson management**
- List of my lessons
- Rename a lesson
- Delete a lesson
- Adjust the time range and retry a failed lesson

**Public demo**
- A single read-only demo lesson at `/demo` that anyone can open without
  signing in (for portfolio visitors)
- Visitors can play it and watch the notes sync, but can't create, edit,
  or delete anything

### ❌ Out of scope (for now)

| Feature                                | Why it's deferred                                      |
|----------------------------------------|--------------------------------------------------------|
| Chords / polyphonic detection          | Much harder; single-note riffs prove the concept first |
| Other instruments (bass, acoustic…)    | Can be added once the pipeline works                   |
| Alternate tunings (Drop D, half-step)  | Fingering logic gets more complex                      |
| Editing notes                          | Valuable, but v2                                       |
| Slow-down / loop sections              | Top v2 candidate                                       |
| Sharing lessons with other users       | Needs permissions design                               |
| Techniques (bends, slides, hammer-ons) | Hard to detect reliably                                |
| Clips longer than 30 seconds           | Keeps processing time and cost bounded                 |
| Traditional 6-line tab staff           | Note cards are simpler and enough for v1               |
| Admin role / dashboard                 | Database console + logs are enough at this scale       |
| Mobile app                             | Responsive web is enough for v1                        |

### Constraints
- **Closed community:** the app is only for the Acts2 network, not the
  general public (apart from the read-only demo).
- **Audio handling:** audio is pulled only to analyze it, and is **deleted
  right after processing**. The app never stores or serves the audio
  itself; playback always goes through YouTube's official embedded player.
- **Accuracy:** the notes are a *starting point* for learning, not a
  perfect transcription. The UI says so.

> 💭 **Why scope matters this much:** the out-of-scope table is the most
> useful part of this doc. Every time I think "it'd be cool if…", I check
> this table. If the feature is on it, it waits until after the MVP ships.

---

## 3. User Stories

Format: *As a user, I want… so that…*, followed by acceptance criteria
that define "done."

### Epic A — Access

**A1. Sign in with my church account**
As a member of the Acts2 network, I want to sign in with my
`@acts2.network` Google account so that I don't need another password.
- [ ] "Sign in with Google" button on the landing page
- [ ] Backend checks that the ID token's `hd` claim is `acts2.network` and
      that the email ends in `@acts2.network`
- [ ] Any other account is rejected with a friendly message:
      "This app is only available to Acts2 network members."
- [ ] A user record is created on first sign-in

**A2. Sign out**
- [ ] The session ends and I'm sent back to the landing page

### Epic B — Creating a lesson

**B1. Submit a clip**
As a guitarist, I want to paste a YouTube link and choose a time range so
that I get notes for just the part I'm learning.
- [ ] Input for a YouTube URL (supports `youtube.com/watch?v=`, `youtu.be/`,
      and `youtube.com/shorts/`)
- [ ] After I paste the URL, a video preview loads so I can confirm it's
      the right video
- [ ] Start/end inputs in `m:ss` format
- [ ] A "Set from video" button fills in the player's current time
- [ ] Instrument is fixed to "Electric guitar — standard tuning"
- [ ] Title defaults to the video's title and can be edited

**B2. Validation**
- [ ] Invalid or unsupported URL → inline error
- [ ] End time is not after start time → inline error
- [ ] Clip is longer than 30 s → inline error ("Max clip length is 30 seconds")
- [ ] Private, age-restricted, or unavailable video → clear error once the
      backend reports it

**B3. Daily limit**
As the app owner, I want to cap how many lessons each user can create so
that processing costs stay predictable.
- [ ] Limit: **1 lesson per user per rolling 24 hours** (set in config)
- [ ] Lessons that are queued, processing, or ready count; **failed
      lessons don't**
- [ ] A retry counts as a fresh submission and must pass the same check
- [ ] When the limit is reached, the create form is disabled with the
      message: "You can create your next lesson in 14h 22m"

**B4. Preview the clip**
- [ ] A Preview button plays only the selected start→end range, so I can
      check it before using my daily lesson

### Epic C — Transcription

**C1. See processing progress**
As a user, I want to see that my lesson is being worked on so that I know
the app hasn't frozen.
- [ ] The lesson's status shows: `queued → processing → ready | failed`
- [ ] The page updates on its own when the status changes (no manual refresh)
- [ ] Target: a 30 s clip is ready in under 60 s

**C2. Get usable notes**
- [ ] Each detected note has: pitch, start time, duration, string, fret
- [ ] Every fret is between 0 and 22, and every string between 1 and 6
- [ ] Very short "ghost" notes (< 50 ms) are filtered out

**C3. Handle failure**
- [ ] If no notes are detected → status `failed` with the message:
      "We couldn't pick out a clear single-note guitar line. Try a cleaner
      section, or a cleaner recording. Guitar covers, lesson videos, and
      live/acoustic versions often work better."
- [ ] If the download or processing fails → status `failed`, with a
      message that fits the error
- [ ] **Retry** opens the create form pre-filled with the same video and
      time range, so I can adjust the start/end before resubmitting
- [ ] A lesson can be retried **at most 3 times**
- [ ] The audio file is deleted whether processing succeeds or fails

### Epic D — Lesson playback

**D1. Watch the notes follow the music**
As a guitarist, I want each note to light up as it's played so that I can
connect what I hear to where it is on the fretboard.
- [ ] Notes are shown as a horizontal sequence of note cards, in order
- [ ] Each card shows the **string name** and **fret number**,
      e.g. `A · 5`, `e · 12`
- [ ] String names: `E A D G B e` (low to high); lowercase `e` = high E
      string, so the two E strings are never confused
- [ ] The note currently sounding is highlighted (solid white, larger than
      the other cards); past notes are dimmed
- [ ] The strip auto-scrolls to keep the current note centered
- [ ] Highlight timing is within ~100 ms of the audio

**D2. Playback controls**
- [ ] Play / pause / restart (restart jumps back to the clip's start)
- [ ] Playback stops at the clip's end time

**D3. Accuracy disclaimer**
- [ ] A short notice: "Tabs are auto-generated and may contain errors."

**D4. Navigate the notes**
- [ ] Clicking a note card seeks the video to that note
- [ ] Keyboard: `Space` play/pause · `R` restart · `←/→` previous/next note

### Epic E — Managing lessons

**E1. My lessons**
- [ ] List of my lessons: title, time range, status, created date
- [ ] Newest first
- [ ] Empty state with a "Create your first lesson" button

**E2. Rename and delete**
- [ ] I can rename a lesson inline (1–100 characters)
- [ ] Delete asks for confirmation first
- [ ] I can only see, rename, and delete my own lessons (enforced on the
      backend, not just hidden in the UI)

**E3. Video removed from YouTube**
- [ ] If a lesson's video is no longer available, the lesson page says so
      and still shows the notes, without playback

### Epic F — Public demo

**F1. Try it without an account**
As a visitor (e.g. a recruiter), I want to see a real lesson in action so
that I understand what the app does without needing to sign in.
- [ ] `/demo` loads without sign-in
- [ ] It uses the normal playback screen, with editing, retry, and delete
      hidden
- [ ] A banner: "This is a demo lesson. DeNote is available to Acts2 network
      members." + [Sign in] button
- [ ] The sign-in page links to the demo: "Just looking? Try the demo →"

> 💭 **Why acceptance criteria:** "user can create a lesson" is vague, and I
> could argue it's done at almost any point. Checkboxes give me a concrete
> test for each story. They'll also turn directly into my GitHub issues and
> test cases.

---

## 4. Technical Risks & Spikes

Before building any UI, I'm proving the hard parts work with small
throwaway scripts ("spikes") in a `spikes/` folder. Each spike has a
pass/fail criterion. If a spike fails, I change the plan *before* I've
built the rest of the app on top of it.

### R1. Getting the audio from YouTube
**Risk:** yt-dlp breaks whenever YouTube changes things, and YouTube often
blocks downloads from cloud server IPs (it shows "Sign in to confirm you're
not a bot"). This app runs on AWS Lambda, which uses exactly those IPs.

**Spike:**
1. Download the audio for a video with `yt-dlp -x`
2. Trim it to the exact start/end with `ffmpeg`
3. Run it on my laptop, **and inside a Lambda function**

**Pass:** 10/10 test videos download and trim correctly from Lambda.

**If it fails:** pin and update yt-dlp often; try passing cookies; last
resort: let users upload an audio file instead (a scope change).

**Results: laptop (2026-10-02 · yt-dlp 2026.08.19 · ffmpeg 9.0.2)**

| Test | Link type | Result | Download | Trim |
|------|-----------|--------|----------|------|
| Guitar cover, 1:10–1:30 | `watch?v=` | ✅ | 1.9 s | 0.4 s |
| Same clip | `youtu.be/` | ✅ identical output | 1.3 s | 0.5 s |
| Guitar Short, 0:00–0:10 | `shorts/` | ✅ | 1.8 s | 0.1 s |
| Official major-label music video, 0:30–0:45 | `youtu.be/` | ✅ | 1.5 s | 0.2 s |
| Video doesn't exist | `watch?v=` | ✅ clean error ("unavailable") | | |
| Malformed URL | `youtu.be/` | ✅ clean error ("Unsupported URL") | | |
| End before start · longer than 30 s · past the end of the video | | ✅ rejected | | |

- Every clip starts and ends at the right moment by ear, and the audio is clean
- The full download is deleted automatically (temp folder); only the trimmed WAV is kept
- **For M2:** check the video's duration *before* downloading (`download=False`),
  and give yt-dlp a logger so errors aren't printed twice
- ⏳ **Lambda test still pending** (needs AWS), so the pass criterion isn't met yet

### R2. Detecting notes in a full mix ⚠️ biggest risk
**Risk:** note-detection models work well on solo guitar but get confused
by full songs. Vocals, bass, keys, and drums all show up as "notes."

**Plan:**
1. **Separate the instruments:** use Demucs (`htdemucs_6s` model) to split
   out the guitar track
2. **Detect notes:** run Spotify's `basic-pitch` on the guitar track → a
   list of (pitch, start, end, confidence)
3. **Reduce to one note at a time:** when notes overlap, keep only the
   loudest/most confident one
4. **Filter:** drop notes outside guitar range (MIDI 40–86, i.e. low E open
   to high e fret 22), and drop notes shorter than 50 ms

**Spike:** 6 test clips that I tab out by hand as the answer key:

| Clip | Type |
|------|------|
| 1–2  | Isolated guitar (lesson videos, intros) |
| 3–4  | Rock/pop riff with full band |
| 5–6  | Worship song lead line (with keys + pads) |

Run each clip **with and without** Demucs and compare the result to my
hand-written tab.

**Targets (not launch blockers):**
- ≥ 80% of notes correct on isolated guitar
- ≥ 60% of notes correct on full mixes (with separation)

Whatever the results, the measured accuracy is published in this README.
Missing the target does not block launch; the numbers are reported
honestly either way.

### R3. Choosing a string and fret for each note
**Risk:** most pitches can be played in 2–5 places on the neck. Choosing
badly produces tabs that are technically correct but impossible to play
(e.g. jumping from fret 2 to fret 14 and back).

**Approach:**
- Open-string MIDI notes: `E=40, A=45, D=50, G=55, B=59, e=64`
- Candidates for a note: every string where `fret = pitch − open` is
  between 0 and 22
- Choose the path through all candidates that **minimizes total hand
  movement** (dynamic programming), with a small penalty for high frets

**Spike:** a pure Python function with unit tests (no audio needed):
- A single note → returns a valid position
- A scale run → stays in one position instead of jumping around
- A note out of range → skipped, no crash

**Pass:** all tests pass, and the output for my 6 test clips looks
playable to me as a guitarist.

### R4. Highlighting notes in sync with playback
**Risk:** highlights that are late or drift out of time feel broken.

**Things to get right:**
- Store note times **relative to the clip start**; during playback,
  `note_time = player.getCurrentTime() − clip_start`
- Trim with `ffmpeg` *after* downloading the full audio, so the clip starts
  at exactly the right moment (trimming during the download can snap to the
  wrong point and shift every note)
- Read the player time every frame with `requestAnimationFrame`, not a
  1-second timer

**Spike:** a plain HTML page with the YouTube embedded player and
hard-coded note times; watch it and tap along.

**Pass:** highlights feel in time by ear (target: ≤ 100 ms off).

### R5. Processing time & hosting cost
**Risk:** Demucs is heavy and could be slow or run out of memory.

**Spike:** time the full pipeline (download → separate → detect → map) for
a 30 s clip on my laptop and on Lambda.

**Pass:** under 60 s per clip, with no out-of-memory errors.

**If it fails:** give the worker more memory (Lambda CPU scales with
memory); or skip separation when the user marks the clip "guitar is
isolated."

### Spike order
R1 → R2 → R3 → R4 → R5

The order follows the data: no audio means nothing to detect, no notes
means nothing to map, and no notes means nothing to sync. R5 runs last
because it measures the whole pipeline.

> 💭 **Why spikes come first:** the riskiest part of this app isn't the
> React UI or the login. It's whether the computer can hear a guitar in a
> mix accurately enough. If R2 fails, the login screen doesn't matter. So I
> spent the first weeks proving the risky parts, not building the easy ones.

---

## 5. Architecture & Stack

### Goal: run on AWS for ~$0/month
Usage is small and occasional (church network, 1 lesson/user/day), so the
design is **serverless**: no servers running 24/7, and you only pay for the
seconds the code actually runs. For this usage, that mostly fits within
AWS's free tiers.

### Architecture

```text
        Browser (React + TS)
              │
              ▼
        CloudFront ────────────────┐
         │  /*                     │  /api/*
         ▼                         ▼
     S3 bucket               API Gateway
   (static React build)            │
                                   ▼
                          Lambda: API (FastAPI)
                           │              │
                           │ read/write   │ send job
                           ▼              ▼
                       Postgres         SQS queue
                       (Neon)             │
                           ▲              ▼
                           │      Lambda: Worker (container image)
                           └───── yt-dlp → ffmpeg → Demucs
                                  → basic-pitch → fret mapping
```

### Components

| Layer | Choice | Notes |
|-------|--------|-------|
| Frontend | React + TypeScript + Vite | Built to static files, hosted on S3 |
| Data fetching | TanStack Query | Polls lesson status every 3 s while processing |
| Playback | YouTube IFrame Player API | `getCurrentTime()` + `requestAnimationFrame` |
| CDN / routing | CloudFront | Serves the frontend at `/*` and the API at `/api/*` from the **same domain**, so cookies just work and there's no CORS setup |
| API | FastAPI on Lambda (via `Mangum`) | Auth, lessons, daily limit, job submission |
| ORM / migrations | SQLAlchemy 2.0 + Alembic | |
| Auth | Google Identity Services → API verifies ID token (`google-auth`), checks `hd == "acts2.network"`, issues its own session JWT in an httpOnly cookie | |
| Queue | SQS → triggers the Worker Lambda | Built-in retries + dead-letter queue for failed jobs |
| Worker | Python Lambda **container image** (~6 GB memory, 3 min timeout) | Contains ffmpeg, yt-dlp, Demucs (model weights baked in), basic-pitch |
| Database | Postgres on **Neon** free tier | Scales to zero; works well with Lambda |
| Infra as code | AWS SAM | One template defines every AWS resource |
| Local dev | Docker Compose (Postgres) + `uvicorn` + run the pipeline as a plain Python function | No AWS needed to develop |

### Repo layout (monorepo)

```text
/frontend          React + TS app
/backend
  /app             FastAPI routes, models, auth
  /pipeline        download.py, separate.py, detect.py, fretmap.py
  /worker          Lambda handler: reads SQS message → runs pipeline
  /tests
/spikes            throwaway experiments from section 4
/infra             SAM template
```

**Key rule:** `/pipeline` is plain Python functions with no AWS code. The
Lambda handler is a thin wrapper around it, so the same code runs on my
laptop, in tests, and in production.

### Rough monthly cost (estimates — verify with the AWS pricing calculator)

| Item | Expected |
|------|----------|
| Lambda (API + worker) | $0 — within the always-free 400k GB-seconds |
| SQS, API Gateway, CloudFront, S3 | $0 — within free tiers at this usage |
| ECR (worker image, ~4 GB) | ~$0.40 |
| Neon Postgres | $0 (free tier) |
| Domain (optional, Route 53) | ~$1/month ($12–15/yr) |
| **Total** | **~$0–2/month** |

### Cost traps to avoid
- ❌ **No NAT Gateway** (~$32/month). Keep Lambdas *outside* a VPC. This is
  why the database is Neon instead of RDS inside a VPC.
- ❌ **No always-on EC2/RDS** unless free-tier credits cover it.
- ✅ Set an **AWS Budget alert at $5** on day one.

> 💭 **Why serverless:** a church-network app might process 20 clips one
> day and none for a week. An always-on server big enough for Demucs (4 GB
> RAM) would cost ~$25–30/month just sitting idle. With Lambda, idle time
> costs nothing.

---

## 6. Data Model

Two tables. Notes live inside the lesson as JSONB.

```text
users 1 ──< lessons
              └── notes (JSONB)
```

### `users`

| Column          | Type        | Notes |
|-----------------|-------------|-------|
| `id`            | uuid PK     | |
| `google_sub`    | text UNIQUE | Google's permanent user ID, used to identify users (emails can change) |
| `email`         | text UNIQUE | Always ends in `@acts2.network` |
| `name`          | text        | From Google profile |
| `avatar_url`    | text NULL   | From Google profile |
| `created_at`    | timestamptz | |
| `last_login_at` | timestamptz | |

### `lessons`

| Column             | Type        | Notes |
|--------------------|-------------|-------|
| `id`               | uuid PK     | |
| `user_id`          | uuid FK → users.id, ON DELETE CASCADE | |
| `title`            | text        | Defaults to the video title |
| `youtube_video_id` | text        | Just the 11-char ID (e.g. `dQw4w9WgXcQ`), not the full URL |
| `video_title`      | text        | Original YouTube title, saved at creation |
| `start_ms`         | integer     | Clip start in the video, in milliseconds |
| `end_ms`           | integer     | Clip end in the video, in milliseconds |
| `instrument`       | text        | `'electric_guitar'` (only value in MVP) |
| `tuning`           | text        | `'standard'` (only value in MVP) |
| `status`           | enum        | `queued`, `processing`, `ready`, `failed` |
| `error_code`       | text NULL   | e.g. `VIDEO_UNAVAILABLE`, `NO_NOTES_DETECTED`, `DOWNLOAD_FAILED` |
| `attempts`         | integer     | Incremented on each retry |
| `notes`            | jsonb NULL  | Set when status = `ready` (shape below) |
| `pipeline_version` | text NULL   | Which version of the detection code produced the notes |
| `created_at`       | timestamptz | |
| `submitted_at`     | timestamptz | Set on create **and on every retry**; used by the daily limit |
| `updated_at`       | timestamptz | |
| `completed_at`     | timestamptz NULL | When it became `ready` or `failed` |

**Constraints**
- `CHECK (end_ms > start_ms)`
- `CHECK (end_ms - start_ms <= 30000)` (the 30-second limit is also
  enforced in the database, not just the UI)

**Indexes**
- `(user_id, created_at DESC)`: used by "My lessons"
- `(user_id, submitted_at)`: used by the daily limit check

### `notes` JSONB shape

```json
{
  "version": 1,
  "notes": [
    { "start_ms": 0,   "dur_ms": 240, "midi": 57, "string": 5, "fret": 12, "confidence": 0.91 },
    { "start_ms": 250, "dur_ms": 180, "midi": 59, "string": 5, "fret": 14, "confidence": 0.87 }
  ]
}
```

- `start_ms` is **relative to the clip start**. During playback:
  `player_time_ms − lesson.start_ms`
- `string` follows guitar convention: **1 = high e … 6 = low E**. The
  frontend turns it into a name (`e B G D A E`).
- `midi` is kept so the fret position can be recalculated later without
  running detection again
- `version` lets the JSON shape change in the future without breaking old
  lessons

### Daily limit rule (as a query)

A lesson **counts** toward the limit if its status is `queued`,
`processing`, or `ready`. `failed` does not count.

```sql
SELECT count(*) FROM lessons
WHERE user_id = :uid
  AND status IN ('queued', 'processing', 'ready')
  AND submitted_at > now() - interval '24 hours';
```

The check and the insert run in **one transaction**, with
`SELECT ... FOR UPDATE` on the user's row, so two quick submissions can't
both pass the check.

"Next lesson available at" = `submitted_at + 24h` of the lesson that counts.

> 💭 **Why `submitted_at` and not `created_at`:** say a lesson fails on
> Monday at 9am, the user makes a successful one at 10am, then retries the
> failed one at 11am. If the limit is based on `created_at`, the retry looks
> like it was "created at 9am" and gets through, so the user ends up with
> **2** lessons that day. Basing the limit on `submitted_at` treats a retry
> as a fresh submission. That bug was caught on paper, before any code.

> 💭 **Why so little schema:** no `jobs` table (SQS handles jobs), no
> `notes` table (JSONB), no `instruments` table (one instrument). Each of
> those would be "future-proofing" for features that aren't in the MVP. The
> `version` and `pipeline_version` fields are the cheap kind of
> future-proofing: they take one column each now and avoid a painful
> migration later.

---

## 7. API Design

REST over JSON. All routes are under `/api` (served via CloudFront on the
same domain as the frontend). Auth is a session JWT in an **httpOnly,
Secure, SameSite=Strict** cookie.

### Conventions
- Every route except `POST /api/auth/google` and `GET /api/demo` requires a
  signed-in user
- Accessing **another user's** lesson returns `404`, not `403`, so the API
  doesn't reveal that the lesson exists
- Times are integer milliseconds; IDs are UUIDs
- All errors use one shape:

```json
{ "error": { "code": "DAILY_LIMIT_REACHED", "message": "You can create your next lesson in 14h 22m", "details": {} } }
```

### Auth

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| POST | `/api/auth/google` | `{ "credential": "<Google ID token>" }` | `200` user + sets cookie · `403 DOMAIN_NOT_ALLOWED` |
| POST | `/api/auth/logout` | — | `204` + clears cookie |
| GET  | `/api/me` | — | user + limit status (below) |

`GET /api/me`:

```json
{
  "id": "…", "email": "jane@acts2.network", "name": "Jane", "avatar_url": "…",
  "limit": { "can_create": false, "next_available_at": "2026-10-02T09:14:00Z" }
}
```

### Video lookup

| Method | Route | Returns |
|--------|-------|---------|
| GET | `/api/videos/lookup?url=…` | `{ "video_id", "title" }` · `400 INVALID_YOUTUBE_URL` · `404 VIDEO_UNAVAILABLE` |

Used by the create form to show the default title (via YouTube's oEmbed
endpoint, which needs no API key). The browser can't reliably call oEmbed
directly (CORS), and this keeps URL → `video_id` parsing in one place.

### Lessons

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET    | `/api/lessons` | — | `200` list of lesson **summaries**, newest first |
| POST   | `/api/lessons` | `{ youtube_url, start_ms, end_ms, title? }` | `201` lesson (status `queued`) |
| GET    | `/api/lessons/{id}` | — | `200` lesson **detail** (includes `notes`) |
| PATCH  | `/api/lessons/{id}` | `{ title }` | `200` lesson |
| POST   | `/api/lessons/{id}/retry` | `{ start_ms, end_ms }` | `202` lesson (status `queued`) |
| DELETE | `/api/lessons/{id}` | — | `204` |

**Lesson summary** (for the list; no notes, so the response stays small):

```json
{ "id", "title", "youtube_video_id", "start_ms", "end_ms", "status", "error_code", "created_at" }
```

**Lesson detail** = summary + `error_message`, `attempts`, `notes`.

**Status polling:** while a lesson is `queued`/`processing`, the frontend
calls `GET /api/lessons/{id}` every 3 s and stops once it reaches
`ready`/`failed`.

### Public demo

| Method | Route | Body | Returns |
|--------|-------|------|---------|
| GET | `/api/demo` | — (no auth) | `200` lesson detail for the demo lesson |

The demo lesson is a normal lesson owned by me. Its ID is set by a
`DEMO_LESSON_ID` environment variable, so there's no schema change and no
`is_public` flag that could accidentally expose other lessons.

### Rules enforced by the API

| Route | Rule | Error |
|-------|------|-------|
| POST lessons | Valid YouTube URL | `400 INVALID_YOUTUBE_URL` |
| POST lessons, retry | `end_ms > start_ms`, length ≤ 30 000 | `400 INVALID_TIME_RANGE` |
| POST lessons, retry | Daily limit (via `submitted_at`) | `429 DAILY_LIMIT_REACHED` (+ `next_available_at`) |
| retry | Lesson status must be `failed` | `409 LESSON_NOT_RETRYABLE` |
| retry | `attempts < 3` | `409 MAX_RETRIES_REACHED` |
| PATCH | Title is 1–100 characters | `400 INVALID_TITLE` |

### Worker contract (not HTTP)

The API sends this message to SQS when a lesson is created or retried:

```json
{ "lesson_id": "…", "attempt": 2 }
```

The worker:
1. Loads the lesson; **skips the message** if `attempt` doesn't match the
   lesson's current `attempts` (an old/duplicate message), or the lesson
   was deleted
2. Sets status → `processing`
3. Runs the pipeline → on success, sets status `ready`, `notes`,
   `pipeline_version`, `completed_at`
4. On failure, sets status `failed`, `error_code`, `error_message`
5. Always deletes the temporary audio files

### Error codes shown to users

| Code | Message |
|------|---------|
| `DOMAIN_NOT_ALLOWED` | This app is only available to Acts2 network members. |
| `INVALID_YOUTUBE_URL` | That doesn't look like a YouTube link. |
| `VIDEO_UNAVAILABLE` | This video is private, age-restricted, or no longer available. |
| `INVALID_TIME_RANGE` | Clips must be between 1 and 30 seconds long. |
| `DAILY_LIMIT_REACHED` | You can create your next lesson in {time}. |
| `DOWNLOAD_FAILED` | We couldn't get the audio for this video. Please try again later. |
| `NO_NOTES_DETECTED` | We couldn't pick out a clear single-note guitar line. Try a cleaner section, or a cleaner recording. Guitar covers, lesson videos, and live/acoustic versions often work better. |
| `PROCESSING_FAILED` | Something went wrong while processing. Please retry. |

> 💭 **Why write the API before coding:** this table is the agreement
> between my frontend and my backend. With it written down, I can build the
> React screens against fake data while the backend is still being built,
> and FastAPI's auto-generated `/docs` page should match this table exactly.

---

## 8. Screens & UX

### Design principles
- **Black & white only.** Contrast comes from shades of white, never from
  color
- **Desktop first** (designed at 1280px wide), still usable on a tablet
- **The music is the focus:** the video and the notes take up most of the
  screen; everything else stays small
- Meaning never depends on color alone; status always has an icon and text

### Design tokens

| Token            | Value      | Used for |
|------------------|------------|----------|
| `--bg`           | `#000000`  | Page background |
| `--surface`      | `#0F0F0F`  | Cards, inputs |
| `--border`       | `#262626`  | Card and input borders, dividers |
| `--text-dim`     | `#525252`  | Past notes, disabled |
| `--text-muted`   | `#A3A3A3`  | Secondary text, labels |
| `--text`         | `#E5E5E5`  | Body text |
| `--text-strong`  | `#FFFFFF`  | Headings, active note, primary buttons |

- **Fonts:** Inter (UI), JetBrains Mono (string · fret, times)
- **Primary button:** white background, black text
- **Secondary button:** transparent, white border
- **Active note:** the card is filled solid white with black text, and is
  larger than the other cards (the brightest thing on screen)

### Screen map

```text
Sign in ──► My Lessons ──► Create Lesson ──► Lesson (processing)
   │           ▲  │                               │
   │           │  └──────────► Lesson (ready) ◄───┤
   │           │                                  │
   │           └──── Retry ◄── Lesson (failed) ◄──┘
   │
   └──► Demo (read-only, no sign-in)
```

### 1. Sign in

```text
┌──────────────────────────────────────────────────────────┐
│                                                          │
│                         DeNote                           │
│        Turn any YouTube riff into guitar notes.          │
│                                                          │
│              [ G  Sign in with Google ]                  │
│                                                          │
│            For Acts2 network members only.               │
│              Just looking? Try the demo →                │
└──────────────────────────────────────────────────────────┘
```

- Wrong domain → message shown under the button (`DOMAIN_NOT_ALLOWED`)

### 2. My Lessons

```text
┌──────────────────────────────────────────────────────────┐
│ DeNote                                    [+ New]  (JP)▾ │
├──────────────────────────────────────────────────────────┤
│ My Lessons                                               │
│                                                          │
│  Way Maker — intro riff    1:12–1:34  ● Ready     Sep 29 │
│  ──────────────────────────────────────────────────────  │
│  Sweet Child — opening     0:00–0:28  ◌ Processing Sep 28│
│  ──────────────────────────────────────────────────────  │
│  Oceans — lead line        2:05–2:30  ✕ Failed    Sep 27 │
└──────────────────────────────────────────────────────────┘
```

- A simple list: title · time range · status · date, newest first
- Each row opens the lesson; hovering lightens the row background
- Status: `● Ready` (white), `◌ Processing` (muted, animated),
  `✕ Failed` (muted)
- Empty state: "No lessons yet." + [Create your first lesson]
- `[+ New]` is disabled when the daily limit is reached; hovering it shows
  "Next lesson in 14h 22m"

### 3. Create Lesson (also used for Retry)

```text
┌──────────────────────────────────────────────────────────┐
│ ← My Lessons                                             │
│                                                          │
│ New Lesson                                               │
│ YouTube link  [ https://youtube.com/watch?v=…         ]  │
│                                                          │
│ ┌────────────────────────────────────┐  Start  [1:12]    │
│ │                                    │  [Set from video] │
│ │          YouTube player            │                   │
│ │                                    │  End    [1:34]    │
│ │                                    │  [Set from video] │
│ └────────────────────────────────────┘  22.0s / 30s      │
│                                                          │
│ Title  [ Way Maker — intro riff                       ]  │
│ Instrument   Electric guitar · Standard tuning           │
│                                                          │
│                                  [ Preview ] [ Create ]  │
└──────────────────────────────────────────────────────────┘
```

- The player appears after a valid URL is pasted
- "Set from video" fills in the player's current time
- **Preview** plays just the selected range, so users can check it before
  using their 1 lesson for the day
- The length readout changes to an error past 30 s; Create is disabled
  until the form is valid
- **Retry mode:** a banner at the top shows the failure message ("Try a
  cleaner section, or a cleaner recording…"); the video and times are
  pre-filled; the button says "Retry (attempt 2 of 3)"

### 4. Lesson — processing

```text
┌──────────────────────────────────────────────────────────┐
│ ← My Lessons                                             │
│ Way Maker — intro riff                       1:12 – 1:34 │
│                                                          │
│                  ◌  Listening…                           │
│      Downloading → Separating guitar → Finding notes     │
│                                                          │
│   This usually takes under a minute. You can leave this  │
│   page; we'll keep working.                              │
└──────────────────────────────────────────────────────────┘
```

- Status updates by polling every 3 s; the page switches to the ready view
  automatically
- The stage labels are for flavor only in v1 (the API reports
  `processing`, not a specific stage)

### 5. Lesson — ready (playback) ⭐ the core screen

```text
┌──────────────────────────────────────────────────────────┐
│ ← My Lessons                                             │
│ Way Maker — intro riff ✎                ⋯    1:12 – 1:34 │
│                                                          │
│      ┌──────────────────────────────────────────────┐    │
│      │                                              │    │
│      │              YouTube player                  │    │
│      │                                              │    │
│      └──────────────────────────────────────────────┘    │
│      [▶ Play]  [↺ Restart]            0:08.4 / 0:22.0    │
│                                                          │
│  ┌────┐┌────┐┌────┐┏━━━━━━┓┌────┐┌────┐┌────┐┌────┐      │
│  │D·10││D·12││A·12│┃ A·14 ┃│D·12││G·11││D·12││A·14│      │
│  └────┘└────┘└────┘┗━━━━━━┛└────┘└────┘└────┘└────┘      │
│   dim   dim   dim   ACTIVE   upcoming →                  │
│                                                          │
│  Tabs are auto-generated and may contain errors.         │
└──────────────────────────────────────────────────────────┘
```

- Active card: solid white, black text, **larger** than the others
- Past = dim · upcoming = normal; the strip keeps the active card centered
- Clicking a note card seeks the video to that note
- Title is editable inline (✎) → `PATCH /api/lessons/{id}`
- **Keyboard:** `Space` play/pause · `R` restart · `←/→` previous/next note
- Delete is in the `⋯` menu next to the title, with confirmation
- **Demo mode (`/demo`):** same screen, with ✎ and ⋯ hidden and a banner:
  "This is a demo lesson. DeNote is available to Acts2 network members."
  + [Sign in]

### 6. Lesson — failed

```text
┌──────────────────────────────────────────────────────────┐
│ ← My Lessons                                             │
│ Oceans — lead line                           2:05 – 2:30 │
│                                                          │
│  ✕  We couldn't pick out a clear single-note guitar line.│
│     Try a cleaner section, or a cleaner recording.       │
│     Guitar covers, lesson videos, and live/acoustic      │
│     versions often work better.                          │
│                                                          │
│     [ Adjust & retry ]   [ Delete ]     Attempt 1 of 3   │
└──────────────────────────────────────────────────────────┘
```

### 7. Edge states
- **Video removed from YouTube** (lesson page): "This video is no longer
  available on YouTube." The notes are still shown, without playback
- **Lesson not found / not yours:** a simple 404 page → back to My Lessons

> 💭 **Why black and white works here:** with no colors, the *only* bright
> white thing during playback is the active note. Your eye goes straight to
> it without needing a highlight color. The limited palette is also faster
> to build, since there are fewer design decisions to make.

---

## 9. Milestones

**Budget:** ~8 hrs/week · **Estimate:** ~95 hrs ≈ **12 weeks**

**Strategy: deploy a bare-bones version first.** Get a minimal "hello
world" through the whole stack (React → CloudFront → API Lambda → Neon,
plus a Worker Lambda) deployed in the first two weeks. Then every feature
is built on a setup that's already live, and deployment never becomes a
scary final step.

### M0 — Setup & skeleton deploy · ~10 hrs · weeks 1–2
- [ ] Monorepo layout (section 5), README, this spec
- [x] Local dev: Docker Compose Postgres, FastAPI "hello", Vite React app
- [x] GitHub Actions CI: `ruff` + `pytest` (backend), `oxlint` + `tsc` (frontend)
- [ ] AWS: budget alert at $5, SAM template, deploy "hello" API + React
      build to S3/CloudFront, connect Neon
- **Done when:** the live URL shows a React page that shows data from the
  deployed API

### M1 — Spikes · ~20 hrs · weeks 2–4
- [ ] R1 YouTube download — **run inside a Lambda** (laptop ✅, Lambda ⏳)
- [ ] R2 Note detection on the 6 hand-tabbed test clips
- [ ] R3 Fret mapping with unit tests
- [ ] R4 Playback sync test page
- [ ] R5 Full pipeline timing on Lambda
- **🚦 Go/no-go:** write the results into this README. If R1 fails, revise
  the scope before going further. R2 results are reported but don't block

### M2 — Pipeline · ~12 hrs · weeks 5–6
- [ ] `/backend/pipeline`: download → trim → separate → detect → reduce to
      single notes → fret map
- [ ] CLI: `python -m pipeline <url> 1:12 1:34` → prints notes as JSON
- [ ] `pytest` for fret mapping and note filtering
- **Done when:** the CLI turns a real YouTube clip into usable notes

### M3 — Backend API · ~16 hrs · weeks 6–8
- [ ] SQLAlchemy models + Alembic migrations (section 6)
- [ ] Google auth + domain check + session cookie
- [ ] Lessons CRUD, rename, retry, daily limit, demo route (section 7)
- [ ] SQS → Worker Lambda wired to the pipeline
- [ ] API tests (auth, ownership, limit, retry rules)
- **Done when:** a lesson can be created end to end in production using
  FastAPI's `/docs` page

### M4 — Frontend · ~22 hrs · weeks 8–11
- [ ] Design tokens + base components (section 8)
- [ ] Sign in → My Lessons → Create (with Preview)
- [ ] Processing → Ready / Failed → Adjust & retry
- [ ] Playback screen: note strip, sync, click-to-seek, shortcuts
- [ ] `/demo` page
- **Done when:** every user story in section 3 can be checked off by hand

### M5 — Ship & portfolio · ~15 hrs · weeks 11–12
- [ ] Create and set the demo lesson (`DEMO_LESSON_ID`)
- [ ] README: demo GIF, spike results, accuracy table, known limitations,
      "What I'd do differently"
- [ ] Beta with 3–5 church members; fix the top issues
- **Done when:** the Definition of Done (section 10) is met

### If I fall behind, cut in this order
1. Keyboard shortcuts / click-to-seek
2. Preview button
3. Adjustable retry (fall back to retrying the same range)
4. Inline rename

**Never cut:** playback sync, domain-restricted auth, the daily limit, the
demo, or the README.

> 💭 **Why the cut list is decided ahead of time:** it's much easier to
> choose what to drop *now*, calmly, than at week 10 when I'm tired and want
> to ship. The "never cut" items are what makes the app itself (the sync),
> what keeps it safe (auth), what keeps it affordable (the limit), and what
> lets people see it (the demo and README).

---

## 10. Definition of Done

The MVP is **done** when every box below is checked. Nothing else, however
tempting, is required to ship.

### Functional
- [ ] Every user story in section 3 (Epics A–F) passes its acceptance
      criteria, tested by hand in **production**
- [ ] The full flow works end to end: sign in → create → process → play
      back with synced notes → rename → delete
- [ ] The failure flow works: failed lesson → adjust & retry → ready

### Quality
- [ ] CI is green on `main` (lint, type checks, tests)
- [ ] Backend tests cover: domain check, lesson ownership (another user's
      lesson → 404), daily limit including the retry case, retry rules,
      fret mapping
- [ ] No known bug that loses data or blocks the core flow

### Security
- [ ] Only `@acts2.network` accounts can sign in (checked on the backend
      using the `hd` claim)
- [ ] Session cookie is httpOnly, Secure, SameSite=Strict
- [ ] No secrets in the repo; secrets live in AWS SSM / Lambda environment
      config
- [ ] `/api/demo` can only return the one demo lesson

### Performance
- [ ] A 30 s clip is processed in **< 60 s** (median of 10 runs)
- [ ] Highlights feel in time by ear (target ≤ 100 ms off)

### Cost & operations
- [ ] AWS budget alert at $5 is active
- [ ] Audio files are deleted after every job (success or failure)
- [ ] Failed SQS messages go to a dead-letter queue
- [ ] The worker logs every failure with the lesson ID and error code
- [ ] Actual cost after the beta: **$___ / month** (recorded here)

### Beta
- [ ] 3–5 Acts2 members each created at least one lesson
- [ ] Their top feedback is either fixed or added to the v2 list

### Portfolio (README)
- [ ] One-paragraph pitch + live demo link at the top
- [ ] Demo GIF of the note sync
- [ ] Architecture diagram (section 5)
- [ ] **Accuracy results table** (below), with honest numbers
- [ ] Decision log + "What I'd do differently" section
- [ ] Known limitations: single notes only, standard tuning, YouTube
      dependency, accuracy on dense mixes
- [ ] v2 roadmap (from the section 2 out-of-scope table)

### Accuracy results

| Clip type | Clips | Notes correct | String/fret playable? |
|-----------|-------|---------------|-----------------------|
| Isolated guitar | 2 | __% | __ |
| Rock/pop full mix (with separation) | 2 | __% | __ |
| Worship full mix (with separation) | 2 | __% | __ |
| Full mix **without** separation | 6 | __% | — |

*Measured against my own hand-written tabs. Pipeline version: `___`.*

> 💭 **Why a written finish line:** side projects rarely fail because the
> code is too hard. They fail because there's no clear point where they're
> *done*, so they keep growing. This checklist is my stopping point. Once
> it's all checked, I ship, and everything else waits for v2.

---

## Decision Log

| # | Decision | Alternatives considered | Why |
|---|----------|-------------------------|-----|
| 1 | All-Python backend (FastAPI + Python worker) | Node API + Python worker | The best audio/ML libraries are in Python; one backend language; learning Python is a goal of this project |
| 2 | Serverless on AWS (Lambda + SQS + S3/CloudFront) | Always-on EC2 server | Usage comes in bursts; idle time costs $0; Demucs needs 4 GB RAM, which would be ~$25–30/mo always-on |
| 3 | Postgres on Neon | RDS, DynamoDB, SQLite | Data is relational; RDS isn't free long-term and needs a VPC/NAT; DynamoDB key design is a steep extra learning curve; SQLite has no persistent disk on Lambda |
| 4 | SQS for jobs | Postgres job table | Nothing runs continuously on Lambda to poll a table; SQS triggers the worker and gives retries for free |
| 5 | Notes stored as JSONB on the lesson | Separate `notes` table | Notes are always read/written together and never queried individually |
| 6 | Public read-only demo via `DEMO_LESSON_ID` | `is_public` column | Recruiters can't sign in; the env var can't leak other lessons |
| 7 | Note strip of `string · fret` cards | Traditional 6-line tab staff | Faster to build, easier to read, shows the same information |
| 8 | 1 lesson per user per 24 h; failed lessons don't count | 10/day; count every attempt | Keeps costs predictable without an admin; failures shouldn't cost a user their day |
| 9 | Single-note detection only | Chords / polyphonic | Much more reliable; proves the concept first |
| 10 | Launch even if accuracy targets are missed | Block launch on accuracy | Honest, measured numbers are more useful than waiting for perfect |
| 11 | Run the laptop spikes (R1-local → R4) before any AWS setup | AWS skeleton deploy first (original M0 order) | R2 is the biggest risk and costs $0 to test; nothing should be spent on hosting until note detection is shown to work |
