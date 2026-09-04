/* =========================================================================
   ArchGuard · Continuous Architecture Review — app (no backend)
   Vanilla JS, classic script (works from file:// or a static server).
   Contains: hash router, two persona consoles, a deterministic client-side
   evaluator that mirrors archguard/evaluate.py, and a mock authoring-time
   compiler. All data comes from window.ArchGuardData — nothing is fetched.
   ========================================================================= */
(function () {
  "use strict";
  var D = window.ArchGuardData;

  /* ---------------- tiny helpers ---------------- */
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  var rulesById = {};
  D.rules.forEach(function (r) { rulesById[r.id] = r; });

  function vbadge(v) { return '<span class="badge" data-v="' + v + '"><span class="tick"></span>' + v + "</span>"; }
  function sevBadge(s) { return '<span class="badge" data-sev="' + s + '">' + s + "</span>"; }
  function modeBadge(m) { return '<span class="badge" data-sev="' + (m === "blocking" ? "block" : "advisory") + '">' + m + "</span>"; }
  function tierBadge(t) {
    var tier = D.tiers.filter(function (x) { return x.id === t; })[0];
    return '<span class="badge" data-tier="' + t + '" title="' + (tier ? esc(tier.name + " · " + tier.owner) : "") + '">' + t + (tier ? " " + tier.name : "") + "</span>";
  }
  function levelBadge(l) { return '<span class="badge" data-level="' + l + '">' + (l === "hld" ? "HLD" : "LLD") + "</span>"; }
  function predicate(tokens) {
    return '<pre class="code">' + tokens.map(function (t) {
      return t[0] === "t" ? esc(t[1]) : '<span class="' + t[0] + '">' + esc(t[1]) + "</span>";
    }).join("") + "</pre>";
  }

  /* ---------------- toasts ---------------- */
  function toast(msg, kind) {
    var host = $("#toasts");
    var el = document.createElement("div");
    el.className = "toast" + (kind ? " toast--" + kind : "");
    el.innerHTML = (kind === "ok" ? "✓ " : kind === "warn" ? "⚠ " : "› ") + msg;
    host.appendChild(el);
    setTimeout(function () { el.classList.add("is-out"); setTimeout(function () { el.remove(); }, 220); }, 3200);
  }

  /* ---------------- drawer ---------------- */
  function ensureDrawer() {
    if ($("#drawer")) return;
    var ov = document.createElement("div"); ov.className = "drawer-overlay"; ov.id = "drawerOverlay";
    var dr = document.createElement("aside"); dr.className = "drawer"; dr.id = "drawer";
    dr.innerHTML = '<div class="drawer__head"><div id="drawerHead"></div>' +
      '<button class="iconbtn drawer__close" id="drawerClose" aria-label="Close">✕</button></div>' +
      '<div class="drawer__body" id="drawerBody"></div>';
    document.body.appendChild(ov); document.body.appendChild(dr);
    ov.addEventListener("click", closeDrawer);
    $("#drawerClose").addEventListener("click", closeDrawer);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeDrawer(); });
  }
  function openDrawer(headHTML, bodyHTML) {
    ensureDrawer();
    $("#drawerHead").innerHTML = headHTML;
    $("#drawerBody").innerHTML = bodyHTML;
    $("#drawerOverlay").classList.add("is-open");
    $("#drawer").classList.add("is-open");
  }
  function closeDrawer() {
    if (!$("#drawer")) return;
    $("#drawerOverlay").classList.remove("is-open");
    $("#drawer").classList.remove("is-open");
  }

  /* =======================================================================
     Deterministic evaluator — mirrors archguard/evaluate.py semantics:
     undeclared cross-context deps, communication-mode mismatch, and
     declared-but-unrealized relationships. No edges are ever invented.
     ======================================================================= */
  function ctx(graph, id) {
    var n = graph.nodes.filter(function (x) { return x.id === id; })[0];
    if (!n) return id;
    return (n.context || String(n.name).split("/")[0]).toLowerCase().replace(/\s+/g, "");
  }
  function approvedMap(graph) {
    var m = {};
    graph.edges.forEach(function (e) {
      if (e.tier === "hld") m[ctx(graph, e.source) + "»" + ctx(graph, e.target)] = e;
    });
    return m;
  }
  function evidenceOf(e) { return e.line == null ? e.artifact : e.artifact + ":" + e.line; }

  function evaluate(graph, changed) {
    var findings = [], approved = approvedMap(graph), realized = {};
    graph.edges.forEach(function (e) {
      if (e.tier !== "lld" || (e.relation !== "CALLS" && e.relation !== "DEPLOYS_WITH")) return;
      var a = ctx(graph, e.source), b = ctx(graph, e.target), key = a + "»" + b;
      if (approved[key]) realized[key] = true;
      if (changed && changed.indexOf(e.artifact) === -1) return;
      if (a === b) return;
      var declared = approved[key];
      if (!declared) {
        findings.push({
          policyId: "ARC-DEP-002",
          severity: e.confidence >= 0.9 ? "block" : "advisory",
          message: "Undeclared cross-context dependency: " + a + " → " + b + ".",
          evidence: evidenceOf(e), pair: [a, b], mode: e.mode, confidence: e.confidence,
        });
        return;
      }
      if (declared.mode && e.mode && declared.mode !== e.mode) {
        findings.push({
          policyId: "ARC-COM-003", severity: "block",
          message: "Communication mode is " + e.mode + "; declared architecture requires " + declared.mode + ".",
          evidence: evidenceOf(e), pair: [a, b], mode: e.mode, confidence: e.confidence,
        });
      }
    });
    Object.keys(approved).forEach(function (key) {
      if (!realized[key]) {
        var d = approved[key], p = key.split("»");
        findings.push({
          policyId: "ARC-PHA-006", severity: "inform",
          message: "Declared relationship " + p[0] + " → " + p[1] + " has no implementation evidence.",
          evidence: evidenceOf(d), pair: p, mode: d.mode,
        });
      }
    });
    return findings;
  }

  /* =======================================================================
     Mock authoring-time compiler (English -> declarative predicate).
     The model never emits executable code; here we return curated outputs
     for the starter rules and a light heuristic otherwise.
     ======================================================================= */
  function compile(text) {
    var key = text.trim().toLowerCase();
    if (D.compiledExamples[key]) return D.compiledExamples[key];
    var t = key;
    if (/(complex|cyclomatic|secret|password|sql injection|\bnull\b|regex|\bloop\b|todo|variable name|indentation|test coverage|deadlock|memory leak|off by one)/.test(t)) {
      return { outcome: "rejected",
        nonGoal: "No primitive inspects a value, follows data, or reasons about control flow. That absence is the CodeQL boundary — this belongs in a linter, CodeQL or a secret scanner. ArchGuard governs architecture, not code values." };
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

  /* =======================================================================
     Router + state
     ======================================================================= */
  var state = {
    role: "architect", view: "landing",
    catalogTab: "all",
    scenario: D.scenarios[0].id,
    iterate: { dep: true, mode: "sync", declared: true },
    chat: [{ who: "bot", html: D.chatAnswers.__default__.text, foot: D.chatAnswers.__default__.foot }],
    model: { violation: false },
  };

  var NAV = {
    architect: [
      { id: "overview", label: "Overview", ico: "▦" },
      { id: "author", label: "Author rule", ico: "✎", badge: "AI" },
      { id: "catalog", label: "Rule catalog", ico: "▤", badge: String(D.rules.length) },
      { id: "model", label: "Architecture model", ico: "◇" },
      { id: "scorecards", label: "Scorecards", ico: "◎" },
      { id: "exceptions", label: "Exceptions", ico: "⚑", badge: String(D.exceptions.length) },
      { id: "health", label: "Rule health", ico: "♥" },
    ],
    developer: [
      { id: "prchecks", label: "PR checks", ico: "⎇", badge: String(D.scenarios.length) },
      { id: "iterate", label: "Iterate — live", ico: "↻" },
      { id: "ask", label: "Ask ArchGuard", ico: "✦", badge: "skill" },
      { id: "myscore", label: "My scorecard", ico: "◱" },
    ],
  };
  function defaultView(role) { return NAV[role][0].id; }

  function go(hash) { if (location.hash === hash) router(); else location.hash = hash; }

  function router() {
    var raw = location.hash.replace(/^#/, "");
    if (!raw || raw === "home" || raw === "landing") { state.view = "landing"; render(); return; }
    var parts = raw.split("/");
    if (parts[0] === "architect" || parts[0] === "developer") {
      state.role = parts[0];
      var v = parts[1] || defaultView(parts[0]);
      state.view = NAV[parts[0]].some(function (n) { return n.id === v; }) ? v : defaultView(parts[0]);
    } else { state.view = "landing"; }
    render();
  }

  /* =======================================================================
     Chrome: header, sidebar
     ======================================================================= */
  function renderChrome() {
    $$("#roleswitch .roleswitch__btn").forEach(function (b) {
      b.classList.toggle("is-active", state.view !== "landing" && b.dataset.role === state.role);
    });
    var shell = $("#shell"), sidebar = $("#sidebar"), main = $("#view");
    var landing = state.view === "landing";
    shell.classList.toggle("is-landing", landing);
    sidebar.classList.toggle("is-hidden", landing);
    main.classList.toggle("is-landing", landing);
    sidebar.innerHTML = landing ? "" : sidebarHTML();
  }
  function sidebarHTML() {
    var items = NAV[state.role].map(function (n) {
      return '<button class="navitem ' + (n.id === state.view ? "is-active" : "") + '" data-nav="' + n.id + '">' +
        '<span class="navitem__ico">' + n.ico + "</span>" + esc(n.label) +
        (n.badge ? '<span class="navitem__badge">' + esc(n.badge) + "</span>" : "") + "</button>";
    }).join("");
    var note = state.role === "architect"
      ? "<strong>Architect.</strong> Author the org architecture &amp; governance — rules compile once, then run on every PR."
      : "<strong>Developer.</strong> Consume the rules in the pipeline or via the skill. Iterate and see the review adapt continuously.";
    return '<div class="navgroup"><div class="navgroup__label">' + (state.role === "architect" ? "Governance" : "Delivery") + "</div>" + items + "</div>" +
      '<div class="persona-note">' + note + "</div>";
  }

  /* =======================================================================
     LANDING
     ======================================================================= */
  function Landing() {
    var loop = [
      { n: 1, t: "Author in English", s: "Architect writes a rule as a plain sentence", tag: "human" },
      { n: 2, t: "Compile once", s: "AI turns it into a deterministic predicate + fixtures", tag: "AI · authoring" },
      { n: 3, t: "Review as a diff", s: "Humans approve the compiled artifact in a policy PR", tag: "human" },
      { n: 4, t: "Replay every PR", s: "Deterministic gate — no LLM in the decision path", tag: "every change" },
      { n: 5, t: "Evolve", s: "Architecture drifts, rules update, the loop repeats", tag: "continuous" },
    ];
    var loopHTML = loop.map(function (x) {
      return '<div class="loopstep"><span class="loopstep__num">' + x.n + "</span>" +
        '<span class="loopstep__txt"><strong>' + esc(x.t) + "</strong><span>" + esc(x.s) + "</span></span>" +
        '<span class="loopstep__tag">' + esc(x.tag) + "</span></div>";
    }).join("");

    return '<section class="landing"><div class="landing__inner">' +
      '<div class="hero">' +
        "<div>" +
          '<div class="eyebrow">Architecture as Code · in the pull-request loop</div>' +
          '<h1>Stop reviewing architecture <span class="grad">once</span>.<br/>Review it <span class="grad">continuously</span>.</h1>' +
          '<p class="lede">' + esc(D.product.pitch) + " Two personas, two levels — low-level design (SOLID, layering) and high-level fitness functions — over one graph, one rule format, one deterministic gate.</p>" +
          '<div class="hero__cta">' +
            '<button class="btn btn--primary btn--lg" data-go="#architect">Enter as Architect →</button>' +
            '<button class="btn btn--lg" data-go="#developer">Enter as Developer →</button>' +
          "</div>" +
          '<div class="hero__meta">' +
            "<div><b>every PR</b> reviewed, not once per release</div>" +
            "<div><b>5</b> verdicts, zero silent passes</div>" +
            "<div><b>0</b> LLMs in the gate decision</div>" +
          "</div>" +
        "</div>" +
        '<div class="loop"><h4>The continuous loop</h4><div class="loopflow">' + loopHTML +
          '<div class="loop__return">↑ every change re-enters the loop — like continuous delivery, but for architecture</div>' +
        "</div></div>" +
      "</div>" +

      '<div class="section"><div class="ba">' +
        '<div class="ba__card ba--before"><h4>◔ Today · manual</h4><ul>' +
          "<li>Architecture lives in a Word doc, reviewed once at kickoff</li>" +
          "<li>Already stale by the time code ships</li>" +
          "<li>ARB meeting is a bottleneck; drift is invisible</li>" +
          "<li>No record of <em>why</em> a design was allowed</li>" +
        "</ul></div>" +
        '<div class="ba__arrow">→</div>' +
        '<div class="ba__card ba--after"><h4>◕ ArchGuard · continuous</h4><ul>' +
          "<li>Architecture is code; governance runs on every pull request</li>" +
          "<li>Findings carry policy ID + <span class='mono'>file:line</span> evidence</li>" +
          "<li>The board curates rules; the gate does the repetitive review</li>" +
          "<li>Rules evolve with the system — review is never &ldquo;done&rdquo;</li>" +
        "</ul></div>" +
      "</div></div>" +

      '<div class="section"><div class="section__title">Pick a persona to explore the prototype</div>' +
        '<div class="persona-cards">' +
          '<button class="persona persona--architect" data-go="#architect">' +
            '<div class="persona__ico">◑</div><h3>Architect</h3>' +
            "<p>Define the org architecture and governance. Author rules in plain English, watch them compile to predicates, and manage tiers, exceptions and rule health.</p>" +
            '<span class="persona__go">Overview · Author rule · Catalog · Model →</span>' +
          "</button>" +
          '<button class="persona persona--developer" data-go="#developer">' +
            '<div class="persona__ico">◐</div><h3>Developer</h3>' +
            "<p>Use the rules in your pipeline or via the skill. See PR gate results with evidence, ask architecture questions, and iterate live as the review adapts to each change.</p>" +
            '<span class="persona__go">PR checks · Iterate live · Ask ArchGuard →</span>' +
          "</button>" +
        "</div>" +
      "</div>" +

      '<div class="section"><div class="section__title">What makes it different</div>' +
        '<div class="features">' +
          feature("⛰", "Two levels, one graph", "LLD Design Rules (SOLID, layering, DIP) and HLD Fitness Functions (org → service) share one compiler and evaluator.") +
          feature("✎", "AI at authoring time only", "The model compiles English → predicate once. It never judges a PR, so verdicts are reproducible.") +
          feature("⚖", "Five honest verdicts", "PASS · FAIL · UNKNOWN · ERROR · SKIPPED. A selector matching nothing is UNKNOWN, never a silent pass.") +
          feature("↻", "Continuous by design", "Compile once, replay every PR, re-check the merge queue, sweep nightly. Architecture review never stops.") +
        "</div>" +
      "</div>" +

      '<div class="section center"><p class="muted small">Prototype · UI only · no backend, no live model calls. Every verdict shown here is computed in your browser from mock data faithful to <span class="mono">idea/00-final-idea.md</span>.</p></div>' +
    "</div></section>";
  }
  function feature(ico, title, body) {
    return '<div class="feature card"><div class="card__pad"><div class="feature__ico">' + ico + "</div><h4>" + esc(title) + "</h4><p>" + esc(body) + "</p></div></div>";
  }

  /* =======================================================================
     ARCHITECT · Overview
     ======================================================================= */
  function ArchOverview() {
    var overdue = D.rules.filter(function (r) { return r.health.overdue; }).length;
    var blocked30 = D.scorecard.org.reduce(function (s, d) { return s + d.blocked30d; }, 0);
    var activeExc = D.exceptions.filter(function (e) { return e.status !== "expired"; }).length;
    var stats =
      stat("Active rules", String(D.rules.length), "across LLD + HLD packs") +
      stat("Org pass rate · 30d", "91%", '<span class="up">▲ 2.4%</span> vs prev') +
      stat("PRs auto-reviewed · 30d", "312", "continuous, every change") +
      stat("Rules overdue for review", String(overdue), overdue ? "review_by elapsed" : "all current");

    var tiers = D.tiers.filter(function (t) { return t.id !== "X"; }).map(function (t) {
      var count = D.rules.filter(function (r) { return r.tier === t.id; }).length;
      return '<div class="dotlead"><span>' + tierBadge(t.id) + '</span><span class="lead">' + esc(t.owner) + "</span><span class='val'>" + count + " rules</span></div>";
    }).join("");

    var feed = D.activity.map(function (a) {
      return '<div class="tl-item is-' + a.kind + '"><div class="tl-item__t">' + esc(a.t) + '</div><div class="tl-item__b">' + a.text + "</div></div>";
    }).join("");

    var max = Math.max.apply(null, D.driftTrend.prs);
    var bars = D.driftTrend.prs.map(function (p, i) {
      var bl = D.driftTrend.blocked[i];
      return '<div class="spark__bar" style="height:' + Math.round(p / max * 100) + '%" title="' + D.driftTrend.labels[i] + ": " + p + " PRs, " + bl + ' blocked">' +
        '<i style="position:absolute;left:0;right:0;bottom:0;height:' + Math.round(bl / p * 100) + '%;background:var(--fail);border-radius:0 0 4px 4px;"></i></div>';
    }).join("");
    var xlabels = D.driftTrend.labels.map(function (l) { return "<span>" + l + "</span>"; }).join("");

    return pageHead("Governance overview", "Continuous architecture review across every team, tier and pull request — not a one-time sign-off.") +
      '<div class="grid cols-4" style="margin-bottom:var(--sp-5)">' + stats + "</div>" +
      '<div class="grid cols-2">' +
        '<div class="card"><div class="card__head"><h3>Continuous review activity</h3><span class="spacer"></span><span class="badge badge--soft">live feed</span></div>' +
          '<div class="card__body"><div class="timeline">' + feed + "</div></div></div>" +
        '<div class="stack">' +
          '<div class="card"><div class="card__head"><h3>PRs reviewed / blocked · 8 weeks</h3></div><div class="card__body">' +
            '<div class="spark">' + bars + '</div><div class="spark-x">' + xlabels + "</div>" +
            '<p class="small muted" style="margin:12px 0 0">Every bar is a week of pull requests auto-reviewed against the live rule set. Red = blocked by a fitness function or design rule.</p>' +
          "</div></div>" +
          '<div class="card"><div class="card__head"><h3>Rules by tier</h3></div><div class="card__body">' + tiers + "</div></div>" +
        "</div>" +
      "</div>" +
      '<div class="callout" style="margin-top:var(--sp-5)"><b>Where the manual review goes.</b> The architect&rsquo;s checklist becomes versioned rules; the board&rsquo;s job shifts from reading every PR to <b>curating rules, deciding exceptions and reviewing rule health</b>. <button class="btn btn--sm" data-nav="author" style="margin-left:8px">Author a rule →</button></div>';
  }

  /* =======================================================================
     ARCHITECT · Author rule (Policy Playground)
     ======================================================================= */
  function ArchAuthor() {
    var chips = D.starterRules.map(function (r, i) {
      return '<button class="chip" data-fill="' + i + '">' + esc(shorten(r, 46)) + "</button>";
    }).join("");
    var tierOpts = D.tiers.map(function (t) { return '<option value="' + t.id + '">' + t.id + " · " + esc(t.name) + "</option>"; }).join("");
    var html = pageHead("Author a rule", "Write governance in plain English. The compiler turns it into a deterministic predicate from a closed vocabulary — at authoring time only. This is the one place a model appears; it never judges a PR.") +
      '<div class="playground">' +
        '<div class="card"><div class="card__body">' +
          '<div class="field"><label>Rule <span class="hint">— plain English, one constraint</span></label>' +
            '<textarea class="textarea" id="ag-rule" placeholder="e.g. Payment systems must not synchronously depend on customer profile services during checkout."></textarea></div>' +
          '<div class="field"><label>Starter examples <span class="hint">— click to load</span></label><div class="chipset">' + chips + "</div></div>" +
          '<div class="field-row">' +
            '<div class="field"><label>Tier / owner</label><select class="select" id="ag-tier">' + tierOpts + "</select></div>" +
            '<div class="field"><label>Mode</label><select class="select" id="ag-mode"><option value="blocking">blocking</option><option value="advisory">advisory</option></select></div>' +
          "</div>" +
          '<div class="field"><label>Scope selector <span class="hint">— CODEOWNERS-matched</span></label><input class="input" id="ag-scope" value="tag:payments, container:Checkout API"/></div>' +
          '<button class="btn btn--primary" id="ag-compile">⚙ Compile rule</button>' +
        "</div></div>" +
        '<div class="card card--accent" id="ag-result-card"><div class="card__body" id="ag-result">' + compileEmpty() + "</div></div>" +
      "</div>";
    return { html: html, wire: wireAuthor };
  }
  function compileEmpty() {
    return '<div class="result-empty"><div><div class="big">⚙</div><strong>Compiled predicate appears here</strong>' +
      '<p class="small muted" style="max-width:38ch;margin:8px auto 0">Write a rule and press <span class="kbd">Compile</span>. The compiler returns one of three answers: <b>expressible</b>, <b>clarify</b>, or <b>rejected</b> — it never guesses.</p></div></div>';
  }
  function wireAuthor(root) {
    var ta = $("#ag-rule", root);
    $$(".chip[data-fill]", root).forEach(function (c) {
      c.addEventListener("click", function () { ta.value = D.starterRules[+c.dataset.fill]; ta.focus(); });
    });
    $("#ag-compile", root).addEventListener("click", function () {
      var text = ta.value.trim();
      if (!text) { toast("Write a rule first", "warn"); return; }
      $("#ag-result", root).innerHTML = compileResult(compile(text), text);
      wireResult(root);
    });
  }
  function wireResult(root) {
    var add = $("#ag-add", root);
    if (add) add.addEventListener("click", function () {
      toast("Compiled artifact staged in policy PR — awaiting human approval", "ok");
    });
    var sug = $("#ag-suggest", root);
    if (sug) sug.addEventListener("click", function () {
      $("#ag-rule", root).value = sug.dataset.text; $("#ag-rule", root).focus();
    });
  }
  function compileResult(res, text) {
    if (res.outcome === "rejected") {
      return '<div class="verdict-banner vb--bad"><div class="verdict-banner__ico">✕</div><div><h3>Rejected — outside the closed vocabulary</h3><p>The compiler quotes the matching non-goal instead of guessing.</p></div></div>' +
        '<div class="callout" style="border-left-color:var(--fail);background:color-mix(in srgb,var(--fail) 7%,var(--surface))"><b>Why:</b> ' + esc(res.nonGoal) + "</div>" +
        '<p class="small muted" style="margin-top:14px">The 15-primitive vocabulary is the guardrail that keeps ArchGuard architectural. If a sentence needs to inspect values or control flow, that is deliberately inexpressible here.</p>';
    }
    if (res.outcome === "clarify") {
      return '<div class="verdict-banner vb--warn"><div class="verdict-banner__ico">?</div><div><h3>Needs clarification</h3><p>Ambiguous as written — the compiler returns a rewording, it does not assume.</p></div></div>' +
        '<div class="callout" style="border-left-color:var(--unknown);background:color-mix(in srgb,var(--unknown) 8%,var(--surface))">' + esc(res.clarify) + "</div>" +
        '<p class="subhead" style="margin-top:16px">Suggested rewording</p>' +
        '<button class="chip is-active" id="ag-suggest" data-text="' + esc(res.suggestion) + '">↺ ' + esc(res.suggestion) + "</button>";
    }
    // expressible
    var conf = Math.round(res.confidence * 100);
    var fx = '<div class="fixtures"><div class="fixture fixture--pass"><div class="fixture__h">✓ PASS fixture</div><div class="fixture__b">' + esc(res.fixtures.pass) + "</div></div>" +
      '<div class="fixture fixture--fail"><div class="fixture__h">✕ FAIL fixture</div><div class="fixture__b">' + esc(res.fixtures.fail) + "</div></div></div>";
    return '<div class="verdict-banner vb--ok"><div class="verdict-banner__ico">✓</div><div><h3>Expressible' + (res.heuristic ? " (best-effort)" : "") + '</h3><p>Compiled to a declarative predicate. Review it as a diff, then approve.</p></div></div>' +
      '<dl class="kv"><dt>Canonical restatement</dt><dd>' + esc(res.restatement) + "</dd>" +
      "<dt>Primitive</dt><dd><span class='inline-code'>" + esc(res.primitive) + "</span> &nbsp;" + levelBadge(res.level) + "</dd>" +
      "<dt>Confidence</dt><dd><div class='meter'><div class='meter__fill' style='width:" + conf + "%'></div></div><span class='small muted'>" + conf + "% — " + (conf >= 85 ? "high" : "review carefully") + "</span></dd></dl>" +
      '<hr class="divider"/><p class="subhead">Compiled predicate <span class="faint">(closed vocabulary · 5–10 reviewable lines)</span></p>' + predicate(res.predicate) +
      (res.note ? '<p class="small muted" style="margin-top:6px">' + esc(res.note) + "</p>" : "") +
      '<p class="subhead" style="margin-top:16px">Generated fixtures <span class="faint">(run in CI on every policy change)</span></p>' + fx +
      '<div class="row" style="margin-top:16px"><button class="btn btn--primary" id="ag-add">✚ Add to policy PR</button><span class="small muted">Human approves the artifact — then the gate replays it every PR.</span></div>';
  }

  /* =======================================================================
     ARCHITECT · Rule catalog
     ======================================================================= */
  function ArchCatalog() {
    var tabs = [["all", "All rules"], ["hld", "Fitness Functions · HLD"], ["lld", "Design Rules · LLD"]];
    var tabsHTML = tabs.map(function (t) {
      return '<button class="tab ' + (state.catalogTab === t[0] ? "is-active" : "") + '" data-tab="' + t[0] + '">' + esc(t[1]) + "</button>";
    }).join("");
    var rows = D.rules.filter(function (r) { return state.catalogTab === "all" || r.level === state.catalogTab; })
      .map(function (r) {
        return '<tr class="clickable" data-rule="' + r.id + '"><td class="id">' + r.id + "</td>" +
          '<td class="title">' + esc(r.title) + '<div class="small faint">' + esc(r.pack) + " · " + esc(r.type) + "</div></td>" +
          "<td>" + levelBadge(r.level) + "</td><td>" + tierBadge(r.tier) + "</td>" +
          "<td>" + modeBadge(r.mode) + "</td><td class='mono small'>" + esc(r.review_by) + "</td></tr>";
      }).join("");
    var html = pageHead("Rule catalog", "Every rule is versioned governance-as-code: an ID cited in every report, an owner matched to CODEOWNERS, the compiled predicate, and the original prose. Click any rule for detail.") +
      '<div class="tabs">' + tabsHTML + "</div>" +
      '<div class="card card--flush"><div class="card__body"><table class="table"><thead><tr><th>ID</th><th>Title</th><th>Level</th><th>Tier</th><th>Mode</th><th>Review by</th></tr></thead><tbody>' +
      rows + "</tbody></table></div></div>";
    return { html: html, wire: wireCatalog };
  }
  function wireCatalog(root) {
    $$(".tab[data-tab]", root).forEach(function (t) {
      t.addEventListener("click", function () { state.catalogTab = t.dataset.tab; render(); });
    });
    $$("tr[data-rule]", root).forEach(function (tr) {
      tr.addEventListener("click", function () { openRule(rulesById[tr.dataset.rule]); });
    });
  }
  function openRule(r) {
    var head = "<div>" + levelBadge(r.level) + " " + tierBadge(r.tier) + " " + modeBadge(r.mode) +
      "<h2 style='margin-top:10px'>" + esc(r.title) + "</h2><span class='id mono'>" + r.id + "</span> <span class='small muted'>· owner " + esc(r.owner) + "</span></div>";
    var h = r.health;
    var body =
      '<p class="subhead">Rule (team&rsquo;s own words)</p><div class="finding__quote">' + esc(r.body) + "</div>" +
      '<p class="subhead" style="margin-top:16px">Compiled predicate</p>' + predicate(r.predicate) +
      '<p class="subhead" style="margin-top:16px">Primitive &amp; type</p><div class="row"><span class="inline-code">' + esc(r.primitive) + '</span><span class="badge badge--soft">' + esc(r.type) + '</span><span class="badge badge--soft">evidence: ' + esc(r.evidence) + "</span></div>" +
      '<p class="subhead" style="margin-top:16px">Fixtures</p><div class="fixtures"><div class="fixture fixture--pass"><div class="fixture__h">✓ PASS</div><div class="fixture__b">' + esc(r.fixtures.pass) + '</div></div><div class="fixture fixture--fail"><div class="fixture__h">✕ FAIL</div><div class="fixture__b">' + esc(r.fixtures.fail) + "</div></div></div>" +
      '<p class="subhead" style="margin-top:16px">Scope</p><div class="taglist">' + r.scope.map(function (s) { return '<span class="tag">' + esc(s) + "</span>"; }).join("") + "</div>" +
      '<p class="subhead" style="margin-top:16px">Rule health</p><dl class="kv">' +
        "<dt>Fires · 30d</dt><dd>" + h.fires + "</dd><dt>False-positive</dt><dd>" + Math.round(h.fp * 100) + "%</dd>" +
        "<dt>UNKNOWN rate</dt><dd>" + Math.round(h.unknown * 100) + "%</dd>" +
        "<dt>Flags</dt><dd>" + (h.vacuous ? '<span class="badge b-unknown">vacuously true</span> ' : "") + (h.overdue ? '<span class="badge b-fail">review overdue</span>' : (!h.vacuous ? '<span class="badge b-pass">healthy</span>' : "")) + "</dd>" +
        "<dt>Review by</dt><dd class='mono'>" + esc(r.review_by) + "</dd></dl>";
    openDrawer(head, body);
  }

  /* =======================================================================
     ARCHITECT · Architecture model (schematic diagrams)
     ======================================================================= */
  function ArchModel() {
    var html = pageHead("Architecture model", "One multilevel graph. The HLD system landscape drives Fitness Functions; the LLD design layering drives Design Rules. Declarations are governed inputs — a developer cannot relabel their way past a rule.") +
      '<div class="row between" style="margin-bottom:var(--sp-4)"><div class="tabs" style="margin:0"><span class="tab is-active">System landscape (HLD)</span></div>' +
        '<label class="switch"><input type="checkbox" id="ag-viol" ' + (state.model.violation ? "checked" : "") + '/><span class="switch__track"></span> Show a proposed violation</label></div>' +
      '<div class="card"><div class="card__body"><div class="diagram">' + hldSVG(state.model.violation) + "</div>" + legend() +
        '<div id="ag-model-note" style="margin-top:14px">' + modelNote(state.model.violation) + "</div>" +
      "</div></div>" +
      '<div class="tabs" style="margin:var(--sp-5) 0 var(--sp-4)"><span class="tab is-active">Design layering — Checkout API (LLD)</span></div>' +
      '<div class="card"><div class="card__body"><div class="diagram">' + lldSVG(state.model.violation) + "</div>" +
        '<p class="small muted" style="margin:12px 0 0">Dependency Inversion in structure: the domain points at the <b>port</b>, the repository <em>implements</em> it. A controller reaching the repository directly (red) violates <span class="inline-code">DR-LAYER-102</span>.</p>' +
      "</div></div>";
    return { html: html, wire: wireModel };
  }
  function wireModel(root) {
    var t = $("#ag-viol", root);
    if (t) t.addEventListener("change", function () { state.model.violation = t.checked; render(); });
  }
  function modelNote(v) {
    return v
      ? '<div class="verdict-banner vb--bad" style="margin:0"><div class="verdict-banner__ico">✕</div><div><h3>ORG-DATA-001 would FAIL</h3><p>The dashed red edge is a proposed cross-domain dependency (Orders → InventoryDB). Because declarations are governed, adding this edge is itself a policy change routed to the ARB.</p></div></div>'
      : '<div class="verdict-banner vb--ok" style="margin:0"><div class="verdict-banner__ico">✓</div><div><h3>Model is clean</h3><p>All declared relationships are within policy. Toggle the switch to see how a proposed edge is evaluated.</p></div></div>';
  }
  function legend() {
    return '<div class="legend">' +
      '<span><i style="border-color:var(--pass)"></i> declared &amp; allowed</span>' +
      '<span><i style="border-color:var(--muted)"></i> implementation edge</span>' +
      '<span><i style="border-color:var(--fail);border-top-style:dashed"></i> proposed violation</span></div>';
  }
  function svgBox(x, y, w, h, title, sub, cls) {
    return '<rect class="node-box ' + (cls || "") + '" x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="10"/>' +
      '<text class="node-label" x="' + (x + w / 2) + '" y="' + (y + (sub ? 22 : h / 2 + 4)) + '" text-anchor="middle">' + esc(title) + "</text>" +
      (sub ? '<text class="node-sub" x="' + (x + w / 2) + '" y="' + (y + 37) + '" text-anchor="middle">' + esc(sub) + "</text>" : "");
  }
  function svgEdge(x1, y1, x2, y2, cls, label) {
    var mid = cls.indexOf("violation") > -1 ? "url(#ah-fail)" : cls.indexOf("declared") > -1 ? "url(#ah-pass)" : "url(#ah-mut)";
    var l = label ? '<text class="edge-label" x="' + ((x1 + x2) / 2) + '" y="' + ((y1 + y2) / 2 - 5) + '" text-anchor="middle">' + esc(label) + "</text>" : "";
    return '<line class="edge-line ' + cls + '" x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" marker-end="' + mid + '"/>' + l;
  }
  function svgDefs() {
    return "<defs>" +
      marker("ah-mut", "#94a3b8") + marker("ah-pass", "#16a34a") + marker("ah-fail", "#dc2626") + "</defs>";
  }
  function marker(id, color) {
    return '<marker id="' + id + '" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="' + color + '"/></marker>';
  }
  function hldSVG(v) {
    var s = '<svg class="svg-arch" viewBox="0 0 760 300" role="img" aria-label="HLD system landscape">' + svgDefs();
    // boxes
    s += svgBox(40, 18, 130, 46, "Internet", "boundary", "");
    s += svgBox(300, 18, 150, 52, "API Gateway", "system · T1 rule", "is-hld");
    s += svgBox(40, 130, 130, 52, "Order", "domain:orders", "is-hld");
    s += svgBox(230, 130, 130, 52, "Checkout", "tag:payments", "is-hld");
    s += svgBox(420, 130, 130, 52, "InventoryDB", "kind:database", "is-hld");
    s += svgBox(610, 130, 120, 52, "Profile", "container", "is-hld");
    s += svgBox(420, 232, 130, 46, "Legacy", "system", "");
    // declared/impl edges
    s += svgEdge(170, 44, 300, 46, "is-declared", "https");
    s += svgEdge(375, 66, 130, 130, "is-declared", "");
    s += svgEdge(375, 70, 295, 130, "is-declared", "");
    s += svgEdge(170, 156, 420, 156, "", "async");
    s += svgEdge(360, 156, 610, 156, "is-declared", "async");
    if (v) s += svgEdge(120, 182, 470, 232, "is-violation", "sync · undeclared");
    s += "</svg>";
    return s;
  }
  function lldSVG(v) {
    var x = 90, w = 240;
    var s = '<svg class="svg-arch" viewBox="0 0 420 316" role="img" aria-label="LLD design layering">' + svgDefs();
    s += svgBox(x, 16, w, 52, "CheckoutController", "layer:controller", "is-lld");
    s += svgBox(x, 96, w, 52, "CheckoutService", "layer:application", "is-lld");
    s += svgBox(x, 176, w, 52, "OrderStorePort", "«interface» port", "is-lld");
    s += svgBox(x, 256, w, 52, "OrderRepository", "layer:repository", "is-lld");
    s += svgEdge(210, 68, 210, 96, "is-declared", "");
    s += svgEdge(210, 148, 210, 176, "is-declared", "");
    s += svgEdge(210, 256, 210, 228, "", "implements");
    if (v) s += '<path class="edge-line is-violation" d="M330 42 C 400 120, 400 220, 330 274" marker-end="url(#ah-fail)"/><text class="edge-label" x="404" y="160">skips layers</text>';
    s += "</svg>";
    return s;
  }

  /* =======================================================================
     ARCHITECT · Scorecards
     ======================================================================= */
  function ArchScorecards() {
    return pageHead("Scorecards", "Team and org posture, derived from the same findings the gate produces. Trends inform; finding-sets gate.") + scorecardBody(true);
  }
  function scorecardBody(org) {
    var t = D.scorecard.team;
    var team =
      '<div class="card"><div class="card__head"><h3>Team scorecard · ' + esc(t.name) + "</h3><span class='spacer'></span><span class='badge b-pass'>healthy</span></div><div class='card__body'>" +
        progressRow("Own-rule pass rate", t.ownRulePass) + progressRow("Org-rule pass rate", t.orgRulePass) +
        '<hr class="divider"/><div class="dotlead"><span class="lead">Active exceptions</span><span class="val">' + t.activeExceptions + "</span></div>" +
        '<div class="dotlead"><span class="lead">Recorded architecture debt</span><span class="val">' + t.debt + "</span></div>" +
        '<div class="dotlead"><span class="lead">Ratchet — no new cross-boundary deps</span><span class="val" style="color:var(--pass)">holding</span></div>' +
        '<div class="dotlead"><span class="lead">Recurring violation</span><span class="val small">' + esc(t.recurring[0]) + "</span></div>" +
      "</div></div>";
    if (!org) return team;
    var rows = D.scorecard.org.map(function (d) {
      var cls = d.posture === "Good" ? "b-pass" : d.posture === "At risk" ? "b-fail" : "b-unknown";
      return "<tr><td class='title'>" + esc(d.domain) + "</td><td><span class='badge " + cls + "'>" + esc(d.posture) + "</span></td><td>" + d.high + "</td><td>" + d.blocked30d + "</td></tr>";
    }).join("");
    var orgCard = '<div class="card card--flush"><div class="card__head"><h3>Org &amp; domain posture</h3></div><div class="card__body"><table class="table"><thead><tr><th>Domain</th><th>Posture</th><th>Open high-severity</th><th>Blocked · 30d</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
    return '<div class="grid cols-2">' + team + orgCard + "</div>";
  }
  function progressRow(label, val) {
    var pct = Math.round(val * 100);
    var color = pct >= 90 ? "var(--pass)" : pct >= 75 ? "var(--unknown)" : "var(--fail)";
    return '<div class="progress-row"><span class="muted">' + esc(label) + '</span><div class="progress-track"><div class="progress-fill" style="width:' + pct + "%;background:" + color + '"></div></div><span class="val">' + pct + "%</span></div>";
  }

  /* =======================================================================
     ARCHITECT · Exceptions
     ======================================================================= */
  function ArchExceptions() {
    var rows = D.exceptions.map(function (e) {
      var cls = e.status === "active" ? "b-pass" : e.status === "expiring" ? "b-unknown" : "b-fail";
      return "<tr><td class='id'>" + e.id + "</td><td class='mono small'>" + e.rule + "</td><td>" + esc(e.scope) + "</td><td class='small'>" + esc(e.approver) + "</td><td class='mono small'>" + e.adr + "</td><td class='mono small'>" + e.expiry + "</td><td><span class='badge " + cls + "'>" + e.status + "</span></td></tr>";
    }).join("");
    return pageHead("Exception register", "Every deviation is ADR-backed, time-boxed and self-terminating. An expired exception becomes a finding in its own right — scope narrowing is a relaxation, not a policy edit.") +
      '<div class="card card--flush"><div class="card__body"><table class="table"><thead><tr><th>ID</th><th>Rule</th><th>Scope</th><th>Approver</th><th>ADR</th><th>Expiry</th><th>Status</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      '<div class="callout" style="margin-top:var(--sp-4)"><b>EXC-030 has expired.</b> The suppressed finding (ReportingController → ReadModelRepository) is now live again and will block the next PR that touches it.</div>';
  }

  /* =======================================================================
     ARCHITECT · Rule health
     ======================================================================= */
  function ArchHealth() {
    var rows = D.rules.map(function (r) {
      var h = r.health;
      var flag = h.vacuous ? '<span class="badge b-unknown">vacuously true</span>' : h.overdue ? '<span class="badge b-fail">overdue</span>' : h.fp > 0.3 ? '<span class="badge b-unknown">noisy</span>' : '<span class="badge b-pass">healthy</span>';
      var act = (h.vacuous || h.overdue || h.fp > 0.3) ? '<button class="btn btn--sm" data-demote="' + r.id + '">Open demotion PR</button>' : '<span class="small faint">—</span>';
      return "<tr><td class='id'>" + r.id + "</td><td class='small'>" + esc(shorten(r.title, 34)) + "</td><td>" + h.fires + "</td><td>" + Math.round(h.fp * 100) + "%</td><td>" + Math.round(h.unknown * 100) + "%</td><td>" + flag + "</td><td>" + act + "</td></tr>";
    }).join("");
    var html = pageHead("Rule-health report", "The mechanism that keeps the gate trusted must itself be governed. Rule health recommends a demotion — a human merges the PR. Nothing is auto-relaxed.") +
      '<div class="card card--flush"><div class="card__body"><table class="table"><thead><tr><th>ID</th><th>Title</th><th>Fires·30d</th><th>FP rate</th><th>UNKNOWN</th><th>Health</th><th>Action</th></tr></thead><tbody>' + rows + "</tbody></table></div></div>" +
      '<div class="callout" style="margin-top:var(--sp-4)"><b>DR-EXPORT-105 is vacuously true</b> — its selector matches nothing, so it silently stops protecting anything. That is the most dangerous state for a gate, which is why it is surfaced here rather than counted as a pass.</div>';
    return { html: html, wire: function (root) {
      $$("[data-demote]", root).forEach(function (b) {
        b.addEventListener("click", function () { toast("Demotion PR opened for " + b.dataset.demote + " — needs human approval", "ok"); });
      });
    } };
  }

  /* =======================================================================
     DEVELOPER · PR checks
     ======================================================================= */
  function DevPR() {
    var sc = D.scenarios.filter(function (s) { return s.id === state.scenario; })[0];
    var chips = D.scenarios.map(function (s) {
      return '<button class="chip ' + (s.id === state.scenario ? "is-active" : "") + '" data-scn="' + s.id + '">' + esc(s.name) + "</button>";
    }).join("");
    var gate = gateOf(sc.ruleResults);
    var files = sc.pr.files.map(function (f) { return '<span class="fileitem ' + (f.changed ? "is-changed" : "") + '">' + esc(f.path) + "</span>"; }).join("");

    var cards = sc.ruleResults.filter(function (r) { return r.v === "FAIL" || r.v === "UNKNOWN" || r.v === "ERROR"; })
      .map(function (r) { return findingCard(r, sc); }).join("") || '<div class="emptybox">No blocking findings — every applicable rule passed. ✓</div>';

    var trace = sc.ruleResults.map(function (r) {
      var rl = rulesById[r.rule];
      return '<div class="dotlead"><span>' + vbadge(r.v) + '</span><span class="lead"><span class="mono small">' + r.rule + "</span> — " + esc(rl ? rl.title : "") + (r.why ? ' <span class="faint">· ' + esc(r.why) + "</span>" : "") + "</span></div>";
    }).join("");

    var html = pageHead("Pull-request checks", "This is the gate in the pipeline. The evaluator replays every applicable compiled predicate over the base and head graphs, then reports on the delta — same input, same verdict, every time.") +
      '<div class="chipset" style="margin-bottom:var(--sp-4)">' + chips + "</div>" +
      '<div class="prhead"><span class="badge badge--soft">PR #' + sc.pr.num + '</span><b>' + esc(sc.pr.title) + '</b><span class="prhead__branch">' + esc(sc.pr.branch) + '</span><span class="small muted">@' + esc(sc.pr.author) + "</span></div>" +
      '<div class="filelist">' + files + "</div>" +
      '<div style="margin-top:var(--sp-4)"><div class="verdict-banner ' + gate.klass + '"><div class="verdict-banner__ico">' + gate.ico + "</div><div><h3>" + esc(gate.title) + "</h3><p>" + esc(gate.sub) + "</p></div></div></div>" +
      '<div class="grid cols-2" style="margin-top:var(--sp-2)">' +
        '<div><p class="subhead">Findings on this delta</p>' + cards + "</div>" +
        '<div><p class="subhead">Policy resolution trace</p><div class="card"><div class="card__body">' + trace +
          '<p class="small muted" style="margin-top:12px">A gate that cannot explain <b>why it stayed silent</b> is as untrustworthy as one that cannot explain why it fired. SKIPPED and UNKNOWN are shown, never hidden.</p></div></div></div>' +
      "</div>";
    return { html: html, wire: function (root) {
      $$("[data-scn]", root).forEach(function (c) { c.addEventListener("click", function () { state.scenario = c.dataset.scn; render(); }); });
    } };
  }
  function gateOf(results) {
    var has = function (v) { return results.some(function (r) { return r.v === v; }); };
    if (has("ERROR")) return { klass: "vb--bad", ico: "!", title: "Check errored — merge blocked", sub: "A provider failed. An architecture gate never goes silently green on error." };
    if (has("FAIL")) return { klass: "vb--bad", ico: "✕", title: "Merge blocked — architecture violation", sub: "A blocking rule failed on the delta this PR introduced. Pre-existing findings are recorded as debt, not blamed on this author." };
    if (has("UNKNOWN")) return { klass: "vb--warn", ico: "?", title: "Needs attention — UNKNOWN verdicts present", sub: "Some rules could not be decided on available evidence. UNKNOWN is never a pass." };
    return { klass: "vb--ok", ico: "✓", title: "All applicable rules passed", sub: "This change respects the declared architecture. Replayed deterministically — no LLM in the decision path." };
  }
  function findingCard(r, sc) {
    var rl = rulesById[r.rule] || { title: r.rule, body: "", primitive: "", evidence: "" };
    var ev = primaryEvidence(sc);
    var head = '<div class="finding__top">' + vbadge(r.v) + '<span class="mono small">' + r.rule + "</span>" + (rl.tier ? tierBadge(rl.tier) : "") + (rl.mode ? modeBadge(rl.mode) : "") + "</div>";
    var body = '<div class="finding__msg">' + esc(rl.title) + "</div>";
    if (r.why) body += '<div class="small muted" style="margin-top:4px">' + esc(r.why) + "</div>";
    if (rl.body) body += '<div class="finding__quote">' + esc(rl.body) + "</div>";
    var evLine = (r.v === "FAIL" && ev) ? '<div class="finding__ev">▚ <a href="#">' + esc(ev) + "</a> <span class='faint'>· " + esc(rl.evidence || "architecture-model") + "</span></div>" :
      '<div class="finding__ev faint">▚ evidence provider: ' + esc(rl.evidence || "architecture-model") + "</div>";
    var trace = '<div class="trace" style="margin-top:10px"><span class="faint">graph path:</span> <span class="path">' + esc((rl.primitive || "predicate")) + "</span> → " + vbadge(r.v) + "</div>";
    var remedy = r.v === "FAIL" && rl.fixtures ? '<div class="remedy"><b>Safer design:</b> ' + esc(rl.fixtures.pass) + ". <span class='muted'>Request an exception only via ADR.</span></div>" : "";
    return '<div class="finding">' + head + body + evLine + trace + remedy + "</div>";
  }
  function primaryEvidence(sc) {
    var best = null;
    sc.graph.edges.forEach(function (e) {
      if (e.tier === "lld" && e.relation === "CALLS" && (!best || (e.confidence || 0) > (best.confidence || 0))) best = e;
    });
    return best ? evidenceOf(best) : null;
  }

  /* =======================================================================
     DEVELOPER · Iterate (live, continuous re-evaluation)
     ======================================================================= */
  function DevIterate() {
    var cfg = state.iterate;
    var graph = buildIterate(cfg);
    var findings = evaluate(graph);
    var block = findings.some(function (f) { return f.severity === "block"; });
    var advisory = findings.some(function (f) { return f.severity === "advisory"; });
    var gate = block ? { klass: "vb--bad", ico: "✕", title: "Would block this PR", sub: "A blocking rule fails on the current shape." }
      : advisory ? { klass: "vb--warn", ico: "!", title: "Advisory finding", sub: "Surfaced, but does not block." }
      : { klass: "vb--ok", ico: "✓", title: "Would pass", sub: "The current shape respects the declared architecture." };

    var findHTML = findings.length ? findings.map(function (f) {
      var sevV = f.severity === "block" ? "FAIL" : f.severity === "advisory" ? "UNKNOWN" : "PASS";
      return '<div class="finding"><div class="finding__top">' + sevBadge(f.severity) + '<span class="mono small">' + f.policyId + "</span></div>" +
        '<div class="finding__msg">' + esc(f.message) + '</div><div class="finding__ev">▚ ' + esc(f.evidence) + (f.confidence ? " <span class='faint'>· confidence " + f.confidence + "</span>" : "") + "</div></div>";
    }).join("") : '<div class="emptybox">No findings — the implementation matches the declared architecture. ✓</div>';

    var html = pageHead("Iterate — continuous review", "Architecture review is not a one-off. Change the design below and the gate re-evaluates instantly — exactly what runs on every commit. Same engine, same verdicts as the pipeline.") +
      '<div class="grid cols-2">' +
        '<div class="card"><div class="card__head"><h3>Proposed design · Checkout → Profile</h3></div><div class="card__body">' +
          '<label class="switch" style="margin-bottom:14px"><input type="checkbox" id="it-dep" ' + (cfg.dep ? "checked" : "") + '/><span class="switch__track"></span> Checkout depends on Profile</label>' +
          '<div class="field"><label>Communication mode</label><div class="chipset">' +
            '<button class="chip ' + (cfg.mode === "sync" ? "is-active" : "") + '" data-mode="sync">sync · HTTP</button>' +
            '<button class="chip ' + (cfg.mode === "async" ? "is-active" : "") + '" data-mode="async">async · events</button></div></div>' +
          '<label class="switch" style="margin-top:14px"><input type="checkbox" id="it-decl" ' + (cfg.declared ? "checked" : "") + '/><span class="switch__track"></span> Declared in architecture (async projection)</label>' +
          '<hr class="divider"/><div class="diagram" style="background:var(--surface-2)">' + iterateSVG(cfg, findings) + "</div>" +
          '<p class="small muted" style="margin-top:10px">Declarations are governed inputs. Turning the declaration off is itself a policy change — you can&rsquo;t relabel your way to green.</p>' +
        "</div></div>" +
        '<div class="stack">' +
          '<div class="verdict-banner ' + gate.klass + '" style="margin:0"><div class="verdict-banner__ico">' + gate.ico + "</div><div><h3>" + esc(gate.title) + "</h3><p>" + esc(gate.sub) + "</p></div></div>" +
          '<div><p class="subhead">Live findings <span class="faint">(recomputed on every change)</span></p>' + findHTML + "</div>" +
          '<div class="card"><div class="card__body"><p class="subhead">The four outcomes</p>' +
            '<div class="dotlead"><span class="lead">async + declared</span><span class="val b-pass" style="color:var(--pass)">realized → PASS</span></div>' +
            '<div class="dotlead"><span class="lead">sync + declared (async)</span><span class="val" style="color:var(--fail)">mode mismatch → FAIL</span></div>' +
            '<div class="dotlead"><span class="lead">any mode + not declared</span><span class="val" style="color:var(--fail)">undeclared → FAIL</span></div>' +
            '<div class="dotlead"><span class="lead">no dependency</span><span class="val" style="color:var(--sev-inform)">declared-not-realized → inform</span></div>' +
          "</div></div>" +
        "</div>" +
      "</div>";
    return { html: html, wire: wireIterate };
  }
  function buildIterate(cfg) {
    var nodes = D.iterate.nodes.slice();
    var edges = [];
    if (cfg.declared) edges.push({ source: "hld:payments", target: "hld:profile", tier: "hld", relation: "ALLOWS", mode: "async", artifact: "workspace.dsl" });
    if (cfg.dep) edges.push({ source: "lld:payments", target: "lld:profile", tier: "lld", relation: "CALLS", mode: cfg.mode, artifact: "src/checkout/profile.ts", line: 41, confidence: 0.96 });
    return { nodes: nodes, edges: edges };
  }
  function iterateSVG(cfg, findings) {
    var block = findings.some(function (f) { return f.severity === "block"; });
    var inform = findings.some(function (f) { return f.policyId === "ARC-PHA-006"; });
    var cls = !cfg.dep ? (cfg.declared ? "is-missing" : "") : block ? "is-violation" : "is-declared";
    var label = !cfg.dep ? (cfg.declared ? "declared, no impl" : "") : cfg.mode + (block ? " ✕" : " ✓");
    var s = '<svg class="svg-arch" viewBox="0 0 420 120" role="img">' + svgDefs();
    s += svgBox(20, 34, 160, 52, "Checkout API", "tag:payments", "is-lld");
    s += svgBox(240, 34, 160, 52, "Profile", "container", "is-hld");
    if (cfg.dep || cfg.declared) {
      var mid = cls.indexOf("violation") > -1 ? "url(#ah-fail)" : cls.indexOf("declared") > -1 ? "url(#ah-pass)" : "url(#ah-mut)";
      s += '<line class="edge-line ' + cls + '" x1="180" y1="60" x2="240" y2="60" marker-end="' + mid + '"/>';
      if (label) s += '<text class="edge-label" x="210" y="52" text-anchor="middle">' + esc(label) + "</text>";
    }
    s += "</svg>";
    return s;
  }
  function wireIterate(root) {
    var dep = $("#it-dep", root), decl = $("#it-decl", root);
    if (dep) dep.addEventListener("change", function () { state.iterate.dep = dep.checked; render(); });
    if (decl) decl.addEventListener("change", function () { state.iterate.declared = decl.checked; render(); });
    $$("[data-mode]", root).forEach(function (b) {
      b.addEventListener("click", function () { state.iterate.mode = b.dataset.mode; render(); });
    });
  }

  /* =======================================================================
     DEVELOPER · Ask ArchGuard (skill)
     ======================================================================= */
  function DevAsk() {
    var sugg = D.chatSuggestions.map(function (q) { return '<button class="chip" data-q="' + esc(q) + '">' + esc(q) + "</button>"; }).join("");
    var log = state.chat.map(function (m) {
      if (m.who === "user") return '<div class="msg msg--user"><div class="msg__av">you</div><div class="msg__bubble">' + esc(m.text) + "</div></div>";
      return '<div class="msg msg--bot"><div class="msg__av">◈</div><div class="msg__bubble"><p>' + m.html + "</p>" +
        (m.ascii ? '<div class="ascii">' + esc(m.ascii) + "</div>" : "") +
        (m.foot ? '<p class="small muted" style="margin:8px 0 0">' + m.foot + "</p>" : "") + "</div></div>";
    }).join("");
    var html = pageHead("Ask ArchGuard", "The skill answers architecture questions over the model and the compiled rules. It explains — the gate decision still runs deterministic predicates, with no model in the path.") +
      '<div class="chipset" style="margin-bottom:var(--sp-3)">' + sugg + "</div>" +
      '<div class="card"><div class="chat"><div class="chat__log" id="ask-log">' + log + "</div>" +
        '<div class="chat__compose"><input class="input" id="ask-input" placeholder="Ask about blast radius, single points of failure, why a rule fails…"/><button class="btn btn--primary" id="ask-send">Send</button></div>' +
      "</div></div>";
    return { html: html, wire: wireAsk };
  }
  function wireAsk(root) {
    var input = $("#ask-input", root);
    function send(q) {
      q = (q || input.value).trim(); if (!q) return;
      state.chat.push({ who: "user", text: q });
      var a = D.chatAnswers[q.toLowerCase()] || D.chatAnswers.__default__;
      state.chat.push({ who: "bot", html: a.text, ascii: a.ascii, foot: a.foot });
      input.value = "";
      render();
      var logEl = $("#ask-log"); if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }
    $("#ask-send", root).addEventListener("click", function () { send(); });
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
    $$("[data-q]", root).forEach(function (c) { c.addEventListener("click", function () { send(c.dataset.q); }); });
    var logEl = $("#ask-log", root); if (logEl) logEl.scrollTop = logEl.scrollHeight;
  }

  function DevScore() {
    return pageHead("My scorecard", "Your team&rsquo;s standing against its own design rules and inherited org fitness functions — updated continuously, not at release time.") + scorecardBody(false) +
      '<div class="callout" style="margin-top:var(--sp-4)"><b>Recorded debt is not your fault line.</b> Pre-existing findings are attributed to the baseline; the gate only blocks on what your PR introduces.</div>';
  }

  /* =======================================================================
     view registry + shared bits
     ======================================================================= */
  var BUILD = {
    "architect/overview": ArchOverview, "architect/author": ArchAuthor, "architect/catalog": ArchCatalog,
    "architect/model": ArchModel, "architect/scorecards": ArchScorecards, "architect/exceptions": ArchExceptions,
    "architect/health": ArchHealth,
    "developer/prchecks": DevPR, "developer/iterate": DevIterate, "developer/ask": DevAsk, "developer/myscore": DevScore,
  };
  function pageHead(title, sub) {
    return '<div class="page-head"><div class="eyebrow">' + (state.role === "architect" ? "Architect" : "Developer") + " · " + esc(D.product.tagline) + '</div><h1>' + esc(title) + '</h1><p class="sub">' + esc(sub) + "</p></div>";
  }
  function stat(label, value, meta) {
    return '<div class="stat"><div class="stat__label">' + esc(label) + '</div><div class="stat__value">' + value + '</div><div class="stat__meta">' + meta + "</div></div>";
  }
  function shorten(s, n) { return s.length > n ? s.slice(0, n - 1) + "…" : s; }

  function render() {
    renderChrome();
    var view = $("#view");
    if (state.view === "landing") { view.innerHTML = Landing(); window.scrollTo(0, 0); return; }
    var key = state.role + "/" + state.view;
    var build = Object.prototype.hasOwnProperty.call(BUILD, key) ? BUILD[key] : null;
    var out = typeof build === "function" ? build() : "<div class='emptybox'>Not found</div>";
    if (typeof out === "string") { view.innerHTML = out; }
    else { view.innerHTML = out.html; if (out.wire) out.wire(view); }
    closeDrawer();
    window.scrollTo(0, 0);
  }

  /* ---------------- boot ---------------- */
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem("ag-theme"); } catch (e) {}
    if (saved) document.documentElement.setAttribute("data-theme", saved);
    setThemeIcon();
  }
  function setThemeIcon() {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var i = $("[data-theme-icon]"); if (i) i.textContent = dark ? "☀" : "☾";
  }
  document.addEventListener("click", function (e) {
    var roleBtn = e.target.closest("[data-role]");
    if (roleBtn) { go("#" + roleBtn.dataset.role); return; }
    var nav = e.target.closest("[data-nav]");
    if (nav) { go("#" + state.role + "/" + nav.dataset.nav); return; }
    var goEl = e.target.closest("[data-go]");
    if (goEl) { go(goEl.dataset.go); return; }
    if (e.target.closest("#brand")) { go("#home"); }
  });
  document.getElementById("themeToggle").addEventListener("click", function () {
    var dark = document.documentElement.getAttribute("data-theme") === "dark";
    var next = dark ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("ag-theme", next); } catch (e) {}
    setThemeIcon();
  });
  window.addEventListener("hashchange", router);
  initTheme();
  router();
})();
