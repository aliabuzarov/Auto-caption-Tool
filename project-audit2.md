# AutoCaption Tool — Professional Audit Report
> **Auditor:** Elite Software Review Committee (UI/UX, QA, Security, Performance, Architecture)  
> **Date:** July 2026  
> **Version Reviewed:** Current main branch  

---

# 1. Executive Evaluation

| Dimension | Score | Commentary |
|---|---|---|
| **Overall Product Quality** | 5.5 / 10 | Promising foundation; critical workflow gaps |
| **UI Quality** | 6.5 / 10 | Aesthetically strong but density creates friction |
| **UX Quality** | 4.5 / 10 | Workflow has hard blockers for real editors |
| **Architecture** | 6.0 / 10 | Sound structure; serious state management holes |
| **Performance** | 5.0 / 10 | Long-poll, no virtualization, rAF loop risks |
| **Scalability** | 3.5 / 10 | Single Celery worker, no queuing, media pileup |
| **Accessibility** | 2.0 / 10 | Essentially non-existent WCAG compliance |
| **Professional Readiness** | 3.0 / 10 | Too many missing professional workflows |
| **Production Readiness** | 2.5 / 10 | Security, auth, rate limiting — all missing |
| **Innovation** | 7.0 / 10 | Local-first AI + karaoke ASS burn-in is genuinely clever |
| **Learning Curve** | 7.5 / 10 | Relatively intuitive compared to DaVinci/Premiere |
| **Market Competitiveness** | 4.0 / 10 | CapCut and Descript are years ahead in UX |
| **Commercial Potential** | 6.0 / 10 | Strong niche; right timing for short-form creators |

## Executive Summary

AutoCaption is a technically ambitious project that successfully implements the hardest parts first: local AI transcription via `faster-whisper`, karaoke-style word-level highlighting, ASS subtitle burn-in via FFmpeg, and a convincingly dark NLE aesthetic. For a side project or early MVP, this is impressive work.

However, if the stated goal is to become "one of the best professional caption editing applications," there are systematic, deep problems that cannot be fixed with styling tweaks. The application has **no authentication**, meaning every video uploaded is accessible to anyone who guesses a UUID. There is **no autosave** — any browser refresh loses all unsaved edits. The **undo system is limited to clips/transform only**, ignoring caption edits. The **timeline is decorative** — dragging clips does not actually change where captions appear in the video. The **caption offset sends a Y-only pixel value** to the backend, ignoring the X axis and the display scale relationship. These are not Polish issues. They are fundamental workflow blockers.

The UI is visually distinctive. The dense dark aesthetic, glassmorphism panels, and NLE-like layout look premium at first glance. But on inspection, the font sizes are frequently too small (8-9px labels are below recommended minimums), the panel resize handles are only 8px wide (far too narrow), and the contrast ratios fail WCAG AA on multiple surfaces.

The backend architecture is clean and well-structured but missing rate limiting, upload size enforcement at the infrastructure level, authentication, and proper media cleanup. The Celery/Redis setup is production-capable but runs a single-worker configuration with no job queue priority.

**Bottom line:** This product is impressive as a working prototype. It is not ready for public users in any capacity. The path to production requires addressing authentication, data persistence, professional timeline editing, real caption syncing, and accessibility before anything else.

---

# 2. UI Review

## 2.1 Visual Hierarchy

**Score: 6/10**

The primary visual hierarchy is reasonable: Header → Preview/Timeline → Inspector. However, hierarchy *within* panels breaks down. In the Inspector, tab labels (8-10px uppercase), value labels, and value outputs all fight for similar visual weight. The primary action ("Export") is buried in the header rather than surfacing prominently in the main workflow.

**DaVinci Resolve comparison:** DaVinci uses larger font sizes (11-12px baseline) and distinct size hierarchies between section headings, property labels, and values. AutoCaption's hierarchy collapses at 9px.

## 2.2 Spacing & Density

**Score: 5.5/10**

The forced densification from earlier in this session is a double-edged sword. On a 13" screen, the extra vertical space is welcome. On a 27" monitor, it feels cramped. The application does not adapt density to available screen real estate. Professional NLEs like Premiere and DaVinci use density presets (compact/normal/expanded) or user-configurable row heights.

**Critical Problem:** The text clip inspector panel uses `p-5 space-y-6` giving ~44px of padding that does not adjust. At 100% browser zoom, the inspector often cannot display all its controls without scrolling, which defeats the WYSIWYG editing loop.

## 2.3 Typography

**Score: 4.5/10**

- **9px uppercase labels** are below the 11px minimum recommended by Apple HIG and Material Design. They also fail WCAG 1.4.3 (contrast minimum 4.5:1) when rendered on translucent `surface/75` backgrounds.
- **8px footer text** (keyboard hints) is unreadable on non-retina displays.
- **Font weight inconsistency**: "font-bold uppercase tracking-wider" appears on nearly every text element regardless of its role. Section headings, values, labels, and captions use the same weight.
- **Font family**: Using `var(--font-sans), system-ui` is a fallback dependency. There is no Google Fonts import visible. The UI could ship with Inter or Geist loaded for consistent rendering.
- **Mono vs. Sans mixing**: Numeric values (`font-mono`) mixed with uppercase labels (`font-sans font-bold`) creates a cluttered texture. This pattern is used correctly in Figma and Linear, but AutoCaption applies it inconsistently — the same value sometimes gets `font-mono` and sometimes doesn't.

## 2.4 Color Usage & Contrast

**Score: 4/10**

Custom palette (`background-dark`, `surface`, `primary`, `secondary`) is conceptually good but unmeasured. The `text-on-surface-variant/40` utility (applied to footer and many labels) is WCAG-failing: 40% opacity white on a very dark background falls well below 4.5:1 contrast.

`text-[9px]` labels on `bg-surface-container-lowest` backgrounds likely fail 3:1 (minimum for UI components per WCAG 1.4.11).

The yellow highlight color (`#FFFF00`) on the preview caption has poor readability on white-background areas. This isn't fixed in the inspector.

## 2.5 Iconography

**Score: 7/10**

Lucide React icons are clean and consistent. Icon sizing (w-3 h-3 to w-5 h-5) matches density. No mixed icon systems. The `Scissors` and `Bookmark` icons in the preview toolbar are not labeled, creating discoverability issues for new users.

## 2.6 Alignment & Consistency

**Score: 5.5/10**

Most layouts are flexbox-aligned correctly. However:
- The PreviewCanvas toolbar buttons use `px-2 py-1 rounded` while the Timeline toolbar uses `px-2.5 py-1 rounded`. Identical semantic role, different sizes.
- The Inspector uses `rounded-xl` for containers; the Timeline uses `rounded-2xl`. No visible system reason.
- Export modal uses `rounded-2xl p-6` while the main panels use `rounded-2xl p-2`. Modal feels disconnected from editor.

## 2.7 Window Layout & Panel Resizing

**Score: 5/10**

The panel resize drag handles are **8px wide** (`w-2`). Professional NLE resize targets are 12-16px. At 8px, precise targeting on a trackpad requires deliberate effort. Adobe Premiere uses 6-8px visually but with a 16px invisible click zone.

The minimum panel widths are hard-coded (`min-w-[400px]` for middle, `240px` min for sidebar/inspector). On a 1366px wide laptop at 100% zoom with both sidebars at minimum, the preview canvas gets ~686px — barely functional.

The **header** does not collapse or hide. On small screens this costs ~48px of vertical space permanently.

## 2.8 Timeline Readability

**Score: 5/10**

- Caption clips (`text-` prefixed) render as pink-to-rose gradient strips. When 100+ caption chunks exist, the timeline becomes an undifferentiated mass of pink. There is no clip label truncation strategy for tiny clips.
- The tick ruler dynamically generates marks at 10s/30s/60s intervals, but does not adapt to zoom level. At 2000% zoom, you would still only see 10-second marks — they should interpolate down to individual frames.
- The "snap grid" value is hardcoded at 5 seconds. This is appropriate for rough cuts but completely wrong for caption editing where you need sub-second precision.
- No waveform visualization despite `hasWaveform: boolean` in the Clip type. The audio track in the UI uses a static `Music` icon gradient — completely decorative.

## 2.9 Inspector Usability

**Score: 5.5/10**

The Inspector's tab-switching (Video / Audio / Effects / Text) does not automatically switch when you click a clip. It fires `setInspectorTab` via `handleSelectClip` but only for `video`, `audio`, `text`, and `effect` types — the 'audio' type correctly maps, but the caption editing experience requires manually knowing to click "Text" tab. This adds cognitive load.

The caption list in the Text inspector is dense and useful, but there is no search or jump-to-time functionality. On a 90-minute video with thousands of captions, this is unusable.

## 2.10 Empty States

**Score: 6/10**

The preview canvas empty state (Step 1: Import Video / Step 2: Generate Captions) is the best-designed part of the UX — clear, actionable, minimal. The Dashboard empty state (no projects) is not visible from the code, suggesting it may exist but wasn't reviewed. The Inspector empty state ("Click a clip...") is fine but uses a dashed border that feels unfinished.

## 2.11 Professional Appearance Comparison

| Dimension | AutoCaption | Premiere | DaVinci | CapCut |
|---|---|---|---|---|
| Dark mode quality | ✅ Strong | ✅ Strong | ✅ Best-in-class | ✅ Good |
| Typography quality | ⚠️ Too small | ✅ Appropriate | ✅ Well-balanced | ✅ Good |
| Timeline density | ⚠️ Fixed | ✅ Configurable | ✅ Configurable | ✅ Adaptive |
| Panel resize | ⚠️ Thin handles | ✅ Wide zones | ✅ Standard | ✅ Good |
| Animation quality | ✅ Smooth CSS | ✅ GPU-native | ✅ GPU-native | ✅ Good |
| Contrast compliance | ❌ Fails | ✅ Passes | ✅ Passes | ✅ Passes |

---

# 3. UX Review

## 3.1 First-Time User Experience

**Score: 5/10**

The stepwise empty state (Import → Generate → Export) is good onboarding. However, the **Dashboard → Create New Project** path drops the user into the editor with the Import tab active but no guided instruction about what to do next. A first-time user sees an empty timeline, empty preview, and 6 sidebar tabs with no indication which to use.

**Missing:** A quick-start tour or contextual guidance after "New Project."

## 3.2 Project Creation & Video Import

**Score: 6/10**

The file import flow (drag-drop or file picker → upload to backend → create job) is sensible. However:
- A 500MB video over a local network still takes time to upload. There is no indication of estimated time.
- The upload progress bar is cleared to `null` immediately on success, then re-shown when polling starts — creating a brief flash of no-feedback.
- **After upload completes**, the video URL switches from `blob:` (instant preview) to the backend-served URL — causing a brief blank video frame. Users may think the upload failed.

## 3.3 AI Transcription Waiting Experience

**Score: 4.5/10**

The 2-second polling interval means status updates are delayed up to 2 seconds. For a 30-second video with the tiny Whisper model, transcription takes 10-60 seconds. The user sees a spinner and a status string in the sidebar — no progress percentage, no estimated time, no cancellation button.

**What Descript does:** Shows "Transcribing... ~2 minutes remaining" with a cancellation option and a countdown. This is the industry standard.

**Missing:** Cancel transcription, estimated time, fallback if polling fails silently (the `clearInterval` on error stops polling but doesn't retry).

## 3.4 Timeline Editing — CRITICAL FAILURE

**Score: 2/10**

This is the most severe UX problem in the application. The Timeline allows you to:
- Drag caption clips left/right ✅
- Resize clip duration ✅
- Delete clips ✅

However, **none of these actions actually change the caption timing in the backend or in `editingCaptions`**. When a clip is moved on the Timeline, `onUpdateClip` fires and updates `clips[]` in local state. But `clips[]` is a display-only state. The actual caption data that gets rendered and exported is in `editingCaptions`, which is **never updated** when timeline clips are dragged.

**Consequence:** A user drags a caption clip 10 seconds to the right. The clip moves on screen. They export. The caption appears at the original position in the output video. This is a fundamental deception of the user.

**What must happen:** When a `isAICaption: true` clip is moved or resized, `handleCaptionTimingEdit` must be called to sync the change to `editingCaptions`.

## 3.5 Caption Editing

**Score: 5.5/10**

Text editing in the Inspector works and is synced to `activeCaptions` (preview) and `editingCaptions` (export). However:
- You cannot **merge** two caption chunks.
- You cannot **split** a caption at the word level.
- You cannot **reorder** captions.
- You cannot **bulk edit** (find & replace).
- The edit field is a `textarea` without min-height constraint — it collapses to a single line on first render.

## 3.6 Keyboard Shortcuts

**Score: 4/10**

Implemented shortcuts (Space, S, M, R, C, Delete, Ctrl+Z/Shift+Z, Ctrl+K) are a good start. **Critical omissions:**
- `J/K/L` shuttle playback (industry standard)
- `I/O` for in/out points
- `→/←` for frame-by-frame advance
- `Tab` to jump to next caption
- No shortcut for zoom in/out on timeline
- No shortcut to navigate between captions in Inspector
- `Escape` does not close export modal

## 3.7 Undo/Redo

**Score: 3/10**

The undo system saves `{ clips, transform }` snapshots. This means:
- ✅ Undoing clip moves on timeline works
- ❌ Undoing caption text edits does NOT work
- ❌ Undoing caption timing edits does NOT work
- ❌ Undoing Inspector changes (effects, audio) does NOT work
- ❌ No redo indicator (how many steps available)
- ❌ No history panel

This is a critical failure for any editor. Subtitle Edit shows undo depth. Premiere shows undo history as a panel. If a user edits 50 captions and presses undo, they expect to rewind one caption edit — not lose all their clip changes.

## 3.8 Export Flow

**Score: 6/10**

The export flow is clear: Settings → Render → Download. What's missing:
- No preview of what the exported video will look like before rendering
- Resolution "4K" option is unrealistic for most uploads and will fail or produce garbage if the source is 720p
- No bitrate control beyond the 3-quality presets
- No codec choice (H.264 only)
- No GIF or WebM export
- Download filename is `captioned_{uuid}.mp4` — completely meaningless to the user

## 3.9 Navigation & State Persistence

**Score: 2/10**

**CRITICAL BUG:** There is no autosave. Browser refresh = all caption edits lost. The project is a backend Job with status `ready_for_review` — the caption data is in the DB. But the `captionOffset`, `captionStyle`, `transform`, and any unsaved text edits in `editingCaptions` that haven't been rendered are all React state and disappear on refresh.

The Dashboard → Editor navigation is clean. But the "Back to Dashboard" button does not warn the user about unsaved edits.

---

# 4. Functionality Review

## 4.1 Import
- **Complete:** File upload with XHR progress tracking ✅
- **Missing:** Drag-and-drop on the import tab area, audio-only file support, URL import (YouTube links), multi-file batch upload
- **Edge cases:** Files with spaces or special characters in names may break ffmpeg path handling. Unicode filenames on Windows containers will fail.

## 4.2 Video Playback
- Uses rAF loop for currentTime sync — correct approach
- **Bug:** `handleVideoTimeUpdate` function body is essentially empty (`// Just keeping it synced`) — the function fires on every `timeupdate` event (4 times/second) and does nothing, wasting event callbacks.
- No frame-by-frame stepping
- No playback speed control (0.5x, 0.75x, 1x, 1.25x, 2x)
- No loop range (loop between I and O points)
- Mute toggle exists ✅
- Fullscreen button exists ✅ (uses `Maximize2` icon but not wired to Fullscreen API — visual only)

## 4.3 Timeline
- Zoom in/out ✅
- Snap to grid ✅ (5-second only, not configurable)
- Markers ✅
- Track mute/lock/solo ✅
- Clip drag to move ✅ (but broken for caption sync — see Section 3.4)
- **Missing:** Multi-clip selection, ripple delete, clip duplication, color labels, track height resize per track, scroll sync to playhead (auto-follow), clip context menu (right-click)

## 4.4 Caption Engine (Backend)
- word-level timing via faster-whisper ✅
- `_group_words` chunking ✅
- **Bug in `_build_karaoke_text`:** When the user edits caption text (adding/removing words), `words_data` will no longer match `text.split()`. The code falls back to even time distribution — correct behavior, but the user is not warned that their word-level highlighting will be lost when they edit.
- **Bug:** The `update_captions` view enforces `job.status == READY_FOR_REVIEW`. After the first render (status = `DONE`), the user cannot save edits and re-export. This blocks the re-export workflow entirely.

## 4.5 ASS Subtitle Generation
- Karaoke `\k` tags ✅
- Custom font, colors, bg opacity ✅
- MarginV for Y offset ✅
- **Critical Bug:** The `caption_offset_y` received by the backend is the raw pixel value from the preview canvas UI. The preview canvas may be 400px tall, while the actual video is 1920px tall. The margin mapping `margin_v = max(0, base_margin - caption_offset_y)` is not scaled to the video resolution. A Y offset of -50 pixels in a 400px preview does not equal -50 pixels in a 1920px video. This means caption positioning will be wrong on every export.
- **Missing:** X offset is completely ignored in the backend, though it's sent by the frontend.

## 4.6 Video Rendering
- FFmpeg burn-in ✅
- Async Celery task ✅
- Resolution scaling (1080p/4K) ✅
- CRF quality control ✅
- **Bug:** `os.rename()` across filesystem boundaries (temp dir → media dir) will fail in Docker if they're on different volumes. Should use `shutil.move()`.
- **Bug:** Output filename is `{job.id}.mp4`. Re-running the render for the same job overwrites the previous output without warning.
- **Missing:** HW acceleration (VAAPI/NVENC), progress reporting during FFmpeg (no way to show real % progress), audio normalization, video watermarking.

## 4.7 Project Persistence
- Jobs persist in PostgreSQL ✅
- Caption data persists as JSON ✅
- **Missing:** `captionStyle`, `captionOffset`, `transform` are **never persisted**. They are React state only. Every time a project is reopened, captions revert to default styling. This is a major UX regression.

## 4.8 Autosave
- **Does not exist.** This is unacceptable for a professional tool.

## 4.9 Undo History
- Limited to `{ clips, transform }` snapshots — see Section 3.7.

## 4.10 Search / Replace
- **Does not exist.**

## 4.11 Merge / Split Captions
- Split exists for timeline clips (not captions).
- **No caption-level merge or split.**

## 4.12 Templates / Preset Management
- **Does not exist.** Users cannot save their captionStyle as a named preset.

## 4.13 Batch Processing / Rendering Queue
- **Does not exist.** One video at a time only.

---

# 5. Professional Video Editor Evaluation

## Would professionals switch?

**No.** Not in current state.

A professional content creator using CapCut, Descript, or Submagic would immediately encounter:
1. No autosave → fear of data loss
2. No undo for caption edits → unacceptable
3. Timeline dragging doesn't change exported output → broken trust
4. Cannot re-export after first render → hard blocker
5. No playback speed control → slows review workflow by 50%

## What feels amateur?

- 8-9px text labels
- The "Play" tooltip visible on hover over the play button in the screenshot (native browser tooltip on a button with `title` attribute — should be a custom tooltip)
- Timestamp `00:08 / 01:35` in the bottom controls uses a system font (the player controls styling is inconsistent with the rest of the UI)
- The LUT system applies CSS filters in the preview, but the backend `_generate_ass` function does not apply any color grading to the video — LUTs are preview-only and will not appear in the exported video
- Audio settings (volume, bass, treble, enhancedVoice) are Inspector controls but are never sent to the backend for rendering — they are pure visual placeholders

## What feels premium?

- The glassmorphism panel aesthetic is genuinely distinctive
- Word-level karaoke highlighting works correctly in preview
- The Dashboard with project thumbnails is professional
- Snap-to-grid with the 5s interval is a nice touch
- The Command Palette (Ctrl+K) is a sophisticated UX pattern borrowed from Linear/Figma

## What features are absolutely required before release?

1. **Autosave** (most critical)
2. **Timeline → caption timing sync** (fundamentally broken workflow)
3. **Re-export after edits** (blocked by status machine bug)
4. **Caption style persistence** (opens project, style is reset)
5. **Authentication / user isolation** (videos are public by UUID)
6. **Playback speed control**
7. **Undo for caption edits**

---

# 6. QA Audit

## Critical Bugs (P0 — Data Loss / Broken Core Workflow)

| # | Bug | Severity | Likelihood | Impact | Fix |
|---|---|---|---|---|---|
| C1 | Timeline clip drag does not update caption timing in export | CRITICAL | 100% | Users export wrong caption positions | Call `handleCaptionTimingEdit` from `onUpdateClip` for AI caption clips |
| C2 | Cannot re-export after first render (status machine locks) | CRITICAL | 100% | Re-export is impossible | After render completes, reset status to `ready_for_review` or add separate endpoint |
| C3 | No autosave — browser refresh loses all caption edits | CRITICAL | Very High | Complete data loss on accident | Persist `editingCaptions`, `captionStyle`, `captionOffset` to backend periodically |
| C4 | `captionStyle` and `captionOffset` never persisted — reset on project reopen | CRITICAL | 100% | Styling work is lost every session | Add these fields to the Job model and persist on export or autosave |
| C5 | `os.rename()` across Docker volume boundaries will fail | CRITICAL | High (Docker env) | Render always fails on Docker | Use `shutil.move()` |

## Major Bugs (P1 — Significant UX Damage)

| # | Bug | Severity | Likelihood | Impact | Fix |
|---|---|---|---|---|---|
| M1 | Caption Y offset scaling mismatch between preview and video | MAJOR | 100% | Captions appear in wrong vertical position | Scale `captionOffset.y` by `(videoHeight / previewCanvasHeight)` |
| M2 | Caption X offset completely ignored in backend | MAJOR | 100% | Horizontal repositioning does nothing on export | Pass and apply X offset in ASS file MarginL/MarginR or `\pos()` tag |
| M3 | LUT color grades (cyberpunk, VHS, etc.) are preview-only — not rendered | MAJOR | 100% | Exported video looks different from preview | Apply FFmpeg color filters (`eq`, `colorchannelmixer`) in `_burn_subtitles` |
| M4 | Audio settings (volume, bass, treble) are display-only — not rendered | MAJOR | 100% | Audio is unchanged in exported video | Pass audio settings and apply FFmpeg audio filters (`volume`, `equalizer`) |
| M5 | Undo does not capture caption text/timing edits | MAJOR | Very High | User cannot undo caption editing mistakes | Extend history to include `editingCaptions` snapshots |
| M6 | `update_captions` API rejects requests if status != `ready_for_review` | MAJOR | High | After render completes, caption re-edit is blocked | Allow updates in any non-transcribing state |
| M7 | Fullscreen button (`Maximize2` icon) is not connected to Fullscreen API | MAJOR | 100% | Button appears to do nothing | `videoRef.current.requestFullscreen()` |
| M8 | Polling continues indefinitely if backend returns unexpected status | MAJOR | Medium | Memory leak from running interval | Add explicit fallback timeout and unknown-status handling |

## Minor Bugs (P2)

| # | Bug | Description | Fix |
|---|---|---|---|
| m1 | `handleVideoTimeUpdate` is empty | Fires 4x/sec, does nothing; wastes event cycles | Remove or implement |
| m2 | Upload URL blob→backend causes brief blank frame | `setUserVideoUrl(mediaUrl(...))` called after polling success | Preload new URL before setting |
| m3 | Thumbnail generation uses `/tmp/` hardcoded path | Will fail if `/tmp/` is not writable or not shared in Docker | Use `tempfile.mkstemp` |
| m4 | `words_per_line` value `1` default for regenerate is always `'small'` model | Cannot change to `medium` or `large` from UI | Expose model size selector in UI |
| m5 | `regenerateJob` call passes `wordsPerLine` but not user-selected model size | The hardcoded `'small'` in `handleRunAICaptions` ignores any future model selector | Use configurable model |
| m6 | Toast messages are all uppercase, truncated for long messages | Export failed messages get cut off | Allow wrapping, remove `uppercase` from error toasts |
| m7 | Dashboard "Back" navigation does not warn about unsaved work | Users lose edits | Add `beforeunload` and navigation guard |
| m8 | Caption offset state not reset when new video is imported | Previous video's caption positioning bleeds into new project | Reset `captionOffset` in `handleVideoFileSelected` |
| m9 | Snap-to-grid is 5s — too coarse for caption editing | Captions are typically 1-3 seconds | Make snap interval configurable or caption-track-aware |
| m10 | `Caption` type imported in App.tsx but no longer used | Dead code | Remove import |

## Race Conditions

| # | Scenario | Risk | Fix |
|---|---|---|---|
| R1 | User clicks "Generate Captions" twice rapidly | Two jobs created, two polls running | The `isGeneratingCaptions` guard partially helps but doesn't prevent a fast double-click |
| R2 | User refreshes during Celery transcription | Frontend loses job ID, orphaned job continues in backend | Store jobId in localStorage on creation |
| R3 | `transcribe_video` task and `render_video` task race if status check is skipped | `render_job` view checks status, but if called via API directly with wrong status it blocks | Status machine is correct, but no lock mechanism |

## Memory Leaks

| # | Scenario | Fix |
|---|---|---|
| L1 | rAF loop in `PreviewCanvas` continues if `isPlaying` state updates but component is remounted | Cancel animation frame in cleanup — partially handled but only if `animationFrameId` is set |
| L2 | `blob:` URL created on video import is revoked on next import — but NOT on component unmount | Add revocation in `useEffect` cleanup |
| L3 | Past undo history grows unbounded | Implement max stack depth (e.g., 50 states) |

## Browser Compatibility Issues

| # | Issue |
|---|---|
| B1 | `@container` CSS queries (used in PreviewCanvas) not supported in Safari < 16.0 |
| B2 | `cqw` units used for caption font sizing — not supported in Firefox < 110 |
| B3 | `requestAnimationFrame` sync may drift on throttled background tabs |

## Large File / Edge Case Handling

| # | Scenario |
|---|---|
| E1 | 1-hour video with 3000+ caption chunks — Inspector caption list is not virtualized; will freeze browser |
| E2 | Video with no audio track — `_extract_audio` will fail; `_fail_job` is called but error message is generic |
| E3 | Unicode filenames (Arabic, CJK) may break FFmpeg subprocess path handling on Windows containers |
| E4 | RTL text (Arabic, Hebrew) in captions — ASS renderer will display incorrectly without `Direction` override |
| E5 | Emoji in captions — may break ASS encoding on some FFmpeg builds |
| E6 | Video with only music (no speech) — Whisper produces no words, `_fail_job` triggers, but user sees generic "no words" error with no guidance |

---

# 7. Test Plan

## Manual Tests — Core Workflows

| ID | Test | Steps | Expected | Priority |
|---|---|---|---|---|
| T001 | Basic end-to-end | Import video → Generate → Edit caption text → Export → Download | Video contains edited captions at correct timing | P0 |
| T002 | Caption Y offset export | Drag caption to top of preview → Export → Verify position in output | Caption appears near top in exported video | P0 |
| T003 | Timeline drag sync | Drag caption clip 5s forward → Export → Verify position | Caption plays 5s later in export | P0 |
| T004 | Re-export after edit | Export once → Edit caption → Export again | Second export reflects edits | P0 |
| T005 | Browser refresh recovery | Edit captions → Refresh → Reopen project → Verify edits persisted | Edits are preserved | P0 |
| T006 | Undo caption edit | Type in caption field → Ctrl+Z → Verify previous text restored | Text reverts | P1 |
| T007 | LUT export verify | Apply Cyberpunk LUT → Export → Verify color grade in output | Output video is color-graded | P1 |
| T008 | Caption with emoji | Type emoji into caption field → Export → Verify rendering | Emoji displays correctly or graceful fallback | P1 |
| T009 | Arabic/RTL caption | Type Arabic text → Export → Verify direction | Text appears RTL | P1 |
| T010 | 500MB video upload | Upload a 500MB video | Upload succeeds within timeout | P1 |

## Automated Unit Tests

| ID | Test | Coverage |
|---|---|---|
| U001 | `_group_words` with various `per_line` values | Caption chunking logic |
| U002 | `_build_karaoke_text` when words_data matches | Karaoke timing tags |
| U003 | `_build_karaoke_text` when user has edited text | Fallback even distribution |
| U004 | `_seconds_to_ass_time` edge cases (0, 3600, 3601) | ASS time formatting |
| U005 | `_hex_to_ass_color` with various formats | Color conversion |
| U006 | `_hex_to_ass_alpha` at 0%, 50%, 100% opacity | Alpha conversion |
| U007 | Timeline `timeToPercent` with zero duration | Division-by-zero guard |

## Integration Tests

| ID | Test |
|---|---|
| I001 | POST /api/jobs/ → 201, job in DB, Celery task dispatched |
| I002 | GET /api/jobs/{id}/ polling until status = ready_for_review |
| I003 | PATCH /api/jobs/{id}/captions/ with modified text → verify DB update |
| I004 | POST /api/jobs/{id}/render/ → 200, status = rendering |
| I005 | GET /api/jobs/{id}/download/ before render complete → 409 |

## Stress Tests

| ID | Test |
|---|---|
| S001 | Upload 10 videos simultaneously → verify queue behavior |
| S002 | 1-hour video transcription with `medium` model → measure memory |
| S003 | 3000-caption timeline scroll performance → measure frame rate |
| S004 | 50 concurrent polling requests to /api/jobs/ → measure DB load |

---

# 8. Accessibility Audit

## Overall WCAG 2.2 AA Score: 2/10

**This application is not accessible to users with disabilities in its current form.**

| Criterion | Status | Detail |
|---|---|---|
| 1.1.1 Non-text Content | ❌ FAIL | Icon-only buttons (`Scissors`, `Bookmark`) have no `aria-label` |
| 1.3.1 Info and Relationships | ❌ FAIL | Sliders have no `<label>` associations; `<aside>` is used for inspector but has no landmark label |
| 1.3.3 Sensory Characteristics | ❌ FAIL | "Drag to resize" panels have no non-visual description |
| 1.4.3 Contrast (Minimum) | ❌ FAIL | Multiple elements at 40% opacity on dark backgrounds fail 4.5:1 |
| 1.4.4 Resize Text | ⚠️ PARTIAL | Layout uses `overflow: hidden` which clips content when browser text size is increased |
| 1.4.11 Non-text Contrast | ❌ FAIL | Range sliders use `accent-primary` with no guaranteed contrast |
| 1.4.13 Content on Hover | ❌ FAIL | Native browser `title` tooltips on several buttons; no custom tooltip with dismissal control |
| 2.1.1 Keyboard | ❌ FAIL | Timeline clips cannot be selected or moved by keyboard. Panel resize is mouse-only. |
| 2.1.3 Keyboard (No Exception) | ❌ FAIL | Drag-to-move captions is mouse-only with no keyboard alternative |
| 2.4.3 Focus Order | ❌ FAIL | No visible focus ring on most interactive elements (CSS `select-none` and `focus:ring-0` actively remove focus indicators) |
| 2.4.7 Focus Visible | ❌ FAIL | `focus:ring-0` on input fields, `select-none` on panels — focus is invisible throughout |
| 3.1.1 Language of Page | ❌ FAIL | No `lang` attribute on `<html>` |
| 4.1.2 Name, Role, Value | ❌ FAIL | Sliders have no `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow` |
| 4.1.3 Status Messages | ⚠️ PARTIAL | Toast messages are not announced via `aria-live` regions |

**Most Critical Accessibility Fixes:**
1. Add `lang="en"` to `index.html`
2. Add `aria-label` to all icon-only buttons
3. Replace `focus:ring-0` with visible focus indicators
4. Add `aria-live="polite"` region for toasts
5. Add `aria-label` and `aria-valuemin/max/now` to all range inputs
6. Ensure keyboard tab order reaches all interactive elements

---

# 9. Performance Audit

## 9.1 React Rendering

**Issues:**
- `App.tsx` destructures 40+ state fields from Zustand. Any state update causes a full re-render of `App`. While Zustand does selector-based re-rendering if called with selectors, the current destructuring pattern does not use selectors — it reads the entire store.
- `handleRunAICaptions` is wrapped in `useCallback` but has 5 dependencies, several of which are functions. This hook recreates on most interactions.
- The rAF loop in `PreviewCanvas` calls `onSeek` (which calls `setCurrentTime`) on every frame (60fps). This triggers 60 `setCurrentTime` calls per second. Each call updates Zustand state, which triggers re-renders in every subscribed component — Timeline, Inspector, PreviewCanvas. This is the most significant performance bottleneck.

**Fix:** Throttle `setCurrentTime` updates to 10-15fps using a `lastUpdate` ref check inside the rAF loop.

## 9.2 Timeline Rendering

- The Timeline renders all clips as DOM elements on every render. For a 1-hour video with 3000 caption chunks, this is 3000 DOM elements always in the tree.
- **No virtualization.** React-window or a canvas-based timeline would handle large subtitle counts correctly.
- Tick mark generation (`tickMarks` array) runs on every render, including unrelated state changes.

## 9.3 Caption Matching

```typescript
const activeCaption = activeCaptions.find(
  (cap) => currentTime >= cap.start && currentTime <= cap.end
);
```

This runs on every render of PreviewCanvas (60fps during playback). For 3000 captions, this is 180,000 comparisons per second. For small projects it's negligible; for large ones it's a real bottleneck.

**Fix:** Use binary search since captions are ordered by time.

## 9.4 Backend Performance

- Django dev server (`runserver`) is single-threaded. Any long-running synchronous operation (thumbnail extraction in `create_job` view) blocks the request thread.
- Thumbnail extraction is done **synchronously inside the view** — it blocks the HTTP response for the duration of FFmpeg execution (~0.5-2 seconds). This should be offloaded to Celery.
- `CaptionJob.objects.all()` with no pagination will return all jobs — will become slow with many users.
- No database indexes beyond `status`. `created_at` should be indexed for sorted queries.

## 9.5 Long-Polling Efficiency

2-second polling on `/api/jobs/{id}/` creates N×(polls/second) DB queries during transcription. For 10 concurrent users, this is 5 DB queries/second just for status checks. WebSockets or Server-Sent Events would reduce this to 0 persistent queries.

---

# 10. Security Audit

## 10.1 Authentication & Authorization

**Score: 0/10 — No authentication exists.**

- Any user who knows a Job UUID can:
  - Access anyone's caption data: `GET /api/jobs/{uuid}/`
  - Modify anyone's captions: `PATCH /api/jobs/{uuid}/captions/`
  - Trigger a new render of anyone's video (compute cost attack)
  - Download anyone's output video
  - Delete anyone's job: `DELETE /api/jobs/{uuid}/`

- The `@csrf_exempt` decorator is applied to **all** views. This disables Django's CSRF protection. Combined with no authentication, any cross-origin site can make requests to this API.

## 10.2 File Upload Security

- **MIME type validation is client-side checked only**: The check `video_file.content_type not in ALLOWED_MIME_TYPES` relies on the browser-reported content type, which can be spoofed. A `.py` file renamed to `.mp4` would pass.
- **Path traversal:** Django's `FileField(upload_to="videos/")` with default storage is safe against path traversal, but the filename is taken directly from the user upload in `job.name = video_file.name` — could inject directory separators in the project name field.
- **File size limit is post-read:** The 500MB check happens after Django has already read the request body into memory. A 10GB file would consume server memory before being rejected. Use nginx `client_max_body_size` instead.

## 10.3 Command Injection

- FFmpeg is called via `subprocess.run(cmd, ...)` with a list-form command — **correctly safe** against shell injection.
- The `.ass` file path escaping in `_burn_subtitles`:
  ```python
  escaped_ass = ass_path.replace(":", "\\:").replace("'", "\\'")
  vf = f"ass='{escaped_ass}'"
  ```
  This manual escaping is fragile. While it's passed in list form, the `-vf` value is a shell-interpreted FFmpeg filter string. A path with `$()` or backticks could potentially inject into the filter. Use `shlex.quote()`.

## 10.4 Resource Exhaustion

- No rate limiting on any endpoint.
- A malicious user can upload a 500MB video, trigger render, upload again, repeat — exhausting disk space and Celery worker time.
- No cleanup of old media files. The `media/` directory will grow indefinitely.
- The ASS file and temporary audio extraction happen in `tempfile.TemporaryDirectory()` — correctly cleaned up. ✅

## 10.5 Information Disclosure

- Error messages in `_fail_job` include full filesystem paths in `error_message`, which is returned to the frontend via API. This discloses server directory structure.
- Django DEBUG mode likely on in development, which exposes full stack traces via HTTP. Ensure `DEBUG=False` in production.

## 10.6 CORS

- Not configured. Django REST Framework defaults to no CORS headers, which means the frontend (localhost:5173) → backend (localhost:8000) flow only works via Vite proxy. Deploying without a proxy would break the API entirely.

---

# 11. Missing Features

## Essential (Product is Broken Without These)

1. **Autosave** — every 30 seconds, persist editingCaptions + captionStyle + captionOffset to the backend
2. **Authentication** — even a simple token or session system
3. **Timeline → caption timing sync** — dragging clips must update export timing
4. **Re-export workflow** — reset status after render to allow editing and re-rendering
5. **Caption position persistence** — save captionOffset and captionStyle to Job model
6. **Cancel transcription** — kill running Celery task
7. **Error details** — show specific error messages, not generic "failed"

## Important (Core Professional Features)

8. **Playback speed control** (0.5x, 0.75x, 1x, 1.25x, 2x)
9. **Frame-by-frame stepping** (← →)
10. **Caption merge** — combine two adjacent chunks
11. **Caption split** — split at word boundary
12. **Find & Replace** in captions
13. **Caption style presets** — save and reload named styles
14. **Undo for caption edits**
15. **Waveform visualization** on audio track
16. **Progress during FFmpeg render** (real percentage, not polled increment)
17. **LUT rendering in export** (currently preview-only)
18. **Audio settings rendering** (volume/EQ in exported video)
19. **Keyboard navigation for caption list** (Tab to next, Shift+Tab to previous)
20. **Timeline auto-scroll to playhead** during playback

## Nice-to-Have

21. **Subtitle style animation** (fade in/out, word pop)
22. **Caption templates** (TikTok style, YouTube style, etc.)
23. **Multiple caption tracks** (translated subtitles in parallel)
24. **YouTube SRT/VTT export** (not just burned-in video)
25. **Whisper model size selector** in UI
26. **Project naming** in editor (not just on Dashboard)
27. **Responsive layout** for 1366px screens
28. **Dark/light mode toggle**
29. **Custom snap interval** on timeline
30. **Clip color labels**

## Future Roadmap

31. **Collaboration** (multiple editors on one project)
32. **Translation** (auto-translate captions to another language)
33. **Speaker diarization** (identify who is speaking)
34. **AI scene detection** (auto-cut on scene changes)
35. **Video chapters** based on captions
36. **Batch export queue**
37. **Mobile-responsive viewer** (not editor)

---

# 12. Prioritized Improvements

## Must Fix Before Beta

| # | Improvement | Impact | Difficulty |
|---|---|---|---|
| 1 | Autosave caption edits + styling to backend | HIGH | Medium |
| 2 | Timeline drag → caption timing sync | HIGH | Easy |
| 3 | Fix re-export status machine | HIGH | Easy |
| 4 | Add authentication (even basic token auth) | HIGH | Medium |
| 5 | Fix caption offset scaling (preview px → video px) | HIGH | Easy |
| 6 | Apply X offset in exported ASS | HIGH | Easy |
| 7 | Fix `os.rename` → `shutil.move` | HIGH | Easy |
| 8 | Persist captionStyle and captionOffset in Job model | HIGH | Medium |
| 9 | Extend undo to cover caption text/timing edits | HIGH | Medium |
| 10 | Add cancellation to transcription polling | MEDIUM | Easy |

## Must Fix Before Release

| # | Improvement | Impact | Difficulty |
|---|---|---|---|
| 11 | LUT rendering in FFmpeg pipeline | HIGH | Medium |
| 12 | Audio settings rendering in FFmpeg | HIGH | Medium |
| 13 | Rate limiting on all API endpoints | HIGH | Easy |
| 14 | Remove `@csrf_exempt` from all views | HIGH | Easy |
| 15 | Validate file type by magic bytes, not extension | HIGH | Medium |
| 16 | Move thumbnail extraction to Celery | MEDIUM | Easy |
| 17 | Add `aria-label` to all icon-only buttons | MEDIUM | Easy |
| 18 | Add `lang="en"` to HTML and `aria-live` for toasts | MEDIUM | Easy |
| 19 | Replace `focus:ring-0` with visible focus styles | MEDIUM | Easy |
| 20 | Playback speed control | HIGH | Easy |
| 21 | Frame-by-frame advance shortcut | MEDIUM | Easy |
| 22 | Caption merge/split operations | HIGH | Medium |
| 23 | Find & Replace for captions | HIGH | Medium |
| 24 | Throttle `setCurrentTime` to 15fps | MEDIUM | Easy |
| 25 | Virtualize timeline clip list | MEDIUM | Hard |
| 26 | Binary search for active caption matching | LOW | Easy |
| 27 | Media file cleanup job (TTL-based) | MEDIUM | Medium |
| 28 | Pagination on `GET /api/jobs/` | MEDIUM | Easy |
| 29 | Error messages sanitized (no filesystem paths) | MEDIUM | Easy |
| 30 | Fix Fullscreen API button | LOW | Easy |

## Post Release

| # | Improvement | Impact | Difficulty |
|---|---|---|---|
| 31 | WebSocket or SSE for transcription progress | MEDIUM | Hard |
| 32 | Caption style presets/templates | HIGH | Medium |
| 33 | Waveform visualization on audio track | MEDIUM | Hard |
| 34 | Multiple caption tracks | MEDIUM | Hard |
| 35 | SRT/VTT/SBV export options | HIGH | Easy |
| 36 | Whisper model size selector in UI | MEDIUM | Easy |
| 37 | Caption animation effects | LOW | Hard |

## Future Vision

| # | Improvement | Impact | Difficulty |
|---|---|---|---|
| 38 | Translation pipeline (deepL or Whisper multilingual) | HIGH | Hard |
| 39 | Speaker diarization (pyannote.audio) | HIGH | Hard |
| 40 | Batch processing queue with priority | HIGH | Hard |
| 41 | Multi-user collaboration | HIGH | Very Hard |
| 42 | AI scene detection and auto-cut | MEDIUM | Hard |

---

# 13. Design Recommendations

## 13.1 Caption Editor Panel — Inspired by Descript

**Why:** Descript's inline text editing (click text in transcript, edit directly) eliminates the "click clip → look at right panel → edit" round trip.

**What:** Replace the Inspector caption list with an inline transcript panel that overlays the timeline or appears in the sidebar. Each caption chunk is a text block. Click it → it becomes editable inline. The playhead seeks to that caption automatically.

**Expected Impact:** Reduces caption editing time by ~40%. Matches the workflow creators are already familiar with from Descript and CapCut's text editor.

**Implementation Difficulty:** Medium.

## 13.2 Adaptive Density — Inspired by DaVinci Resolve

**Why:** The current layout is fixed-density. 13" screen users see a cramped timeline. 27" screen users see a lot of empty glassmorphism.

**What:** Add a density toggle in settings: Compact (current) / Normal / Expanded. Implement via CSS custom properties `--track-height: 32px / 48px / 64px` and `--panel-padding: 8px / 16px / 24px`.

**Expected Impact:** Expands the addressable hardware market from "large external monitor" to "any laptop screen."

**Implementation Difficulty:** Medium.

## 13.3 Caption Timeline Track — Inspired by Subtitle Edit

**Why:** Caption clips are currently all identical pink gradients. With 200+ clips, the track is unusable.

**What:** Render caption clips with their text content overlaid when the clip is wide enough. When clips are too narrow (< 60px), just show a colored stub. Color-code clips by speaker if diarization is added. Highlight the currently active clip with a brighter border.

**Expected Impact:** The timeline becomes readable and navigable for long videos.

**Implementation Difficulty:** Easy.

## 13.4 Minimum Font Size Enforcement — Apple HIG

**Why:** 8-9px text is unreadable on non-retina displays and fails WCAG. Apple HIG specifies 11pt minimum for secondary text.

**What:** Systematically replace all `text-[8px]`, `text-[9px]`, `text-[10px]` with at minimum `text-[11px]`. Use `text-xs` (12px) as the floor for label text.

**Expected Impact:** Accessibility compliance, legibility improvement, professional appearance on non-HiDPI screens.

**Implementation Difficulty:** Easy.

## 13.5 Persistent State via localStorage — Arc Browser Pattern

**Why:** Arc Browser persists workspace state aggressively. Users expect their view to be exactly as they left it.

**What:** Persist `captionStyle`, `captionOffset`, `zoom`, `timelineHeight`, `leftPanelWidth`, `rightPanelWidth` to `localStorage` and restore on load. Use Zustand's `persist` middleware.

**Expected Impact:** Eliminates one class of UX frustration (rebuilding your workspace every session) at essentially zero cost.

**Implementation Difficulty:** Easy.

## 13.6 Inline Caption Positioning — Inspired by CapCut

**Why:** CapCut's caption position is set by clicking directly on the caption text in the preview and dragging. The current approach (drag the entire caption block, plus a separate Y-offset that doesn't work correctly) is confusing.

**What:** The caption text should be draggable by click-and-hold directly on it. Show a position indicator ("Bottom 15%" / "Top 30%") in a small badge next to the caption during drag. Snap to common positions (top/center/bottom) on release.

**Expected Impact:** The most-used gesture (repositioning captions) becomes obvious and requires no documentation.

**Implementation Difficulty:** Easy (the drag logic already exists, it just needs proper scaling and snapping).

---

# 14. Overall Grade

| Dimension | Score |
|---|---|
| **Final UI Score** | 6.0 / 10 |
| **Final UX Score** | 4.0 / 10 |
| **Architecture Score** | 6.0 / 10 |
| **Performance Score** | 4.5 / 10 |
| **QA Score** | 3.0 / 10 |
| **Professional Readiness** | 2.5 / 10 |
| **Commercial Readiness** | 2.0 / 10 |
| **Engineering Quality** | 5.5 / 10 |
| **Innovation Score** | 7.0 / 10 |
| **Overall Product Score** | 4.5 / 10 |

---

## Would I personally approve this product for production?

**No.**

The application has five critical workflow failures that would immediately destroy user trust:

1. **Timeline editing doesn't affect the export.** The moment a user drags a clip and exports, they discover the caption is in the wrong place. This feels like the application is broken, regardless of the aesthetic quality.

2. **You cannot edit and re-export.** After the first successful export, the job status is `done`. The "Save Captions & Render" button in the export modal calls the `/captions/` endpoint which rejects updates unless status is `ready_for_review`. The user is permanently stuck.

3. **There is no authentication.** UUID-guessing attacks are trivially easy. Any video uploaded to this service is potentially accessible to anyone. This is a GDPR and privacy catastrophe waiting to happen.

4. **No autosave means caption edits are lost on refresh.** Professional editors use browsers that crash, suspend, or get reloaded. The expectation in 2026 is that edits persist. Losing an hour of caption corrections is unacceptable.

5. **Caption positioning in the export is incorrect.** The Y offset is applied without scaling to the actual video resolution, and the X offset is ignored entirely. The exported video looks different from what the user designed.

---

## Biggest Weaknesses

1. **The frontend-backend state divergence** — clips[], activeCaptions[], editingCaptions[] are three separate stores that have complex sync requirements that are incompletely implemented.
2. **No persistence strategy** — critical user data (styling preferences, caption edits between sessions) lives only in ephemeral React state.
3. **Status machine is too restrictive** — `ready_for_review` as the only state that allows editing/rendering blocks re-export entirely.

## Strongest Innovations

1. **Local-first AI transcription** — running faster-whisper in a Docker container is genuinely privacy-preserving and avoids OpenAI API costs. This is a meaningful competitive differentiator in a market dominated by cloud-locked tools.
2. **Karaoke word-level highlighting with ASS burn-in** — the end-to-end pipeline from Whisper word timestamps → karaoke `\k` tags → FFmpeg subtitle rendering is technically elegant and produces a professional output format.
3. **NLE aesthetic in a web app** — most web caption tools look like consumer apps. AutoCaption's dark, dense, pro aesthetic sets it apart visually and signals seriousness to content creators.

## Three Highest-Impact Improvements

1. **Fix Timeline → Caption Timing Sync** *(1-2 days)* — This single fix transforms the timeline from a decorative widget into the actual editor. Without it, the entire NLE paradigm is theatrical.

2. **Implement Autosave + Persist captionStyle/captionOffset** *(2-3 days)* — Add a `PATCH /api/jobs/{id}/settings/` endpoint. Save caption style + offset every 30 seconds and on every export trigger. This alone will dramatically reduce support complaints and user frustration.

3. **Fix the Re-export Status Machine** *(2-4 hours)* — After a render completes, set the job back to `ready_for_review` or add a new status transition (`done → editing → rendering`). This unblocks the iterative editing workflow that every professional caption editor relies on daily.
