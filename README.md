# কাদিরখিল উচ্চ বিদ্যালয় — Alumni Website

Static website for the Kadirkhil High School alumni community: history timeline,
alumni directory, alumni blog, and a bKash donation / full-registration modal.

No build step, no framework — plain HTML, CSS and JavaScript. Upload the folder
as-is and GitHub Pages serves it.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Home page + registration/donation modal |
| `history.html` | School timeline (edit the `<li>` items directly) |
| `alumni.html` | Alumni registration form + directory |
| `blog.html` | Alumni blog composer + post list |
| `styles.css` | All styling (shared by every page) |
| `script.js` | Modals, tabs, TrxID validation, directory + blog logic |
| `supabase.js` | Supabase credentials/config (only file you normally edit) |
| `.serve.ps1` | Optional local preview server (PowerShell) |

## Run it locally

```powershell
python -m http.server 8765
# open http://localhost:8765/
```

Double-clicking `index.html` also works, but a local server is recommended.

## Publish on GitHub Pages

1. Create a new repository (e.g. `kadirkhil-high-school`) and make it **public**
   — GitHub Pages is free on public repos.
2. Upload the files from this folder to the repository root
   (drag-and-drop in the browser, or use Git):

   ```powershell
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<user>/<repo>.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages → Build and deployment → Source: Deploy from a
   branch → branch `main`, folder `/ (root)` → Save**.
4. Wait ~1 minute, then open
   `https://<user>.github.io/<repo>/`.

## Optional integrations

### Supabase (shared alumni directory)

Supabase is **off** by default, so the site works out of the box with
`localStorage` (data stays in each visitor's browser).

To turn it on:

1. Create a project at <https://supabase.com> and run the SQL in the comment
   block at the top of `supabase.js` in the SQL Editor.
2. Paste your project URL and anon key into `supabase.js` and set
   `USE_SUPABASE: true`.
3. Add the Supabase JS client before `script.js` in the two pages that use it
   (`index.html`, `alumni.html`):

   ```html
   <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
   ```

The anon key is safe to publish; never put the service-role key in the repo.

### Google Form (full registration + donation)

Build a Google Form, then set `FORM_REGISTRATION_URL` (and optionally
`FORM_DONATION_URL`) at the top of `script.js`. The form is embedded in the
"সম্পূর্ণ নিবন্ধন ও দান" tab.

### bKash

Update the placeholder number `01XXXXXXXXX` in `index.html` and `alumni.html`
with the real personal bKash number, and set `DONATION_GOAL_BDT` in `script.js`.
The TrxID box only validates the format (8–20 letters/digits) — it does not
verify payments against bKash.
