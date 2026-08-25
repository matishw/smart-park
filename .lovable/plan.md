# Fixing the Android install warning

## What the message means

The "built for an older version of Android / Play Protect" warning does not come from the web app itself. It appears when Android installs the app as a locally generated package instead of a proper WebAPK minted by Google Play Services. This usually happens when:

- the install is done from a browser other than Chrome (Samsung Internet, Edge, Firefox), which sideloads a self-signed package with an old target SDK, or
- the install runs from the Lovable preview URL rather than the published site, or
- the manifest is missing fields Chrome requires to request a real WebAPK.

The app itself is safe; the warning is about the packaging path.

## Plan

1. Strengthen the web app manifest so Chrome always qualifies it for a real WebAPK:
   - add `id`, `lang`, `dir`
   - keep a dedicated maskable icon (with safe-zone padding) separate from the "any" icons
   - add `categories` and at least one `screenshots` entry (improves the richer install dialog)
2. Improve the in-app install button behavior:
   - if the browser is not Chrome on Android (no `beforeinstallprompt`), show guidance to open the app in Chrome instead of triggering a sideload-style install
   - detect when the page is running on a preview/iframe host and tell the user to install from the published address
3. Add a short help note under the install button explaining that on Android the app should be installed from Chrome on the published site, and that any Play Protect warning means it was installed from an APK file or a non-Chrome browser.

No service worker or offline caching will be added — installability stays manifest-only.

## Technical notes

- `public/manifest.webmanifest`: add `id: "/"`, `lang: "he"`/`en`, `dir`, `categories`, `screenshots`; keep 192/512 "any" icons plus a padded 512 maskable icon.
- `src/components/InstallAppButton.tsx`: branch on user agent + `beforeinstallprompt` availability; add Chrome-on-Android and preview-host messaging via existing toasts.
- No database or API changes.
