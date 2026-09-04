/* =========================================================================
   ArchGuard portal — shared shell + render helpers (no backend, no build).
   Uses Bootstrap 5 for layout/components and Alpine.js for page interactivity.
   All content is mock data from data.js (window.ArchGuardData).
   ========================================================================= */
(function () {
  "use strict";
  var D = window.ArchGuardData;

  /* ---- tiny helpers ---- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var rulesById = {};
  (D.rules || []).forEach(function (r) { rulesById[r.id] = r; });

  /* ---- badge colour maps (Bootstrap contextual classes) ---- */
  var VERDICT = { PASS: "success", FAIL: "danger", UNKNOWN: "warning", ERROR: "dark", SKIPPED: "secondary" };
  var SEV = { block: "danger", advisory: "warning", inform: "info", high: "danger", medium: "warning", low: "secondary" };
  function verdictBadge(v) { return '<span class="badge text-bg-' + (VERDICT[v] || "secondary") + '">' + esc(v) + "</span>"; }
  function sevBadge(s) { return '<span class="badge text-bg-' + (SEV[s] || "secondary") + '">' + esc(s) + "</span>"; }
  function modeBadge(m) { return '<span class="badge rounded-pill text-bg-' + (m === "blocking" ? "danger" : "secondary") + '">' + esc(m) + "</span>"; }
  function levelBadge(l) { return '<span class="badge text-bg-' + (l === "hld" ? "primary" : "info") + '">' + (l === "hld" ? "HLD" : "LLD") + "</span>"; }
  function tierBadge(t) {
    var tier = (D.tiers || []).filter(function (x) { return x.id === t; })[0];
    return '<span class="badge rounded-pill text-bg-light border" title="' + (tier ? esc(tier.name + " · " + tier.owner) : "") + '">' + esc(t) + (tier ? " " + esc(tier.name) : "") + "</span>";
  }
  function predicateHTML(tokens) {
    return '<pre class="code mb-0"><code>' + (tokens || []).map(function (t) {
      return t[0] === "t" ? esc(t[1]) : '<span class="tok-' + t[0] + '">' + esc(t[1]) + "</span>";
    }).join("") + "</code></pre>";
  }

  /* =======================================================================
     Authoring-time compiler (mock). English -> declarative predicate.
     Curated outputs for the starter rules, a light heuristic otherwise.
     Outcomes: "expressible" | "clarify" | "rejected".
     ======================================================================= */
  function compile(text) {
    var key = String(text || "").trim().toLowerCase();
    if (!key) return null;
    if (D.compiledExamples[key]) return D.compiledExamples[key];
    var t = key;
    if (/(complex|cyclomatic|secret|password|sql injection|\bnull\b|regex|\bloop\b|todo|variable name|indentation|test coverage|deadlock|memory leak|off by one)/.test(t)) {
      return { outcome: "rejected",
        nonGoal: "No primitive inspects a value, follows data, or reasons about control flow. That is the CodeQL boundary — this belongs in a linter, CodeQL or a secret scanner. ArchGuard governs architecture, not code values." };
    }
    var aspirational = /\b(fast|clean|good|nice|scalable|maintainable|secure|simple|better|robust|quality|elegant)\b/.test(t);
    var structural = /(depend|layer|import|cycle|reside|gateway|database|datastore|service|reuse|annotat|export|abstraction|boundary|container|module|package|repository|controller|zone)/.test(t);
    if (t.length < 22 || (aspirational && !structural)) {
      return { outcome: "clarify",
        clarify: "This reads as an aspiration rather than a checkable constraint. Rephrase it as a dependency, placement, cardinality or reuse rule over named elements.",
        suggestion: "The domain layer must depend only on abstractions." };
    }
    var primitive = "may-not-depend-on", level = /(layer|class|module|import|controller|repository|abstraction|package|annotat)/.test(t) ? "lld" : "hld";
    if (/(reuse|shared|instead of adding|duplicate|its own|another one|new app)/.test(t)) primitive = "must-obtain-capability-via";
    else if (/(cycle|circular)/.test(t)) primitive = "must-not-cycle";
    else if (/(gateway|must go through|enter through|pass through|via the)/.test(t)) primitive = "must-cross-via";
    else if (/(reside|stay within|inside the|zone|boundary|remain in)/.test(t)) primitive = "must-reside-in";
    else if (/(only on abstraction|depend only on|only depend on)/.test(t)) primitive = "must-depend-only-on-abstractions";
    else if (/(annotat|@)/.test(t)) primitive = "must-be-annotated-with";
    else if (/(exceed|more than|at most|fan-out|budget|limit|no more than)/.test(t)) primitive = "must-not-exceed(metric, budget)";
    else if (/(not be exported|internal|do not export)/.test(t)) primitive = "must-not-be-exported";
    return { outcome: "expressible", confidence: 0.72, primitive: primitive, level: level, heuristic: true,
      restatement: "Interpreted as: " + primitive + " over the elements named in your sentence. Confirm the selector before saving.",
      predicate: [["c", "// best-effort interpretation — confirm the selector binds"], ["t", "\n"], ["p", "selector"], ["t", "\n  "], ["k", primitive]],
      fixtures: { pass: "a design that satisfies the constraint", fail: "a design that violates it" } };
  }

  /* ---- PR gate summary from a scenario's rule results ---- */
  function gateOf(results) {
    var has = function (v) { return results.some(function (r) { return r.v === v; }); };
    if (has("ERROR")) return { cls: "danger", ico: "bi-exclamation-octagon", title: "Check errored — merge blocked", sub: "A provider failed. An architecture gate never goes silently green on error." };
    if (has("FAIL")) return { cls: "danger", ico: "bi-x-octagon", title: "Merge blocked — architecture violation", sub: "A blocking rule failed on the delta this PR introduced. Pre-existing findings are recorded as debt, not blamed on this author." };
    if (has("UNKNOWN")) return { cls: "warning", ico: "bi-question-octagon", title: "Needs attention — UNKNOWN verdicts present", sub: "Some rules could not be decided on the available evidence. UNKNOWN is never a pass." };
    return { cls: "success", ico: "bi-check-circle", title: "All applicable rules passed", sub: "This change respects the declared architecture. Replayed deterministically — no LLM in the decision path." };
  }

  /* ---- schematic architecture diagrams (inline SVG) ---- */
  function marker(id, color) {
    return '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' + color + '"/></marker>';
  }
  function defs() { return "<defs>" + marker("ah-mut", "#94a3b8") + marker("ah-pass", "#16a34a") + marker("ah-fail", "#dc2626") + "</defs>"; }
  function box(x, y, w, h, title, sub, cls) {
    return '<rect class="node-box ' + (cls || "") + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"/>' +
      '<text class="node-label" x="' + (x + w / 2) + '" y="' + (y + (sub ? 22 : h / 2 + 4)) + '" text-anchor="middle">' + esc(title) + "</text>" +
      (sub ? '<text class="node-sub" x="' + (x + w / 2) + '" y="' + (y + 37) + '" text-anchor="middle">' + esc(sub) + "</text>" : "");
  }
  function edge(x1, y1, x2, y2, cls, label) {
    var mid = cls.indexOf("violation") > -1 ? "url(#ah-fail)" : cls.indexOf("declared") > -1 ? "url(#ah-pass)" : "url(#ah-mut)";
    var l = label ? '<text class="edge-label" x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 5) + '" text-anchor="middle">' + esc(label) + "</text>" : "";
    return '<line class="edge-line ' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" marker-end="' + mid + '"/>' + l;
  }
  function hldSVG(v) {
    var s = '<svg class="svg-arch" viewBox="0 0 760 300" role="img" aria-label="System landscape">' + defs();
    s += box(40, 18, 130, 46, "Internet", "boundary", "");
    s += box(300, 18, 150, 52, "API Gateway", "system · T1 rule", "is-hld");
    s += box(40, 130, 130, 52, "Order", "domain:orders", "is-hld");
    s += box(230, 130, 130, 52, "Checkout", "tag:payments", "is-hld");
    s += box(420, 130, 130, 52, "InventoryDB", "kind:database", "is-hld");
    s += box(610, 130, 120, 52, "Profile", "container", "is-hld");
    s += box(420, 232, 130, 46, "Legacy", "system", "");
    s += edge(170, 44, 300, 46, "is-declared", "https");
    s += edge(375, 66, 130, 130, "is-declared", "");
    s += edge(375, 70, 295, 130, "is-declared", "");
    s += edge(170, 156, 420, 156, "", "async");
    s += edge(360, 156, 610, 156, "is-declared", "async");
    if (v) s += edge(120, 182, 470, 232, "is-violation", "sync · undeclared");
    return s + "</svg>";
  }
  function lldSVG(v) {
    var x = 90, w = 240;
    var s = '<svg class="svg-arch" viewBox="0 0 420 316" role="img" aria-label="Design layering">' + defs();
    s += box(x, 16, w, 52, "CheckoutController", "layer:controller", "is-lld");
    s += box(x, 96, w, 52, "CheckoutService", "layer:application", "is-lld");
    s += box(x, 176, w, 52, "OrderStorePort", "«interface» port", "is-lld");
    s += box(x, 256, w, 52, "OrderRepository", "layer:repository", "is-lld");
    s += edge(210, 68, 210, 96, "is-declared", "");
    s += edge(210, 148, 210, 176, "is-declared", "");
    s += edge(210, 256, 210, 228, "", "implements");
    if (v) s += '<path class="edge-line is-violation" d="M330 42 C 400 120, 400 220, 330 274" marker-end="url(#ah-fail)"/><text class="edge-label" x="404" y="160">skips layers</text>';
    return s + "</svg>";
  }

  /* =======================================================================
     Shared chrome: top navbar + sidebar menu + mobile offcanvas.
     Each page puts its content inside <template id="page">…</template>;
     this relocates it into the layout content column.
     ======================================================================= */
  var NAV = [
    { group: "Overview", items: [
      { file: "index.html", label: "Dashboard", ico: "bi-speedometer2" },
      { file: "how-it-works.html", label: "How it works", ico: "bi-diagram-3" },
    ]},
    { group: "For architects", items: [
      { file: "author.html", label: "Author a rule", ico: "bi-pencil-square", badge: "AI" },
      { file: "catalog.html", label: "Rule catalog", ico: "bi-collection" },
      { file: "model.html", label: "Architecture model", ico: "bi-diagram-2" },
      { file: "scorecards.html", label: "Scorecards", ico: "bi-clipboard-data" },
      { file: "exceptions.html", label: "Exceptions", ico: "bi-shield-exclamation" },
    ]},
    { group: "For developers", items: [
      { file: "pr-checks.html", label: "PR checks", ico: "bi-git", badge: String((D.scenarios || []).length) },
      { file: "ask.html", label: "Ask ArchGuard", ico: "bi-chat-dots", badge: "skill" },
    ]},
  ];

  function currentFile() {
    var f = location.pathname.split("/").pop();
    return f && f.length ? f : "index.html";
  }
  function menuHTML(active) {
    return NAV.map(function (g) {
      var items = g.items.map(function (it) {
        var on = it.file === active;
        return '<a href="' + it.file + '" class="ag-navlink' + (on ? " active" : "") + '">' +
          '<i class="bi ' + it.ico + '"></i><span>' + esc(it.label) + "</span>" +
          (it.badge ? '<span class="badge rounded-pill text-bg-secondary ms-auto">' + esc(it.badge) + "</span>" : "") + "</a>";
      }).join("");
      return '<div class="ag-navgroup"><div class="ag-navgroup__label">' + esc(g.group) + "</div>" + items + "</div>";
    }).join("");
  }
  function themeToggleHTML() {
    return '<button class="btn btn-sm btn-outline-secondary" id="ag-theme" type="button" title="Toggle light / dark"><i class="bi bi-moon-stars"></i></button>';
  }
  function navbarHTML(active) {
    return '<nav class="navbar navbar-expand-lg ag-topbar fixed-top">' +
      '<div class="container-fluid">' +
        '<button class="btn btn-sm btn-outline-light d-lg-none me-2" type="button" data-bs-toggle="offcanvas" data-bs-target="#agMenu"><i class="bi bi-list"></i></button>' +
        '<a class="navbar-brand d-flex align-items-center gap-2" href="index.html">' +
          '<i class="bi bi-shield-check text-info"></i><span class="fw-bold">ArchGuard</span>' +
          '<span class="ag-brand-sub d-none d-md-inline">Continuous Architecture Review</span>' +
        "</a>" +
        '<div class="ms-auto d-flex align-items-center gap-2">' +
          '<span class="badge rounded-pill text-bg-dark border border-secondary"><i class="bi bi-hdd-network me-1"></i>Prototype · no backend</span>' +
          themeToggleHTML() +
        "</div>" +
      "</div></nav>";
  }

  function buildLayout() {
    var active = currentFile();
    document.body.insertAdjacentHTML("afterbegin",
      navbarHTML(active) +
      '<aside class="ag-sidebar d-none d-lg-block">' + menuHTML(active) + "</aside>");
    document.body.insertAdjacentHTML("beforeend",
      '<div class="offcanvas offcanvas-start ag-offcanvas" tabindex="-1" id="agMenu">' +
        '<div class="offcanvas-header"><h5 class="offcanvas-title">Menu</h5><button type="button" class="btn-close" data-bs-dismiss="offcanvas"></button></div>' +
        '<div class="offcanvas-body">' + menuHTML(active) + "</div>" +
      "</div>");

    // theme
    var saved = null; try { saved = localStorage.getItem("ag-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-bs-theme", saved);
    document.addEventListener("click", function (e) {
      if (e.target.closest("#ag-theme")) {
        var dark = document.documentElement.getAttribute("data-bs-theme") === "dark";
        var next = dark ? "light" : "dark";
        document.documentElement.setAttribute("data-bs-theme", next);
        try { localStorage.setItem("ag-theme", next); } catch (e2) {}
      }
    });
  }

  /* expose for Alpine templates + pages */
  window.AG = {
    D: D, esc: esc, rulesById: rulesById,
    verdictBadge: verdictBadge, sevBadge: sevBadge, modeBadge: modeBadge, levelBadge: levelBadge, tierBadge: tierBadge,
    predicateHTML: predicateHTML, compile: compile, gateOf: gateOf, hldSVG: hldSVG, lldSVG: lldSVG,
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", buildLayout);
  else buildLayout();
})();
