/* =============================================================
   ACISP 2027 — site engine
   Loads editable CSV data, injects the shared header/footer,
   and renders page content. Edit files in /data and refresh.
   No build step. Serve over http:// (see README) — opening the
   files directly with file:// blocks fetch() in most browsers.
   ============================================================= */
(function () {
  "use strict";

  var DATA_DIR = "data/";

  /* Single source of truth for the top navigation. Add/remove
     a line here to change the menu across every page. */
  var NAV = [
    ["index.html", "Home"],
    ["cfp.html", "Call for Papers"],
    ["committee.html", "Committee"],
    ["pc.html", "Program Committee"],
    ["registration.html", "Registration"],
    ["accepted.html", "Accepted Papers"],
    ["author-info.html", "Author Information"],
    ["program.html", "Technical Program"],
    ["speakers.html", "Invited Speakers"],
    ["venue.html", "Venue"],
    ["explore-melbourne.html", "Explore Melbourne"],
    ["sponsors.html", "Sponsors"],
    ["contact.html", "Contact"]
  ];

  /* Site-wide banner slideshow, shown under the title bar on every page.
     Add/remove/reorder slides here. Each slide needs src + alt + credit; the
     credit must match that image's author/licence (all current images are
     CC BY-SA 4.0 from Wikimedia Commons — keep the visible credit). */
  /* Auto-rotation interval, in milliseconds. */
  var SLIDE_MS = 5000;

  var BANNERS = [
    {
      src: "img/banner-city.jpg",
      alt: "Melbourne city skyline from Southbank with Princes Bridge and St Paul's Cathedral",
      credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:City_of_Melbourne_skyline_from_Southbank_with_Princes_Bridge_and_St_Pauls,_2018.jpg" target="_blank" rel="noopener">Gracchus250</a>, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener">CC BY-SA 4.0</a>'
    },
    {
      src: "img/banner-twelve-apostles.jpg",
      alt: "The Twelve Apostles on the Great Ocean Road, Victoria",
      credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:Princetown_(AU),_Port_Campbell_National_Park,_Twelve_Apostles_--_2019_--_1017.jpg" target="_blank" rel="noopener">Dietmar Rabich</a>, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener">CC BY-SA 4.0</a>'
    },
    {
      src: "img/banner-southbank-night.jpg",
      alt: "Melbourne Southbank skyline across the Yarra River at dusk",
      credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:Southbank_night.jpg" target="_blank" rel="noopener">Romain.pontida</a>, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener">CC BY-SA 4.0</a>'
    },
    {
      src: "img/banner-flinders-station.jpg",
      alt: "Flinders Street Station, Melbourne, at night",
      credit: 'Photo: <a href="https://commons.wikimedia.org/wiki/File:Melbourne_(AU),_Flinders_Street_Railway_Station_--_2019_--_202623.jpg" target="_blank" rel="noopener">Dietmar Rabich</a>, ' +
        '<a href="https://creativecommons.org/licenses/by-sa/4.0" target="_blank" rel="noopener">CC BY-SA 4.0</a>'
    }
  ];

  /* ---------------- small helpers ---------------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function isBlank(v) { return v == null || String(v).trim() === ""; }
  function isTBA(v) {
    if (isBlank(v)) return true;
    return /^(tba|tbd|tbc|to be announced|to be confirmed|to be advised)\.?$/i.test(String(v).trim());
  }
  function tbaChip(text) { return '<span class="tba">' + esc(text || "To be announced") + "</span>"; }
  function currentPage() {
    var p = location.pathname.split("/").pop();
    return p && p.length ? p : "index.html";
  }
  function linkify(text, url, cls) {
    var t = esc(text);
    if (isBlank(url)) return t;
    return '<a class="' + (cls || "") + '" href="' + esc(url) + '" target="_blank" rel="noopener">' + t + "</a>";
  }

  /* ---------------- CSV parsing (RFC 4180) ---------------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, ""); // strip BOM
    var rows = [], row = [], field = "", i = 0, inQ = false, c;
    while (i < text.length) {
      c = text[i];
      if (inQ) {
        if (c === '"') {
          if (text[i + 1] === '"') { field += '"'; i += 2; continue; }
          inQ = false; i++; continue;
        }
        field += c; i++; continue;
      }
      // Only open a quoted field at the START of a field (right after a
      // delimiter/newline). A stray '"' mid-value is treated as a literal
      // so one unescaped quote can't swallow the rest of the file.
      if (c === '"' && field === "") { inQ = true; i++; continue; }
      if (c === ",") { row.push(field); field = ""; i++; continue; }
      if (c === "\r") { i++; continue; }
      if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; i++; continue; }
      field += c; i++;
    }
    // last field/row
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
    return rows;
  }
  // -> array of objects keyed by header row; skips fully-empty rows
  function parseObjects(text) {
    var rows = parseCSV(text).filter(function (r) {
      return r.some(function (c) { return String(c).trim() !== ""; });
    });
    if (!rows.length) return [];
    var head = rows[0].map(function (h) { return h.trim(); });
    return rows.slice(1).map(function (r) {
      var o = {};
      head.forEach(function (h, idx) { o[h] = r[idx] != null ? r[idx].trim() : ""; });
      return o;
    });
  }

  var _cache = {};
  function loadCSV(name) {
    if (_cache[name]) return _cache[name];
    _cache[name] = fetch(DATA_DIR + name, { cache: "no-cache" }).then(function (res) {
      if (!res.ok) throw new Error(name + " -> HTTP " + res.status);
      return res.text();
    }).then(parseObjects);
    return _cache[name];
  }

  var CONFIG = {};
  function loadConfig() {
    return loadCSV("config.csv").then(function (rows) {
      rows.forEach(function (r) { if (r.key) CONFIG[r.key] = r.value; });
      return CONFIG;
    });
  }
  function cfg(k, fallback) {
    var v = CONFIG[k];
    return isBlank(v) ? (fallback == null ? "" : fallback) : v;
  }

  var IS_FILE = location.protocol === "file:";

  function fail(el, name) {
    if (IS_FILE) {
      el.innerHTML = '<p class="empty-note">This section loads from <code>' + esc(DATA_DIR + name) +
        "</code> when the site is served over http — see the notice at the top of the page.</p>";
      return;
    }
    el.innerHTML =
      '<div class="callout callout--note"><p><span class="callout__label">Data could not be loaded.</span> ' +
      "Could not read <code>" + esc(DATA_DIR + name) + "</code>. Start a local server " +
      "(<code>python3 -m http.server</code>) and reload — see the README.</p></div>";
  }

  function showFileBanner() {
    var b = document.createElement("div");
    b.className = "local-banner";
    b.innerHTML = "<strong>Local preview:</strong> you’ve opened this file directly, so the " +
      "editable content (dates, committee, etc.) can’t load — browsers block that over " +
      "<code>file://</code>. Double-click <code>preview.command</code> in this folder, or run " +
      "<code>python3 -m http.server</code> here and open <code>http://localhost:8000</code>. " +
      "Once deployed (e.g. GitHub Pages) everything works automatically.";
    document.body.insertBefore(b, document.body.firstChild);
  }

  /* ---------------- shared chrome: top bar · sidebar · footer ---------------- */
  /* Chrome text is derived from config.csv, with identical built-in fallbacks
     so the chrome can be painted instantly, before the config fetch returns. */
  function chromeText() {
    var datesTxt = isTBA(cfg("dates", "")) ? "Dates to be announced" : cfg("dates", "");
    return {
      name: cfg("edition", "32nd") + " " +
        cfg("full_name", "Australasian Conference on Information Security and Privacy"),
      meta: datesTxt + " · " + cfg("city", "Melbourne") + ", " + cfg("country", "Australia"),
      sub: cfg("city", "Melbourne") + " · " + cfg("country", "Australia"),
      footLeft: "© " + cfg("year", "2027") + " " + cfg("acronym", "ACISP 2027") + " · " +
        cfg("full_name", "Australasian Conference on Information Security and Privacy"),
      footRight: "Proceedings by " + cfg("proceedings", "Springer LNCS (Lecture Notes in Computer Science)")
    };
  }

  /* Patch the few config-driven chrome strings in place once config.csv has
     actually loaded (no rebuild — avoids any visible reflow). */
  function refreshChrome() {
    var t = chromeText(), el;
    if ((el = document.querySelector(".conf-title__name"))) el.textContent = t.name;
    if ((el = document.querySelector(".conf-title__meta"))) el.textContent = t.meta;
    if ((el = document.querySelector(".site-banner__sub"))) el.textContent = t.sub;
    var spans = document.querySelectorAll(".site-footer .inner span");
    if (spans[0]) spans[0].textContent = t.footLeft;
    if (spans[1]) spans[1].textContent = t.footRight;
  }

  function buildChrome() {
    var page = currentPage();
    var main = document.getElementById("main") || document.querySelector("main");
    if (!main) return;

    var acronym = cfg("acronym", "ACISP 2027");
    var ap = acronym.split(" ");
    var yr = ap.length > 1 ? ap.pop() : "";
    var an = ap.join(" ");
    var t = chromeText();

    // --- top title bar ---
    var topbar = document.createElement("header");
    topbar.className = "topbar";
    topbar.innerHTML =
      '<div class="topbar__inner">' +
        '<a class="brandbar" href="index.html">' +
          '<img src="img/favicon.svg" alt="" width="46" height="46">' +
          '<span class="brandbar__acronym">' + esc(an) + (yr ? ' <span>' + esc(yr) + "</span>" : "") + "</span>" +
        "</a>" +
        '<button class="topbar__toggle" aria-expanded="false" aria-controls="site-menu" aria-label="Toggle menu">' +
          '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
        "</button>" +
        '<div class="conf-title">' +
          '<div class="conf-title__name">' + esc(t.name) + "</div>" +
          '<div class="conf-title__meta">' + esc(t.meta) + "</div>" +
        "</div>" +
      "</div>";

    // --- sidebar: menu + partners ---
    var links = NAV.map(function (n) {
      var cur = n[0] === page ? ' aria-current="page"' : "";
      return '<li><a href="' + n[0] + '"' + cur + ">" + esc(n[1]) + "</a></li>";
    }).join("");
    var sidebar = document.createElement("aside");
    sidebar.className = "sidebar";
    sidebar.innerHTML =
      '<nav aria-label="Site"><ul class="menu" id="site-menu">' + links + "</ul></nav>" +
      '<div class="sidebar__partners">' +
        "<h4>Proceedings</h4>" +
        '<a href="https://www.springer.com/gp/computer-science/lncs" target="_blank" rel="noopener">' +
          '<img src="img/logo-springer.png" alt="Springer — Lecture Notes in Computer Science"></a>' +
        "<h4>Hosted by</h4>" +
        '<a href="https://www.monash.edu/" target="_blank" rel="noopener">' +
          '<img src="img/monash-logo.svg" alt="Monash University"></a>' +
      "</div>";

    // --- assemble: skip · topbar · content[sidebar|main] · footer ---
    var content = document.createElement("div");
    content.className = "site-content";
    main.parentNode.insertBefore(content, main);
    content.appendChild(sidebar);
    content.appendChild(main); // moves main out of body into the column
    content.parentNode.insertBefore(topbar, content);

    // --- site banner slideshow (every page): full content width between
    //     the title bar and the sidebar/content row, like the 2026 carousel.
    //     Only the first slide loads eagerly; the rest hydrate after load. ---
    var slideHtml = BANNERS.map(function (b, i) {
      var srcAttr = i === 0
        ? 'src="' + esc(b.src) + '" fetchpriority="high"'
        : 'data-src="' + esc(b.src) + '"';
      return '<div class="site-banner__slide' + (i === 0 ? " is-active" : "") + '">' +
        "<img " + srcAttr + ' alt="' + esc(b.alt) + '">' +
        '<span class="site-banner__credit">' + b.credit + "</span>" +
        "</div>";
    }).join("");
    var dotsHtml = BANNERS.length > 1
      ? '<div class="site-banner__dots">' + BANNERS.map(function (b, i) {
          return '<button class="site-banner__dot' + (i === 0 ? " is-active" : "") +
            '" type="button" aria-label="Show slide ' + (i + 1) + '"></button>';
        }).join("") + "</div>"
      : "";
    var bwrap = document.createElement("div");
    bwrap.className = "site-banner-wrap";
    bwrap.innerHTML =
      '<div class="site-banner">' + slideHtml +
        '<div class="site-banner__overlay">' +
          '<p class="site-banner__title">' + esc(acronym) + "</p>" +
          '<p class="site-banner__sub">' + esc(t.sub) + "</p>" +
        "</div>" + dotsHtml +
      "</div>";
    content.parentNode.insertBefore(bwrap, content);
    initBanner(bwrap);

    var skip = document.createElement("a");
    skip.className = "skip-link";
    skip.href = "#main";
    skip.textContent = "Skip to content";
    document.body.insertBefore(skip, topbar);

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = '<div class="inner"><span>' + esc(t.footLeft) + "</span>" +
      "<span>" + esc(t.footRight) + "</span></div>";
    document.body.appendChild(footer);

    // --- mobile menu toggle ---
    var btn = topbar.querySelector(".topbar__toggle");
    var menu = sidebar.querySelector(".menu");
    btn.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
    menu.addEventListener("click", function (e) {
      if (e.target.tagName === "A") { menu.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); }
    });
  }

  /* ---------------- banner slideshow ---------------- */
  function initBanner(root) {
    var slides = root.querySelectorAll(".site-banner__slide");
    var dots = root.querySelectorAll(".site-banner__dot");
    if (slides.length < 2) return;
    var idx = 0, timer = null;
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function hydrate(slide) {
      var img = slide.querySelector("img[data-src]");
      if (img) { img.src = img.getAttribute("data-src"); img.removeAttribute("data-src"); }
    }
    function show(n) {
      slides[idx].classList.remove("is-active");
      if (dots[idx]) dots[idx].classList.remove("is-active");
      idx = (n + slides.length) % slides.length;
      hydrate(slides[idx]);
      slides[idx].classList.add("is-active");
      if (dots[idx]) dots[idx].classList.add("is-active");
    }
    function start() {
      if (!reduce && !timer) timer = setInterval(function () { show(idx + 1); }, SLIDE_MS);
    }
    dots.forEach(function (d, i) {
      d.addEventListener("click", function () {
        if (timer) { clearInterval(timer); timer = null; }
        show(i);
        start();
      });
    });
    // Load the remaining slides once the page itself has finished loading,
    // then begin rotating (no auto-rotation for reduced-motion users).
    function ready() {
      slides.forEach(function (s) { hydrate(s); });
      start();
    }
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready);
  }

  /* ---------------- config text substitution ---------------- */
  function applyConfigText() {
    document.querySelectorAll("[data-config]").forEach(function (el) {
      var key = el.getAttribute("data-config");
      // If config never loaded (e.g. file://) the key is absent — keep the
      // inline fallback text the page ships with instead of blanking out.
      if (!Object.prototype.hasOwnProperty.call(CONFIG, key)) return;
      var val = CONFIG[key];
      if (isTBA(val)) {
        el.innerHTML = tbaChip(el.getAttribute("data-tba") || "To be announced");
      } else {
        el.textContent = val;
      }
    });
    // Links whose href comes from config.csv (e.g. the submission server).
    document.querySelectorAll("[data-config-href]").forEach(function (el) {
      var url = cfg(el.getAttribute("data-config-href"), "");
      if (isBlank(url)) return; // keep the page's own fallback href
      el.setAttribute("href", url);
    });
  }

  /* ---------------- renderers ---------------- */
  var RENDER = {};

  RENDER.dates = function (el) {
    return loadCSV("dates.csv").then(function (rows) {
      if (!rows.length) { el.innerHTML = '<p class="empty-note">Important dates will be announced.</p>'; return; }
      var body = rows.map(function (r) {
        var struck = /^(y|yes|true|1)$/i.test(r.struck || "");
        var hl = /^(y|yes|true|1)$/i.test(r.highlight || "");
        var dateCell = isTBA(r.date) ? tbaChip("To be announced")
          : (struck ? "<s>" + esc(r.date) + "</s>" : esc(r.date));
        var label = esc(r.label) + (isBlank(r.note) ? "" : ' <span class="muted">(' + esc(r.note) + ")</span>");
        return '<tr class="' + (struck ? "struck " : "") + (hl ? "row-highlight" : "") + '">' +
          "<td>" + label + "</td><td>" + dateCell + "</td></tr>";
      }).join("");
      el.innerHTML =
        '<div class="table-wrap"><table class="data dates">' +
        "<thead><tr><th>Milestone</th><th>Date</th></tr></thead><tbody>" + body + "</tbody></table></div>";
    }).catch(function () { fail(el, "dates.csv"); });
  };

  RENDER.committee = function (el) {
    return loadCSV("committee.csv").then(function (rows) {
      if (!rows.length) { el.innerHTML = '<p class="empty-note">The organising committee will be announced.</p>'; return; }
      var order = [], groups = {};
      rows.forEach(function (r) {
        var g = r.group || "Committee";
        if (!groups[g]) { groups[g] = []; order.push(g); }
        groups[g].push(r);
      });
      el.innerHTML = order.map(function (g) {
        var people = groups[g].map(function (r) {
          var name = isTBA(r.name) ? tbaChip("To be announced") : linkify(r.name, r.url, "person__link");
          var aff = isBlank(r.affiliation) ? "" :
            '<span class="person__aff">' + linkify(r.affiliation, r.aff_url) + "</span>";
          return '<div class="person"><span class="person__name">' + name + "</span> " + aff + "</div>";
        }).join("");
        return '<div class="committee-group"><h2>' + esc(g) + '</h2><div class="people">' + people + "</div></div>";
      }).join("");
    }).catch(function () { fail(el, "committee.csv"); });
  };

  RENDER.pc = function (el) {
    return loadCSV("pc.csv").then(function (rows) {
      var real = rows.filter(function (r) { return !isTBA(r.name); });
      if (!real.length) {
        el.innerHTML = '<p class="empty-note">The Program Committee will be announced closer to the submission deadline.</p>';
        return;
      }
      var items = real.map(function (r) {
        return '<div class="person"><span class="person__name">' + esc(r.name) + "</span>" +
          (isBlank(r.affiliation) ? "" : ' <span class="person__aff">' + esc(r.affiliation) + "</span>") + "</div>";
      }).join("");
      el.innerHTML = '<div class="pc-list">' + items + "</div>" +
        '<p class="muted" style="margin-top:1rem">' + real.length + " members listed.</p>";
    }).catch(function () { fail(el, "pc.csv"); });
  };

  RENDER.speakers = function (el) {
    return loadCSV("speakers.csv").then(function (rows) {
      var real = rows.filter(function (r) { return !isTBA(r.name); });
      if (!real.length) { el.innerHTML = '<p class="empty-note">Invited speakers will be announced.</p>'; return; }
      el.innerHTML = real.map(function (r) {
        var initials = (r.name || "?").split(/\s+/).map(function (w) { return w[0]; }).slice(0, 2).join("");
        var photo = isBlank(r.photo)
          ? '<div class="speaker__photo speaker__photo--ph" aria-hidden="true">' + esc(initials.toUpperCase()) + "</div>"
          : '<img class="speaker__photo" src="' + esc(r.photo) + '" alt="' + esc(r.name) + '" loading="lazy" onerror="this.classList.add(\'speaker__photo--ph\')">';
        var parts = [];
        if (!isBlank(r.title)) parts.push('<p class="speaker__title">' + esc(r.title) + "</p>");
        if (!isBlank(r.schedule)) parts.push('<p class="speaker__sched">' + esc(r.schedule) + "</p>");
        if (!isBlank(r.abstract)) parts.push("<p><span class=\"speaker__label\">Abstract. </span>" + r.abstract + "</p>");
        if (!isBlank(r.bio)) parts.push("<p><span class=\"speaker__label\">Biography. </span>" + r.bio + "</p>");
        return '<article class="speaker">' + photo +
          '<div><h2>' + linkify(r.name, r.url) + "</h2>" +
          (isBlank(r.affiliation) ? "" : '<p class="speaker__aff">' + esc(r.affiliation) + "</p>") +
          parts.join("") + "</div></article>";
      }).join("");
    }).catch(function () { fail(el, "speakers.csv"); });
  };

  RENDER.registration = function (el) {
    return loadCSV("registration.csv").then(function (rows) {
      if (!rows.length) { el.innerHTML = '<p class="empty-note">Registration details will be announced.</p>'; return; }
      var order = [], secs = {};
      rows.forEach(function (r) {
        var s = r.section || "Registration";
        if (!secs[s]) { secs[s] = []; order.push(s); }
        secs[s].push(r);
      });
      var body = order.map(function (s) {
        var head = order.length > 1 || s !== "Registration"
          ? '<tr class="subhead"><th colspan="3" scope="colgroup">' + esc(s) + "</th></tr>" : "";
        var rowsHtml = secs[s].map(function (r) {
          var fee = isTBA(r.fee) ? tbaChip("TBA") : esc(r.fee);
          var action = isBlank(r.link)
            ? '<span class="btn btn--outline btn--sm is-disabled" aria-disabled="true">Opens soon</span>'
            : '<a class="btn btn--primary btn--sm" href="' + esc(r.link) + '" target="_blank" rel="noopener">Register</a>';
          var type = esc(r.type) + (isBlank(r.note) ? "" : ' <span class="muted">' + esc(r.note) + "</span>");
          return "<tr><td>" + type + "</td><td>" + fee + "</td><td>" + action + "</td></tr>";
        }).join("");
        return head + rowsHtml;
      }).join("");
      el.innerHTML =
        '<div class="table-wrap"><table class="data">' +
        "<thead><tr><th>Registration type</th><th>Fee</th><th>Register</th></tr></thead><tbody>" +
        body + "</tbody></table></div>";
    }).catch(function () { fail(el, "registration.csv"); });
  };

  RENDER.sponsors = function (el) {
    return loadCSV("sponsors.csv").then(function (rows) {
      var real = rows.filter(function (r) { return !isBlank(r.name); });
      if (!real.length) {
        el.innerHTML = '<p class="empty-note">Sponsors will be listed here. Interested in supporting ACISP 2027? ' +
          'See <a href="sponsors.html">sponsorship opportunities</a>.</p>';
        return;
      }
      var order = [], tiers = {};
      real.forEach(function (r) {
        var t = r.tier || "Sponsors";
        if (!tiers[t]) { tiers[t] = []; order.push(t); }
        tiers[t].push(r);
      });
      el.innerHTML = order.map(function (t) {
        var items = tiers[t].map(function (r) {
          var inner = isBlank(r.logo)
            ? '<span class="person__name">' + esc(r.name) + "</span>"
            : '<img src="' + esc(r.logo) + '" alt="' + esc(r.name) + '" loading="lazy">';
          return isBlank(r.url) ? '<div class="sponsor">' + inner + "</div>"
            : '<a class="sponsor" href="' + esc(r.url) + '" target="_blank" rel="noopener">' + inner + "</a>";
        }).join("");
        return '<div class="sponsor-tier"><h2>' + esc(t) + '</h2><div class="sponsor-row">' + items + "</div></div>";
      }).join("");
    }).catch(function () { fail(el, "sponsors.csv"); });
  };

  RENDER.accepted = function (el) {
    return loadCSV("accepted.csv").then(function (rows) {
      var real = rows.filter(function (r) { return !isBlank(r.title); });
      if (!real.length) { el.innerHTML = '<p class="empty-note">The list of accepted papers will be published after notification.</p>'; return; }
      var order = [], groups = {};
      real.forEach(function (r) {
        var g = r.round || "Accepted Papers";
        if (!groups[g]) { groups[g] = []; order.push(g); }
        groups[g].push(r);
      });
      el.innerHTML = order.map(function (g) {
        var items = groups[g].map(function (r) {
          return "<li><span class=\"person__name\">" + esc(r.title) + "</span>" +
            (isBlank(r.authors) ? "" : '<br><span class="person__aff">' + esc(r.authors) + "</span>") + "</li>";
        }).join("");
        return '<h2 class="group-title">' + esc(g) + '</h2><ol class="stack" style="padding-left:1.3rem">' + items + "</ol>";
      }).join("");
    }).catch(function () { fail(el, "accepted.csv"); });
  };

  RENDER.news = function (el) {
    return loadCSV("news.csv").then(function (rows) {
      if (!rows.length) { el.innerHTML = '<p class="empty-note">No announcements yet.</p>'; return; }
      el.innerHTML = '<ul class="news">' + rows.map(function (r) {
        return "<li><time>" + esc(r.date) + "</time><span>" + (r.html || "") + "</span></li>";
      }).join("") + "</ul>";
    }).catch(function () { fail(el, "news.csv"); });
  };

  RENDER.topics = function (el) {
    return loadCSV("topics.csv").then(function (rows) {
      if (!rows.length) { el.innerHTML = '<p class="empty-note">Topics of interest will be announced.</p>'; return; }
      el.innerHTML = '<ul class="topic-list">' + rows.map(function (r) {
        return "<li>" + esc(r.topic) + "</li>";
      }).join("") + "</ul>";
    }).catch(function () { fail(el, "topics.csv"); });
  };

  RENDER.program = function (el) {
    return loadCSV("program.csv").then(function (rows) {
      var real = rows.filter(function (r) { return !isBlank(r.title) || !isBlank(r.session); });
      if (!real.length) {
        el.innerHTML = '<p class="empty-note">The technical program will be published closer to the conference.</p>';
        return;
      }
      var order = [], days = {};
      real.forEach(function (r) {
        var d = (r.day || "") + (isBlank(r.date) ? "" : " — " + r.date) || "Program";
        if (!days[d]) { days[d] = []; order.push(d); }
        days[d].push(r);
      });
      el.innerHTML = order.map(function (d) {
        var body = days[d].map(function (r) {
          var time = [r.start, r.end].filter(function (x) { return !isBlank(x); }).join("–");
          var main = (isBlank(r.session) ? "" : "<strong>" + esc(r.session) + "</strong>") +
            (isBlank(r.title) ? "" : (isBlank(r.session) ? "" : "<br>") + esc(r.title)) +
            (isBlank(r.speaker) ? "" : '<br><span class="person__aff">' + esc(r.speaker) + "</span>");
          return "<tr><td style=\"white-space:nowrap\">" + esc(time) + "</td><td>" + main + "</td>" +
            "<td>" + esc(r.room || "") + "</td></tr>";
        }).join("");
        return '<h2 class="group-title">' + esc(d) + '</h2><div class="table-wrap"><table class="data">' +
          "<thead><tr><th>Time</th><th>Session</th><th>Room</th></tr></thead><tbody>" + body + "</tbody></table></div>";
      }).join("");
    }).catch(function () { fail(el, "program.csv"); });
  };

  function runRenderers() {
    var jobs = [];
    document.querySelectorAll("[data-render]").forEach(function (el) {
      var fn = RENDER[el.getAttribute("data-render")];
      if (fn) jobs.push(fn(el));
    });
    return Promise.all(jobs);
  }

  /* ---------------- boot ---------------- */
  function boot() {
    if (IS_FILE) showFileBanner();
    // Inject the chrome synchronously — before first paint — using the built-in
    // fallback text, so navigation never flashes an unchromed page.
    buildChrome();
    // Data sections fill in as their own CSVs arrive (independent of config).
    runRenderers();
    // Once config.csv lands, patch chrome strings + page-level config spans.
    loadConfig().catch(function () { /* fallbacks already shown */ }).then(function () {
      refreshChrome();
      applyConfigText();
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else { boot(); }
})();
