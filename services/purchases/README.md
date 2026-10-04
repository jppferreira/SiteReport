# Purchases

`PurchaseService` is the only boundary the rest of the app talks to for
monetization. `EntitlementService` wraps it and exposes `hasProAccess()`,
which is the only thing screens should call — nothing in the UI should ask
the store (or this interface) directly whether the user is Pro.

## What's wired up today

`MockPurchaseService` implements the full interface against a locally
persisted simulated store (see its file comment for why: this build
environment has no Apple/Google developer account, no signed native build,
and no device to run one on, so a real purchase cannot be exercised here).
It supports every state the real stores do — purchase, cancel, pending,
restore, lifetime, subscription expiry — so every paywall, entitlement-gated
feature, and settings screen can be fully built and tested against it.

## Wiring a real store for production

Swap `createPurchaseService()` in `index.ts` to return a `StorePurchaseService`
backed by [`react-native-iap`](https://github.com/dooboolab-community/react-native-iap)
once you have:

1. App Store Connect / Google Play Console products configured for
   `sitereport.pro.monthly`, `sitereport.pro.annual`, `sitereport.pro.lifetime`
   matching the ids in `MockPurchaseService.ts`.
2. A custom Expo dev client or EAS build (react-native-iap requires native
   linking; it will not run in Expo Go or in a browser preview).
3. An implementation of `PurchaseService` that:
   - Calls `initConnection()` on `initialize()`.
   - Calls `getSubscriptions`/`getProducts` for `getProducts()`, mapping the
     store's localized price string directly into `ProductInfo` — never
     hard-code a price string in the UI.
   - Calls `requestSubscription` / `requestPurchase` for `purchase()`, and
     resolves the returned promise only after `purchaseUpdatedListener`
     fires, mapping store error codes (`E_USER_CANCELLED`, `E_ALREADY_OWNED`,
     deferred/pending states) onto `PurchaseResult`.
   - Always calls `finishTransaction` after acknowledging a purchase.
   - Calls `getAvailablePurchases` for `restorePurchases()`.
   - Verifies entitlement server-side or via `expo-in-app-purchases`
     receipt validation if stronger anti-tampering is required later;
     until then, local receipt presence is treated as sufficient for a
     single-user, local-first app with no server component.

Because every consumer of purchases goes through the `PurchaseService`
interface and `EntitlementService`, this swap requires no changes outside
this folder.
