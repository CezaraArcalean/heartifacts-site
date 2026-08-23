# Heartifacts website

Official fan-facing website for **Heartifacts**, a five-piece alternative rock band from Bucharest, Romania.

This repository is intentionally simple: plain HTML, CSS and vanilla JavaScript, hosted on GitHub Pages. There is no backend, database, CMS, npm build or framework.

## How deployment works

GitHub Pages publishes the `main` branch from the repository root. Development work should normally happen on a feature branch and be merged into `main` only after review.

The current working branch is `feature/v1-foundation`.

## Public Band Manager data

Published gig/release data follows a strict one-way path:

```text
Private Band Manager
        |
        | explicit human-approved publication
        v
heartifacts-public-data / band-manager.json
        |
        | read-only HTTPS GET
        v
heartifacts.ro
```

The website reads only:

```text
https://raw.githubusercontent.com/CezaraArcalean/heartifacts-public-data/main/band-manager.json
```

The website has no Band Manager credential, Google Sheets access, Apps Script URL, GitHub write token, webhook or backend.

`public-data.js` owns the trust boundary. It:

- fetches the JSON once per page load with a timeout;
- accepts only schema version 1;
- validates the expected top-level collections;
- caps payload/entity/text/URL sizes;
- validates date-only strings deliberately;
- accepts HTTPS-only external links;
- restricts Spotify to `open.spotify.com`;
- restricts YouTube to approved YouTube hosts;
- restricts published media references to local `assets/` paths;
- ignores unknown fields;
- filters invalid entities;
- never injects public JSON as HTML.

All published text is rendered with DOM node creation and `textContent`.

### Gig updates

Do **not** manually add gigs to `site-data.js`.

Approved/public gig details are published from Band Manager into the public-data repository. The website fetches that sanitized snapshot and renders upcoming gigs automatically.

The current Gigs UI:

- sorts upcoming gigs by date ascending;
- preserves the date exactly as a date-only value;
- uses RO/EN descriptions from the same existing language state;
- highlights `featured: true` visually;
- shows ticket/event links only when safe URLs are present;
- shows a non-clickable coming-soon treatment when tickets are not published yet;
- fails back to quiet fan-facing copy if the feed is unavailable or invalid.

Past gigs remain present in the sanitized in-memory data but are not turned into a large archive in the current homepage design.

### Release updates

The public-data contract also supports releases. When valid published releases exist, the Music area can use the featured/newest published release without another architecture pass.

When `releases` is empty, the current static Red Flag content in `site-data.js` remains intact. This is intentional progressive enrichment: an empty Band Manager release list must not remove known-good public music links.

## Files you will edit most often

- `site-data.js` — static social/contact information, static release fallback, hero and gallery photos.
- `public-data.js` — public JSON fetch/validation contract. Change carefully.
- `content/en.js` — English website text.
- `content/ro.js` — Romanian website text.
- `site.js` — safe DOM rendering and interactions.
- `assets/` — public, web-optimized images and band-owned assets.

You normally should **not** need to edit code just to publish a new gig; Band Manager publication owns that workflow.

## Social links and booking contact

Static public links live in `site-data.js`:

```js
social: {
  instagram: "https://www.instagram.com/heartifacts_band/",
  spotify: "PUBLIC_SPOTIFY_ARTIST_URL",
  youtube: "https://www.youtube.com/@Heartifacts-band"
},
contact: {
  email: "heartifactsband@gmail.com"
}
```

Only put contact details here that are intentionally public.

## Static release fallback

`featuredRelease` in `site-data.js` is the known-good fallback used when Band Manager has not published any release objects yet:

```js
featuredRelease: {
  title: "Red Flag",
  artwork: "./assets/brand/Red_flag_sticker.webp",
  spotify: "PUBLIC_SPOTIFY_TRACK_URL",
  youtube: "PUBLIC_YOUTUBE_URL"
}
```

## Romanian / English text

Edit `content/ro.js` for Romanian and `content/en.js` for English. Keep the same property names in both files.

Language selection priority:

1. `?lang=ro` or `?lang=en` in the URL;
2. the visitor's previous local browser choice;
3. Romanian browser language → Romanian;
4. otherwise English.

Dynamic Band Manager descriptions use this exact same language state and do not trigger a second network request when the language changes.

## Images

The GitHub repository is **not** the master photo archive. Keep original high-resolution files in proper band storage and commit only web derivatives here.

Good defaults:

- Hero / very large photos: about 1600–2200 px on the long edge.
- Gallery `*_medium.webp`: roughly 1400–1800 px on the long edge for lightbox use.
- Optional gallery `*_small.webp`: roughly 1000–1200 px on the long edge for responsive inline display.
- Prefer WebP; AVIF may be used when practical.
- Keep compression visually clean instead of chasing the smallest possible file.

Gallery entries support an optional `small` field:

```js
gallery: [
  {
    src: "./assets/photos/band_medium.webp",
    small: "./assets/photos/band_small.webp",
    alt: {
      en: "Heartifacts band photo",
      ro: "Fotografie cu trupa Heartifacts"
    }
  }
]
```

When `small` exists, the browser receives responsive `srcset`/`sizes`; the lightbox continues to use the medium image.

## Security — important

This is a **public repository**. Treat every committed file as publicly readable forever, including data recoverable from Git history.

Never commit:

- passwords or API keys;
- OAuth/PAT/access tokens;
- private certificates;
- private Google Drive/Sheets data;
- private Band Manager exports;
- unpublished sensitive media;
- private member contact details;
- credentials of any kind.

The site uses a narrow Content Security Policy. External runtime data access is limited to `https://raw.githubusercontent.com`; public-data media remains site-owned/local.

External links opened in new tabs use `rel="noopener noreferrer"`.

Third-party runtime libraries should not be added merely for convenience.

## Failure behaviour

The public-data feed is progressive enhancement. If GitHub Raw is unavailable, the request times out, JSON is malformed, the schema changes unexpectedly, or entities fail validation:

- the rest of the site remains usable;
- the Gigs section shows quiet fan-facing fallback copy;
- the static Music/Red Flag experience remains available;
- no technical error payload is shown to visitors.

## Restoring a bad change

Git is the recovery system. If a change is bad:

1. identify the last good commit;
2. revert the bad commit or restore affected files;
3. review on the feature branch;
4. merge/push the correction to `main` only when ready.

## Paths and GitHub Pages

Use relative paths such as:

```text
./assets/photos/hero.webp
```

The public-data media validator is intentionally stricter: published media references must resolve under the site's `assets/` tree. Arbitrary remote images, Google Drive URLs and path traversal are not accepted.

## Custom domain

Canonical domain: `https://heartifacts.ro/`.

Keep registrar and GitHub accounts protected with 2FA, keep HTTPS enabled, and retain domain verification records.

## Current intentional placeholder

The social-sharing/Open Graph image (`og-image.jpg`) is still intentionally pending until the final share artwork is chosen.

## Architecture principle

The visual layer can be gloriously Heartifacts-y.

The engineering layer should remain boring, small, secure, fast and easy to recover.
