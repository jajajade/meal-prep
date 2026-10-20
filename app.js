/* Renders a week from window.WEEK. Vanilla JS, works on file:// and GitHub Pages. */
(function () {
  var cur = 0;
  var W = window.WEEK, C = W.components, M = W.meals, D = W.days;
  var $ = function (id) { return document.getElementById(id); };
  var dayName = {}; D.forEach(function (d) { dayName[d.id] = d.label + " " + d.num; });

  function list(items, check, key) {
    return '<ul class="' + (check ? "check" : "plain") + '">' + items.map(function (t, i) {
      if (!check) return "<li>" + t + "</li>";
      var id = key + "-" + i;
      return '<li><label><input type="checkbox" data-k="' + id + '"><span>' + t + "</span></label></li>";
    }).join("") + "</ul>";
  }
  function nut(s) { return s ? '<p class="nut">Est. per serve: ' + s + "</p>" : ""; }
  function recipe(id, check) {
    var c = C[id];
    return '<article class="recipe"><h3>' + c.name + "</h3>" +
      '<p class="meta">Makes ' + c.serves + " · keeps until " + c.keeps + "</p>" +
      "<h4>Ingredients</h4>" + list(c.ing, check, W.range + id) +
      "<h4>Method</h4><ol>" + c.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" + nut(c.nut) + "</article>";
  }
  /* ---- Eating out / other plans ---- */
  var OUTKEY = "out:" + W.range;
  function outState() {
    var st = {}; D.forEach(function (d) { if (d.out) Object.keys(d.out).forEach(function (k) { st[d.id + "-" + k] = { out: true, note: d.out[k] }; }); });
    try { var saved = JSON.parse(localStorage.getItem(OUTKEY) || "null"); if (saved) st = saved; } catch (e) {}
    return st;
  }
  function esc(t) { return String(t || "").replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function isPestle(id) { var m = M[id]; return !!m && m.uses.some(function (u) { return /\(Pestle\)/.test(C[u].name); }); }

  function meal(slot, id, alt, okey) {
    var o = okey && outState()[okey];
    if (o && o.out) return '<div class="meal out"><p class="slot">' + slot + '</p><h3><s>' + (id ? M[id].name : "Planned meal") + '</s></h3><p class="out-note">Out' + (o.note ? ": " + esc(o.note) : "") + "</p></div>";
    if (!id) return '<div class="meal"><p class="slot">' + slot + '</p><p class="muted">Use whatever you have; prep comes first today.</p></div>';
    var m = M[id];
    var uses = m.uses.length ? '<p class="uses">Uses: ' + m.uses.map(function (u) { return C[u].name.replace(" (Pestle)", "").replace(" (Jade's)", ""); }).join(", ") + "</p>" : "";
    return '<div class="meal"><p class="slot">' + slot + (m.time ? ' <span class="muted">· ' + m.time + "</span>" : "") + "</p>" +
      "<h3>" + m.name + (alt ? ' <span class="muted">' + alt + "</span>" : "") + "</h3>" + uses +
      list(m.items, false) + (m.steps.length ? '<ol class="quick">' + m.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" : "") + nut(m.nut) + "</div>";
  }

  function render(i) {
    var d = D[i], h = "";
    [].forEach.call(document.querySelectorAll(".days button"), function (b, j) { b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
    var rem = d.remind && d.remind.length, gro = d.grocery && d.grocery.length;
    if (rem) h += '<div class="remind"><strong>Reminder</strong>' + list(d.remind, false) + "</div>";
    if (gro) h += ('<div class="grocery"><strong><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 7h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z M9 7V6a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>Groceries</strong>' + list(d.grocery, false) + "</div>");
    if (d.nightBefore && d.nightBefore.length) h += '<div class="nightb"><strong>Tonight, for tomorrow\u2019s cook</strong>' + list(d.nightBefore, true, "nb:" + W.range + d.id) + "</div>";
    var meals = '<section><h2>Today\u2019s meals</h2>' + meal("Breakfast", d.b, null, d.id + "-b") + meal("Lunch", d.l, null, d.id + "-l") + meal("Dinner", d.d, d.dAlt, d.id + "-d") +
      '<div class="meal"><p class="slot">Snacks</p><p>' + W.snacks + "</p></div></section>";
    if (d.cook) { h += cookSection(d); h += meals; } else h += meals;
    $("today").innerHTML = h;
    $("today-title").textContent = (d.cook ? "Cook day · " : "") + dayName[d.id];
    restore(); tickTimers();
  }

  /* ---- Cook plan ---- */
  function lsGet(k, def) { try { var v = localStorage.getItem(k); return v === null ? def : v; } catch (e) { return def; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function timerBtn(key, min) {
    return '<button type="button" class="timer" data-timer="' + key + '" data-min="' + min + '">Start ' + fmtMin(min) + "</button>";
  }
  function fmtMin(m) { return m % 1 ? Math.floor(m) + "½ min" : m + " min"; }
  function cookSection(d) {
    var p = d.cook.plan, tab = lsGet("cooktab", "plan"), n = lsGet("cooks", "1"), k = "tick:" + W.range + ":" + d.id + ":";
    var h = '<section class="cook"><h2>Cook today <span class="muted">' + (p ? p.time : d.cook.time) + "</span></h2>";
    if (!p) return h + "</section><section><h2>Recipes for today</h2>" + d.cook.make.map(function (id) { return recipe(id, true); }).join("") + "</section>";
    h += '<div class="tabs" role="tablist" aria-label="Cook view">' +
      '<button type="button" role="tab" id="tab-plan" aria-controls="panel-plan" aria-selected="' + (tab === "plan") + '" data-tab="plan">Cook plan</button>' +
      '<button type="button" role="tab" id="tab-rec" aria-controls="panel-rec" aria-selected="' + (tab === "rec") + '" data-tab="rec">Recipes</button></div>';
    h += '<div role="tabpanel" id="panel-plan" aria-labelledby="tab-plan"' + (tab === "plan" ? "" : " hidden") + ">";
    h += '<div class="seg" role="group" aria-label="Number of cooks"><button type="button" data-cooks="1" aria-pressed="' + (n === "1") + '">1 cook</button><button type="button" data-cooks="2" aria-pressed="' + (n === "2") + '">2 cooks</button></div>';
    h += '<h3 class="step-h">1. Get out</h3>' + Object.keys(p.getout).map(function (g) { return '<h4>' + g + "</h4>" + list(p.getout[g], true, k + "get" + g); }).join("");
    h += '<h3 class="step-h">2. Weigh &amp; measure</h3>' + list(p.weigh.map(function (w) { return w[0] + ' <span class="rtag">' + w[1] + "</span>"; }), true, k + "weigh");
    h += '<h3 class="step-h">3. Bulk prep</h3>' + list(p.bulk, true, k + "bulk");
    h += '<h3 class="step-h">4. Cook</h3>';
    var step = function (c, i) { return '<li><label><input type="checkbox" data-k="' + k + "cook-" + i + '"><span>' + (n === "1" ? "" : "") + c.t + "</span></label>" + (c.min ? timerBtn(d.id + "-" + i, c.min) : "") + "</li>"; };
    if (n === "1") h += '<ol class="check cooklist">' + p.cook.map(step).join("") + "</ol>";
    else h += '<div class="lanes">' + ["A", "B"].map(function (who) {
      return '<div class="lane"><h4>Person ' + who + "</h4><ol class=\"check cooklist\">" + p.cook.map(function (c, i) { return c.a === who ? step(c, i) : ""; }).join("") + "</ol></div>"; }).join("") + "</div>";
    h += '<h3 class="step-h">5. Pack</h3>' + list(p.pack, true, k + "pack");
    h += "</div>";
    h += '<div role="tabpanel" id="panel-rec" aria-labelledby="tab-rec"' + (tab === "rec" ? "" : " hidden") + ">" + recipeCards(d) + "</div>";
    return h + "</section>";
  }
  /* ---- Collapsible recipe cards with Done ticks ---- */
  var CHEV = '<svg class="chev" viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function rk(kind, d, id) { return kind + ":" + W.range + ":" + d.id + ":" + id; }
  function recipeCards(d) {
    var ids = d.cook.make, done = ids.filter(function (id) { return lsGet(rk("rdone", d, id), "0") === "1"; });
    var firstOpen = ids.filter(function (id) { return done.indexOf(id) < 0; })[0];
    var h = '<div class="rbar"><p class="rprog" id="rprog" aria-live="polite">' + progText(done.length, ids.length) + '</p><button type="button" class="linkbtn" id="rexpand">' + "Expand all" + "</button></div>";
    h += '<div class="rmeter" aria-hidden="true"><span id="rmeter" style="width:' + (100 * done.length / ids.length) + '%"></span></div>';
    h += ids.map(function (id) {
      var c = C[id], isDone = done.indexOf(id) > -1, st = lsGet(rk("rexp", d, id), null);
      var open = isDone ? false : (st === null ? id === firstOpen : st === "1");
      var name = c.name.replace(" (Pestle)", ""), pestle = /\(Pestle\)/.test(c.name);
      return '<article class="rcard' + (open ? " open" : "") + (isDone ? " done" : "") + '" data-rid="' + id + '">' +
        '<div class="rhead"><label class="dtick"><input type="checkbox" data-done="' + id + '"' + (isDone ? " checked" : "") + ' aria-label="' + name + ' done"><span class="box" aria-hidden="true"><svg viewBox="0 0 24 24" width="20" height="20"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg></span></label>' +
        '<button type="button" class="rtoggle" aria-expanded="' + open + '" aria-controls="rb-' + id + '"><span class="rname">' + name + (pestle ? ' <span class="tag p">Pestle</span>' : "") + '</span><span class="rmeta">' + c.serves + " · keeps to " + c.keeps + "</span>" + CHEV + "</button></div>" +
        '<div class="rbody" id="rb-' + id + '"' + (open ? "" : " inert") + '><div class="rin">' + recipe(id, true).replace(/<h3>.*?<\/h3>/, "").replace(/<p class="meta">.*?<\/p>/, "") + "</div></div></article>";
    }).join("");
    return h;
  }
  function progText(n, t) { return n === t ? "All " + t + " recipes done. Nice work!" : n + " of " + t + " recipes done"; }
  function setOpen(card, open) {
    card.classList.toggle("open", open);
    card.querySelector(".rtoggle").setAttribute("aria-expanded", open);
    var b = card.querySelector(".rbody"); if (open) b.removeAttribute("inert"); else b.setAttribute("inert", "");
    lsSet(rk("rexp", D[cur], card.dataset.rid), open ? "1" : "0");
    syncExpandBtn();
  }
  function syncExpandBtn() { var b = $("rexpand"); if (!b) return; var any = document.querySelector(".rcard:not(.open)"); b.textContent = any ? "Expand all" : "Collapse all"; }
  document.addEventListener("click", function (e) {
    var tg = e.target.closest(".rtoggle"); if (tg) { var card = tg.closest(".rcard"); setOpen(card, !card.classList.contains("open")); return; }
    if (e.target.closest("#rexpand")) { var open = !!document.querySelector(".rcard:not(.open)"); [].forEach.call(document.querySelectorAll(".rcard"), function (c) { setOpen(c, open); }); }
  });
  document.addEventListener("change", function (e) {
    var cb = e.target.closest("[data-done]"); if (!cb) return;
    var d = D[cur], card = cb.closest(".rcard");
    lsSet(rk("rdone", d, cb.dataset.done), cb.checked ? "1" : "0");
    card.classList.toggle("done", cb.checked);
    var ids = d.cook.make, n = ids.filter(function (id) { return lsGet(rk("rdone", d, id), "0") === "1"; }).length;
    $("rprog").textContent = progText(n, ids.length); $("rmeter").style.width = (100 * n / ids.length) + "%";
    if (cb.checked) {
      celebrate(cb.nextElementSibling, n === ids.length, card);
      setTimeout(function () { setOpen(card, false); var next = document.querySelector(".rcard:not(.done)"); if (next && !document.querySelector(".rcard.open")) setOpen(next, true); }, 450);
    }
  });

  /* ---- Confetti (canvas, ~1 s; gentle pulse when reduced motion) ---- */
  var COLS = ["#a8402b", "#3e6140", "#e1ebdd", "#f7e4de", "#c8a24a", "#1f2a22"];
  function celebrate(el, big, card) {
    var rm = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (rm) { card.classList.remove("pulse"); void card.offsetWidth; card.classList.add("pulse"); if (big) toast("All recipes done. Enjoy dinner!"); return; }
    var r = el.getBoundingClientRect(), cv = document.createElement("canvas"), dpr = window.devicePixelRatio || 1;
    cv.className = "confetti"; cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; document.body.appendChild(cv);
    var ctx = cv.getContext("2d"); ctx.scale(dpr, dpr);
    var ps = [], n = big ? 160 : 36, dur = big ? 2200 : 1000;
    for (var i = 0; i < n; i++) {
      var ox = big ? innerWidth / 2 : r.left + r.width / 2, oy = big ? innerHeight * 0.35 : r.top + r.height / 2;
      var ang = big ? Math.random() * Math.PI * 2 : -Math.PI / 2 + (Math.random() - .5) * 2.2, sp = (big ? 6 : 4) + Math.random() * (big ? 8 : 5);
      ps.push({ x: ox, y: oy, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, w: 5 + Math.random() * 5, h: 3 + Math.random() * 4, rot: Math.random() * 6, vr: (Math.random() - .5) * .4, c: COLS[i % COLS.length] });
    }
    var t0 = performance.now();
    (function frame(t) {
      var k = (t - t0) / dur; ctx.clearRect(0, 0, innerWidth, innerHeight);
      ps.forEach(function (p) { p.vy += .25; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - k * k); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore(); });
      if (k < 1) requestAnimationFrame(frame); else cv.remove();
    })(t0);
    if (big) toast("All recipes done. Enjoy dinner!");
  }

  document.addEventListener("click", function (e) {
    var t = e.target.closest("[data-tab]"); if (t) { lsSet("cooktab", t.dataset.tab); render(cur); var b = $(t.dataset.tab === "plan" ? "tab-plan" : "tab-rec"); if (b) b.focus(); return; }
    var c = e.target.closest("[data-cooks]"); if (c) { lsSet("cooks", c.dataset.cooks); render(cur); var b2 = document.querySelector('[data-cooks="' + c.dataset.cooks + '"]'); if (b2) b2.focus(); return; }
    var tm = e.target.closest("[data-timer]"); if (tm) { toggleTimer(tm.dataset.timer, +tm.dataset.min); return; }
    var r = e.target.closest("[data-ref]"); if (r) { e.preventDefault(); var det = $(r.dataset.ref); if (det) { det.open = true; det.scrollIntoView({ block: "start" }); det.querySelector("summary").focus(); } }
  });

  /* ---- Timers (persist in localStorage; several can run at once) ---- */
  function timers() { try { return JSON.parse(lsGet("timers", "{}")); } catch (e) { return {}; } }
  function saveTimers(t) { lsSet("timers", JSON.stringify(t)); }
  function toggleTimer(key, min) {
    var t = timers();
    if (t[key]) delete t[key]; else t[key] = { end: Date.now() + min * 60000, min: min, label: key };
    saveTimers(t); tickTimers(); unlockAudio();
  }
  var actx = null;
  function unlockAudio() { try { if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === "suspended") actx.resume(); } catch (e) {} }
  function beep() {
    try { unlockAudio(); [0, .35, .7].forEach(function (s) { var o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; o.connect(g); g.connect(actx.destination);
      g.gain.setValueAtTime(.2, actx.currentTime + s); g.gain.exponentialRampToValueAtTime(.001, actx.currentTime + s + .25); o.start(actx.currentTime + s); o.stop(actx.currentTime + s + .26); }); } catch (e) {}
    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 200]);
  }
  function tickTimers() {
    var t = timers(), now = Date.now(), changed = false, running = 0;
    Object.keys(t).forEach(function (k) {
      var left = t[k].end - now;
      if (left <= 0 && !t[k].done) { t[k].done = true; changed = true; beep(); toast("Timer done"); }
      if (!t[k].done) running++;
    });
    if (changed) saveTimers(t);
    [].forEach.call(document.querySelectorAll("[data-timer]"), function (b) {
      var x = t[b.dataset.timer];
      if (!x) { b.className = "timer"; b.textContent = "Start " + fmtMin(+b.dataset.min); b.setAttribute("aria-label", "Start " + fmtMin(+b.dataset.min) + " timer"); return; }
      if (x.done) { b.className = "timer done"; b.textContent = "Done · reset"; b.setAttribute("aria-label", "Timer done, tap to reset"); return; }
      var s = Math.ceil((x.end - now) / 1000), mm = Math.floor(s / 60), ss = ("0" + (s % 60)).slice(-2);
      b.className = "timer run"; b.textContent = mm + ":" + ss + " left"; b.setAttribute("aria-label", mm + " minutes " + ss + " seconds left, tap to cancel");
    });
    var pill = $("timer-pill");
    if (pill) { pill.hidden = !running; pill.textContent = running + (running === 1 ? " timer running" : " timers running"); }
  }
  setInterval(tickTimers, 1000);
  function toast(msg) { var el = $("toast"); if (!el) return; el.textContent = msg; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(function () { el.hidden = true; }, 3000); }

  /* ---- Week overview ---- */
  var SLOTS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"]];
  function overview() {
    var st = outState(), first = D[0], mon = new Date(+first.date.slice(0, 4), +first.date.slice(5, 7) - 1, +first.date.slice(8, 10));
    while (mon.getDay() !== 1) mon.setDate(mon.getDate() - 1);
    var byDate = {}; D.forEach(function (d) { byDate[d.date] = d; });
    var h = '<p class="small muted">Tick a meal if you\u2019re eating out or have other plans, add a note, then press Submit.</p><div class="ov">';
    for (var i = 0; i < 7; i++) {
      var dt = new Date(mon); dt.setDate(mon.getDate() + i);
      var key = dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2), d = byDate[key];
      var title = dt.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
      h += '<div class="ov-day"><h3>' + title + (d && d.cook ? ' <span class="tag">cook day</span>' : "") + "</h3>";
      if (!d) { h += '<p class="muted small">Not in this week\u2019s plan.</p></div>'; continue; }
      SLOTS.forEach(function (s) {
        var id = d[s[0]], ok = d.id + "-" + s[0], o = st[ok] || {}, m = id && M[id];
        var refs = m ? m.uses.map(function (u) { return '<a href="#ref-c-' + u + '" data-ref="ref-c-' + u + '">' + C[u].name.split(" (")[0].split(",")[0] + "</a>"; }) : [];
        if (m && m.items.length && id !== "birthday") refs.unshift('<a href="#ref-m-' + id + '" data-ref="ref-m-' + id + '">How to assemble</a>');
        h += '<div class="ov-slot' + (o.out ? " out" : "") + '"><p class="slot">' + s[1] + "</p>" +
          '<p class="ov-meal">' + (o.out ? "<s>" : "") + (m ? m.name : '<span class="muted">Nothing planned</span>') + (o.out ? "</s>" : "") + (isPestle(id) ? ' <span class="tag p">Pestle</span>' : "") + "</p>" +
          (refs.length ? '<p class="ov-refs">' + refs.join(" · ") + "</p>" : "") +
          '<label class="ov-out"><input type="checkbox" data-out="' + ok + '"' + (o.out ? " checked" : "") + "> Eating out / other plans</label>" +
          '<label class="ov-note"><span class="sr">Note for ' + title + " " + s[1] + '</span><input type="text" data-note="' + ok + '" value="' + esc(o.note) + '" placeholder="Note (optional)" maxlength="60"></label></div>';
      });
      h += "</div>";
    }
    h += '</div><p><button type="button" class="btn" id="ov-submit">Submit changes</button></p><div id="ov-fallback" hidden><p class="small">Couldn\u2019t copy automatically. Select and copy this:</p><textarea id="ov-text" rows="3" readonly></textarea></div>';
    $("overview-body").innerHTML = h;
  }
  function collectOut() {
    var st = {}; [].forEach.call(document.querySelectorAll("[data-out]"), function (c) {
      var note = document.querySelector('[data-note="' + c.dataset.out + '"]').value.trim();
      if (c.checked || note) st[c.dataset.out] = { out: c.checked, note: note }; });
    return st;
  }
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#ov-submit")) return;
    var st = collectOut(); lsSet(OUTKEY, JSON.stringify(st));
    var names = { b: "breakfast", l: "lunch", d: "dinner" }, parts = [];
    D.forEach(function (d) { SLOTS.forEach(function (s) { var o = st[d.id + "-" + s[0]]; if (o && o.out) parts.push(d.label + " " + names[s[0]] + " out" + (o.note ? " (" + o.note + ")" : "")); }); });
    var start = new Date(+D[0].date.slice(0, 4), +D[0].date.slice(5, 7) - 1, +D[0].date.slice(8, 10));
    var text = "Week of " + start.getDate() + " " + start.toLocaleDateString("en-AU", { month: "short" }) + " changes: " + (parts.length ? parts.join("; ") : "none");
    overview(); render(cur); weekTable();
    var fb = function () { $("ov-fallback").hidden = false; var ta = $("ov-text"); ta.value = text; ta.focus(); ta.select(); toast("Saved. Copy the text below"); };
    if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).then(function () { toast("Copied, paste this to Chef"); }, fb); else fb();
  });

  function restore() {
    [].forEach.call(document.querySelectorAll("input[data-k]"), function (el) {
      try { el.checked = localStorage.getItem(el.dataset.k) === "1"; } catch (e) {}
      el.onchange = function () { try { localStorage.setItem(el.dataset.k, el.checked ? "1" : "0"); } catch (e) {} };
    });
  }

  function staticParts() {
    $("days").innerHTML = D.map(function (d, i) {
      return '<button type="button" data-i="' + i + '" aria-pressed="false"><span>' + d.label + "</span><b>" + d.num + "</b>" + (d.cook ? '<i>cook</i>' : "") + "</button>";
    }).join("");
    $("days").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      var i = +b.dataset.i; cur = i; render(i); history.replaceState(null, "", "#" + D[i].id);
    };
    weekTable();
  }
  function weekTable() {
    var st = outState();
    $("week-table").innerHTML = "<table><thead><tr><th>Day</th><th>Lunch</th><th>Dinner</th></tr></thead><tbody>" + D.map(function (d) {
      var cell = function (id, alt, ok) { var o = st[ok]; if (o && o.out) return '<span class="out-cell"><s>' + (id ? M[id].name : "Meal") + '</s> Out' + (o.note ? ": " + esc(o.note) : "") + "</span>";
        if (!id) return '<span class="muted">—</span>'; var m = M[id];
        return m.name + (alt ? " " + alt : "") + (m.uses.length ? '<br><span class="muted small">' + m.uses.map(function (u) { return C[u].name.split(" (")[0].split(",")[0]; }).join(", ") + "</span>" : ""); };
      return "<tr><th scope=\"row\">" + dayName[d.id] + (d.cook ? '<br><span class="muted small">cook</span>' : "") + "</th><td>" + cell(d.l, null, d.id + "-l") + "</td><td>" + cell(d.d, d.dAlt, d.id + "-d") + "</td></tr>";
    }).join("") + "</tbody></table><p class=\"small muted\">Breakfast: overnight oats, except eggs on toast on Sun. These are suggestions; swap any meals.</p>";
  }
  function refParts() {
    $("fridge").innerHTML = '<ul class="plain fridge">' + Object.keys(C).map(function (k) { var c = C[k];
      return "<li><span>" + c.name + '</span><span class="muted">' + dayName[c.made] + " → " + c.keeps + "</span></li>"; }).join("") + "</ul>";
    $("all-recipes").innerHTML = Object.keys(C).map(function (k) { return '<details id="ref-c-' + k + '"><summary>' + C[k].name + "</summary>" + recipe(k, false) + "</details>"; }).join("") +
      Object.keys(M).filter(function (k) { return k !== "birthday"; }).map(function (k) { return '<details id="ref-m-' + k + '"><summary>' + M[k].name + "</summary>" + meal("Meal", k) + "</details>"; }).join("");
    $("topup").innerHTML = list(W.topup, false);
    $("freezer").innerHTML = list(W.freezer, false);
    $("repeat").innerHTML = Object.keys(W.repeat).map(function (g) { return "<h3 class=\"grp\">" + g + "</h3>" + list(W.repeat[g], false); }).join("");
    $("targets").textContent = W.targets + " All nutrition figures are estimates.";
  }

  function pick() {
    var h = location.hash.slice(1);
    for (var i = 0; i < D.length; i++) if (D[i].id === h) return i;
    var today;
    try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { var n = new Date(); today = n.getFullYear() + "-" + ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2); }
    for (var j = 0; j < D.length; j++) if (D[j].date === today) return j;
    return 0;
  }

  staticParts(); refParts(); overview();
  cur = pick();
  render(cur);

  /* ---- Section shortcuts (left) ---- */
  var SECTIONS = [["today-title","Today"],["overview","Week overview"],["week","Rest of the week"],["fridge","In the fridge"],["recipes","All recipes"],["shop","Shopping & freezer"]];
  if ($("archive")) SECTIONS.push(["archive","Past weeks"]);
  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  function go(id) { var el = $(id); if (!el) return; el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    el.setAttribute("tabindex", "-1"); el.focus({ preventScroll: true }); }
  var links = SECTIONS.map(function (s) { return '<li><a href="#' + s[0] + '" data-go="' + s[0] + '">' + s[1] + "</a></li>"; }).join("");
  $("jump-list").innerHTML = links; if ($("side-list")) $("side-list").innerHTML = links;
  document.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-go]"); if (!a) return;
    e.preventDefault(); closeAll(); go(a.dataset.go);
  });

  /* ---- Popovers ---- */
  var pops = [["jump-btn","jump-pop"],["cal-btn","cal-pop"]], opener = null;
  function closeAll(restore) {
    pops.forEach(function (p) { var b = $(p[0]), el = $(p[1]); if (!el || el.hidden) return; el.hidden = true; b.setAttribute("aria-expanded", "false"); });
    if (restore && opener) opener.focus(); opener = null;
  }
  function open(p) {
    closeAll(); var b = $(p[0]), el = $(p[1]); el.hidden = false; b.setAttribute("aria-expanded", "true"); opener = b;
    if (p[1] === "cal-pop") drawCal();
    var f = el.querySelector(".sel") || el.querySelector("button[data-day]") || el.querySelector("a, button:not([disabled])"); if (f) f.focus();
  }
  pops.forEach(function (p) { var b = $(p[0]); if (b) b.onclick = function (e) { e.stopPropagation(); $(p[1]).hidden ? open(p) : closeAll(true); }; });
  document.addEventListener("click", function (e) { if (!e.target.closest(".pop") && !e.target.closest(".icon-btn")) closeAll(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(true); });

  /* ---- Calendar ---- */
  var IDS = ["sun","mon","tue","wed","thu","fri","sat"];
  var base = location.pathname.indexOf("/weeks/") > -1 ? "../" : "";
  function iso(dt) { return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2); }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }
  var todayIso = (function () { try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch (e) { return iso(new Date()); } })();
  var here = {}; D.forEach(function (d, i) { here[d.date] = i; });
  var other = {}; (window.WEEKS || []).forEach(function (w) {
    if (!w.start || !w.end) return; var a = parse(w.start), z = parse(w.end);
    for (var t = new Date(a); t <= z; t.setDate(t.getDate() + 1)) { var k = iso(t); if (!(k in here)) other[k] = base + w.file + "#" + IDS[t.getDay()]; }
  });
  var view = parse(D[cur].date); view.setDate(1);
  function drawCal() {
    var y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7, sel = D[cur].date;
    var h = '<div class="cal-head"><button type="button" class="icon-btn sm" data-nav="-1" aria-label="Previous month">\u2039</button><b>' +
      first.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) + '</b><button type="button" class="icon-btn sm" data-nav="1" aria-label="Next month">\u203a</button></div>' +
      '<div class="cal-grid" role="grid">' + ["M","T","W","T","F","S","S"].map(function (x) { return '<span class="dow" aria-hidden="true">' + x + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) h += "<span></span>";
    for (var dd = 1; dd <= days; dd++) {
      var k = iso(new Date(y, m, dd)), label = new Date(y, m, dd).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
      var cls = "day" + (k === todayIso ? " today" : ""), attrs = "";
      if (k in here) { var di = here[k]; cls += " plan" + (D[di].cook ? " cook" : "") + (k === sel ? " sel" : "");
        h += '<button type="button" class="' + cls + '" data-day="' + di + '" aria-label="' + label + (D[di].cook ? ", cook day" : "") + '"' + (k === todayIso ? ' aria-current="date"' : "") + (k === sel ? ' aria-pressed="true"' : "") + ">" + dd + "</button>"; }
      else if (k in other) h += '<a class="' + cls + ' past" href="' + other[k] + '" aria-label="' + label + ', past week">' + dd + "</a>";
      else h += '<button type="button" class="' + cls + '" disabled aria-label="' + label + ', no plan"' + (k === todayIso ? ' aria-current="date"' : "") + ">" + dd + "</button>";
    }
    h += '</div><p class="cal-key"><span class="k plan"></span>Planned <span class="k cook"></span>Cook day <span class="k today"></span>Today</p>';
    $("cal").innerHTML = h;
  }
  $("cal").addEventListener("click", function (e) {
    e.stopPropagation();
    var n = e.target.closest("[data-nav]"); if (n) { view.setMonth(view.getMonth() + +n.dataset.nav); drawCal(); $("cal").querySelector('[data-nav="' + n.dataset.nav + '"]').focus(); return; }
    var b = e.target.closest("[data-day]"); if (!b) return;
    cur = +b.dataset.day; render(cur); history.replaceState(null, "", "#" + D[cur].id); closeAll(true); window.scrollTo(0, 0);
  });
  var cp = $("copy");
  if (cp) cp.onclick = function () {
    var t = $("repeat").innerText;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = "Copied"; });
  };
})();
