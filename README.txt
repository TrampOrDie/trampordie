Outside Construction Transition Guide

What this is
- A single-page web app that turns your document into:
  - Table of contents
  - Search
  - Expand/collapse sections
  - Per-section checklist + master checklist
  - Progress tracking (saved in your browser)

How to run (recommended)
Browsers block fetch() from local files. Run a tiny local server:

Option A — Python (installed on most computers)
1) Open a terminal in this folder
2) Run:
   python -m http.server 8000
3) Open in your browser:
   http://localhost:8000

Option B — VS Code
- Install “Live Server” extension
- Right click index.html -> “Open with Live Server”

Printing / PDF
- Click “Print” and choose “Save as PDF” in your browser.

Files
- index.html  (app shell)
- styles.css  (styling)
- app.js      (logic)
- data.json   (your content + checklists)
