# U.S. Bank demo PWA

Fake mobile-style login for demos. Password is not validated.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Add to home screen on mobile for standalone PWA behavior.

## Login behavior

- Enter any non-blank **username** and tap **Log in**.
- The Braze Web SDK (loaded from Braze CDN) initializes with:
  - API key: `23c3829a-21a9-44fe-9247-dc8c48efa204`
  - Endpoint: `sdk.iad-03.braze.com`
  - `allowUserSuppliedJavascript: true` (required for Braze HTML/JS content cards)
- The SDK calls `changeUser` with the trimmed username and opens a session.

## Braze content cards

### Inbox (`location` = `inbox`)

Shown at the top of the notifications inbox (bell icon). The card **title** is the notification headline (e.g. “Statement Available”). The **description** uses the card body if set; otherwise it defaults to `Statement through MM/DD/YYYY for account 1856` using today’s date. The date column uses today’s date. Swipe left to dismiss.

### Home carousel (`location` = `home`)

Shown at the start of the promo carousel above Checking & savings; built-in promos follow when you scroll. Map fields as follows:

| Braze field | UI |
|-------------|-----|
| Title | Promo headline (e.g. “$250 bonus — Limited time offer!”) |
| Description | Subtext |
| Extra `link_text` (or `tag` / `category`) | Upper label (e.g. “CASH+ CARD”) |
| Image | Right-side image |
| URL | Entire card is clickable |

Optional extras: `link_text`, `image`, `url` in KVPs if not using standard card fields.

## Build

```bash
npm run build
npm run preview
```
