# Heartifacts website

Official fan-facing website for **Heartifacts**, a five-piece alternative rock band from Bucharest, Romania.

This repository is intentionally simple: plain HTML, CSS and vanilla JavaScript, hosted on GitHub Pages. There is no backend, database, CMS, npm build or framework.

## How deployment works

GitHub Pages publishes the `main` branch from the repository root. Once Pages is configured, merging or pushing a website change to `main` republishes the public site automatically.

Development work should normally happen on a feature branch and be merged into `main` only after review.

## Files you will edit most often

- `site-data.js` — social links, booking email, featured release, upcoming shows and gallery photos.
- `content/en.js` — English website text.
- `content/ro.js` — Romanian website text.
- `assets/` — public, web-optimized images and brand assets once added.

You normally should **not** need to edit `index.html`, `styles.css` or `site.js` just to update band content.

## Update social links

Open `site-data.js` and edit:

```js
social: {
  instagram: "https://www.instagram.com/heartifacts_band/",
  spotify: "PASTE_PUBLIC_SPOTIFY_URL_HERE",
  youtube: "https://www.youtube.com/@Heartifacts-band"
}
```

Leave a URL as an empty string if it is not ready. The site hides unavailable links instead of sending visitors to a broken destination.

## Update booking / press email

In `site-data.js`:

```js
contact: {
  email: "booking@example.com"
}
```

Use only an email address intentionally meant to be public. Do not put a private phone number or private member contact details here.

## Update the featured song

In `site-data.js`, edit:

```js
featuredRelease: {
  title: "Red Flag",
  artwork: "./assets/music/red-flag-cover.webp",
  spotify: "PUBLIC_SPOTIFY_URL",
  youtube: "https://www.youtube.com/watch?v=FbAdPtLhO2g"
}
```

If artwork is not supplied yet, leave `artwork` empty and the site uses the branded placeholder.

## Update the next gig

Shows live in the `shows` array in `site-data.js`:

```js
shows: [
  {
    date: "2026-09-20",
    venue: "The Pub",
    city: "Bucharest",
    eventUrl: "PUBLIC_EVENT_URL",
    ticketUrl: "PUBLIC_TICKET_URL"
  }
]
```

Use an ISO date in `YYYY-MM-DD` format. If there is no confirmed public show, remove the entries or leave the date empty. The website will show the branded no-shows message automatically.

## Update Romanian / English text

Edit `content/ro.js` for Romanian and `content/en.js` for English.

Keep the same property names in both files. The language system reads these keys and swaps the visible copy without duplicating the whole website.

Language selection priority:

1. `?lang=ro` or `?lang=en` in the URL
2. the visitor's previously selected language stored locally in their browser
3. Romanian browser language → Romanian
4. otherwise English

Manual choices are remembered only in the visitor's browser. No cookies or server storage are used.

## Replace the hero photo

1. Export a web-optimized image, preferably WebP.
2. Put it in `assets/photos/`, for example `assets/photos/hero.webp`.
3. Set this in `site-data.js`:

```js
hero: {
  image: "./assets/photos/hero.webp",
  alt: {
    en: "Heartifacts band photo",
    ro: "Fotografie cu trupa Heartifacts"
  }
}
```

Suggested large-image target: roughly 1600–2200 px on the long edge, compressed sensibly. Do not upload multi-megabyte camera originals unless there is a specific reason.

## Add gallery photos

Add optimized files under `assets/photos/`, then add entries to the `gallery` array:

```js
gallery: [
  {
    src: "./assets/photos/band-02.webp",
    width: 1600,
    height: 1200,
    alt: {
      en: "Heartifacts together at rehearsal",
      ro: "Heartifacts împreună la repetiție"
    },
    caption: {
      en: "Rehearsal room chaos.",
      ro: "Haos de sală de repetiții."
    }
  }
]
```

Reorder entries in the array to change their order on the page. Keep the strongest 4–8 images rather than turning the homepage into a full archive.

Width and height are recommended because they reduce layout shift while photos load.

## Image guidance

The GitHub repository is **not** the master photo archive. Keep original high-resolution files in proper band storage and commit only web derivatives here.

Good defaults:

- Hero / very large photos: about 1600–2200 px wide.
- Supporting photos: about 1200–1800 px wide.
- Prefer WebP; AVIF may be used when practical.
- Keep compression visually good but avoid unnecessarily huge files.
- Avoid text baked into general-purpose photos unless it is intentional artwork.
- Write useful alt text for meaningful images.

## Security — important

This is a **public repository**. Treat every committed file as publicly readable forever, including data recoverable from Git history.

Never commit:

- passwords
- API keys
- OAuth/access tokens
- private certificates
- private Google Drive links
- private Band Manager exports/data
- unpublished sensitive media
- personal addresses
- private phone numbers
- credentials of any kind

The website deliberately has no backend, authentication system or database, which keeps the attack surface small.

Third-party JavaScript libraries should not be added just for convenience. If one ever becomes necessary, review its privacy, security, performance and maintenance cost first.

External links opened in new tabs use `rel="noopener noreferrer"`.

## Restoring a bad change

Git is the recovery system. If a change is bad:

1. identify the last good commit in GitHub;
2. revert the bad commit or restore the affected files from the good version;
3. merge/push the correction to `main`;
4. GitHub Pages republishes the restored site.

For larger changes, use a feature branch and pull request so the diff can be reviewed before the live branch changes.

## Paths and GitHub Pages

Use relative paths such as:

```text
./assets/photos/hero.webp
```

Do not casually change them to root-absolute paths such as:

```text
/assets/photos/hero.webp
```

Relative paths allow the same source to work both at the repository GitHub Pages URL and later at `heartifacts.ro`.

## Custom domain

The planned canonical domain is `heartifacts.ro`.

When connecting it later:

- register the domain under band/user control;
- protect registrar and GitHub accounts with 2FA;
- verify the domain in GitHub before DNS switching;
- avoid wildcard DNS records;
- keep the GitHub verification TXT record;
- enable HTTPS;
- test both root and `www` behavior;
- add/update canonical and Open Graph URLs after the domain is final.

## Current placeholders

The code is designed to remain usable while final assets are missing. Current placeholders should eventually be replaced with:

- final Heartifacts logo/wordmark
- hero band photo
- Red Flag artwork
- selected gallery photos
- Spotify URL
- exact confirmed public gig date/event details
- public booking/press email
- final social-sharing image

## Architecture principle

The visual layer can be gloriously Heartifacts-y.

The engineering layer should remain boring, small, secure, fast and easy to recover.
