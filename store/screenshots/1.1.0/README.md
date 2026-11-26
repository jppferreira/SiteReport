# Trade Report 1.1.0 screenshots (iPhone 17 simulator)

Captured 24 Nov 2026 from `iPhone 17 (iOS 26.4)` at native **1206×2622**.

## Recommended store set

| File | Screen | Notes |
| --- | --- | --- |
| `01-jobs.png` / `17-jobs.png` | Jobs list | Shows job cards |
| `02-job-detail.png` | Guided job steps | Highlights Measure, Level, notes, checklist |
| `03-photos.png` | Photos by section | Before / during / after |
| `05-measure.png` | AR Measure coach | Camera/AR feature |
| `07-summary.png` | Work notes | Voice/notes surface |
| `08-preview.png` | PDF preview + templates | Premium templates visible |
| `10-paywall.png` | Pro upgrade | Pricing |
| `12-level.png` | Spirit level UI | **Simulator cannot feed motion sensors** — shows “Motion sensors aren’t available”. Recapture on a physical iPhone. |

## Still needed (physical device preferred)

1. Level with live roll/pitch (no sensor warning)
2. Annotate editor with callouts on a real photo
3. Checklist (Pro unlocked)
4. Voice dictation sheet mid-recording
5. Evidence stamp on a photo
6. Clean shots without Expo “Open debugger to view warnings” banner (use a Release / production build)

## RC smoke (TestFlight / Play internal) — 1.1.0 backup story

Ship binary must include: Hermes `runtimeCrypto`, launch path-repair, restore pick-before-dismiss, Drive MIME broaden.

| Step | Pass criteria |
| --- | --- |
| Quote → commercial PDF | `QUO-*`, lines, totals render |
| Annotate photo → report PDF | Callout / arrow / dimension bake visible |
| Android: Save to Google Drive | DocumentsUI may open on **Downloads** — open side menu → **Google Drive / My Drive** → Save. Toast “Backup saved to Google Drive”. Saving outside Drive must fail with the Drive-not-selected copy. |
| Android: Restore that zip | Quotes + annotated photo notes return. **Verified 25 Nov 2026** on Galaxy (`R3CX70KL1MD`): (1) `restore-e2e` harness and (2) Settings → Choose backup → Drive search → `tradesreport-backup-annotated-e2e.zip` — SQLite kept callouts **Damaged unit** + **Worn worktop** and quotes QUO-0001…0005. Tap the **filename row** in DocumentsUI (Preview icon does not select). Requires `fileService` legacy `writeBytes`/`readBytes`. If native Save to Drive returns `ERR_DRIVE_WRITE` after SAVE, recheck My Drive selection; Share→Drive is a fallback only for debugging. |
| iOS: Save to iCloud Drive (signed-in Apple ID) | Toast “Backup saved to iCloud Drive”; zip under iCloud Drive → Trade Report. Simulator may report `signed-out` (`ubiquityIdentityToken` nil) even with an Apple ID in Settings — prefer a physical iPhone, and confirm the binary was built with `CloudDocuments` entitlements (`plugins/withIcloudDocuments.js`). Dev harness: `tradesreport://debug/icloud-e2e`. |
| iOS: Restore that zip | Jobs / quotes / photos return |
| Android Drive picker | DocumentsUI often opens on **Downloads** — switch to Google Drive / My Drive before Save (copy updated in Settings + error toast). |
| Fresh install after update | No `Property 'crypto'`; photos still resolve (path remap) |

Copied into `store/screenshots/`, `store/play/`, and resized to 1320×2868 under `store/ios-headers/`.
