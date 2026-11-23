# Trade Report 1.1.0

**iOS:** 1.1.0 (6) · **Android:** 1.1.0 (11)

## What’s new

- **Photo annotations on reports** — pins, notes, pen, arrows, and circles now appear in the generated PDF, baked into each photo as SVG so marks stay aligned with the image.
- **Annotation editor polish** — full-width photo canvas, compact tools bar, and no bulk delete control; remove individual callout cards when needed.
- **Section photos keep marks** — annotations are preserved when photos are grouped by area/section in the report.
- **Uniform photo scaling** — marked photos scale to fit without cropping; a blurred backdrop fills letterboxed frames.
- **Larger rounded photo frames** — report photo frames use a larger corner radius for a cleaner print look.
- **Empty jobs guidance** — clearer first-report prompt when you have no jobs yet.

## Checks before release

- Typecheck: pass
- Annotation / PDF unit tests: pass (56)
- Fixed ScrollView ref typing and aria-label nullability in annotation code
- Fixed locale-sensitive job-date assertion in `reportHtml.test.ts`

## Known notes

- A callout on the extreme photo edge (e.g. normalized ~0,0) can sit slightly inset in the PDF so the pin stays inside the rounded frame.
- Debug route `/debug-github-report` exists for support tooling and is not linked from Settings.
- EAS submit for iOS needs the ASC API key path in `eas.json` (`AuthKey_3TXXMB78D6.p8`); that file was not present locally at build time — build only, no auto-submit.

## EAS builds (production, store)

- Android: https://expo.dev/accounts/joaoferreira500/projects/tradesreport/builds/9208aa08-44c7-471b-a7c6-fdd64383b333
- iOS: https://expo.dev/accounts/joaoferreira500/projects/tradesreport/builds/cf77f9f6-6552-4987-a0aa-05a1270a3c54
