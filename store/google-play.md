# Trade Report — Google Play Console

Draft / prepare only. Do not roll out to production until J says so.

**Play Console (as of 28 Oct 2026)**

| Field | Value |
| --- | --- |
| Developer account | Joao Prates Ferreira (`8407589994182832236`) |
| App name in console | TradesReport (listing title set to **Trade Report**) |
| Package name | `com.tradesreport.app` |
| App ID | `4972398680603116595` |
| Status | Draft (internal testing release already created; listing incomplete graphics) |
| Default listing locale | English (United Kingdom) – en-GB |
| Privacy policy | `https://tradereportapp.com/privacy.html` |
| Terms | `https://tradereportapp.com/terms.html` |
| Support / marketing | `https://tradereportapp.com/` |

Dashboard checklist (approximate): internal testing 2/3, store listing 10/11, closed testing incomplete, production access not applied (disabled until closed testing requirements are met for personal accounts).

## Listing copy (en-GB)

**App name** (30 chars max): Trade Report

**Short description** (80 chars max):

Before-and-after photos, notes, and a signature into a branded PDF.

**Full description:**

Trade Report is for trades and small service businesses. Photograph the job, write what you did, collect an optional customer signature, and generate a branded PDF.

Jobs stay on the device. There is no account. Trade Report does not upload customer photos, names, or addresses. A backup is created only when you ask, after a confirmation that lists what is in the file. You save it to a folder you pick. Google Drive and other providers can appear in that picker. The app does not sign in to Google or Apple.

The free tier includes PDF reports for 3 jobs. Pro unlocks unlimited reports, your logo and colours, and customer sign-off.

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
| Phone screenshots | `store/play/jobs.png`, `photos.png`, `report-preview.png` (also under `store/screenshots/`) | 1320×2868 portrait |

Upload feature graphic + at least 2 phone screenshots in **Grow users → Store listings → Default → Assets** if they are still missing. An app icon (`Logo.png`) was already present in the draft.

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

- **Collects data?** Yes — only optional bug reports.
- **Data shared with third parties?** Yes for that optional bug report path (FormSubmit → developer email). Not sold. Not used for advertising.
- **Collected (optional, app functionality, not required for core use):**
  - User-generated content / support text (bug report body)
  - App info / diagnostics: app version and platform (e.g. Android)
- **Not collected by Trade Report:** photos, precise location, contacts, name, email, phone, address, payment info, device IDs for analytics, crash logs automatic, advertising ID.
- Job photos, customer details, signatures, and PDFs stay on device unless the user shares or saves a backup themselves.
- Purchases are processed by Google Play; Play’s own disclosures apply for payment data.

Also complete: content rating questionnaire, target audience (not children), news app / COVID / data encryption declarations as applicable (encryption: standard HTTPS for optional bug report only; jobs are local).

## What J must do by hand

1. **Play Console API service account**
   - Google Cloud project → create service account → JSON key
   - Play Console → Users and permissions → invite the service account with **Release to testing tracks** (and metadata if you want API listing edits)
   - Save the JSON as `store/play-service-account.json` (never commit)
2. **Upload missing listing graphics** (feature graphic + phone screenshots from `store/play/`) if Console still shows them incomplete
3. **Store settings:** confirm privacy policy URL `https://tradereportapp.com/privacy.html`, app category, contact email
4. **Data safety** form (answers above)
5. **Content rating** questionnaire
6. **Create / activate** Play Billing products (`tradesreport.pro` + lifetime)
7. **Personal account production access:** finish closed testing requirements (Google often requires a minimum number of testers and a period of closed testing before production is unlocked) — **Apply for production** stays disabled until then
8. **Preview and confirm** the internal testing release (dashboard task still open) — draft only, no production rollout
9. Run `eas submit --platform android --latest` once the service account JSON is in place

## Explicitly out of scope for this prep

- Production track rollout
- Sending the app for production review
- Closed testing recruitment beyond noting the requirement
