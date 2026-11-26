# Trade Report — App Store Connect copy

Paste this into App Store Connect. Nothing here has been submitted. Prices are the UK amounts already used by the in-app catalog in `services/purchases/catalog.ts`. Apple’s price tiers must match those amounts. The app shows the price the store returns.

Privacy and Terms are live on the marketing site. Use these HTTPS URLs in App Store Connect and Google Play.

**ASC (App ID 6827091783):** en-GB App Information privacy policy URL is `https://tradereportapp.com/privacy.html`. Support and marketing URLs are `https://tradereportapp.com/`. IAP products `tradesreport.pro.monthly`, `tradesreport.pro.annual`, and `tradesreport.pro.lifetime` exist and are `READY_TO_SUBMIT`.

## Listing

- Name: Trade Report
- Subtitle: Proof of work in a PDF
- Primary category: Productivity
- Secondary category: Business
- Age rating: 4+. The app is not made for children.
- Copyright: 2026 J P Ferreira Creative Ltd
- Support URL: `https://tradereportapp.com/`
- Marketing URL: same site
- Privacy Policy URL: `https://tradereportapp.com/privacy.html`

Promotional text (170 characters max):

Quotes, invoices, before-and-after photos, AR measure, voice notes, and a branded PDF. Jobs stay on your phone.

Description:

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
• Manual zip backup; optional iCloud auto-backup on iPhone to your own iCloud Drive

Jobs stay on the device. There is no account. Trade Report does not upload customer photos, names, or addresses. Optional voice dictation is transcribed on this device. A backup is created when you ask, after a confirmation that lists what is in the file, or on iPhone via optional iCloud auto-backup. You save backups to a folder you pick. Google Drive and iCloud Drive can appear in that picker. The app does not sign in to Google or Apple.

The free tier includes PDF reports for 3 jobs. Pro unlocks unlimited reports, your logo and colours, customer sign-off, photo markup, and other Pro tools shown in the app.

Monthly and annual Pro plans renew until you cancel them in your App Store account settings, at least 24 hours before the end of the current period. Apple charges the renewal within 24 hours before that period ends. A lifetime purchase is charged once and does not renew. The price is the amount shown on the upgrade screen, charged to your Apple ID. Deleting the app does not cancel a subscription.

Privacy policy: https://tradereportapp.com/privacy.html
Terms of use: https://tradereportapp.com/terms.html

Keywords (under 100 characters):

trades,builder,plumber,electrician,quote,invoice,photos,pdf,signature,handover,measure

## Subscriptions and the lifetime purchase

Create these in App Store Connect before the first version. Use one subscription group named Trade Report Pro for the two plans. Lifetime is a non-consumable, not a subscription.

| Product ID | Type | Length | UK price | Store display name |
| --- | --- | --- | --- | --- |
| tradesreport.pro.monthly | Auto-renewable subscription | 1 month | £4.99 | Pro Monthly |
| tradesreport.pro.annual | Auto-renewable subscription | 1 year | £29.99 | Pro Annual |
| tradesreport.pro.lifetime | Non-consumable | Once | £79.99 | Pro Lifetime |

Subscription display name on the group: Trade Report Pro.

Review description for each plan: Unlimited PDF reports, your logo and colours on reports, customer sign-off, and other Pro tools shown in the app.

Paid Applications agreement must be active, and each product must be attached to the version under review.

Review notes (do not include a demo login):

Trade Report has no account. Jobs, photos, and signatures stay on the device. Microphone: optional voice dictation; on-device Whisper transcription; temporary audio is deleted after use; no audio uploaded to Trade Report. Location: optional Pro evidence stamp only; foreground while in use; not sent to developer servers. AR / level: camera plus ARKit where available, and accelerometer for the spirit level; measurements saved locally. Save to Google Drive / iCloud opens the system folder picker or writes to the user’s iCloud Drive; it is not a Google or Apple sign-in by Trade Report. Optional iCloud auto-backup on iPhone can be turned off in Settings. The free tier generates reports for 3 jobs. Pro is the subscriptions and lifetime product above. Restore purchases is on the upgrade screen.

## App Privacy answers

Data used to track you: none. Do not answer yes to tracking. No App Tracking Transparency prompt is required.

Do you or your third-party partners collect data from this app? Yes. The only data Trade Report collects from the device is an optional bug or contact message the user sends.

Declare these two types, both with purpose App Functionality, not linked to the user’s identity, not used for tracking:

- User Content → Customer Support. The text the user types in the bug or contact report. Sent to GitHub Issues on the Trade Report project repository (mailto fallback to hello@jppferreira.com if GitHub cannot accept it). Optional.
- Diagnostics → Other Diagnostic Data. App version and platform, such as iOS. Sent with that same optional message. Optional.

Do not declare photos, videos, precise location, contacts, name, email, phone, physical address, payment info, purchases, device ID, crash data, product interaction, or audio data as collected by Trade Report. Microphone audio and optional location stamps are processed on device for app functionality and are not received by the developer. Customer names, addresses, photos, signatures, and private notes stay on the device unless the user shares a PDF or saves a backup into their own Drive or Files. That backup is not collected by Trade Report, and Google or Apple are not partners collecting it for the developer.

## Screenshots (1.1.0 — all primary features)

Apple requires at least one screenshot per required display, up to 10, as PNG or JPEG with no transparency. The app is portrait-only (`supportsTablet: false`) — iPhone set only. Native captures are 1206 × 2622; resized large set is 1320 × 2868 under `store/ios-headers/` and `store/screenshots/1.1.0-store-set/iphone-1320/`.

Recommended upload order (up to 10):

| # | File | Feature |
| --- | --- | --- |
| 1 | `01-jobs.png` | Jobs home — Quote/Report/Invoice + money summary + job cards with photos |
| 2 | `02-job-guided.png` | Guided job steps (photos, measure, level, notes, checklist, sign-off, PDF) |
| 3 | `03-photos.png` | Before / during / after photos by section |
| 4 | `04-photo-evidence.png` | Evidence stamp + callout on a real job photo |
| 5 | `06-measure.png` | AR measure on a real door/opening |
| 6 | `07-level.png` | Spirit level (prefer a physical-device recapture without the simulator sensor warning) |
| 7 | `08-notes.png` | Work notes + voice mic |
| 8 | `11-quote.png` / `11b-invoice.png` | Quote or invoice status workflow |
| 9 | `12-preview.png` | Branded PDF preview |
| 10 | `14-paywall.png` | Pro upgrade with prices |

Also in the set: checklist, toolbox, annotate, signature, backup (`15-backup.png`). Source folder: `store/screenshots/1.1.0-store-set/`.
