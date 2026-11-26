# Trade Report 1.1.0 — store screenshot set (all primary features)

Native captures from `iPhone 17 (iOS 26.4)` at **1206×2622**, with demo jobs/photos/quotes/invoices seeded so screens are not empty. Large App Store / Play set: `iphone-1320/` and `play-phone/` at **1320×2868**.

## Primary feature coverage

| File | Feature |
| --- | --- |
| `01-jobs.png` | Jobs home — Quote / Report / Invoice segments, money summary donut, job cards with photos |
| `02-job-guided.png` | Guided job checklist (details, photos, measure, level, notes, checklist, sign-off, Create PDF) |
| `03-photos.png` | Photos by section (Kitchen / Utility) with before · during · after counts and thumbnails |
| `04-photo-evidence.png` | Real job photo with evidence stamp + callout note |
| `05-annotate.png` | Photo markup / section browse with marks |
| `06-measure.png` | AR measure on a door/opening (filled capture) |
| `07-level.png` | Spirit level UI |
| `08-notes.png` | Work notes (tidied for PDF) + voice mic |
| `09-checklist.png` | Field Proof checklist 5/5 |
| `10-toolbox.png` | Toolbox — AR Measure, Level, Notes |
| `11-quote.png` | Quote workflow (sent, timeline, mark accepted) |
| `11b-invoice.png` | Invoice workflow (unpaid, mark paid) |
| `12-preview.png` | Branded PDF preview |
| `13-signature.png` | Customer sign-off |
| `14-paywall.png` | Pro upgrade |
| `15-backup.png` | Data & privacy / iCloud backup |

Published copies also live under `store/ios-headers/` and `store/play/`.

## Demo data used

Simulator DB seeded with bathroom refit, boiler service, and kitchen quote jobs; website job photos under `Documents/sitereport/jobs/`; quotes/invoices with totals so the money summary is populated.

## Still better on a physical iPhone

1. Level with live roll/pitch (no “Motion sensors aren’t available”)
2. Annotate editor with a clear photo under the marks (simulator annotate canvas sometimes failed to paint the bitmap)
3. AR measure live camera (use `06-measure.png` filled door shot for now)
4. Release / production build so the Expo debugger banner never appears
