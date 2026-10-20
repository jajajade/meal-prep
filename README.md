# Meal prep site

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
