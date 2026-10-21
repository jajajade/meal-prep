/* Renders a week from window.WEEK. Vanilla JS, works on file:// and GitHub Pages. */
(function () {
  var cur = 0;
  var W = window.WEEK, C = W.components, M = W.meals, D = W.days;
  var $ = function (id) { return document.getElementById(id); };
  var todayIso = (function () { var n = new Date(), f = function (x) { return ("0" + x).slice(-2); }; try { return new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(n); } catch (e) { return n.getFullYear() + "-" + f(n.getMonth() + 1) + "-" + f(n.getDate()); } })();
  var dayName = {}; D.forEach(function (d) { dayName[d.id] = d.label + " " + d.num; });

  function list(items, check, key) {
    return '<ul class="' + (check ? "check" : "plain") + '">' + items.map(function (t, i) {
      if (!check) return "<li>" + t + "</li>";
      var id = key + "-" + i;
      return '<li><label><input type="checkbox" data-k="' + id + '"><span>' + t + "</span></label></li>";
    }).join("") + "</ul>";
  }
  function nut(s) { return s ? '<p class="nut"><span class="nut-l">Est. per serve</span>' + s.split(/\s*·\s*/).map(function (x) { return '<span class="nchip">' + x + "</span>"; }).join("") + "</p>" : ""; }
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
  function frac(q) { return q === 1.5 ? "1½" : q === 0.5 ? "½" : String(q); }
  function amt(u, q) {
    var p = C[u].portion; q = q || 1; if (!p) return "";
    var g = Math.round(p.g * q / 5) * 5;
    return (u === "eggs" ? (q === 1 ? "1 egg" : frac(q) + " eggs") : "~" + g + " g (" + (q === 1 ? p.measure : frac(q) + " × " + p.measure) + ")");
  }
  function short(u) { return C[u].name.split(" (")[0].split(",")[0]; }
  function usesList(m) { return m.uses.map(function (u) { return short(u) + ", " + amt(u, m.qty && m.qty[u]); }); }
  function isPestle(id) { var m = M[id]; return !!m && m.uses.some(function (u) { return /\(Pestle\)/.test(C[u].name); }); }

  var PAN = '<svg class="ic" viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path d="M3 12h13a0 0 0 0 1 0 0v1a5 5 0 0 1-5 5H8a5 5 0 0 1-5-5zM16 13h5M8 8c0-1.2 1-1.2 1-2.4M12 8c0-1.2 1-1.2 1-2.4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var MERGED = '<a class="eff merged" href="#cook-sec" data-tocook>' + '<svg class="ic" viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="M12 5v14M5 12l7 7 7-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" transform="rotate(180 12 12)"/></svg>Made during tonight\u2019s cook</a>';
  function effort(m, slot) {
    if (!m || !m.effort) return "";
    var mins = m.cookMins ? " · " + m.cookMins + " min" : "";
    if (m.effort === "cook") return '<span class="eff cook">' + PAN + (/dinner/i.test(slot || "") ? "Cook tonight" : "Cook fresh") + mins + "</span>";
    return '<span class="eff">Assemble' + mins + "</span>";
  }
  /* Dinner on a cook day: weeknights fold it into the cook ("merged"); weekends keep it separate with a callout ("after").
     Override per day with cook.dinnerInCook: true/false. */
  function dinnerMode(d) {
    var m = d && d.cook && d.d && M[d.d]; if (!m || m.effort !== "cook") return null;
    if (d.cook.dinnerInCook === true) return "merged"; if (d.cook.dinnerInCook === false) return "after";
    var wd = parse(d.date).getDay(); return wd >= 1 && wd <= 5 ? "merged" : "after";
  }
  function freshDay(d) { var x = d.d && M[d.d], o = outState()[d.id + "-d"]; return !!(x && x.effort === "cook" && !(o && o.out)); }
  function meal(slot, id, alt, okey, merged) {
    var o = okey && outState()[okey];
    if (o && o.out) return '<div class="meal out"><h3><s>' + (id ? M[id].name : "Planned meal") + '</s></h3><p class="slot">' + slot + '</p><p class="out-note">Out' + (o.note ? ": " + esc(o.note) : "") + "</p></div>";
    if (!id) return '<div class="meal"><h3>Nothing planned</h3><p class="slot">' + slot + '</p><p class="muted">Use whatever you have; prep comes first today.</p></div>';
    var m = M[id];
    var uses = m.uses.length ? '<p class="uses-h">From the fridge (per person):</p><ul class="uses">' + usesList(m).map(function (t) { return "<li>" + t + "</li>"; }).join("") + "</ul>" : "";
    return '<div class="meal"' + (/^dinner$/i.test(slot) ? ' id="meal-dinner"' : "") + ">" + "<h3>" + m.name + (alt ? ' <span class="muted">' + alt + "</span>" : "") + "</h3>" + '<p class="slot">' + slot + " " + (merged ? MERGED : m.effort ? effort(m, slot) : (m.time ? '<span class="muted">· ' + m.time + "</span>" : "")) + "</p>" + uses +
      (function () { var extra = m.uses.length ? m.items.filter(function (t) { return !/^(1|1½) portions? |^1 jammy egg$/.test(t); }) : m.items;
        return extra.length ? (m.uses.length ? '<p class="uses-h">Plus:</p>' : "") + list(extra.map(function (t) { return t.replace(/^1 jammy egg AND /, ""); }), false) : ""; })() + (m.atWork && /lunch/i.test(slot) ? (function () { var w = lsGet("lunchmode", "work") === "work";
          return '<div class="seg lmode" role="group" aria-label="Where are you eating?"><button type="button" data-lmode="work" aria-pressed="' + w + '">At work</button><button type="button" data-lmode="home" aria-pressed="' + !w + '">At home</button></div>' +
            '<ol class="quick">' + (w ? m.atWork : m.steps).map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>"; })() :
        merged ? '<p class="merged-note">Cooked as part of today\u2019s cook plan, so the steps are in the timeline above. <a href="#cook-sec" data-tocook>Go to the cook</a></p>' : (m.steps.length ? '<ol class="quick">' + m.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" : "")) + nut(m.nut) + "</div>";
  }

  function render(i) {
    var d = D[i], h = "";
    [].forEach.call(document.querySelectorAll(".days button"), function (b, j) { b.setAttribute("aria-pressed", j === i ? "true" : "false"); });
    var BAG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 7h14l-1.4 11.2a2 2 0 0 1-2 1.8H8.4a2 2 0 0 1-2-1.8z M9 7V6a3 3 0 0 1 6 0v1" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
    var IC = function (p) { return '<svg class="ic" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="' + p + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'; };
    var BELL = IC("M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0"), MOON = IC("M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z");
    if (d.remind && d.remind.length) h += tickBox(d.id + ":remind", "remind", BELL + "Reminders", d.remind, "All reminders sorted. Nice!");
    var g = d.grocery;
    if (g) { if (Array.isArray(g)) g = { type: "topup", title: "Groceries", items: g };
      if (g.items.length) h += tickBox(d.id + ":grocery", "grocery", BAG + "Groceries" + (g.title ? '<span class="tb-sub">' + g.title + "</span>" : ""), g.items,
        g.type === "main" ? "Big shop done. Next week\u2019s sorted!" : "Shopping sorted. Nice one!"); }
    if (d.nightBefore && d.nightBefore.length) h += tickBox("nb:" + W.range + d.id, "nightb", MOON + "Tonight, for tomorrow\u2019s cook", d.nightBefore, "Ready for tomorrow\u2019s cook. Nice!");
    var meals = '<section><h2>Today\u2019s meals</h2>' + meal("Breakfast", d.b, null, d.id + "-b") + meal("Lunch", d.l, null, d.id + "-l") + meal("Dinner", d.d, d.dAlt, d.id + "-d", dinnerMode(d) === "merged") +
      '<div class="meal"><p class="slot">Snacks</p><p>' + W.snacks + "</p></div></section>";
    if (d.cook) {
      var done = cookComplete(d), open = !done || lsGet(ckey(d), "0") === "1";
      wasComplete[d.id] = done;
      var wrap = '<div class="cookwrap' + (open ? "" : " collapsed") + '" id="cook-sec">' +
        (done ? '<button type="button" class="cookbar" id="cookbar" aria-expanded="' + open + '" aria-controls="cookbody"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg><span class="cb-t">Cook day done: ' + d.cook.make.length + ' recipes packed</span><span class="cb-a">' + (open ? "Hide" : "Show") + "</span>" + CHEV + "</button>" : "") +
        '<div class="cookbody" id="cookbody"' + (open ? "" : " inert") + '><div class="rin">' + cookSection(d) + "</div></div></div>";
      h += wrap + meals;
    } else h += meals;
    $("today-body").innerHTML = h;
    $("today-title").textContent = (d.cook ? "Cook day · " : "") + dayName[d.id];
    $("cal-btn").setAttribute("aria-label", "Open calendar, " + dayName[d.id] + " selected");
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
    var h = '<section class="cook"><h2 class="sec-h"><svg class="ic" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path d="M4 10h16v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM2 10h2M20 10h2M9 6c0-1 1-1 1-2M14 6c0-1 1-1 1-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Cook today <span class="muted">' + (p ? p.time : d.cook.time) + "</span></h2>";
    if (!p) return h + "</section><section><h2>Recipes for today</h2>" + d.cook.make.map(function (id) { return recipe(id, true); }).join("") + "</section>";
    h += '<div class="tabs" role="tablist" aria-label="Cook view">' +
      '<button type="button" role="tab" id="tab-plan" aria-controls="panel-plan" aria-selected="' + (tab === "plan") + '" data-ctab="plan">Cook plan</button>' +
      '<button type="button" role="tab" id="tab-rec" aria-controls="panel-rec" aria-selected="' + (tab === "rec") + '" data-ctab="rec">Recipes</button></div>';
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
    if (dinnerMode(d) === "after") { var dm = M[d.d];
      h += '<div class="after-cook"><p class="pause">Good place to stop; come back at dinner.</p><a class="still" href="#meal-dinner" data-todinner>Still to do at dinner: <b>' + dm.name + "</b> \u00b7 ~" + dm.cookMins + " min</a></div>"; }
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
    if (!cb.checked) checkCook();
    $("rprog").textContent = progText(n, ids.length); $("rmeter").style.width = (100 * n / ids.length) + "%";
    if (cb.checked) {
      celebrate(cb.nextElementSibling, n === ids.length, card);
      checkCook();
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
    var t = e.target.closest("[data-ctab]"); if (t) { lsSet("cooktab", t.dataset.ctab); render(cur); var b = $(t.dataset.ctab === "plan" ? "tab-plan" : "tab-rec"); if (b) b.focus(); return; }
    var c = e.target.closest("[data-cooks]"); if (c) { lsSet("cooks", c.dataset.cooks); render(cur); var b2 = document.querySelector('[data-cooks="' + c.dataset.cooks + '"]'); if (b2) b2.focus(); return; }
    var tm = e.target.closest("[data-timer]"); if (tm) { toggleTimer(tm.dataset.timer, +tm.dataset.min); return; }
    var r = e.target.closest("[data-ref]"); if (r) { e.preventDefault(); var det = $(r.dataset.ref); if (det) { det.open = true; det.scrollIntoView({ block: "start" }); det.querySelector("summary").focus(); } }
  });

  function scrollToEl(id) { var el = $(id); if (!el) return; el.scrollIntoView({ block: "start", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }); }
  document.addEventListener("click", function (e) {
    var a = e.target.closest("[data-tocook],[data-todinner]"); if (a) { e.preventDefault(); scrollToEl(a.hasAttribute("data-todinner") ? "meal-dinner" : "cook-sec"); return; }
    var w = e.target.closest("[data-tocook-day]"); if (w) { e.preventDefault(); e.stopPropagation(); location.hash = "#today/" + w.dataset.tocookDay; setTimeout(function () { scrollToEl("cook-sec"); }, 60); }
  }, true);
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
  function toast(msg) { var el = $("toast"); if (!el) return; el.textContent = msg; el.hidden = false; el.classList.remove("show"); void el.offsetWidth; el.classList.add("show"); clearTimeout(toast.t); clearTimeout(toast.h); toast.t = setTimeout(function () { el.classList.remove("show"); toast.h = setTimeout(function () { el.hidden = true; }, 300); }, 2500); }

  /* ---- Week overview ---- */
  var SLOTS = [["b", "Breakfast"], ["l", "Lunch"], ["d", "Dinner"]];
  var NOTEKEY = "weeknote:" + W.range, SENTKEY = "sent:" + W.range;
  function weekState() { return JSON.stringify({ out: collectOutFrom(outState()), note: lsGet(NOTEKEY, "") }); }
  function collectOutFrom(st) { var r = {}; Object.keys(st).sort().forEach(function (k) { var o = st[k]; if (o && (o.out || o.note)) r[k] = { out: !!o.out, note: o.note || "" }; }); return r; }
  function baseline() {
    var b = lsGet(SENTKEY, null); if (b !== null) return b;
    var st = {}; D.forEach(function (d) { if (d.out) Object.keys(d.out).forEach(function (k) { st[d.id + "-" + k] = { out: true, note: d.out[k] }; }); });
    return JSON.stringify({ out: collectOutFrom(st), note: "" });
  }
  function syncSend() { var b = $("ov-send"); if (b) b.hidden = weekState() === baseline(); }
  function mark(m) {
    if (!m || m.effort !== "cook") return "";
    return '<span class="mk cook" title="Pan or oven on the night">' + PAN + "Cook" + (m.cookMins ? " · " + m.cookMins + " min" : "") + "</span>";
  }
  function tileHead(d, s, o) {
    var id = d[s[0]], m = id && M[id];
    var name = m ? m.name : "Nothing planned";
    var meta = o.out ? '<span class="out-pill">Out</span>' + (o.note ? '<span class="out-why">' + esc(o.note) + "</span>" : "") :
      (s[0] === "d" && dinnerMode(d) === "merged" ? '<span class="mk merged">Made during the cook</span>' : mark(m)) + (isPestle(id) ? '<span class="tag p">Pestle</span>' : "");
    return '<span class="cx-t"><span class="wt-slot">' + s[1] + "</span>" + name + "</span>" + (meta ? '<span class="cx-m">' + meta + "</span>" : "");
  }
  function noteUI() {
    var v = lsGet(NOTEKEY, "").trim(), saved = $("wk-saved"), add = $("wk-add"), field = $("wk-field");
    if (!saved) return;
    var editing = !field.hidden;
    saved.hidden = editing || !v; add.hidden = editing || !!v;
    $("wk-text").textContent = v;
  }
  function noteEdit(on) {
    $("wk-field").hidden = !on; noteUI();
    if (on) { var t = $("week-note"); t.focus(); t.setSelectionRange(t.value.length, t.value.length); } else { var f = lsGet(NOTEKEY, "").trim() ? $("wk-edit") : $("wk-add"); if (f) f.focus(); }
  }
  document.addEventListener("click", function (e) {
    if (e.target.closest("#wk-add, #wk-edit")) noteEdit(true);
    else if (e.target.closest("#wk-done")) noteEdit(false);
    else if (e.target.closest("#ov-past")) { var ov = document.querySelector(".ov"), on = !ov.classList.contains("show-past"); ov.classList.toggle("show-past", on); e.target.closest("#ov-past").setAttribute("aria-expanded", on); e.target.closest("#ov-past").querySelector(".pl").textContent = on ? "Hide earlier days" : e.target.closest("#ov-past").dataset.label; }
  });
  function overview() {
    var st = outState(), note = lsGet(NOTEKEY, "");
    var past = D.filter(function (d) { return d.date < todayIso; });
    var h = '<div class="wk-note">' +
      (W.weekNote ? '<p class="wk-their"><span class="grp">Your note</span>' + esc(W.weekNote) + "</p>" : "") +
      (W.weekNoteApplied ? '<p class="wk-chef"><span class="grp">Chef</span>' + esc(W.weekNoteApplied) + "</p>" : "") +
      '<div class="wk-saved" id="wk-saved" hidden><p class="wk-text" id="wk-text"></p><button type="button" class="linkbtn" id="wk-edit" aria-label="Edit note for this week">Edit</button></div>' +
      '<button type="button" class="wk-add" id="wk-add" aria-controls="wk-field"><span aria-hidden="true">+</span> Add a note for the week</button>' +
      '<div class="wk-field" id="wk-field" hidden><label class="sr" for="week-note">Note for this week</label><textarea id="week-note" rows="2" maxlength="400" placeholder="Anything on the cards this week? Cravings, late nights, plans\u2026">' + esc(note) + '</textarea><button type="button" class="btn sm" id="wk-done">Done</button></div></div>' +
      (past.length ? '<button type="button" class="ov-past" id="ov-past" aria-expanded="false" data-label="Show earlier days (' + past.map(function (d) { return d.label + " " + d.num; }).join(", ") + ')">' + CHEV + '<span class="pl">Show earlier days (' + past.map(function (d) { return d.label + " " + d.num; }).join(", ") + ")</span></button>" : "") +
      '<div class="ov"><div class="ov-labels" aria-hidden="true"><span></span>' + SLOTS.map(function (s) { return "<span>" + s[1] + "</span>"; }).join("") + "</div>";
    D.forEach(function (d) {
      var title = parse(d.date).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" });
      h += '<section class="ov-day' + (d.date < todayIso ? " past" : "") + (d.date === todayIso ? " now" : "") + '" aria-label="' + title + '"><h2 class="ov-h"><a href="#today/' + d.id + '" class="ov-daylink">' + title + "</a>" + (d.cook ? ' <span class="day-tag">Cook day</span>' : "") + (d.date === todayIso ? ' <span class="day-tag now">Today</span>' : "") + "</h2>";
      SLOTS.forEach(function (s) {
        var id = d[s[0]], ok = d.id + "-" + s[0], o = st[ok] || {}, m = id && M[id];
        var refs = m ? m.uses.map(function (u) { return '<a href="#recipes/c-' + u + '">' + short(u) + "</a> " + amt(u, m.qty && m.qty[u]); }) : [];
        if (m && m.items.length && id !== "birthday") refs.unshift('<a href="#recipes/m-' + id + '">How to assemble</a>');
        var body = (m && m.effort ? '<p class="wt-eff">' + (s[0] === "d" && dinnerMode(d) === "merged" ? '<a href="#today/' + d.id + '" data-tocook-day="' + d.id + '">Made during ' + d.label + "\u2019s cook \u2192</a>" : effort(m, s[1])) + "</p>" : "") +
          (refs.length ? '<ul class="ov-refs">' + refs.map(function (r) { return "<li>" + r + "</li>"; }).join("") + "</ul>" : "") +
          '<div class="wt-plans"><label class="ov-out"><input type="checkbox" data-out="' + ok + '"' + (o.out ? " checked" : "") + "> Eating out / other plans</label>" +
          '<label class="ov-note"><span class="sr">Note for ' + title + " " + s[1] + '</span><input type="text" data-note="' + ok + '" value="' + esc(o.note) + '" placeholder="Where or why? (optional)" maxlength="60"></label></div>';
        h += cx("wk-" + ok, tileHead(d, s, o), body, false).replace('class="cx', 'class="cx wt' + (o.out ? " out" : ""));
      });
      h += "</section>";
    });
    h += '</div><div id="ov-fallback" hidden><p class="small">Couldn\u2019t copy automatically. Select and copy this:</p><textarea id="ov-text" rows="3" readonly></textarea></div>' +
      '<button type="button" class="ov-send" id="ov-send" hidden>Send changes to Chef</button>';
    $("overview-body").innerHTML = h; syncSend(); noteUI();
  }
  document.addEventListener("input", function (e) { if (e.target.id === "week-note") { lsSet(NOTEKEY, e.target.value); syncSend(); } });
  function collectOut() {
    var st = {}; [].forEach.call(document.querySelectorAll("[data-out]"), function (c) {
      var note = document.querySelector('[data-note="' + c.dataset.out + '"]').value.trim();
      if (c.checked || note) st[c.dataset.out] = { out: c.checked, note: note }; });
    return st;
  }
  // Autosave: ticks and notes persist immediately; Submit just builds and copies the summary.
  document.addEventListener("change", function (e) {
    if (!e.target.closest("[data-out],[data-note]")) return;
    try {
      var st = collectOut(); lsSet(OUTKEY, JSON.stringify(st));
      var ok = (e.target.dataset.out || e.target.dataset.note), tile = $("cx-wk-" + ok);
      if (tile) { var di = ok.split("-")[0], sl = ok.split("-")[1], d = D.filter(function (x) { return x.id === di; })[0], s = SLOTS.filter(function (x) { return x[0] === sl; })[0];
        var o = st[ok] || {}; tile.classList.toggle("out", !!o.out); var hd = tile.querySelector(".cx-h"); hd.innerHTML = tileHead(d, s, o) + CHEV; }
      render(cur); syncSend();
    } catch (err) { if (window.console) console.error(err); }
  });
  document.addEventListener("click", function (e) {
    if (!e.target.closest("#ov-send")) return;
    var st = collectOut(); lsSet(OUTKEY, JSON.stringify(st));
    var names = { b: "breakfast", l: "lunch", d: "dinner" }, parts = [];
    D.forEach(function (d) { SLOTS.forEach(function (s) { var o = st[d.id + "-" + s[0]]; if (o && o.out) parts.push(d.label + " " + names[s[0]] + " out" + (o.note ? " (" + o.note + ")" : "")); }); });
    var start = new Date(+D[0].date.slice(0, 4), +D[0].date.slice(5, 7) - 1, +D[0].date.slice(8, 10));
    var wn = lsGet(NOTEKEY, "").trim();
    var text = "Week of " + start.getDate() + " " + start.toLocaleDateString("en-AU", { month: "short" }) + " changes: " + (parts.length ? parts.join("; ") : "none") + (wn ? "\nNote: " + wn : "");
    lsSet(SENTKEY, weekState()); syncSend(); render(cur);
    var fb = function () { $("ov-fallback").hidden = false; var ta = $("ov-text"); ta.value = text; ta.focus(); ta.select(); toast("Saved. Copy the text below"); };
    if (navigator.clipboard && window.isSecureContext !== false) navigator.clipboard.writeText(text).then(function () { toast("Copied, paste this to Chef"); }, fb); else fb();
  });

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-lmode]"); if (!b) return;
    lsSet("lunchmode", b.dataset.lmode); render(cur);
  });
  /* ---- Tickable reminder boxes ---- */
  function tbk(id, i) { return id.indexOf("nb:") === 0 ? id + "-" + i : "tb:" + W.range + ":" + id + ":" + i; }
  function tbAll(id, n) { for (var i = 0; i < n; i++) if (lsGet(tbk(id, i), "0") !== "1") return false; return true; }
  var TICK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function tickBox(id, cls, title, items, msg) {
    var done = tbAll(id, items.length), open = !done || lsGet("tbopen:" + W.range + ":" + id, "0") === "1";
    return '<div class="tb ' + cls + (done ? " is-done" : "") + (open ? "" : " collapsed") + '" data-tb="' + id + '" data-n="' + items.length + '">' +
      '<button type="button" class="tb-bar" aria-expanded="' + open + '"' + (done ? "" : " hidden") + ">" + TICK + '<span class="tb-msg">' + msg + '</span><span class="tb-a">' + (open ? "Hide" : "Show") + "</span>" + CHEV + "</button>" +
      '<div class="tb-body"' + (open ? "" : " inert") + '><div class="rin"><strong class="tb-title">' + title + '</strong><ul class="check tb-list">' +
      items.map(function (t, i) { var on = lsGet(tbk(id, i), "0") === "1";
        return '<li><label><input type="checkbox" data-tbk="' + i + '"' + (on ? " checked" : "") + "><span>" + t + "</span></label></li>"; }).join("") +
      "</ul></div></div></div>";
  }
  function tbOpen(box, open) {
    box.classList.toggle("collapsed", !open);
    var b = box.querySelector(".tb-bar"); b.setAttribute("aria-expanded", open); b.querySelector(".tb-a").textContent = open ? "Hide" : "Show";
    var body = box.querySelector(".tb-body"); if (open) body.removeAttribute("inert"); else body.setAttribute("inert", "");
    lsSet("tbopen:" + W.range + ":" + box.dataset.tb, open ? "1" : "0");
  }
  document.addEventListener("change", function (e) {
    var cb = e.target.closest("[data-tbk]"); if (!cb) return;
    var box = cb.closest("[data-tb]"), id = box.dataset.tb, n = +box.dataset.n;
    lsSet(tbk(id, cb.dataset.tbk), cb.checked ? "1" : "0");
    var li = cb.closest("li");
    [].forEach.call(document.querySelectorAll('[data-tb="' + id + '"] [data-tbk="' + cb.dataset.tbk + '"]'), function (x) { x.checked = cb.checked; });
    if (cb.checked) { li.classList.remove("tb-pop"); void li.offsetWidth; li.classList.add("tb-pop"); setTimeout(function () { li.classList.remove("tb-pop"); }, 500); }
    var all = tbAll(id, n);
    if (cb.checked) toast(all ? "All done here. Nice!" : "Ticked off");
    [].forEach.call(document.querySelectorAll('[data-tb="' + id + '"]'), function (bx) {
      var bar = bx.querySelector(".tb-bar");
      if (all && !bx.classList.contains("is-done")) {
        bx.classList.add("is-done"); bar.hidden = false;
        if (bx === box) celebrate(cb.nextElementSibling || cb, false, bx);
        setTimeout(function () { tbOpen(bx, false); }, 700);
      } else if (!all && bx.classList.contains("is-done")) { bx.classList.remove("is-done"); bar.hidden = true; tbOpen(bx, true); }
    });
  });
  document.addEventListener("click", function (e) { var b = e.target.closest(".tb-bar"); if (b) { var bx = b.closest("[data-tb]"); tbOpen(bx, bx.classList.contains("collapsed")); } });

  /* ---- Cook-day completion ---- */
  var wasComplete = {};
  function ckey(d) { return "cookopen:" + W.range + ":" + d.id; }
  function cookComplete(d) {
    if (!d.cook) return false;
    var recipes = d.cook.make.every(function (id) { return lsGet("rdone:" + W.range + ":" + d.id + ":" + id, "0") === "1"; });
    if (recipes) return true;
    var p = d.cook.plan; if (!p) return false;
    var k = "tick:" + W.range + ":" + d.id + ":", keys = [];
    Object.keys(p.getout).forEach(function (g) { p.getout[g].forEach(function (_, i) { keys.push(k + "get" + g + "-" + i); }); });
    p.weigh.forEach(function (_, i) { keys.push(k + "weigh-" + i); });
    p.bulk.forEach(function (_, i) { keys.push(k + "bulk-" + i); });
    p.cook.forEach(function (_, i) { keys.push(k + "cook-" + i); });
    p.pack.forEach(function (_, i) { keys.push(k + "pack-" + i); });
    return keys.every(function (x) { return lsGet(x, "0") === "1"; });
  }
  var collapseT = null;
  function checkCook() {
    var d = D[cur]; if (!d.cook) return;
    var now = cookComplete(d);
    if (now && !wasComplete[d.id]) {
      wasComplete[d.id] = true; lsSet(ckey(d), "0");
      clearTimeout(collapseT);
      collapseT = setTimeout(function () {
        var w = $("cook-sec"); if (!w) return;
        w.classList.add("collapsed");
        setTimeout(function () { render(cur); }, 400);
      }, 1500);
    } else if (!now && wasComplete[d.id]) { clearTimeout(collapseT); wasComplete[d.id] = false; render(cur); }
  }
  function setCookOpen(open) {
    var d = D[cur]; lsSet(ckey(d), open ? "1" : "0");
    var w = $("cook-sec"), b = $("cookbar"), body = $("cookbody");
    w.classList.toggle("collapsed", !open); b.setAttribute("aria-expanded", open); b.querySelector(".cb-a").textContent = open ? "Hide" : "Show";
    if (open) body.removeAttribute("inert"); else body.setAttribute("inert", "");
  }
  document.addEventListener("click", function (e) { if (e.target.closest("#cookbar")) setCookOpen($("cook-sec").classList.contains("collapsed")); });

  function restore() {
    [].forEach.call(document.querySelectorAll("input[data-k]"), function (el) {
      try { el.checked = localStorage.getItem(el.dataset.k) === "1"; } catch (e) {}
      el.onchange = function () { try { localStorage.setItem(el.dataset.k, el.checked ? "1" : "0"); } catch (e) {} checkCook(); };
    });
  }

  function staticParts() {
    var nw = new Date(), td = nw.getFullYear() + "-" + ("0" + (nw.getMonth() + 1)).slice(-2) + "-" + ("0" + nw.getDate()).slice(-2);
    $("days").innerHTML = D.map(function (d, i) {
      return '<a href="#today/' + d.id + '" data-i="' + i + '" aria-current="false"' + (d.date < todayIso ? ' class="past"' : "") + '><span>' + d.label + "</span><b>" + d.num + "</b>" + (d.date < todayIso ? '<i class="mk" aria-hidden="true"></i>' : d.cook ? '<i class="mk">cook</i>' : freshDay(d) ? '<i class="mk"><em class="fdot" title="Cooking fresh tonight"></em></i>' : '<i class="mk" aria-hidden="true"></i>') + "</a>";
    }).join("");
  }

  /* ---- One expand/collapse pattern (Recipes library, repeat lists) ---- */
  function cx(key, head, body, defOpen) {
    var st = lsGet("cx:" + W.range + ":" + key, null), open = st === null ? !!defOpen : st === "1";
    return '<div class="cx' + (open ? " open" : "") + '" id="cx-' + key + '" data-cx="' + key + '">' +
      '<h3 class="cx-wrap"><button type="button" class="cx-h" aria-expanded="' + open + '" aria-controls="cxb-' + key + '">' + head + CHEV + "</button></h3>" +
      '<div class="cx-b" id="cxb-' + key + '"' + (open ? "" : " inert") + '><div class="rin">' + body + "</div></div></div>";
  }
  function cxOpen(el, open) {
    el.classList.toggle("open", open);
    el.querySelector(".cx-h").setAttribute("aria-expanded", open);
    var b = el.querySelector(".cx-b"); if (open) b.removeAttribute("inert"); else b.setAttribute("inert", "");
    lsSet("cx:" + W.range + ":" + el.dataset.cx, open ? "1" : "0");
  }
  document.addEventListener("click", function (e) {
    var h = e.target.closest(".cx-h"); if (h) { var el = h.closest(".cx"); cxOpen(el, !el.classList.contains("open")); }
    var ex = e.target.closest("#rx-all"); if (ex) { var any = !!document.querySelector("#all-recipes .cx:not(.open)");
      [].forEach.call(document.querySelectorAll("#all-recipes .cx"), function (c) { cxOpen(c, any); }); ex.textContent = any ? "Collapse all" : "Expand all"; }
  });
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-repeat]"); if (!b) return; var el = $("cx-" + b.dataset.repeat); if (!el) return;
    if (!el.classList.contains("open")) cxOpen(el, true); el.scrollIntoView({ block: "start", behavior: "smooth" }); el.querySelector(".cx-h").focus({ preventScroll: true });
  });
  function repeatList(id) {
    return Object.keys(W.repeat).map(function (g) { return '<h3 class="grp">' + g + "</h3>" + list(W.repeat[g], false); }).join("") +
      '<p><button type="button" class="btn" data-copy="' + id + '">Copy list</button></p>';
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-copy]"); if (!b) return;
    var t = b.closest(".rin").innerText.replace(/Copy list\s*$/, "").trim();
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { b.textContent = "Copied"; toast("Shopping list copied"); }, function () { toast("Couldn\u2019t copy. Select the list instead"); });
  });

  function refParts() {
    // Kitchen
    var DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], byId = {}; D.forEach(function (d) { byId[d.id] = d; });
    var useBy = function (c) { var md = byId[c.made], w = DOW.indexOf(String(c.keeps).slice(0, 3)); if (!md || w < 0) return null;
      var t = parse(md.date); do { t.setDate(t.getDate() + 1); } while (t.getDay() !== w); return iso(t); };
    var daysTo = function (k) { if (!k) return 99; return Math.round((parse(k) - parse(todayIso)) / 864e5); };
    var keys = Object.keys(C).sort(function (x, y) { return (useBy(C[x]) || "9") < (useBy(C[y]) || "9") ? -1 : (useBy(C[x]) || "9") > (useBy(C[y]) || "9") ? 1 : 0; });
    $("fridge").innerHTML = '<ul class="plain fridge">' + keys.map(function (k) { var c = C[k], p = c.portion, n = daysTo(useBy(c)), first = n >= 0 && n <= 1;
      return '<li' + (first ? ' class="use-first"' : "") + '><div class="fr-top"><span class="fr-name"><a href="#recipes/c-' + k + '">' + c.name.replace(" (Pestle)", "") + "</a>" + (/\(Pestle\)/.test(c.name) ? ' <span class="tag p">Pestle</span>' : "") + "</span>" +
        '<span class="fr-keep">' + (first ? '<span class="use-tag' + (n ? " soon" : "") + '">' + (n ? "Use soon" : "Use first") + "</span>" : "") + "Keeps to " + c.keeps + "</span></div>" +
        (p ? '<p class="fr-por">' + p.n + " portions · " + (k === "eggs" ? "1 egg each" : amt(k, 1) + " each") + '</p><p class="fr-batch">Batch ' + p.batch + " · made " + dayName[c.made] + "</p>" : "") + "</li>"; }).join("") + "</ul>" +
      '<p class="small muted">Easiest: divide each batch into its portions (or containers) when packing, so each meal is just grab-and-go. Portions are the same for Jade and Matteo; Matteo adds a little extra rice, pasta or toast.</p>';
    $("freezer").innerHTML = list(W.freezer, false);
    var main = D.filter(function (d) { return d.grocery && !Array.isArray(d.grocery) && d.grocery.type === "main"; })[0];
    $("topup").innerHTML = tickBox("shop:topup", "grocery plainbox", "Top-ups this week", W.topup, "Top-ups bought. Nice one!") +
      (main ? tickBox(main.id + ":grocery", "grocery plainbox", main.grocery.title + ' <span class="tag">' + main.label + "</span>", main.grocery.items, "Big shop done. Next week\u2019s sorted!") : "") +
      cx("repeat-k", '<span class="cx-t">Repeat this week: full shopping list</span>', repeatList("k"), false);
    // Recipes
    $("all-recipes").innerHTML = '<p class="small muted rx-intro">Components are cooked on cook days; meals are 5-minute assemblies.</p>' +
      '<div class="list-head"><h2 class="grp">Components</h2><button type="button" class="linkbtn" id="rx-all">Expand all</button></div>' + Object.keys(C).map(function (k) { var c = C[k];
        return cx("c-" + k, '<span class="cx-t">' + c.name.replace(" (Pestle)", "") + (/\(Pestle\)/.test(c.name) ? ' <span class="tag p">Pestle</span>' : "") + '</span><span class="cx-m">Cook ' + dayName[c.made] + " · " + c.serves + "</span>", recipe(k, false).replace(/<h3>.*?<\/h3>/, ""), false); }).join("") +
      '<h2 class="grp">Meals</h2>' + Object.keys(M).filter(function (k) { return k !== "birthday"; }).map(function (k) { var m = M[k];
        return cx("m-" + k, '<span class="cx-t">' + m.name + (isPestle(k) ? ' <span class="tag p">Pestle</span>' : "") + '</span><span class="cx-m">' + (m.time || "") + "</span>", meal("Meal", k).replace(/<h3>.*?<\/h3>/, ""), false); }).join("");
    // History
    var base2 = location.pathname.indexOf("/weeks/") > -1 ? "../" : "";
    var WS = window.WEEKS || [];
    $("weeklist").innerHTML = WS.map(function (w) {
      var curWeek = w.start === D[0].date;
      var chips = curWeek ? Object.keys(C).map(function (k) { return short(k).replace(/ \(.*$/, ""); }) : String(w.summary || "").replace(/\.$/, "").split(/[,;+]\s*/);
      chips = chips.map(function (x) { return x.replace(/^\w+:\s*/, "").trim(); }).filter(Boolean);
      var more = chips.length > 4 ? chips.length - 4 : 0;
      return '<li class="wk-card"><div class="wk-card-h"><a href="' + base2 + w.file + '#today"><b>' + w.range.replace(/\s\d{4}$/, "") + "</b></a>" + (curWeek ? '<span class="day-tag now">This week</span>' : "") + "</div>" +
        '<p class="wk-chips">' + chips.slice(0, 4).map(function (c) { return '<span class="chip">' + esc(c) + "</span>"; }).join("") + (more ? '<span class="chip more">+' + more + " more</span>" : "") + "</p>" +
        '<div class="wk-acts">' + (curWeek ? '<button type="button" class="btn" data-repeat="repeat-h">Repeat this week</button>' : '<a class="btn" href="' + base2 + w.file + '#history">Repeat this week</a>') +
        '<a class="linkbtn" href="' + base2 + w.file + '#week">See the plan</a></div></li>'; }).join("") +
      (WS.length < 2 ? '<li class="wk-empty">Past weeks will collect here as you go, ready to repeat.</li>' : "");
    $("repeat").innerHTML = cx("repeat-h", '<span class="cx-t">Full shopping list to repeat this week</span>', repeatList("h"), false);
    $("targets").textContent = W.targets + " All nutrition figures are estimates.";
  }

  function todayIdx() {
    var today;
    try { today = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    catch (e) { var n = new Date(); today = n.getFullYear() + "-" + ("0" + (n.getMonth() + 1)).slice(-2) + "-" + ("0" + n.getDate()).slice(-2); }
    for (var j = 0; j < D.length; j++) if (D[j].date === today) return j;
    return 0;
  }
  function parse(s) { var p = s.split("-"); return new Date(+p[0], p[1] - 1, +p[2]); }

  /* ---- Tabs + hash routing (#today, #today/wed, #week, #kitchen, #recipes/c-chicken, #history) ---- */
  var TABS = ["today", "week", "kitchen", "recipes", "history"];
  var dayChosen = false, rendered = false;
  function route() {
    var h = location.hash.slice(1), parts = h.split("/"), tab = parts[0], sub = parts[1];
    for (var i = 0; i < D.length; i++) if (D[i].id === tab) { tab = "today"; sub = D[i].id; }   // legacy #wed
    if (TABS.indexOf(tab) < 0) {
      tab = lsGet("lasttab", "today"); if (TABS.indexOf(tab) < 0) tab = "today";
    }
    lsSet("lasttab", tab);
    TABS.forEach(function (t) {
      var v = $("v-" + t); if (v) v.hidden = t !== tab;
      [].forEach.call(document.querySelectorAll('a[data-nav="' + t + '"]'), function (b) { if (t === tab) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current"); });
    });
    document.body.setAttribute("data-view", tab);
    if (tab === "today") {
      var di = -1; if (sub) for (var k = 0; k < D.length; k++) if (D[k].id === sub) di = k;
      if (di < 0) di = dayChosen ? cur : todayIdx();
      if (di !== cur || !rendered) { cur = di; render(cur); rendered = true; }
      dayChosen = true;
      [].forEach.call(document.querySelectorAll("#days a"), function (a, j) { a.setAttribute("aria-current", j === cur ? "true" : "false"); });
    }
    if (tab === "recipes" && sub) {
      var el = $("cx-" + sub);
      if (el) { if (!el.classList.contains("open")) cxOpen(el, true); setTimeout(function () { el.scrollIntoView({ block: "start" }); el.querySelector(".cx-h").focus({ preventScroll: true }); }, 0); return; }
    }
    toTop();
  }
  /* Always land at the top of a view: no native fragment jump, no smooth scroll, header height kept in sync for scroll-padding. */
  function toTop() { try { window.scrollTo({ top: 0, left: 0, behavior: "instant" }); } catch (e) { window.scrollTo(0, 0); } }
  function syncTopH() { var t = document.querySelector(".top"); if (t) document.documentElement.style.setProperty("--top-h", t.offsetHeight + "px"); }
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  window.addEventListener("resize", syncTopH);
  window.addEventListener("load", function () { syncTopH(); if (!/^#recipes\/./.test(location.hash)) toTop(); });
  window.addEventListener("hashchange", function () { setTimeout(syncTopH, 0); });
  window.addEventListener("hashchange", route);
  render = (function (r) { return function (i) { r(i); if (typeof dayNav === "function" && typeof IDS !== "undefined") dayNav(); [].forEach.call(document.querySelectorAll("#days a"), function (a, j) { a.setAttribute("aria-current", j === i ? "true" : "false"); }); }; })(render);

  staticParts(); refParts(); overview();
  cur = todayIdx();
  var IDS = ["sun","mon","tue","wed","thu","fri","sat"];
  var base = location.pathname.indexOf("/weeks/") > -1 ? "../" : "";
  function iso(dt) { return dt.getFullYear() + "-" + ("0" + (dt.getMonth() + 1)).slice(-2) + "-" + ("0" + dt.getDate()).slice(-2); }
  route();

  /* ---- Previous / next day (arrows, keys, swipe) ---- */
  function weekAt(dateIso) { var r = null; (window.WEEKS || []).forEach(function (w) { if (w.start && w.end && w.start <= dateIso && dateIso <= w.end && w.start !== D[0].date) r = w; }); return r; }
  function adj(delta) {
    var i = cur + delta; if (i >= 0 && i < D.length) return "#today/" + D[i].id;
    var t = parse(D[cur].date); t.setDate(t.getDate() + delta); var w = weekAt(iso(t));
    return w ? base + w.file + "#today/" + IDS[t.getDay()] : null;
  }
  function dayNav() {
    [["day-prev", -1], ["day-next", 1]].forEach(function (p) {
      var b = $(p[0]); if (!b) return; var href = adj(p[1]);
      b.disabled = !href; b.dataset.href = href || "";
      var t = parse(D[cur].date); t.setDate(t.getDate() + p[1]);
      b.setAttribute("aria-label", (p[1] < 0 ? "Previous day" : "Next day") + (href ? ", " + t.toLocaleDateString("en-AU", { weekday: "long", day: "numeric" }) : ", none in this plan"));
    });
  }
  function goDay(delta) { var h = adj(delta); if (!h) return; if (h.charAt(0) === "#") location.hash = h; else location.href = h; }
  document.addEventListener("click", function (e) { var b = e.target.closest("#day-prev, #day-next"); if (b && !b.disabled) goDay(b.id === "day-prev" ? -1 : 1); });
  document.addEventListener("keydown", function (e) {
    if (document.body.getAttribute("data-view") !== "today" || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (!$("cal-pop").hidden) return;
    if (e.key === "ArrowLeft") { e.preventDefault(); goDay(-1); } else if (e.key === "ArrowRight") { e.preventDefault(); goDay(1); }
  });
  var sx = null, sy = 0;
  $("today-body").addEventListener("touchstart", function (e) { if (e.touches.length !== 1) { sx = null; return; } sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
  $("today-body").addEventListener("touchend", function (e) {
    if (sx === null) return; var t = e.changedTouches[0], dx = t.clientX - sx, dy = t.clientY - sy; sx = null;
    if (Math.abs(dx) > 70 && Math.abs(dy) < 40 && !e.target.closest(".scroll, input, textarea")) goDay(dx < 0 ? 1 : -1);
  }, { passive: true });

  /* ---- Calendar popover ---- */
  var opener = null;
  function closeCal(restore) { var el = $("cal-pop"); if (el.hidden) return; el.hidden = true; $("cal-btn").setAttribute("aria-expanded", "false"); if (restore && opener) opener.focus(); opener = null; }
  function openCal() {
    var b = $("cal-btn"), el = $("cal-pop"); el.hidden = false; b.setAttribute("aria-expanded", "true"); opener = b; drawCal();
    var f = el.querySelector(".sel") || el.querySelector("button[data-day]") || el.querySelector("a, button:not([disabled])"); if (f) f.focus();
  }
  $("cal-btn").onclick = function (e) { e.stopPropagation(); $("cal-pop").hidden ? openCal() : closeCal(true); };
  document.addEventListener("click", function (e) { if (!e.target.closest(".pop") && !e.target.closest("#cal-btn")) closeCal(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeCal(true); });

  var here = {}; D.forEach(function (d, i) { here[d.date] = i; });
  var other = {}; (window.WEEKS || []).forEach(function (w) {
    if (!w.start || !w.end) return; var a = parse(w.start), z = parse(w.end);
    for (var t = new Date(a); t <= z; t.setDate(t.getDate() + 1)) { var k = iso(t); if (!(k in here)) other[k] = base + w.file + "#today/" + IDS[t.getDay()]; }
  });
  var view = parse(D[cur].date); view.setDate(1);
  function drawCal() {
    var y = view.getFullYear(), m = view.getMonth(), first = new Date(y, m, 1), days = new Date(y, m + 1, 0).getDate();
    var lead = (first.getDay() + 6) % 7, sel = D[cur].date;
    var h = '<div class="cal-head"><button type="button" class="icon-btn sm" data-nav="-1" aria-label="Previous month">\u2039</button><b>' +
      first.toLocaleDateString("en-AU", { month: "long", year: "numeric" }) + '</b><button type="button" class="icon-btn sm" data-nav="1" aria-label="Next month">\u203a</button></div>' +
      '<div class="cal-grid">' + ["M","T","W","T","F","S","S"].map(function (x) { return '<span class="dow" aria-hidden="true">' + x + "</span>"; }).join("");
    for (var i = 0; i < lead; i++) h += "<span></span>";
    for (var dd = 1; dd <= days; dd++) {
      var k = iso(new Date(y, m, dd)), label = new Date(y, m, dd).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long" });
      var cls = "day" + (k === todayIso ? " today" : "");
      if (k in here) { var di = here[k]; cls += " plan" + (D[di].cook ? " cook" : (typeof freshDay === "function" && freshDay(D[di]) ? " fresh" : "")) + (k === sel ? " sel" : "");
        h += '<button type="button" class="' + cls + '" data-day="' + di + '" aria-label="' + label + (D[di].cook ? ", cook day" : "") + '"' + (k === todayIso ? ' aria-current="date"' : "") + (k === sel ? ' aria-pressed="true"' : "") + ">" + dd + "</button>"; }
      else if (k in other) h += '<a class="' + cls + ' past" href="' + other[k] + '" aria-label="' + label + ', past week">' + dd + "</a>";
      else h += '<button type="button" class="' + cls + '" disabled aria-label="' + label + ', no plan"' + (k === todayIso ? ' aria-current="date"' : "") + ">" + dd + "</button>";
    }
    h += '</div><p class="cal-key"><span class="ki"><span class="k today">12</span>Today</span><span class="ki"><span class="k cook"></span>Cook day</span><span class="ki"><span class="k fresh"></span>Fresh dinner</span></p>';
    $("cal").innerHTML = h;
  }
  $("cal").addEventListener("click", function (e) {
    e.stopPropagation();
    var n = e.target.closest("[data-nav]"); if (n) { view.setMonth(view.getMonth() + +n.dataset.nav); drawCal(); $("cal").querySelector('[data-nav="' + n.dataset.nav + '"]').focus(); return; }
    var b = e.target.closest("[data-day]"); if (!b) return;
    closeCal(true); location.hash = "#today/" + D[+b.dataset.day].id;
  });
})();
