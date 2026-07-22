# AutoCaption — Full Production Readiness Audit

> Reviewed by Staff SWE / Senior Product Designer / QA / Perf / Security roles.
> Comparable products used as UX reference: CapCut, Canva, DaVinci Resolve, Adobe Express, Descript.

---

## Table of Contents

1. [Architecture Review](#1-architecture-review)
2. [Code Quality Review](#2-code-quality-review)
3. [UI Review](#3-ui-review)
4. [UX Review](#4-ux-review)
5. [Accessibility Audit](#5-accessibility-audit)
6. [Performance Audit](#6-performance-audit)
7. [Video Editing Workflow Review](#7-video-editing-workflow-review)
8. [QA Testing — Bug Registry](#8-qa-testing--bug-registry)
9. [Security Review](#9-security-review)
10. [Developer Experience](#10-developer-experience)
11. [Missing Features](#11-missing-features)
12. [Product Critique](#12-product-critique)
13. [Prioritized Improvement Roadmap](#13-prioritized-improvement-roadmap)
14. [Final Score](#14-final-score)
15. [Executive Summary](#15-executive-summary)

---

## 1. Architecture Review

### Overview

| Layer | Technology | Assessment |
|---|---|---|
| Frontend | React + Vite + TypeScript + TailwindCSS | ✅ Good choice |
| Backend | Django 5 + Django REST Framework | ✅ Solid |
| Async jobs | Celery + Redis | ✅ Correct pattern |
| Database | PostgreSQL (prod) / SQLite (dev) | ✅ Good |
| AI transcription | faster-whisper (CPU) | ✅ Practical |
| Caption rendering | ffmpeg + ASS subtitles | ✅ Correct |
| Deployment | Docker Compose (single-host) | ⚠️ Dev-grade |

---

### A1 — 🔴 Critical: God Component (`App.tsx`)

**Severity:** Critical  
**Description:** `App.tsx` is 817 lines and acts as a "God Component" — it holds ALL state, ALL callbacks, ALL business logic, ALL modals, ALL keyboard shortcuts, and ALL routing. Every child component prop-drills through this single file.

**Why it matters:** When this file grows (and it will), any new feature requires touching App.tsx. PRs will produce massive merge conflicts. Bugs anywhere in the app will land here. It is nearly impossible to unit-test. The current architecture cannot scale.

**Recommendation:**

```
src/
  contexts/
    ProjectContext.tsx     ← jobId, jobStatus, editingCaptions, activeCaptions
    PlaybackContext.tsx     ← currentTime, isPlaying, videoDuration
    ClipContext.tsx         ← clips, tracks, selectedClipId
    ExportContext.tsx       ← exportProgress, isExporting, downloadUrl
  hooks/
    usePollJob.ts           ← polling logic extracted from App.tsx
    useExport.ts            ← export flow extracted
    useKeyboardShortcuts.ts ← keyboard handler
    useCaptionSync.ts       ← caption ↔ clip ↔ activeCaptions sync
  store/                   (OR use Zustand if Contexts become complex)
```

**Estimated impact:** High — dramatically reduces maintenance cost and enables testing.

---

### A2 — 🔴 Critical: No State Management Layer

**Severity:** Critical  
**Description:** There is no centralized state manager. Prop drilling is 3–5 levels deep (App → PreviewCanvas → EditingCaptions). When you add new features (e.g., multi-track audio, transitions), the prop chain becomes unmanageable.

**Recommendation:** Adopt Zustand (lightweight, TypeScript-native). Create slices: `useProjectStore`, `useTimelineStore`, `usePlaybackStore`. This eliminates prop drilling and makes every component independently testable.

---

### A3 — 🟠 High: Duplicated Caption-to-Clip Sync Logic

**Severity:** High  
**Description:** The code that transforms caption data into timeline clips is copy-pasted in THREE places:
- `handleRunAICaptions()` (L347–367)
- `handleSelectProject()` (L524–543)
- `handleCaptionTextEdit()` / `handleCaptionTimingEdit()` 

Any change to the clip schema must be made in all three. This is a maintenance time bomb.

**Recommendation:** Extract to `useCaptionSync.ts`:
```typescript
function syncCaptionsToClips(captions: Caption[]): Clip[] { ... }
```

---

### A4 — 🟠 High: Django `runserver` in Production Docker Container

**Severity:** High  
**Description:** `docker-compose.yml` uses Django's built-in `runserver` (`python manage.py runserver 0.0.0.0:8001`). Django explicitly states `runserver` should **never** be used in production — it's single-threaded, has no request queuing, no process management, and is slow under concurrent load.

**Recommendation:** Replace with Gunicorn:
```yaml
command: gunicorn autocaption.wsgi:application --bind 0.0.0.0:8001 --workers 4
```

---

### A5 — 🟡 Medium: Single Frontend Build Stage (No Lock File)

**Severity:** Medium  
**Description:** `Dockerfile` runs `npm install` without a `package-lock.json` or `npm ci`. This means non-deterministic dependency resolution at build time. Any minor version bump in a transitive dependency could break the build silently.

**Recommendation:** Commit `package-lock.json` and change to `RUN npm ci` in the Dockerfile.

---

### A6 — 🟡 Medium: SQLite Committed to Repository

**Severity:** Medium  
**Description:** `db.sqlite3` is a 140KB database file committed to version control. This leaks previous job data (file paths, captions, user data).

**Recommendation:** Add `db.sqlite3` to `.gitignore` immediately.

---

### A7 — 🟢 Low: Types Duplicated Between `api.ts` and `types.ts`

**Severity:** Low  
**Description:** `CaptionChunk` and `JobResponse` interfaces are defined in both `api.ts` and `types.ts`. They are slightly different (e.g., `status: string` vs `status: JobStatus`).

**Recommendation:** Export only from `types.ts`. Import from there in `api.ts`.

---

## 2. Code Quality Review

### C1 — 🔴 Critical: `zoom` Prop Hardcoded to `100` in App.tsx

**Severity:** Critical — **Active Bug**  
**Description:** On line 643 of `App.tsx`:
```typescript
<Timeline
  zoom={100}        // ← HARDCODED! The zoom buttons and scroll wheel have NO effect.
  setZoom={() => {}}  // ← No-op. Zoom state is local to Timeline only.
```
The Timeline component has its own internal `zoom` state (via `setZoom` from props), but since App.tsx passes a hardcoded `zoom={100}` and `setZoom={() => {}}` no-op, the zoom controls update local display but the value **never flows back to App.tsx**. This means the playhead calculation and clip positioning are always computed at 100% zoom regardless of what the user sees.

**Recommendation:** Move zoom state up to App.tsx and pass it down properly:
```typescript
const [zoom, setZoom] = useState(100);
<Timeline zoom={zoom} setZoom={setZoom} ... />
```

---

### C2 — 🟠 High: Polling Interval Never Cleared on Component Re-mount

**Severity:** High  
**Description:** `pollTimerRef` and `exportPollTimerRef` are cleared on unmount (the cleanup `useEffect`), but if the user navigates to the Dashboard and back to the editor, `App.tsx` does **not** unmount — it conditionally renders (`viewMode === 'dashboard'`). If captions are already generating and the user navigates away and returns, a second interval could be started, creating two simultaneous polling loops.

**Recommendation:** Always clear the existing interval before starting a new one:
```typescript
if (pollTimerRef.current) clearInterval(pollTimerRef.current);
pollTimerRef.current = setInterval(...);
```

---

### C3 — 🟠 High: `showToast` Can Overlap / Be Lost

**Severity:** High  
**Description:** The toast system uses a single `setTimeout` per call. If two toasts are shown within 3.5 seconds of each other (common during export), the second toast's timer will clear the first before the user reads it, and both disappear immediately.

**Recommendation:** Use a toast queue (`toast[]` array) with sequential or stacked display. Libraries like `react-hot-toast` handle this out of the box.

---

### C4 — 🟠 High: Missing `useCallback` on `handleSelectProject`

**Severity:** High  
**Description:** `handleSelectProject` (L513) is defined as a plain `async` function inside the component body, not wrapped in `useCallback`. This creates a new function reference on every render, causing unnecessary re-renders of `Dashboard` which receives it as a prop.

---

### C5 — 🟡 Medium: `handleAddTextClip` Creates a 35-Second Clip by Default

**Severity:** Medium — User-facing bug  
**Description:** L239: `duration: 35` hardcoded. A 35-second text clip added to a 10-second video looks absurd in the timeline and extends far beyond the video bounds with no warning.

**Recommendation:** Default to `Math.min(5, videoDuration - currentTime)`.

---

### C6 — 🟡 Medium: Race Condition in Caption Sync

**Severity:** Medium  
**Description:** `handleCaptionTextEdit` updates three separate state atoms (`editingCaptions`, `activeCaptions`, `clips`) in sequence. React batches state updates in event handlers, but if these are called in rapid succession (e.g., the user types quickly), the intermediate states may be inconsistent.

**Recommendation:** Derive `activeCaptions` and `clips` from a single `editingCaptions` source of truth, either via `useMemo` or a unified reducer.

---

### C7 — 🟡 Medium: `wordsPerLine` Default Is 1 (Non-Intuitive)

**Description:** The default is 1 word per caption, which produces TikTok/Hormozi-style captions. Most users expect traditional subtitle behavior (5–8 words). The setting is in the "AI Tools" tab, which is not the first tab the user sees. Users will generate captions, be confused by the single-word output, and not know where to change it.

---

### C8 — 🟢 Low: `mediaUrl` Has Overly Complex Logic

**Description:** The `mediaUrl()` function in `api.ts` has three conditional branches to handle paths that should be normalized server-side. The server should always return absolute paths or paths that need only one transform.

---

## 3. UI Review

### Screen 1: Dashboard — **7/10**

**Deductions:**
- **-1:** No video thumbnail preview on project cards. Every card shows a generic `Video` icon regardless of what was uploaded. Users cannot distinguish projects visually.
- **-1:** Project name is derived from the uploaded filename (e.g. `20240721_clip_final_v3_EDIT.mp4`), which is not user-friendly and often gets truncated.
- **-1:** No way to delete or rename projects from the dashboard.

---

### Screen 2: Editor (Import Tab) — **6/10**

**Deductions:**
- **-1:** No file size or format validation feedback. Users who upload a 4GB RAW file get no warning before upload begins.
- **-1:** No progress indicator for the upload itself (only for transcription). Large files leave users staring at a static UI.
- **-2:** The workflow is non-obvious. Users need to: (1) import, (2) switch to AI Tools, (3) set words per line, (4) click Generate. This 4-step flow is never surfaced. After importing, there is no clear "next step" prompt.

---

### Screen 3: Editor (AI Tools + Caption Generation) — **7/10**

**Deductions:**
- **-1:** The "Captions Ready" success state replaces the Generate button but doesn't tell the user what to do next (i.e., click Export).
- **-1:** No estimated time remaining during transcription. Users have no idea if the job will take 10 seconds or 5 minutes.
- **-1:** The "Words per Caption" slider label says "Choose '1' for the fast-paced Hormozi style" which is jargon. New users won't know what "Hormozi style" means.

---

### Screen 4: Editor (Timeline) — **6/10**

**Deductions:**
- **-1:** The timeline is fixed-height at `h-64` (256px). A video editor timeline is one of the most-used surfaces. It should be resizable vertically via drag.
- **-1:** Caption clips are extremely small when at 100% zoom. Users can barely see or select them without zooming in first. The default zoom level should be auto-calculated based on video duration.
- **-2:** Clip colors are all gradient-based dark tones. It's hard to distinguish video, text, and audio tracks at a glance. Professional editors (Premiere, Resolve) use distinct, saturated per-track colors.

---

### Screen 5: Inspector — **7/10**

**Deductions:**
- **-1:** Inspector shows transform controls even when no clip is selected. When nothing is selected, all those sliders are meaningless and confuse users about what they're controlling.
- **-1:** Audio controls (bass, treble, enhanced voice) look real but are **simulation-only**. These settings are never used during rendering. This is deceptive UI.
- **-1:** No confirmation dialog before deleting a clip. Single click on the red trash icon immediately removes it with no undo.

---

### Screen 6: Export Modal — **8/10**

**Deductions:**
- **-1:** Export progress (`+3% per interval`) is fake and unrelated to actual render progress. The progress bar jumps to 85% and stalls, then jumps to 100%. This looks broken.
- **-1:** No option to customize export settings (resolution, quality, format). Professional users expect at minimum 720p/1080p/4K and MP4/MOV options.

---

## 4. UX Review

### U1 — 🔴 Critical: No Guided Onboarding / Empty State Flow

**Description:** A first-time user lands on the Dashboard with a "No Projects Yet" screen and a "Start Creating" button that takes them to the editor at the Import tab. There is **zero guidance** on what to do next. The user sees: Sidebar (7 tabs), Preview (empty), Timeline (empty), Inspector (empty). Nothing tells them to import a video first.

**Recommendation:** Add a step indicator or welcome overlay: "Step 1: Import your video → Step 2: Generate captions → Step 3: Export." This is table stakes for any creative tool in 2025.

---

### U2 — 🔴 Critical: The Core User Journey Is Broken by Tab Switching

**Description:** The intended flow requires the user to manually navigate to different tabs at different stages:
1. Go to **Import** tab → upload video
2. Go to **AI Tools** tab → set words per line → click Generate
3. After generation, open **Preview** → click "Edit Captions" → edit text
4. Click **Export** button in the header

None of these transitions are prompted by the UI. A new user has no way to discover this flow. 

**Recommendation:** After a video is imported, automatically prompt "Generate captions?" with a call-to-action. After generation, auto-scroll or highlight the preview caption editor. This reduces user friction from 4 context switches to 0.

---

### U3 — 🔴 Critical: No Undo / Redo

**Description:** There is no Ctrl+Z / Ctrl+Y undo system. If a user accidentally deletes a clip, edits a caption incorrectly, or moves a clip to the wrong position, they have no way to recover. This is a dealbreaker for any serious editing workflow.

**Recommendation:** Implement a command stack:
```typescript
type HistoryEntry = { before: AppState; after: AppState; description: string };
const [history, setHistory] = useState<HistoryEntry[]>([]);
```
Or use the "immer + patches" approach for efficient state diffing.

---

### U4 — 🟠 High: Caption Position Cannot Be Changed After Generation

**Description:** The `caption_position` field (`top` | `bottom`) is set at job creation time and baked into the ASS file at render time. The `captionOffset` drag in the preview is a purely visual simulation — it does **not** affect the final rendered video. Users will drag the caption to the top of the screen in the preview, export, and find the caption is still at the bottom.

**Recommendation:** The `captionOffset` from the preview drag must be serialized and passed to the render task. The ASS MarginV value must be computed from the drag offset.

---

### U5 — 🟠 High: No Way to Re-Generate Captions With Different Settings

**Description:** Once captions are generated, the job status moves to `ready_for_review`. The `update_captions` and `render_job` views both check `job.status != ready_for_review` and reject calls otherwise. If users want to change `wordsPerLine` and re-run, they must create a new project from scratch.

**Recommendation:** Add a "Re-generate captions" button that creates a new Celery task for the same job (resetting status to `pending` and running `transcribe_video` again with updated parameters).

---

### U6 — 🟠 High: LUT Effects Are Visual Only — Not Rendered

**Description:** Similar to audio controls — the LUT effects (cyberpunk, VHS, noir) applied in the Inspector are CSS filter simulations. They're not passed to ffmpeg. The exported video will have no color grade. Users will feel deceived.

**Recommendation:** Either pass LUT effect metadata to the render task and implement them via ffmpeg's color space filters, or clearly label them as "Preview Only" and disable them in the export flow.

---

### U7 — 🟡 Medium: Timeline Snap Interval (5 Seconds) Is Too Coarse for Captions

**Description:** The snap grid is hardcoded to 5-second intervals (`Math.round(time / 5) * 5` in `handleRulerClick`). Caption clips are typically 0.5–3 seconds long. Snapping in 5-second increments makes caption trimming very imprecise.

**Recommendation:** Make the snap interval adaptive based on zoom level. At 200% zoom, snap every 0.5s. At 500%, snap every 0.1s.

---

### U8 — 🟡 Medium: No Keyboard Shortcuts for Essential Caption Workflow

**Description:** Available shortcuts: Space, S (split), M (marker), R (reset), C (generate captions), Ctrl+K (command palette). **Missing:** Delete (delete selected clip), Ctrl+Z (undo), arrow keys (nudge clip), J/K/L (playback speed like DaVinci), I/O (in/out points).

---

## 5. Accessibility Audit

### WCAG Compliance: **AA Non-Compliant**

| Issue | Severity | WCAG Criterion |
|---|---|---|
| No `aria-label` on icon-only buttons (mute, lock, zoom) | 🔴 Critical | 1.1.1 Non-text Content |
| No visible keyboard focus ring on most interactive elements | 🔴 Critical | 2.4.7 Focus Visible |
| `select-none` on the root div disables text selection globally | 🔴 Critical | 1.3.1 Info & Relationships |
| Toast messages are not announced to screen readers (`role="alert"` missing) | 🟠 High | 4.1.3 Status Messages |
| Color is the only differentiator for clip types in the timeline | 🟠 High | 1.4.1 Use of Color |
| No `aria-pressed` on toggle buttons (mute, snap, bounding box) | 🟠 High | 4.1.2 Name, Role, Value |
| Text in toasts is uppercase `tracking-widest` — poor readability | 🟡 Medium | 1.4.12 Text Spacing |
| Inspector sliders have no visible value labels adjacent | 🟡 Medium | 1.3.1 |
| Touch targets for clip edge handles are only ~4px wide | 🔴 Critical (mobile) | 2.5.5 Target Size |
| All text is white-on-near-black — estimated contrast OK, but grey-on-grey areas fail | 🟡 Medium | 1.4.3 Contrast |

**Estimated WCAG AA Score: ~40%**

---

## 6. Performance Audit

### P1 — 🔴 Critical: Timeline Re-renders On Every Frame During Playback

**Description:** `currentTime` is stored in React state and updated via `onSeek`. If playback is implemented by updating `currentTime` at 30 fps, this causes the **entire Timeline component** to re-render 30 times per second. The Timeline renders every clip, every track, every tick mark, and the playhead position — all re-computed on every animation frame.

**Recommendation:** Use a `ref` for the playhead position during playback, and only update React state when playback stops. Apply the playhead position via direct DOM manipulation or CSS custom properties:
```typescript
// In a useEffect driven by requestAnimationFrame:
playheadRef.current.style.left = `${timeToPercent(time)}%`;
```

---

### P2 — 🟠 High: No Memoization on Expensive Computations

**Description:** `tickMarks` array generation, `clips.filter(c => c.trackId === track.id)` (inside a `.map()`), and `clips.find(c => c.id === selectedClipId)` — all run on every render. With 100+ caption clips, this is O(n) per track per render.

**Recommendation:**
```typescript
const tickMarks = useMemo(() => generateTicks(totalDuration), [totalDuration]);
const clipsByTrack = useMemo(() => groupBy(clips, 'trackId'), [clips]);
```

---

### P3 — 🟠 High: No Virtualization for Large Caption Lists

**Description:** The Caption Editor in PreviewCanvas renders every caption row at once. A 20-minute video might produce 200+ caption entries. All are rendered in the DOM simultaneously, causing layout thrashing.

**Recommendation:** Use `react-window` or `react-virtual` to render only visible rows.

---

### P4 — 🟠 High: `URL.createObjectURL` Leaks Memory

**Description:** In `handleVideoFileSelected()` (L263):
```typescript
const url = URL.createObjectURL(file);
setUserVideoUrl(url);
```
The old URL is never revoked. Every time a user selects a new video, the previous `ObjectURL` remains allocated in browser memory until page refresh.

**Recommendation:**
```typescript
const handleVideoFileSelected = (file: File) => {
  if (userVideoUrl?.startsWith('blob:')) URL.revokeObjectURL(userVideoUrl);
  const url = URL.createObjectURL(file);
  setUserVideoUrl(url);
};
```

---

### P5 — 🟡 Medium: Whisper Model Runs on CPU — No GPU Detection

**Description:** `tasks.py` always uses `device="cpu"` for the Whisper model. If the host machine has a CUDA GPU (very likely for a video editing server), transcription is 10–50x slower than it needs to be.

**Recommendation:**
```python
import torch
device = "cuda" if torch.cuda.is_available() else "cpu"
WhisperModel(model_size, device=device, compute_type="float16" if device == "cuda" else "int8")
```

---

### P6 — 🟡 Medium: 2-Second Polling Interval Is Too Frequent

**Description:** Both the transcription and export polls hit the Django API every 2 seconds. For a 5-minute video transcription, this creates ~150 API calls just for status checking. Redis is fast, but polling this aggressively adds unnecessary load.

**Recommendation:** Use exponential backoff starting at 1s, maxing at 10s. Or implement WebSockets/SSE for real-time job status (Django Channels).

---

## 7. Video Editing Workflow Review

This is the most critical section.

### W1 — 🔴 Critical: Playhead Does Not Sync With Video Playback

**Description:** The video `<video>` element plays independently. `currentTime` in React state is only updated when the user manually seeks (ruler click, caption click, +/-10s buttons). During active playback, the React state `currentTime` is NOT updated to match the actual video position. This means:
- The timeline playhead freezes while the video plays
- The active caption overlay does not update while the video plays
- Seeking by clicking the timeline ruler while playing gives wrong results

**Recommendation:** Attach a `timeupdate` event listener to the video element and call `setCurrentTime(video.currentTime)` during playback. Using a ref for live playback (P1 recommendation) prevents the performance penalty.

---

### W2 — 🔴 Critical: Timeline Zoom Is Broken (See C1)

As described in C1, the `zoom` prop is hardcoded to `100` in App.tsx. All zoom interactions in the Timeline are purely cosmetic — they don't affect clip rendering calculations, playhead position, or ruler accuracy.

---

### W3 — 🟠 High: No Multi-Track Support in Practice

**Description:** The model has 4 tracks (Video, Audio, Text, Effects), but in practice:
- Only one video clip can exist (`video-main`)
- `handleVideoLoaded` does not add a new clip if a video clip exists (hardcoded guard at L281)
- Audio and effects tracks have no real backend integration
- The "Effects" track in the timeline does nothing

Users who try to add a second video clip or layer multiple audio tracks will find the timeline unresponsive.

---

### W4 — 🟠 High: Clip Drag (Repositioning) Is Absent

**Description:** There is NO drag-to-reposition for clips. The only way to move a clip is using the tiny `←5s / →5s` arrow buttons that appear when selected. Users expect to click-and-drag clips along the timeline, which is the most fundamental timeline interaction.

---

### W5 — 🟠 High: Edge Drag Is Imprecise Due to Snap Grid

As described in U7. At 100% zoom on a 60-second video, one pixel in the timeline represents ~1 second. Dragging an edge a few pixels jumps 5 seconds (due to snap grid). Caption clips that are 0.5–2 seconds long cannot be edited at all at this zoom level.

---

### W6 — 🟡 Medium: Split at Playhead Has Poor UX

**Description:** The split shortcut (`S`) requires:
1. A clip to be selected  
2. The playhead to be inside that clip's bounds  

If either condition fails, a toast appears. The user has no visual indicator of where the playhead is relative to the selected clip's bounds. Professional editors show a visual highlight on the clip at the playhead intersection.

---

### W7 — 🟡 Medium: Markers Cannot Be Deleted

**Description:** `handleAddMarker` toggles a marker — if a marker exists at `currentTime`, it's removed. But the user can only delete a marker by seeking to its exact timestamp (to the floating-point second), which is nearly impossible to do precisely with a mouse.

**Recommendation:** Right-click context menu on markers to delete them, or show markers in a list with delete buttons.

---

## 8. QA Testing — Bug Registry

### Functional Bugs

| ID | Bug | Likelihood | Severity | Steps to Reproduce |
|---|---|---|---|---|
| F1 | Zoom controls have no effect on playhead/clip positions | **Confirmed** | 🔴 Critical | Zoom in → observe playhead position stays relative to container, not time |
| F2 | Video playhead freezes during playback | **Confirmed** | 🔴 Critical | Import video → play → observe timeline playhead |
| F3 | Caption drag offset not applied to rendered video | **Confirmed** | 🔴 Critical | Drag caption up in preview → export → verify position in output |
| F4 | LUT effects not applied in exported video | **Confirmed** | 🟠 High | Apply "Noir" LUT → export → view output (will be color-normal) |
| F5 | Audio settings (bass/treble) not applied in exported video | **Confirmed** | 🟠 High | Adjust volume/bass → export → compare audio levels |
| F6 | Text clip default duration (35s) exceeds video duration | Likely | 🟡 Medium | Import 10s video → add text clip → inspect timeline |
| F7 | `URL.createObjectURL` leak on repeated video selection | **Confirmed** | 🟠 High | Open devtools memory → import video → import again → observe blob URL count |

### State Bugs

| ID | Bug | Likelihood | Severity |
|---|---|---|---|
| S1 | Double-polling if user navigates away/back during transcription | Likely | 🟠 High |
| S2 | Toast messages overwrite each other within 3.5s window | Likely | 🟡 Medium |
| S3 | `clips` state diverges from `editingCaptions` after timeline edge-drag | Likely | 🟠 High |
| S4 | `selectedClipId` refers to deleted clip if split creates new IDs | Possible | 🟡 Medium |

### Race Conditions

| ID | Scenario | Root Cause |
|---|---|---|
| R1 | User clicks Generate Captions twice rapidly | `isGeneratingCaptions` check is correct but `createJob()` still fires before state updates | 
| R2 | User starts export while previous render poll is still running | `exportPollTimerRef` not cleared before starting new export |
| R3 | `transcribe_video` Celery task: if `faster_whisper` model loading fails after `save()` of TRANSCRIBING status, job hangs indefinitely in TRANSCRIBING | Max retries = 2, but no timeout mechanism in frontend poll |

### Edge Cases

| ID | Scenario |
|---|---|
| E1 | Video file with no audio track (silent video) — `_fail_job` called with "no words" message, but UI only shows generic "Transcription failed" |
| E2 | Video longer than 1 hour — Celery task time limit is 1 hour, but the task computes audio extraction + whisper transcription + rendering in sequence, which together could exceed limit |
| E3 | User uploads a non-video file with video MIME type disguised (e.g., a text file renamed to .mp4) |
| E4 | Two browser tabs open for same project — concurrent PATCH to captions endpoint causes last-write-wins data loss |
| E5 | Caption with `start >= end` after user edits timing inputs — currently validated server-side but not client-side, allowing export of corrupt ASS file |

### Memory Leaks

| ID | Leak | Location |
|---|---|---|
| M1 | `URL.createObjectURL` never revoked | `handleVideoFileSelected` |
| M2 | `pollTimerRef` interval not cleared if component force-unmounts during transcription | App.tsx cleanup useEffect |
| M3 | `window.addEventListener('mousemove', ...)` in PreviewCanvas and Timeline are duplicated — each drag operation adds new listeners that get cleaned up, but rapid drag starts could stack | PreviewCanvas.tsx L166–174, L187–195 |

### Browser Compatibility

| Issue | Browsers Affected |
|---|---|
| `e.ctrlKey` on wheel for pinch-zoom only works in desktop Chrome/Firefox; Safari uses GestureEvent API | Safari |
| `onWheel` passive event listener cannot call `e.preventDefault()` in React 18 | All (causes console warning) |
| `URL.createObjectURL` from `File` — not supported in IE11 | IE11 (negligible) |

---

## 9. Security Review

### SEC1 — 🔴 Critical: No File Upload Validation

**Description:** The upload endpoint accepts any file with any MIME type up to any size. An attacker could upload:
- A malformed video that causes ffmpeg to hang indefinitely (DoS)
- A zip bomb or specially crafted file that exhausts disk space
- A script file renamed to `.mp4` (less dangerous since ffmpeg is invoked, but unsafe)

**Recommendation:**
```python
MAX_UPLOAD_SIZE = 500 * 1024 * 1024  # 500 MB
ALLOWED_MIME_TYPES = {'video/mp4', 'video/mov', 'video/avi', 'video/webm'}

if file.size > MAX_UPLOAD_SIZE:
    return Response({'detail': 'File too large'}, status=413)
if file.content_type not in ALLOWED_MIME_TYPES:
    return Response({'detail': 'Invalid file type'}, status=415)
```

Also validate with `python-magic` (actual byte-level MIME detection, not just content_type header spoofing).

---

### SEC2 — 🔴 Critical: No Authentication or Authorization

**Description:** Every API endpoint is completely unauthenticated (`DEFAULT_AUTHENTICATION_CLASSES: []`, `DEFAULT_PERMISSION_CLASSES: []`). Anyone who can reach the server can:
- List all projects (`GET /api/jobs/`)
- Download any video by UUID
- Upload unlimited videos
- Trigger unlimited Celery renders (CPU exhaustion attack)

If this app is deployed on a public URL, it is an open compute resource.

**Recommendation:** Even for a personal tool, add at minimum a shared secret header (`X-API-Key`) or HTTP Basic Auth via nginx. For multi-user: implement Django session auth.

---

### SEC3 — 🔴 Critical: `SECRET_KEY` Checked into Repository

**Description:** `docker-compose.yml` contains:
```yaml
DJANGO_SECRET_KEY: docker-compose-insecure-dev-key
```
This is committed to version control. If this repository is ever made public, the secret key is compromised and all Django sessions/signatures can be forged.

**Recommendation:** Use `.env` files (not committed) or Docker secrets. Never hardcode secrets in compose files.

---

### SEC4 — 🔴 Critical: `CORS_ALLOW_ALL_ORIGINS = True`

**Description:** CORS is set to allow all origins. If this backend is deployed with a real domain, any website can make authenticated API requests on behalf of your users.

**Recommendation:**
```python
CORS_ALLOWED_ORIGINS = ["http://localhost:3000", "https://yourdomain.com"]
```

---

### SEC5 — 🟠 High: ffmpeg Path Injection Risk

**Description:** `_burn_subtitles()` builds a shell path from a temp file:
```python
escaped_ass = ass_path.replace(":", "\\:").replace("'", "\\'")
cmd = [..., "-vf", f"ass='{escaped_ass}'", ...]
```
The path comes from `tempfile.TemporaryDirectory()` so it's system-generated. However, if the `job_id` or filename ever contributed to the path, this would be a command injection vector. The current implementation is safe, but the pattern is fragile.

**Recommendation:** Use subprocess argument list form (which you already do) and never interpolate user-controlled values into the ffmpeg filter string.

---

### SEC6 — 🟡 Medium: `@csrf_exempt` on Mutation Endpoints

**Description:** `create_job`, `update_captions`, and `render_job` all use `@csrf_exempt`. While DRF handles CSRF differently for API views, the explicit exemption disables Django's CSRF protection globally for these endpoints.

**Recommendation:** Remove `@csrf_exempt` and rely on DRF's built-in CSRF handling (or session-based auth with `SessionAuthentication`).

---

### SEC7 — 🟡 Medium: `DEBUG = True` Default

**Description:** `settings.py` defaults `DEBUG` to True. In production, this exposes stack traces, SQL queries, and internal paths to any user who triggers an error.

**Recommendation:** Change the default to `False` and require explicit opt-in for dev environments.

---

## 10. Developer Experience

### DX1 — No Tests Whatsoever

**Description:** There are zero unit tests, zero integration tests, and zero end-to-end tests. With no safety net, every refactor risks silent regressions.

**Recommendation:**
- Backend: `pytest-django` for model and view tests, `celery` test fixture for task tests
- Frontend: `vitest` + `react-testing-library` for component tests
- E2E: `Playwright` for critical user flows (upload → transcribe → export)

---

### DX2 — No `.env.example` File

**Description:** There is no `.env.example` or onboarding documentation explaining what environment variables are needed. A new developer must read `settings.py`, `docker-compose.yml`, and the `Dockerfile` to reconstruct the required environment.

**Recommendation:** Create `.env.example`:
```env
DJANGO_SECRET_KEY=generate-a-strong-key-here
DJANGO_DEBUG=True
DATABASE_URL=postgres://autocaption:autocaption@db:5432/autocaption
CELERY_BROKER_URL=redis://redis:6379/0
```

---

### DX3 — No API Documentation

**Description:** The 5 API endpoints are documented only in docstrings inside `views.py`. There is no Swagger/OpenAPI schema. New developers must read the Django source to understand the API contract.

**Recommendation:** Add `drf-spectacular` for automatic OpenAPI schema generation and a `/api/docs/` endpoint.

---

## 11. Missing Features

### 🔴 Critical (Users Will Abandon Without These)

| Feature | Why Critical |
|---|---|
| Undo / Redo | Industry standard — users WILL accidentally delete work |
| Real playback sync (currentTime from video element) | Timeline is broken without this |
| Caption position applied to render | Core feature claim is broken |
| Upload progress bar | Without this, large file uploads look frozen |

### 🟠 Important (Significant Competitive Gap)

| Feature |
|---|
| Drag-to-reposition clips in timeline |
| Delete key shortcut to remove selected clip |
| Project naming / renaming |
| Video thumbnail in project card (from ffprobe) |
| Re-generate captions with new settings on existing project |
| Caption font customization in render (font family, size, color) |
| Export settings (resolution, quality, format) |
| Real-time progress from Celery task to frontend (WebSocket) |

### 🟡 Nice To Have

| Feature |
|---|
| Caption translation (via deep-translate or Google Translate API) |
| Multiple caption styles (outlined, shadowed, boxed) |
| Auto-highlight (karaoke) toggle — optionally disable per-word animation |
| Clip duplication |
| Timeline scrubbing (hover preview) |
| Waveform visualization from actual audio data |
| Multiple language detection |

### 💡 Future Ideas

| Feature |
|---|
| AI-powered clip selection (auto-remove filler words/silence) |
| B-roll auto-matching via semantic video search |
| Cloud storage integration (Google Drive, Dropbox) |
| Team collaboration on captions |
| Caption brand kit (save presets per user/brand) |

---

## 12. Product Critique

**Would users enjoy using it?**
> Partially. The visual design is genuinely impressive and the AI captioning core works well. But the workflow friction — 4 manual tab switches, no undo, no guided flow — will frustrate users before they reach the "wow moment."

**Would they recommend it?**
> Not yet. Too many silent failures (LUT not applied, position not saved, playhead frozen) will make users feel the product lied to them.

**Would professionals use it?**
> No. Missing drag-to-reposition, no keyboard shortcut for delete, no multi-audio support, no timeline scrubbing, no export format selection. Professionals will leave after 2 minutes.

**Would beginners understand it?**
> No. No onboarding, no guided flow, no tooltips. A beginner who imports a video has no indication that they should switch to a different tab.

**What would stop adoption?**
> 1. The playback-timeline sync bug (it looks fundamentally broken)
> 2. The "caption position drag does nothing to the output" issue (feels deceptive)
> 3. No undo system

**What feels unfinished?**
> The Inspector's audio and effects controls, the LUT simulation, the static waveform, and the "Effects" timeline track.

---

## 13. Prioritized Improvement Roadmap

### 🔥 Critical (Must Fix Before Any Public Release)

| # | Task | Difficulty | User Impact |
|---|---|---|---|
| 1 | Fix `currentTime` sync with video `timeupdate` event | Easy | High |
| 2 | Fix zoom: move state to App.tsx, pass correctly | Easy | High |
| 3 | Apply `captionOffset` to ASS margin in render task | Medium | High |
| 4 | Add no-auth guard or basic API key protection | Easy | High |
| 5 | Fix `SECRET_KEY` in docker-compose (use .env) | Easy | High |
| 6 | Set `CORS_ALLOW_ALL_ORIGINS = False` | Easy | High |
| 7 | Revoke `URL.createObjectURL` on re-import | Easy | Medium |
| 8 | Add file upload size + MIME validation | Easy | High |
| 9 | Add toast queue (no overwriting) | Easy | Medium |
| 10 | Clear polling timer before starting new one | Easy | Medium |

---

### 🟠 High Priority (Pre-Launch Polish)

| # | Task | Difficulty | User Impact |
|---|---|---|---|
| 11 | Implement basic Undo/Redo (command stack) | Hard | High |
| 12 | Add upload progress indicator | Medium | High |
| 13 | Add step-by-step guided onboarding flow | Medium | High |
| 14 | Add drag-to-reposition clips in timeline | Medium | High |
| 15 | Fix snap grid to be adaptive to zoom level | Medium | High |
| 16 | Add video `timeupdate` → timeline playhead animation via RAF | Medium | High |
| 17 | Add `Delete` key shortcut for selected clip | Easy | Medium |
| 18 | Add `aria-label` to all icon-only buttons | Easy | Medium |
| 19 | Add `role="alert"` to toast | Easy | Medium |
| 20 | Add keyboard focus rings (`:focus-visible`) | Easy | Medium |

---

### 🟡 Medium Priority (Post-Launch V1.1)

| # | Task | Difficulty |
|---|---|---|
| 21 | Refactor App.tsx into context/hooks | Hard |
| 22 | Add Zustand state management | Medium |
| 23 | Add GPU auto-detection in Celery worker | Easy |
| 24 | Replace `runserver` with Gunicorn in Docker | Easy |
| 25 | Add `react-window` for caption list virtualization | Medium |
| 26 | Memoize tick marks and clip grouping | Easy |
| 27 | Add project naming/renaming | Medium |
| 28 | Add video thumbnail generation via ffprobe | Medium |
| 29 | Add `npm ci` and lock file to Dockerfile | Easy |
| 30 | Add `.env.example` and `drf-spectacular` docs | Easy |

---

### 🟢 Low Priority (V1.2+)

| # | Task |
|---|---|
| 31 | Add export format/resolution settings |
| 32 | Add re-generate captions button on existing project |
| 33 | Add real waveform data visualization |
| 34 | Add WebSocket for real-time job status updates |
| 35 | Add caption translation feature |

---

## 14. Final Score

| Category | Score | Notes |
|---|---|---|
| **Architecture** | 4/10 | God component, no state management, duplicated logic |
| **Maintainability** | 4/10 | No tests, 817-line App.tsx, no documentation |
| **Code Quality** | 5/10 | TypeScript is good, but significant bugs like hardcoded zoom |
| **UI** | 7/10 | Genuinely impressive visual design for the stage of development |
| **UX** | 4/10 | No onboarding, no undo, broken core workflow |
| **Accessibility** | 2/10 | Global select-none, no ARIA, no focus rings |
| **Performance** | 5/10 | Memory leaks, no memoization, CPU-only Whisper |
| **Scalability** | 3/10 | runserver, no load balancing, single-worker, no CDN |
| **Reliability** | 4/10 | Race conditions, silent feature failures (LUT, audio, position) |
| **Video Editing Experience** | 3/10 | Playhead frozen, zoom broken, no drag, no undo |
| **Developer Experience** | 3/10 | No tests, no docs, no env example, no API schema |
| **Testing** | 0/10 | Zero tests |
| **Security** | 2/10 | No auth, open CORS, secret in repo, no upload validation |
| **Overall Product** | 5/10 | Beautiful shell, broken core |
| **Production Readiness** | 2/10 | Not production-ready |

### **Overall Score: 38 / 100**

---

### How to Reach 95+/100

| Phase | Key Actions | Score Gain |
|---|---|---|
| **Fix breaking bugs** | Fix playhead sync, fix zoom, fix caption position in render | +18 |
| **Security hardening** | Auth, CORS, secrets, upload validation | +10 |
| **Core UX** | Undo/redo, onboarding, guided flow | +12 |
| **Architecture refactor** | Contexts/Zustand, extract duplicated logic | +8 |
| **Testing** | 70% coverage on critical paths | +8 |
| **Accessibility** | ARIA, focus rings, contrast fixes | +6 |
| **Performance** | RAF playhead, memoization, ObjectURL cleanup | +4 |
| **Developer Experience** | Docs, env example, OpenAPI | +3 |

---

## 15. Executive Summary

### 🏆 Top 10 Issues

1. **Playhead doesn't sync with video** — timeline appears broken during playback
2. **Zoom is hardcoded to 100%** — all zoom interactions are purely visual, non-functional
3. **Caption drag position not applied to render** — core UX promise is broken
4. **No undo/redo** — any accidental action is permanent
5. **No authentication** — public endpoints are an open compute API
6. **LUT and audio effects are simulated only** — deceptive UI
7. **No onboarding** — new users have no guided flow
8. **Secret key and CORS in repository** — security risk
9. **No file upload validation** — DoS and disk exhaustion risk
10. **No tests** — every refactor is a gamble

---

### ⚡ Top 10 Quick Wins (< 1 hour each)

1. Fix `zoom={100}` → `zoom={zoom}` in App.tsx
2. Add `onTimeUpdate` to `<video>` element → call `setCurrentTime`
3. Add `URL.revokeObjectURL` before re-assigning blob URL
4. Clear polling timer before starting a new one
5. Add `role="alert"` to toast div
6. Add `aria-label` to mute, lock, zoom buttons
7. Add `db.sqlite3` to `.gitignore`
8. Change `CORS_ALLOW_ALL_ORIGINS = False` in settings
9. Change `DEBUG = False` as default in settings
10. Add `Delete` keyboard shortcut for selected clip deletion

---

### 🏗️ Biggest Architectural Risk
> The 817-line God Component `App.tsx`. As the product grows, this becomes unmaintainable. Every new feature will create merge conflicts, hidden bugs, and performance regressions. Refactor to Context + Hooks before the codebase doubles.

### 😤 Biggest UX Issue
> **No guided flow**. A user who imports a video is dropped in a complex editor with no indication of what to do next. The core workflow (Import → AI Tools → Generate → Edit → Export) requires 4 manual context switches with zero prompting. This will cause every new user to give up before generating their first caption.

### 🐌 Biggest Performance Bottleneck
> The `currentTime` state update triggering full Timeline re-renders at playback speed. Fix with requestAnimationFrame + direct DOM manipulation for the playhead position.

### 🔒 Biggest Security Concern
> Zero authentication on the API. Combined with no file upload validation and open CORS, this is an open invitation for abuse the moment the app is deployed anywhere with a public IP.

### 🚀 Biggest Opportunity to Differentiate
> The karaoke-style per-word caption highlighting is genuinely unique and powerful. No other web-based tool does this out of the box. Double down on this: add caption style presets (Hormozi, YouTube, TikTok), allow brand color customization, and make the highlight animation configurable. This is a genuine moat if executed well.
