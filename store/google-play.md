# Trade Report — Google Play Console

Organisation account — open testing is the path onto the Play Store. Do not roll out **production** until J says so.

**Play Console (as of 30 Oct 2026)**

| Field | Value |
| --- | --- |
| Developer account | Joao Prates Ferreira (`8407589994182832236`) — organisation (open testing allowed) |
| App name in console | TradesReport (listing title set to **Trade Report**) |
| Package name | `com.tradesreport.app` |
| App ID | `4972398680603116595` |
| Status | Closed testing has 1.0.0 (vc7). Internal draft has vc8. Open testing (beta) empty until countries are set and vc8 is promoted. |
| Default listing locale | English (United Kingdom) – en-GB |
| Privacy policy | `https://tradereportapp.com/privacy.html` |
| Terms | `https://tradereportapp.com/terms.html` |
| Support / marketing | `https://tradereportapp.com/` |

Open testing needs at least one country selected under **Test and release → Open testing → Countries/regions** (beta currently syncs with production, which has none). Then promote vc8 and send for review.

## Listing copy (en-GB)

**App name** (30 chars max): Trade Report

**Short description** (80 chars max):

Quotes, invoices, photos, AR measure, and voice notes into a branded PDF.

**Full description:**

Trade Report is for trades and small service businesses. Run the job from quote to invoice: photograph the work, mark up photos, dictate or write what you did, collect an optional customer signature, and generate a branded PDF report, quote, or invoice.

Primary features:

• Jobs home with Quote / Report / Invoice views and a money summary for drafts, awaiting replies, and unpaid invoices
• Before, during, and after photos by room or section, with optional evidence stamps (date, address, verified on device)
• Photo markup — arrows, callouts, dimensions, highlights, and freehand notes that appear on the PDF
• AR measure and spirit level in the Toolbox (where your phone supports them), with readings saved to the job
• Work notes with optional on-device voice dictation
• Field Proof job checklists that can print on the report
• Customer sign-off and premium report templates (Pro)
• Quotes and invoices with status tracking, send, and mark paid
• Manual zip backup you save to a folder you pick (Google Drive can appear in that picker)

Jobs stay on the device. There is no account. Trade Report does not upload customer photos, names, or addresses. Optional voice dictation is transcribed on this device. The app does not sign in to Google or Apple.

The free tier includes PDF reports for 3 jobs. Pro unlocks unlimited reports, your logo and colours, customer sign-off, photo markup, and other Pro tools shown in the app.

Monthly and annual Pro plans renew until you cancel them in Google Play subscriptions, at least 24 hours before the end of the current period. Google Play charges the renewal within 24 hours before that period ends. A lifetime purchase is charged once and does not renew. The price is the amount shown on the upgrade screen. Deleting the app does not cancel a subscription.

Privacy policy: https://tradereportapp.com/privacy.html
Terms of use: https://tradereportapp.com/terms.html

**Category (current in Console):** Tools — tags include Camera, House & home, Interior design, Productivity. Consider switching category to **Productivity** to match App Store if J prefers; not required for draft prep.

**Contact email:** hello@jppferreira.com  
**Website (updated in Console):** `https://tradereportapp.com/` (was incorrectly pointing at the old sitereport GitHub Pages host)

## Graphics ready in the repo

| Asset | Path | Spec |
| --- | --- | --- |
| App icon 512×512 | `store/play/icon-512.png` | Required |
| Feature graphic 1024×500 | `store/play/feature-graphic.png` | Required |
| Phone screenshots | `store/play/*.png` and `store/screenshots/1.1.0-store-set/play-phone/` | 1320×2868 portrait |

**1.1.0 phone set (all primary features):** `jobs.png`, `job-guided.png`, `photos.png`, `photo-evidence.png`, `annotate.png`, `ar-measure.png`, `level-tool.png`, `work-notes.png`, `checklist.png`, `toolbox.png`, `quote.png`, `invoice.png`, `report-preview.png`, `paywall.png`, `backup.png`.

Upload feature graphic + at least 2 phone screenshots in **Grow users → Store listings → Default → Assets**. Prefer 8–10 shots covering jobs, photos, measure, notes, quote/invoice, PDF preview, and Pro.

## EAS submit (draft / internal only)

`eas.json` → `submit.production.android`:

- `serviceAccountKeyPath`: `./store/play-service-account.json` (gitignored — J must create this file locally)
- `track`: `internal`
- `releaseStatus`: `draft`
- `changesNotSentForReview`: `true`

Existing production AAB on EAS: version `1.0.0`, versionCode **7**  
(`eas build:list --platform android`).

After the JSON key exists:

```bash
npx eas-cli submit --platform android --latest --profile production
```

That uploads to the **internal** track as a **draft** release. It does not publish production.

## In-app products (must match `services/purchases/catalog.ts`)

Create under Monetize → Products (package `com.tradesreport.app`):

| Play product | Type | Notes | UK price |
| --- | --- | --- | --- |
| `tradesreport.pro` | Subscription | Base plans `monthly` and `annual` | £4.99 / £29.99 inc. VAT |
| `tradesreport.pro.lifetime` | One-time / managed product | Lifetime Pro | £79.99 inc. VAT |

Activate base plans. License testing needs a build on an internal testing track.

## Data Safety form (J must complete in Console)

App content → Data safety. Suggested answers aligned with the privacy policy and ASC App Privacy:

- **Collects data?** Yes — only optional bug / contact messages the user sends.
- **Data shared with third parties?** Yes for that optional message path (GitHub Issues on the project repo; mail fallback to developer). Not sold. Not used for advertising.
- **Collected (optional, app functionality, not required for core use):**
  - User-generated content / support text (bug or contact message body)
  - App info / diagnostics: app version and platform (e.g. Android)
- **Permissions to declare** (device access; not “collected by developer” unless you choose that framing):
  - Camera — job photos and optional AR measure
  - Microphone — optional on-device voice dictation (temp audio deleted after transcription; not uploaded to Trade Report)
  - Location (approximate and precise / while in use) — optional evidence stamp when the user turns it on; not sent to Trade Report servers
- **Do not declare / not in the release AAB:** `ACTIVITY_RECOGNITION` (blocked — spirit level uses accelerometer only), broad photo/video storage (`READ_MEDIA_*` blocked; system picker), overlay (`SYSTEM_ALERT_WINDOW` blocked), media-playback foreground service (background audio playback disabled).
- **Not collected / not shared by Trade Report:** photos, precise location coordinates, audio recordings, contacts, name, email, phone, address, payment info, device IDs for analytics, automatic crash logs, advertising ID. Those may be processed on the device for the features above, but the developer does not receive them.
- **Optional network note for Data Safety / privacy alignment:** some premium PDF layouts may request fonts from Google Fonts (IP / technical request data to Google; not job content). Disclose if Console asks about data shared with third parties beyond the optional support message.
- Job photos, customer details, signatures, and PDFs stay on device unless the user shares or saves a backup themselves. Google Drive saves use the system document UI; the app does not sign in to Google.
- Purchases are processed by Google Play; Play’s own disclosures apply for payment data.

Also complete: content rating questionnaire, target audience (not children), news app / COVID / data encryption declarations as applicable (encryption: standard HTTPS for optional bug report only; jobs are local).

## Done via API (24 Nov 2026)

- en-GB store listing copy (short + full description) committed
- Data Safety CSV uploaded (optional support messages + app version/platform; no account creation; deletion URL → privacy policy)

## What J must do by hand

1. **Upload missing listing graphics** (feature graphic + phone screenshots from `store/play/`) if Console still shows them incomplete
2. **Content rating** questionnaire (if not already complete)
3. **Create / activate** Play Billing products (`tradesreport.pro` + lifetime) if not already live
4. **Declare trader status** (account-level; due Feb 2027) from Play Console home → Get started
5. **Publishing overview:** send pending Trade Report changes for review when ready (Console shows “Changes not yet sent for review”)
6. **Production access:** finish closed/open testing requirements before production rollout
7. Run `eas submit --platform android --latest` for the next Android build when ready

## Explicitly out of scope for this prep

- Production track rollout
- Sending the app for production review
- Closed testing recruitment beyond noting the requirement
