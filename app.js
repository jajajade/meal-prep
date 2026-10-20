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
    return '<article class="recipe" id="r-' + id + '"><h3>' + c.name + "</h3>" +
      '<p class="meta">Makes ' + c.serves + " · keeps until " + c.keeps + "</p>" +
      "<h4>Ingredients</h4>" + list(c.ing, check, W.range + id) +
      "<h4>Method</h4><ol>" + c.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol>" + nut(c.nut) + "</article>";
  }
  function meal(slot, id, alt) {
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
    var meals = '<section><h2>Today\u2019s meals</h2>' + meal("Breakfast", d.b) + meal("Lunch", d.l) + meal("Dinner", d.d, d.dAlt) +
      '<div class="meal"><p class="slot">Snacks</p><p>' + W.snacks + "</p></div></section>";
    if (d.cook) {
      h += '<section><h2>Cook today <span class="muted">' + d.cook.time + "</span></h2>" +
        '<ol class="order">' + d.cook.steps.map(function (s) { return "<li>" + s + "</li>"; }).join("") + "</ol></section>";
      h += "<section><h2>Recipes for today</h2>" + d.cook.make.map(function (id) { return recipe(id, true); }).join("") + "</section>";
      h += meals;
    } else h += meals;
    $("today").innerHTML = h;
    $("today-title").textContent = (d.cook ? "Cook day · " : "") + dayName[d.id];
    restore();
  }

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
    $("week-table").innerHTML = "<table><thead><tr><th>Day</th><th>Lunch</th><th>Dinner</th></tr></thead><tbody>" + D.map(function (d) {
      var cell = function (id, alt) { if (!id) return '<span class="muted">—</span>'; var m = M[id];
        return m.name + (alt ? " " + alt : "") + (m.uses.length ? '<br><span class="muted small">' + m.uses.map(function (u) { return C[u].name.split(" (")[0].split(",")[0]; }).join(", ") + "</span>" : ""); };
      return "<tr><th scope=\"row\">" + dayName[d.id] + (d.cook ? '<br><span class="muted small">cook</span>' : "") + "</th><td>" + cell(d.l) + "</td><td>" + cell(d.d, d.dAlt) + "</td></tr>";
    }).join("") + "</tbody></table><p class=\"small muted\">Breakfast: overnight oats, except eggs on toast on Sun. These are suggestions; swap any meals.</p>";
    $("fridge").innerHTML = '<ul class="plain fridge">' + Object.keys(C).map(function (k) { var c = C[k];
      return "<li><span>" + c.name + '</span><span class="muted">' + dayName[c.made] + " → " + c.keeps + "</span></li>"; }).join("") + "</ul>";
    $("all-recipes").innerHTML = Object.keys(C).map(function (k) { return "<details><summary>" + C[k].name + "</summary>" + recipe(k, false) + "</details>"; }).join("") +
      Object.keys(M).filter(function (k) { return k !== "birthday"; }).map(function (k) { return "<details><summary>" + M[k].name + "</summary>" + meal("Meal", k) + "</details>"; }).join("");
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

  staticParts();
  cur = pick();
  render(cur);

  /* ---- Section shortcuts (left) ---- */
  var SECTIONS = [["today-title","Today"],["week","Rest of the week"],["fridge","In the fridge"],["recipes","All recipes"],["shop","Shopping & freezer"]];
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
