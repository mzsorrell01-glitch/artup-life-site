# ArtUp Life — marketing site

Static multi-page site for ArtUp Life, with a lightweight inline CMS so the content
can be edited on the live page without a redeploy.

**Live:** https://artup.life (also served at `artup-life-site.vercel.app`)

## Stack

No framework and no build step. Plain HTML/CSS/JS, deployed on Vercel, which serves
the `.html` files statically and turns each file under `api/` into a serverless
function automatically. The only dependency is `@vercel/blob`.

```
index.html, about/, artists/, artwork/,     page routes (one index.html each)
collection/, campus-canvas/, contact/,
events/, how-it-works/
style.css                                   all styling
script.js                                   CMS overlay + editor + page interactions
admin/                                      login page (redirects to / on success)
api/content.js                              public read of the CMS content
api/contact.js                              contact form → email (see below)
api/admin/*.js                              login/logout/me/save/upload
api/_lib/                                   auth (HMAC session cookie) + blob helpers
assets/                                     images shipped with the repo
```

## How the CMS works

Any element tagged `data-cms="some.key"` is editable. `script.js` fetches
`/api/content` on load and overlays the stored values on top of whatever the HTML
ships with, so the markup always holds sensible defaults.

- `data-cms` on text → editable text
- `data-cms` on `<img>` → click-to-upload image
- `data-cms-href` on `<a>` → editable link URL
- `data-cms-rich` → preserves line breaks
- `data-cms-zone="key"` → freeform area where an admin can add text/image blocks

Content lives in a single `content.json` in Vercel Blob storage, shaped as
`{ strings, images, colors, blocks }`. Editing it writes through
`/api/admin/save` — **no redeploy needed**, changes are live immediately.

### Editing

Go to [artup.life/admin](https://artup.life/admin), log in, then use **Edit this
page** on any page. Credentials are the `ADMIN_USERNAME` / `ADMIN_PASSWORD` env
vars in the Vercel project.

Note the login session is a cookie scoped to one domain — logging in on
`artup.life` does not carry over to `artup-life-site.vercel.app`, and vice versa.

## Environment variables

Set in the Vercel project (all marked secret):

| Variable | Purpose |
|---|---|
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | admin login |
| `ADMIN_SESSION_SECRET` | signs the session cookie |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob access for content + uploads |
| `RESEND_API_KEY` | contact form email — **not yet set** |
| `CONTACT_FROM_EMAIL` | verified sender address — **not yet set** |
| `CONTACT_TO_EMAIL` | where contact form mail goes (defaults to `hello@artup.life`) |

Until the Resend variables are set, `/api/contact` returns 503 and the contact form
falls back to opening the visitor's own mail client via `mailto:`.

## Deploying

`main` is the production branch and is connected to Vercel, so **pushing to `main`
deploys to artup.life automatically.**

> **Important:** Vercel blocks deployments whose git commit author isn't a member of
> the Vercel team. Commit as `dev@artup.life`, or the deploy will fail with
> "the commit author doesn't have permission to create deployments for this project"
> — which presents as a deploy that silently never goes live.
>
> ```bash
> git config user.email "dev@artup.life"
> ```

To deploy manually instead: `vercel deploy --prod`.

## Local preview

Any static file server works, since there's no build step:

```bash
python3 -m http.server 4173
```

The `/api/*` routes won't exist locally, so `script.js` falls back to the hardcoded
defaults in the HTML — fine for working on layout and styling, but CMS content and
the admin editor need a deployed environment (or `vercel dev`).
