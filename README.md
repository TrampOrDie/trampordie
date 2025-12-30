# Outside Construction Transition Guide — Interactive Web App

This is a static (no-server) web app. It works locally and on Netlify.

## Deploy to Netlify (Drag & Drop)
1. Log into Netlify
2. Go to **Sites** → **Add new site** → **Deploy manually**
3. Drag **the entire folder contents** of this project (the same folder that contains `index.html`) into the upload area
4. Netlify will publish it and give you a live URL

## Deploy to Netlify (Git-based)
1. Put these files in a GitHub repo
2. In Netlify: **Add new site** → **Import an existing project**
3. Build settings:
   - Build command: *(leave blank)*
   - Publish directory: `.`

(You can also keep the included `netlify.toml` — Netlify will auto-detect it.)

## Run locally
- Quick preview: just double-click `index.html`
- Best (avoids any browser file restrictions):
  ```bash
  python -m http.server 8000
  ```
  Then open: http://localhost:8000
