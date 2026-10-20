/* Renders a week from window.WEEK. Vanilla JS, works on file:// and GitHub Pages. */
(function () {
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
    if (d.remind && d.remind.length) h += '<div class="remind"><strong>Reminder</strong>' + list(d.remind, false) + "</div>";
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
      var i = +b.dataset.i; render(i); history.replaceState(null, "", "#" + D[i].id);
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
  render(pick());
  var cp = $("copy");
  if (cp) cp.onclick = function () {
    var t = $("repeat").innerText;
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(function () { cp.textContent = "Copied"; });
  };
})();
