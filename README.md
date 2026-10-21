# Beanos and Lentos's Magical Cookbook

Weekly meal-prep site for Beanos & Matteo.

Open `index.html` directly. It works from file://, with no server needed.

## Structure
- `index.html`: the current (newest) week shown in full, plus the "Previous weeks" archive. **Generated, so don't edit by hand.**
- `weeks/YYYY-MM-DD.html` + `weeks/YYYY-MM-DD.data.js`: one page per week. The HTML is a shell; all the content (components, meals, days, reminders, shopping) lives in the `.data.js` file as `window.WEEK`.
- `app.js`: shared renderer. It builds the day selector (auto-selects today in Sydney time, falls back to the first day; `#wed` etc. in the URL picks a day), cook-day schedule and recipes, today's meals, and the reference sections.
- `weeks.js`: list of weeks (newest first). The archive is rendered from this; it's a JS variable, so there's no fetch().
- `styles.css`: shared styling for every page.
- `build.py`: rebuilds `index.html` from the first week listed in `weeks.js`.

## Adding a week
1. Copy the latest week's two files, e.g. `weeks/2026-10-27.html` and `weeks/2026-10-27.data.js`. In the HTML, update the title, the date range and the `.data.js` script name. Then edit the data file: `days` (with dates), `components`, `meals`, `remind`, `topup`, `freezer` and `repeat`.
2. Add a new entry to the **top** of `weeks.js`: `file`, `start`, `range`, `title`, `summary` (one line describing the components).
3. Run `python3 build.py` to regenerate `index.html`.
4. Optional: `cd .. && python3 -c "import shutil;shutil.make_archive('meal-prep-site','zip','.','meal-prep-site')"` to share.

## Day reminders (in each `days[]` entry of the week's `.data.js`)
- `remind: ["..."]`: freezer/thaw and use-by reminders, shown in the pink box.
- `grocery: ["..."]`: light grocery/top-up nudges, shown in a separate green "Groceries" box. Keep them short. Example: `grocery: ["On the way home: cucumber + olives."]`.
Both are optional.

## Calendar & shortcuts
- The calendar button (top right) shows the month. Days in this week are highlighted and switch the day view; cook days have a dot. Days from older weeks link to that week's page (`file#tue`). Each `weeks.js` entry needs `start` and `end` dates for this.
- The menu button (top left) jumps to sections; on wide screens the same list sits on the left.

## Week page data: cook plan, night-before, eating out
In a day entry of `weeks/YYYY-MM-DD.data.js`:
- `cook.plan`: the combined cook-day view, with these keys:
  - `time`
  - `getout`: `{ "Fridge": [...], "Pantry": [...], "Spices & sauces": [...] }`, with totals summed across recipes
  - `weigh`: `[["amount", "Recipe"], ...]`
  - `bulk`: one line per ingredient
  - `cook`: `[{ a: "A" | "B", t: "step", min: 35 }]`. `a` is the lane in 2-cook mode; the array order is the 1-cook order. `min` adds a tap-to-start timer.
  - `pack`
- `cook.make`: component ids shown under the Recipes tab.
- `nightBefore: [...]`: "Tonight, for tomorrow's cook" checklist (put it on the day before a cook day).
- `out: { b|l|d: "note" }`: pre-marks a meal as eaten out. Shown greyed and struck through everywhere. The Week overview lets you tick or untick meals and add notes; Submit saves them (localStorage) and copies a summary for Chef.
Ticks, the 1/2-cook choice and timers persist in localStorage.

## Icons
`favicon.svg` is the source. The PNGs in `icons/` and `favicon.ico` were rendered from it with headless Chrome + ffmpeg. `manifest.webmanifest` lives at the site root; week pages link to it with `../` paths.

## Portions
- Each component can have `portion: { g, measure, n, batch }`: cooked grams per portion, a household measure, the number of portions in the batch, and the batch yield. Its `nut` is per portion.
- Each meal has `qty: { componentId: portions }` (default 1). The page shows e.g. "Gochujang chicken, ~65 g (about ⅔ palm)", and meal `nut` should equal the sum of its parts plus extras.

## Tickable reminders
- `remind: ["..."]` and `grocery` items are checkboxes. When every item is ticked, the box collapses into a done bar (unticking re-expands it), and ticks persist per day.
- `grocery` can be a list of strings or `{ type: "topup" | "main", title, items: [...] }`. The type picks the done message.
- The Shopping section's `topup` list works the same way.

## Navigation (tabs)
- A bottom tab bar: Today | Week | Kitchen | Recipes | History. Routes are hashes: `#today`, `#today/wed`, `#week`, `#kitchen`, `#recipes`, `#recipes/c-chicken` (component) or `#recipes/m-bowl` (meal), `#history`. Old `#wed` links still work. The last tab is remembered; the default is Today.
- **Today:** day strip, reminders, groceries, night-before, cook section, meals.
- **Week:** per-day meals with portions, eating-out ticks and Submit.
- **Kitchen:** fridge, freezer & thaw, shopping (top-ups, main shop, repeat list).
- **Recipes:** collapsible cards, all collapsed by default.
- **History:** the `weeks.js` list plus a repeat list.
- All collapsibles use one pattern (`cx` in app.js): same chevron and animation, with state remembered in localStorage.
- `build.py` now only copies the newest week page to `index.html` with root paths; History renders from `weeks.js` in app.js.

## Dinner on cook days
When a day has `cook.plan` and its dinner meal has `effort: "cook"`:
- **Weeknights (Mon–Fri): dinner is folded into the cook.** Write dinner's steps into `cook.plan.cook` as part of one timeline (e.g. pasta water on ~10 min before the ragu finishes, finish the sauce, plate, then pack). `cook.time` / `plan.time` is the full hands-on total *including* dinner. The dinner tile on Today and Week drops its "Cook · N min" chip, shows "Made during tonight's cook" and links to the cook section; its own steps are replaced by that pointer.
- **Weekends (Sat/Sun): dinner stays separate** with its own chip and method. The cook section ends with a pause line ("Good place to stop; come back at dinner") and a "Still to do at dinner: <meal> · ~N min" link to the dinner card.
- Override the weekday rule per day with `cook.dinnerInCook: true` (fold in) or `false` (keep separate).
- The date strip and calendar show only COOK on cook days, whatever the dinner is.
- Dinner steps don't get a separate per-person split; they sit in the timeline like any other step.

## Meal effort (fresh cook vs assemble)
Each meal in `meals` can carry `effort: "cook" | "assemble"` and `cookMins: <number>`.
- `cook`: needs a pan/oven step on the night beyond reheating (e.g. pan-fried lamb chops, cooking pasta/noodles, fried rice, eggs). Shown as an accent pill with a pan icon, "Cook tonight · 12 min" (dinner) or "Cook fresh · 10 min" (breakfast/lunch), on Today and Week; days whose dinner is a fresh cook get a small accent dot in the day strip and an underline in the calendar.
- `assemble`: reheat/plate only. Shown as a quiet "Assemble · 5 min" label.
Derive it from the meal's `steps`: anything that fries, boils or bakes on the night is `cook`.

## Cache-busting
`python3 build.py` stamps every local asset URL (styles.css, app.js, weeks.js, data files, icons, manifest) with `?v=<content hash>` in all week pages and index.html, so phones never mix new HTML with a cached old app.js/styles.css. Always run it before committing.

## Week note
Optional fields on `window.WEEK`:
- `weekNote`: the note you sent for this week (shown under "Your note").
- `weekNoteApplied`: Chef's one-liner on how it shaped the plan (shown under "Chef").
The Week tab also has a "Notes for this week" textarea that autosaves to localStorage (`weeknote:<range>`). It's included in the "Send changes to Chef" copy text. That button only appears when eating-out ticks, slot notes or the week note differ from what was last sent (`sent:<range>`). Eating-out data keeps its old key (`out:<range>`).

## Lunch at work vs at home
A meal can have `atWork: [...]` steps (packing notes + microwave reheat, cold parts in a separate pot). When it's served as a lunch, Today shows an "At work | At home" switch (remembered in localStorage `lunchmode`, default work); "At home" shows the normal `steps`.
