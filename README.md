# Beanos & Matteo · Meal prep site

Open `index.html` directly. It works from file://, with no server needed.

## Structure
- `index.html`: the current (newest) week shown in full, plus the "Previous weeks" archive. **Generated, so don't edit by hand.**
- `weeks/YYYY-MM-DD.html`: one page per week, named after the week's start date.
- `weeks.js`: list of weeks (newest first). The archive is rendered from this; it's a JS variable, so there's no fetch().
- `styles.css`: shared styling for every page.
- `build.py`: rebuilds `index.html` from the first week listed in `weeks.js`.

## Adding a week
1. Copy the latest week, e.g. `cp weeks/2026-10-20.html weeks/2026-10-27.html`, and edit its content (overview, prep, components, meals, totals, shopping, and the **Repeat this week** list). Keep `<link rel="stylesheet" href="../styles.css">` and the "← All weeks" link.
2. Add a new entry to the **top** of `weeks.js`: `file`, `start`, `range`, `title`, `summary` (one line describing the components).
3. Run `python3 build.py` to regenerate `index.html`.
4. Optional: `cd .. && python3 -c "import shutil;shutil.make_archive('meal-prep-site','zip','.','meal-prep-site')"` to share.
