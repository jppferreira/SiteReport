# Trade Report 1.1.0

**iOS:** 1.1.0 · **Android:** 1.1.0

## What’s new

- **Photo annotations on reports** — pins, notes, pen, arrows, and circles appear in the generated PDF.
- **On-device voice dictation** — dictate job notes; audio is transcribed on this device and is not uploaded.
- **Evidence stamps** — optional location and verified-on-device labels on photos (Pro).
- **Job checklists** — Field Proof checklists for handover-ready reports.
- **AR measure & spirit level** — measure distances and check surfaces where the device supports them; save measurements into the report.
- **Quote & invoice layouts** — Pro document types plus review-link QR on PDFs.
- **Premium report templates** — additional branded PDF looks.
- **Backups** — manual zip backup; optional iCloud auto-backup on iPhone to your own iCloud Drive.

## Store / privacy checklist for this release

- [x] Publish updated `website/privacy.html` and `website/terms.html` (24 November 2026).
- [ ] Paste updated listing copy from `store/app-store-connect.md` and `store/google-play.md` (Play Console + ASC — manual).
- [ ] Update App Privacy (ASC): FormSubmit → GitHub for optional messages (manual).
- [ ] Update Play Data Safety + declare Camera / Microphone / Location permissions as in `store/google-play.md` (manual).
- [x] Confirm privacy policy URL still `https://tradereportapp.com/privacy.html`.
- [x] Android: block `ACTIVITY_RECOGNITION` and `SYSTEM_ALERT_WINDOW`; disable expo-audio background playback FGS.
- [x] Android AR measure: library pick uses system photo picker (no broad media permission).

## Checks before release

- Typecheck: pass
- Feature / PDF unit tests: pass (AR, level, voice, conversion, backup, checklists, annotations)

## Known notes

- A callout on the extreme photo edge can sit slightly inset in the PDF so the pin stays inside the rounded frame.
- Debug route `/debug-github-report` exists for support tooling and is not linked from Settings.
- Live device QA for mic, GPS stamp, AR, and Drive/iCloud still needs a store or local native build.
