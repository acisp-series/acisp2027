# ACISP 2027 website

The website for the **32nd Australasian Conference on Information Security and
Privacy (ACISP 2027)**, Melbourne, Australia.

It is a plain static site (HTML + CSS + a little JavaScript) with **no build
step**. All the content that changes over time lives in editable **CSV files**
under [`data/`](data/). Edit a CSV, refresh the page, and the site updates — you
never touch HTML for routine updates.

---

## Quick start (local preview)

The pages load the CSV files with `fetch()`, which browsers **block when you
open an HTML file directly** (`file://`). So don't double-click the `.html`
files — serve the folder over `http://` instead. Easiest options:

- **macOS:** double-click **`preview.command`** in this folder. It starts a
  local server and opens your browser automatically. (First time, you may need
  to right-click → Open to get past Gatekeeper.)
- **Any OS, terminal:** from this folder run one of:

  ```bash
  python3 -m http.server 8000        # then open http://localhost:8000
  # or:  npx serve .
  # or:  php -S localhost:8000
  ```

Then open <http://localhost:8000>. If you open a page the wrong way, it shows a
banner reminding you how to preview it — nothing is broken, and **once the site
is deployed (e.g. GitHub Pages) everything loads automatically.**

---

## Editing content — the `data/` folder

Open these in Excel, Numbers, Google Sheets, or any text editor. Keep the header
row (first line) intact. If a value contains a comma, wrap it in double quotes,
e.g. `"Hardware, Side Channels, and CPS Security"`. To show a placeholder, put
`To be announced` (or leave the cell blank) — the site renders a neat “to be
announced” marker automatically.

| File | Shows up on | Columns |
| ---- | ----------- | ------- |
| `config.csv` | Everywhere (title bar, hero, footer, venue) | `key,value` — see below |
| `dates.csv` | Home, Call for Papers | `label,date,struck,highlight,note` |
| `committee.csv` | Committee | `group,name,affiliation,url,aff_url` |
| `pc.csv` | Program Committee | `name,affiliation` |
| `speakers.csv` | Invited Speakers | `name,affiliation,title,abstract,bio,photo,schedule,url` |
| `registration.csv` | Registration | `section,type,fee,link,note` |
| `sponsors.csv` | Sponsors, Home | `tier,name,logo,url` |
| `accepted.csv` | Accepted Papers | `round,title,authors` |
| `program.csv` | Program | `day,date,start,end,session,title,speaker,room` |
| `news.csv` | Home | `date,html` |
| `topics.csv` | Call for Papers | `topic` |

### `config.csv` keys

`key,value` pairs. The important ones:

- `dates` — e.g. `6–9 July 2027` (shows on the hero, facts strip, venue, CFP)
- `venue`, `venue_address` — the conference venue
- `host` — host institution(s)
- `submission_url` — the EasyChair link (leave blank until it opens)
- `contact_email` — organisers’ email (leave blank until confirmed)
- Stable values already filled in: `acronym`, `edition`, `year`, `full_name`,
  `city`, `state`, `country`, `proceedings`, `submission_system`.

### Column tips

- **`dates.csv`** — set `struck` to `yes` to strike through a passed deadline;
  set `highlight` to `yes` to emphasise a row (used for the conference row).
- **`committee.csv`** — the `group` column both labels and groups people
  (e.g. `General Chairs`). Groups appear in the order they first appear in the
  file. `url` links the person, `aff_url` links the affiliation. Repeat a group
  name across rows to add more people to it.
- **`pc.csv`** — one member per row. While it only contains `To be announced`,
  the page shows a “will be announced” note instead of the list.
- **`speakers.csv`** — `abstract` and `bio` may contain HTML (e.g. `<em>`).
  `photo` is a path such as `img/keynotes/jane.jpg`; leave it blank for an
  initials placeholder.
- **`news.csv`** — `html` may contain links; newest item first. Remember to
  escape quotes inside a quoted CSV field by doubling them (`""`).
- **`registration.csv`** — leave `link` blank to show a disabled “Opens soon”
  button; add a Stripe/registration URL to activate it. Use `section` to group
  rows under a heading (leave blank for a single flat table).

---

## Changing the menu, colours, or logos

- **Navigation menu** — edit the `NAV` array near the top of
  [`js/site.js`](js/site.js); it drives the left sidebar menu on every page.
- **Colours / fonts / spacing** — edit the CSS variables in the `:root` block at
  the top of [`css/styles.css`](css/styles.css) (e.g. `--navy`, `--accent`).
- **Favicon** — [`img/favicon.svg`](img/favicon.svg). Add sponsor/host logos to
  `img/` and reference them from `sponsors.csv` or the venue page.

---

## Project structure

```text
acisp2027/
├── index.html            Home
├── cfp.html              Call for Papers
├── committee.html        Organising committee
├── pc.html               Program committee
├── registration.html     Registration
├── accepted.html         Accepted papers
├── program.html          Technical program
├── speakers.html         Invited speakers
├── venue.html            Venue & travel
├── explore-melbourne.html
├── sponsors.html         Sponsors
├── contact.html          Contact
├── author-info.html      Camera-ready info
├── css/styles.css        Design system (all styling)
├── js/site.js            Loads CSVs, injects header/footer, renders content
├── data/*.csv            ← all editable content
└── img/favicon.svg
```

There is one shared header and footer, generated by `js/site.js`, so page chrome
and the menu live in exactly one place.

---

## Deploying to GitHub Pages

1. Create a repository (or reuse the ACISP one) and push the contents of this
   folder to the branch GitHub Pages serves (commonly `main` or `gh-pages`).
2. In **Settings → Pages**, set the source to that branch / root.
3. The `.nojekyll` file is already included so GitHub Pages serves the `data/`
   folder as-is.
4. **Custom domain (`acisp.org`) — staged launch.** While the site is in
   preparation it is served at
   <https://acisp-series.github.io/acisp2027/> with **no `CNAME` file
   committed** (all site paths are relative, so the sub-path just works).
   To go live on `acisp.org`:
   1. Remove the custom domain from the old 2026 repository
      (Settings → Pages) — GitHub allows one repository per domain.
   2. In this repo: `echo 'acisp.org' > CNAME && git add CNAME && git commit -m "Bind acisp.org" && git push`
   3. Update the DNS `CNAME` record for `www.acisp.org` to point to
      `acisp-series.github.io` (the apex A records already point to
      GitHub Pages and need no change).
   4. Wait for the certificate, then tick **Enforce HTTPS** in
      Settings → Pages.
   5. Verify `acisp.org` under the org's Settings → Pages →
      **Verified domains** (adds an org-specific TXT record) to prevent
      domain takeover.

Everything is served over `https://` on GitHub Pages, so the CSV `fetch()` calls
work with no extra configuration.

## Image credits

- Banner slideshow images (all cropped/resized from Wikimedia Commons, all
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0); each slide
  shows its own visible corner credit, set in `BANNERS` in `js/site.js` —
  keep the credits if you replace or re-crop the images):
  - `img/banner-city.jpg` —
    [“City of Melbourne skyline from Southbank with Princes Bridge and St Pauls, 2018”](https://commons.wikimedia.org/wiki/File:City_of_Melbourne_skyline_from_Southbank_with_Princes_Bridge_and_St_Pauls,_2018.jpg)
    by Gracchus250.
  - `img/banner-twelve-apostles.jpg` —
    [“Princetown (AU), Port Campbell National Park, Twelve Apostles — 2019 — 1017”](https://commons.wikimedia.org/wiki/File:Princetown_(AU),_Port_Campbell_National_Park,_Twelve_Apostles_--_2019_--_1017.jpg)
    by Dietmar Rabich.
  - `img/banner-southbank-night.jpg` —
    [“Southbank night”](https://commons.wikimedia.org/wiki/File:Southbank_night.jpg)
    by Romain.pontida.
  - `img/banner-flinders-station.jpg` —
    [“Melbourne (AU), Flinders Street Railway Station — 2019 — 202623”](https://commons.wikimedia.org/wiki/File:Melbourne_(AU),_Flinders_Street_Railway_Station_--_2019_--_202623.jpg)
    by Dietmar Rabich.
- `img/monash-logo.svg` — official Monash University logo (host institution).
  Consider replacing with the asset supplied by Monash brand/marketing once
  available, per their brand guidelines.
- `img/logo-springer.svg` — Springer publisher logo (vector, so it stays sharp
  at any size), from the English Wikipedia article on Springer.
- `img/lncs.png` — Lecture Notes in Computer Science logo carried over from the
  ACISP 2026 site. It is 369x136, which is exactly retina-sharp at the 68px
  display height set in `.pub-logos`; enlarging it further will look soft
  unless a higher-resolution original is obtained from Springer.

Both identify the proceedings publisher, as they do in the CFP document.
