# Purchases

`PurchaseService` is the only boundary the rest of the app talks to for
monetization. `EntitlementService` wraps it and exposes `hasProAccess()`,
which is the only thing screens should call — nothing in the UI should ask
the store (or this interface) directly whether the user is Pro.

## What's wired up today

Android uses `PlayPurchaseService` (`index.android.ts`) and iOS uses
`StoreKitPurchaseService` (`index.ios.ts`), both backed by `expo-iap`.
Web and Expo Go still use `MockPurchaseService`, which simulates purchase,
cancel, pending, restore, lifetime, and expiry against the same plans.

Product ids live in `catalog.ts` and must match Play Console. Monthly and
yearly are base plans on one subscription, under package `com.tradesreport.app`.

Create subscription `tradesreport.pro` (name: Trade Report Pro):

| Base plan ID | Renewal | Price |
| --- | --- | --- |
| `monthly` | Every month | £4.99 including VAT |
| `annual` | Every year | £29.99 including VAT |

Create in-app product `tradesreport.pro.lifetime` at £79.99 including VAT.
Set these as the price the customer pays, not the amount before tax. Activate
both base plans, then upload a build to an internal testing track before a
license-tester purchase will succeed. Paywall prices come from Play.

App Store Connect needs three products, with the two subscriptions in one group:

| Product ID | Type | Price |
| --- | --- | --- |
| `tradesreport.pro.monthly` | Auto-renewable subscription | £4.99 including VAT |
| `tradesreport.pro.annual` | Auto-renewable subscription | £29.99 including VAT |
| `tradesreport.pro.lifetime` | Non-consumable | £79.99 including VAT |

A StoreKit build reads prices and entitlements from the App Store. An expired
subscription returns to the free plan. A cancelled subscription stays Pro until
the period StoreKit reports has ended.

`Manage subscription` on Android opens the Play subscription screen for the
active plan. Lifetime purchases stay in the app because Play has no
subscription to manage.

A custom dev client or EAS build is required. Play Billing does not run in
Expo Go or in the browser preview. Purchases are acknowledged with
`finishTransaction` after Play reports them. This app has no server, so an
active Play purchase is treated as Pro.
