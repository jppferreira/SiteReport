# Trade Report — App Store Connect copy

Paste this into App Store Connect. Nothing here has been submitted. Prices are the UK amounts already used by the in-app catalog in `services/purchases/catalog.ts`. Apple’s price tiers must match those amounts. The app shows the price the store returns.

Privacy and Terms are live on the GitHub Pages site. Use these HTTPS URLs in App Store Connect and Google Play. Do not enter `https://sitereport.pages.dev` — that host still serves a different product, Daily Site Report.

**ASC (App ID 6827091783) as of 28 Oct 2026:** en-GB App Information privacy policy URL is `https://tradereportapp.com/privacy.html`. Version 1.0 support and marketing URLs are `https://tradereportapp.com/`. IAP products `tradesreport.pro.monthly`, `tradesreport.pro.annual`, and `tradesreport.pro.lifetime` exist and are `READY_TO_SUBMIT`.

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

Turn before-and-after photos, notes, and an optional signature into a branded PDF. Jobs stay on your phone.

Description:

Trade Report is for trades and small service businesses. Photograph the job, write what you did, collect an optional customer signature, and generate a branded PDF.

Jobs stay on the device. There is no account. Trade Report does not upload customer photos, names, or addresses. A backup is created only when you ask, after a confirmation that lists what is in the file. You save it to a folder you pick. Google Drive and iCloud Drive can appear in that picker. The app does not sign in to Google or Apple.

The free tier includes PDF reports for 3 jobs. Pro unlocks unlimited reports, your logo and colours, and customer sign-off.

Monthly and annual Pro plans renew until you cancel them in your App Store account settings, at least 24 hours before the end of the current period. Apple charges the renewal within 24 hours before that period ends. A lifetime purchase is charged once and does not renew. The price is the amount shown on the upgrade screen, charged to your Apple ID. Deleting the app does not cancel a subscription.

Privacy policy: https://tradereportapp.com/privacy.html
Terms of use: https://tradereportapp.com/terms.html

Keywords (88 characters, comma-separated, under the 100-character limit):

trades,builder,plumber,electrician,job,photos,pdf,signature,handover,site,diary,snagging

## Subscriptions and the lifetime purchase

Create these in App Store Connect before the first version. Use one subscription group named Trade Report Pro for the two plans. Lifetime is a non-consumable, not a subscription.

| Product ID | Type | Length | UK price | Store display name |
| --- | --- | --- | --- | --- |
| tradesreport.pro.monthly | Auto-renewable subscription | 1 month | £4.99 | Pro Monthly |
| tradesreport.pro.annual | Auto-renewable subscription | 1 year | £29.99 | Pro Annual |
| tradesreport.pro.lifetime | Non-consumable | Once | £79.99 | Pro Lifetime |

Subscription display name on the group: Trade Report Pro.

Review description for each plan: Unlimited PDF reports, your logo and colours on reports, and customer sign-off.

Paid Applications agreement must be active, and each product must be attached to version 1.0.0.

Review notes (do not include a demo login):

Trade Report has no account. Jobs, photos, and signatures stay on the device. Save to Google Drive opens the system folder picker. It is not a Google sign-in. The free tier generates reports for 3 jobs. Pro is the subscriptions and lifetime product above. Restore purchases is on the upgrade screen.

## App Privacy answers

Data used to track you: none. Do not answer yes to tracking. No App Tracking Transparency prompt is required.

Do you or your third-party partners collect data from this app? Yes. The only collection is an optional bug report.

Declare these two types, both with purpose App Functionality, not linked to the user’s identity, not used for tracking:

- User Content → Customer Support. The text the user types in the bug report. Sent to FormSubmit (formsubmit.co), which emails hello@jppferreira.com. Optional.
- Diagnostics → Other Diagnostic Data. App version and platform, such as iOS. Sent with that same bug report. Optional.

Do not declare photos, videos, precise location, contacts, name, email, phone, physical address, payment info, purchases, device ID, crash data, or product interaction. Customer names, addresses, photos, signatures, and private notes stay on the device unless the user shares a PDF or saves a backup into their own Drive or Files. That backup is not collected by Trade Report, and Google is not a partner collecting it for the developer.

## Screenshots still to capture

Apple requires at least one screenshot per required display, up to 10, as PNG or JPEG with no transparency. The app is portrait-only. Capture on a device or simulator. Do not invent a marketing frame that is not the app.

Required, because `ios.supportsTablet` is true in `app.json`:

- iPhone with Dynamic Island, medium display: 1179 × 2556 or 1206 × 2622 pixels, portrait.
- iPad 13-inch: 2064 × 2752 or 2048 × 2732 pixels, portrait.

Also upload the large iPhone set so the newest phones are not a scaled image: 1320 × 2868, 1290 × 2796, or 1260 × 2736 pixels, portrait. If that set is missing, the medium set above is still the required one.

Use the same five screens in each set:

1. Jobs list, with a few real-looking jobs.
2. A job’s before-and-after photos.
3. The PDF preview of a finished report.
4. The customer signature screen.
5. The upgrade screen, showing the price, the renewal terms, and the Privacy and Terms links.

Setting `supportsTablet` to false drops the iPad set. Do that only if the first version should be iPhone-only.
