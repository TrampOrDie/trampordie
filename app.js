/* Offline-first interactive guide (no backend).
   - Loads content from data.json
   - Builds TOC + collapsible cards
   - Provides per-section and master checklist with localStorage persistence
*/

const $ = (sel) => document.querySelector(sel);
const tocEl = $("#toc");
const contentEl = $("#content");
const searchEl = $("#search");
const dialog = $("#checklistDialog");
const masterChecklistEl = $("#masterChecklist");
const progressBar = $("#progressBar");
const progressText = $("#progressText");

const LS_KEY = "outside_guide_checkmarks_v1";

function loadState(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveState(state){
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function slugify(s){
  return s.toLowerCase()
    .replace(/[^a-z0-9\s-]/g,"")
    .trim()
    .replace(/\s+/g,"-")
    .slice(0,70);
}

function escapeHtml(str){
  return str.replace(/[&<>"]/g, (c)=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c]));
}

function highlight(text, q){
  if(!q) return escapeHtml(text);
  const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(safe, "ig");
  return escapeHtml(text).replace(re, (m)=>`<span class="highlight">${m}</span>`);
}

function sectionKey(sectionSlug, itemIndex){
  return `${sectionSlug}::${itemIndex}`;
}

function computeProgress(data, state){
  let total=0, done=0;
  data.sections.forEach(sec=>{
    const slug = sec.slug;
    if(sec.checklist && sec.checklist.length){
      sec.checklist.forEach((_, idx)=>{
        total++;
        if(state[sectionKey(slug, idx)]) done++;
      });
    }
  });
  const pct = total ? Math.round((done/total)*100) : 0;
  return {total, done, pct};
}

function updateProgressUI(data, state){
  const {pct} = computeProgress(data, state);
  progressBar.style.width = pct + "%";
  progressText.textContent = pct + "%";
}

function buildTOC(data, state){
  tocEl.innerHTML = "";
  data.sections.forEach((sec, i)=>{
    const a = document.createElement("a");
    a.href = `#${sec.slug}`;
    a.dataset.slug = sec.slug;

    const dot = document.createElement("span");
    dot.className = "dot";

    // done if all items in checklist done (or no checklist -> never marked done)
    if(sec.checklist && sec.checklist.length){
      const allDone = sec.checklist.every((_, idx)=> state[sectionKey(sec.slug, idx)]);
      if(allDone) dot.classList.add("done");
    }

    const labelWrap = document.createElement("span");
    const label = document.createElement("div");
    label.className = "label";
    label.textContent = sec.title;

    const sub = document.createElement("div");
    sub.className = "sub";
    const meta = sec.checklist?.length ? `${sec.checklist.length} checklist item(s)` : `${sec.content.length} paragraph(s)`;
    sub.textContent = meta;

    labelWrap.appendChild(label);
    labelWrap.appendChild(sub);

    a.appendChild(dot);
    a.appendChild(labelWrap);

    tocEl.appendChild(a);
  });

  highlightActiveTOC();
}

function highlightActiveTOC(){
  const slug = (location.hash || "").replace("#","") || null;
  document.querySelectorAll(".toc a").forEach(a=>{
    a.classList.toggle("active", slug && a.dataset.slug === slug);
  });
}

function buildCards(data, state, query=""){
  contentEl.innerHTML = "";
  const q = query.trim();

  const filtered = !q ? data.sections : data.sections.filter(sec=>{
    const inTitle = sec.title.toLowerCase().includes(q.toLowerCase());
    const inText = sec.content.some(p => p.toLowerCase().includes(q.toLowerCase()));
    const inTasks = (sec.checklist||[]).some(t => t.toLowerCase().includes(q.toLowerCase()));
    return inTitle || inText || inTasks;
  });

  if(filtered.length === 0){
    const empty = document.createElement("div");
    empty.className = "card";
    empty.innerHTML = `<div class="card-header"><div><h2 class="card-title">No results</h2><div class="card-meta"><span class="pill">Try a different search.</span></div></div></div>`;
    contentEl.appendChild(empty);
    return;
  }

  filtered.forEach((sec, idx)=>{
    const card = document.createElement("section");
    card.className = "card";
    card.id = sec.slug;

    const hasChecklist = sec.checklist && sec.checklist.length;

    const header = document.createElement("div");
    header.className = "card-header";
    header.setAttribute("role","button");
    header.setAttribute("tabindex","0");

    const left = document.createElement("div");
    const title = document.createElement("h2");
    title.className = "card-title";
    title.innerHTML = highlight(sec.title, q);

    const meta = document.createElement("div");
    meta.className = "card-meta";
    meta.innerHTML = hasChecklist
      ? `<span class="pill">${sec.checklist.length} item(s)</span><span class="pill">Checklist</span>`
      : `<span class="pill">${sec.content.length} paragraph(s)</span>`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement("div");
    right.className = "muted";
    right.textContent = "Click to open";

    header.appendChild(left);
    header.appendChild(right);

    const body = document.createElement("div");
    body.className = "card-body";

    const grid = document.createElement("div");
    grid.className = "grid2";

    const textBox = document.createElement("div");
    textBox.className = "box text";
    textBox.innerHTML = `<h3>Section</h3>` + sec.content.map(p=>`<p>${highlight(p, q)}</p>`).join("");

    const sideBox = document.createElement("div");
    sideBox.className = "box";

    if(hasChecklist){
      sideBox.innerHTML = `<h3>Checklist</h3><div class="checklist"></div><div class="section-actions">
        <button class="smallbtn" type="button" data-action="markSection">Mark section</button>
        <button class="smallbtn" type="button" data-action="clearSection">Clear section</button>
      </div>`;
      const list = sideBox.querySelector(".checklist");

      sec.checklist.forEach((item, i)=>{
        const id = `${sec.slug}__${i}`;
        const row = document.createElement("div");
        row.className = "check";

        const input = document.createElement("input");
        input.type = "checkbox";
        input.id = id;
        input.checked = !!state[sectionKey(sec.slug, i)];
        input.addEventListener("change", ()=>{
          const st = loadState();
          st[sectionKey(sec.slug, i)] = input.checked;
          saveState(st);
          updateProgressUI(data, st);
          buildTOC(data, st);
        });

        const label = document.createElement("label");
        label.setAttribute("for", id);
        label.innerHTML = highlight(item, q);

        row.appendChild(input);
        row.appendChild(label);
        list.appendChild(row);
      });

      sideBox.querySelector('[data-action="markSection"]').addEventListener("click", ()=>{
        const st = loadState();
        sec.checklist.forEach((_, i)=> st[sectionKey(sec.slug, i)] = true);
        saveState(st);
        updateProgressUI(data, st);
        buildTOC(data, st);
        buildCards(data, st, searchEl.value);
      });
      sideBox.querySelector('[data-action="clearSection"]').addEventListener("click", ()=>{
        const st = loadState();
        sec.checklist.forEach((_, i)=> delete st[sectionKey(sec.slug, i)]);
        saveState(st);
        updateProgressUI(data, st);
        buildTOC(data, st);
        buildCards(data, st, searchEl.value);
      });

    } else {
      sideBox.innerHTML = `<h3>Notes</h3>
        <div class="muted" style="line-height:1.5">
          No checklist items were defined for this section.
          Use search above to jump between topics.
        </div>`;
    }

    grid.appendChild(textBox);
    grid.appendChild(sideBox);
    body.appendChild(grid);

    card.appendChild(header);
    card.appendChild(body);

    // open/close behavior
    function toggle(open){
      const willOpen = open ?? !card.classList.contains("open");
      card.classList.toggle("open", willOpen);
      right.textContent = willOpen ? "Click to close" : "Click to open";
    }
    header.addEventListener("click", ()=> toggle());
    header.addEventListener("keydown", (e)=>{
      if(e.key === "Enter" || e.key === " "){
        e.preventDefault(); toggle();
      }
    });

    contentEl.appendChild(card);
  });

  // Auto-open the hash section (if present) and scroll it into view.
  const slug = (location.hash || "").replace("#","").trim();
  if(slug){
    const target = document.getElementById(slug);
    if(target){
      target.classList.add("open");
      target.querySelector(".card-header .muted")?.replaceChildren(document.createTextNode("Click to close"));
      setTimeout(()=> target.scrollIntoView({behavior:"smooth", block:"start"}), 50);
    }
  }
}

function buildMasterChecklist(data){
  masterChecklistEl.innerHTML = "";
  const state = loadState();

  const groups = data.sections.filter(s => s.checklist && s.checklist.length);

  if(!groups.length){
    masterChecklistEl.innerHTML = `<div class="muted">No checklist items found.</div>`;
    return;
  }

  groups.forEach(sec=>{
    const g = document.createElement("div");
    g.className = "group";
    g.innerHTML = `<div class="group-title">${escapeHtml(sec.title)}</div>`;
    sec.checklist.forEach((item, idx)=>{
      const id = `master__${sec.slug}__${idx}`;
      const row = document.createElement("div");
      row.className = "check";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = !!state[sectionKey(sec.slug, idx)];
      input.addEventListener("change", ()=>{
        const st = loadState();
        st[sectionKey(sec.slug, idx)] = input.checked;
        saveState(st);
        updateProgressUI(data, st);
        buildTOC(data, st);
        buildCards(data, st, searchEl.value);
      });

      const label = document.createElement("label");
      label.setAttribute("for", id);
      label.textContent = item;

      row.appendChild(input);
      row.appendChild(label);
      g.appendChild(row);
    });
    masterChecklistEl.appendChild(g);
  });
}

async function main(){
  const res = await fetch("data.json");
  const data = await res.json();

  // add slugs
  data.sections = data.sections.map((s, i)=>({
    ...s,
    slug: slugify(`${i+1}-${s.title}`)
  }));

  const state = loadState();

  buildTOC(data, state);
  buildCards(data, state);

  updateProgressUI(data, state);

  window.addEventListener("hashchange", ()=>{
    highlightActiveTOC();
    // open the chosen section if it exists
    const slug = (location.hash || "").replace("#","");
    const card = document.getElementById(slug);
    if(card){
      card.classList.add("open");
      card.scrollIntoView({behavior:"smooth", block:"start"});
      card.querySelector(".card-header .muted")?.replaceChildren(document.createTextNode("Click to close"));
    }
  });

  searchEl.addEventListener("input", ()=>{
    const st = loadState();
    buildCards(data, st, searchEl.value);
  });

  $("#toggleChecklist").addEventListener("click", ()=>{
    buildMasterChecklist(data);
    dialog.showModal();
  });

  $("#markAll").addEventListener("click", ()=>{
    const st = loadState();
    data.sections.forEach(sec=>{
      if(sec.checklist && sec.checklist.length){
        sec.checklist.forEach((_, idx)=> st[sectionKey(sec.slug, idx)] = true);
      }
    });
    saveState(st);
    updateProgressUI(data, st);
    buildTOC(data, st);
    buildCards(data, st, searchEl.value);
    buildMasterChecklist(data);
  });

  $("#clearAll").addEventListener("click", ()=>{
    saveState({});
    updateProgressUI(data, {});
    buildTOC(data, {});
    buildCards(data, {}, searchEl.value);
    buildMasterChecklist(data);
  });

  $("#print").addEventListener("click", ()=> window.print());
}

main().catch(err=>{
  console.error(err);
  contentEl.innerHTML = `<div class="card"><div class="card-header"><div><h2 class="card-title">Error</h2><div class="card-meta"><span class="pill">Could not load data.json</span></div></div></div><div class="card-body" style="display:block"><div class="muted">Open this folder with a local web server (see README).</div></div></div>`;
});