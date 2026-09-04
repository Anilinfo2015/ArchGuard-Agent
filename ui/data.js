/* =========================================================================
   ArchGuard · Continuous Architecture Review — mock data (no backend)
   Every value here is illustrative/hard-coded for the prototype. It mirrors
   the finalized product in idea/00-final-idea.md:
     - two policy packs: Design Rules (LLD) + Fitness Functions (HLD)
     - a closed primitive set (AI compiles English -> predicate at authoring time)
     - five verdicts (PASS / FAIL / UNKNOWN / ERROR / SKIPPED)
     - deterministic, evidence-bound gate replayed on EVERY pull request
   ========================================================================= */
window.ArchGuardData = (function () {
  "use strict";

  const product = {
    name: "ArchGuard",
    tagline: "Continuous Architecture Review",
    pitch: "Architecture governance that runs on every change — like CI/CD, but for your architecture.",
  };

  /* ---- The multi-tier scope model (idea 00, Component 2) ---- */
  const tiers = [
    { id: "T0", name: "Regulatory", owner: "Security & Compliance", scope: "Company-wide, non-negotiable architecture mandates (e.g. trust-boundary placement)", change: "Formal board review", color: "T0" },
    { id: "T1", name: "Org", owner: "Enterprise Architecture", scope: "Every system in the company", change: "Enterprise architecture review", color: "T1" },
    { id: "T2", name: "Domain", owner: "Domain architect", scope: "One domain / bounded-context group", change: "Domain review", color: "T2" },
    { id: "T3", name: "Team", owner: "Owning team", scope: "The services a team owns", change: "Normal team pull request", color: "T3" },
    { id: "T4", name: "Service", owner: "Service owner", scope: "One service / one repository", change: "Service owner pull request", color: "T4" },
    { id: "X", name: "Exception", owner: "Named approver", scope: "One rule, one scope, one expiry", change: "ADR-backed, time-boxed, self-expiring", color: "X" },
  ];

  /* ---- The closed primitive set (the anti-CodeQL guardrail) ---- */
  const primitives = {
    structural: [
      "may-not-depend-on", "must-depend-only-on-abstractions", "must-be-instantiated-via",
      "must-reside-in", "must-implement", "must-not-be-exported", "must-not-cycle",
      "must-not-exceed(metric, budget)", "must-not-regress(finding-set)",
      "must-be-annotated-with", "must-cross-via",
    ],
    reuse: [
      "must-obtain-capability-via", "must-reuse", "must-not-exceed-count", "must-not-introduce",
    ],
  };

  /* ---- Five verdicts (a gate that only says pass/fail will lie) ---- */
  const verdicts = [
    { id: "PASS", meaning: "Evaluated; no violation", gate: "Proceed" },
    { id: "FAIL", meaning: "Evaluated; violation found", gate: "Blocks at blocking tiers" },
    { id: "UNKNOWN", meaning: "Not decidable on available evidence", gate: "Never a pass; surfaces loudly" },
    { id: "ERROR", meaning: "Provider, parse or binding failure", gate: "Blocks the check itself" },
    { id: "SKIPPED", meaning: "Out of scope, superseded, or covered by a live exception", gate: "Reported with the reason" },
  ];

  const modeBadge = (m) => (m === "blocking" ? "block" : "advisory");

  /* ---- Architecture rules: Fitness Functions (HLD) + Design Rules (LLD) ---- */
  const rules = [
    /* ----- HLD : Fitness Functions ----- */
    {
      id: "ORG-ISO-000", level: "hld", pack: "Fitness Functions", tier: "T0", type: "structural",
      title: "Sensitive data must stay inside its owning domain",
      owner: "arb", scope: ["boundary:payments-data"], severity: "high", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-09-30", status: "active",
      primitive: "must-reside-in",
      body: "A container that reads, stores or forwards payment data must stay inside the boundary of the domain that owns it. No dependency may carry that data across a domain boundary.",
      predicate: [["k","element"],["t"," where "],["p","dataClass == \"payment\""],["t","\n  "],["k","must-reside-in"],["t"," "],["s","boundary:payments-data"]],
      fixtures: { pass: "Tokenizer stays inside the payments boundary", fail: "An analytics job outside the boundary reads raw payment data" },
      health: { fires: 0, fp: 0.0, unknown: 0.02, vacuous: false, overdue: false, last: "—" },
    },
    {
      id: "ORG-DATA-001", level: "hld", pack: "Fitness Functions", tier: "T1", type: "structural",
      title: "No shared datastore across domains",
      owner: "arb", scope: ["level:system"], severity: "high", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-09-30", status: "active",
      primitive: "may-not-depend-on",
      body: "A container owned by one domain may not depend on a database owned by another domain. Cross-domain data is exchanged through an owned API or events, never a shared schema.",
      predicate: [["k","container"],["t"," where "],["p","domain != db.domain"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","kind:database"]],
      fixtures: { pass: "Orders reads its own OrdersDB", fail: "Orders reads InventoryDB directly" },
      health: { fires: 3, fp: 0.0, unknown: 0.01, vacuous: false, overdue: false, last: "2h ago" },
    },
    {
      id: "ORG-GW-002", level: "hld", pack: "Fitness Functions", tier: "T1", type: "structural",
      title: "All external traffic must enter through the API gateway",
      owner: "arb", scope: ["boundary:internet"], severity: "high", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-08-15", status: "active",
      primitive: "must-cross-via",
      body: "Any relationship that originates outside the trust boundary and terminates at an internal container must pass through the API Gateway container.",
      predicate: [["k","relationship"],["t"," from "],["p","external"],["t"," to "],["p","internal"],["t","\n  "],["k","must-cross-via"],["t"," "],["s","container:API Gateway"]],
      fixtures: { pass: "Web app -> Gateway -> Orders", fail: "Web app -> Orders (bypasses gateway)" },
      health: { fires: 1, fp: 0.0, unknown: 0.0, vacuous: false, overdue: false, last: "1d ago" },
    },
    {
      id: "ORG-REUSE-004", level: "hld", pack: "Fitness Functions", tier: "T1", type: "reuse",
      title: "New features must reuse the shared Notification Service",
      owner: "arb", scope: ["capability:notifications"], severity: "medium", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-07-31", status: "active",
      primitive: "must-obtain-capability-via",
      body: "A feature that needs to send notifications must obtain that capability from the registered shared Notification Service. Introducing a new first-party notification app is not permitted.",
      predicate: [["k","feature"],["t"," needing "],["p","capability:notifications"],["t","\n  "],["k","must-obtain-capability-via"],["t"," "],["s","service:Notification Service"]],
      fixtures: { pass: "Promo feature calls Notification Service", fail: "Promo feature ships its own SMS sender" },
      health: { fires: 2, fp: 0.5, unknown: 0.0, vacuous: false, overdue: false, last: "5h ago" },
    },
    {
      id: "DOM-ORD-003", level: "hld", pack: "Fitness Functions", tier: "T2", type: "structural",
      title: "Order domain must not depend on the Legacy monolith",
      owner: "orders-domain", scope: ["domain:orders"], severity: "high", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-05-31", status: "active",
      primitive: "may-not-depend-on",
      body: "No container in the Orders domain may hold a synchronous dependency on the Legacy monolith. Migration paths run through an anti-corruption layer approved by exception.",
      predicate: [["k","container"],["t"," in "],["p","domain:orders"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","system:Legacy"]],
      fixtures: { pass: "Orders API -> Orders services only", fail: "Orders API -> Legacy.Billing (sync)" },
      health: { fires: 6, fp: 0.16, unknown: 0.0, vacuous: false, overdue: true, last: "20m ago" },
    },
    {
      id: "PAY-014", level: "hld", pack: "Fitness Functions", tier: "T3", type: "structural",
      title: "Checkout must not synchronously depend on customer profile",
      owner: "payments", scope: ["tag:payments", "container:Checkout API"], severity: "high", mode: "blocking",
      evidence: "architecture-model", review_by: "2026-12-31", status: "active",
      primitive: "may-not-depend-on",
      body: "During checkout, payment systems must not make a synchronous call to any customer profile service. Profile data needed at checkout must come from a locally owned projection kept up to date by events.",
      predicate: [["k","container:Checkout API"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","container:Profile"],["t"," where "],["p","mode == sync"]],
      fixtures: { pass: "Checkout reads local profile projection (async-fed)", fail: "Checkout -> Profile over HTTP (sync)" },
      health: { fires: 4, fp: 0.0, unknown: 0.0, vacuous: false, overdue: false, last: "12m ago" },
    },
    {
      id: "SVC-INV-021", level: "hld", pack: "Fitness Functions", tier: "T4", type: "operational",
      title: "Inventory service fan-out must not exceed 5",
      owner: "inventory", scope: ["service:Inventory"], severity: "medium", mode: "advisory",
      evidence: "architecture-model (trend)", review_by: "2026-10-31", status: "active",
      primitive: "must-not-exceed(fan-out, 5)",
      body: "The Inventory service should not synchronously call more than five downstream services. This is an evolutionary metric: it is reported as a trend and does not block.",
      predicate: [["k","service:Inventory"],["t","\n  "],["k","must-not-exceed"],["t","("],["p","fan-out"],["t",", "],["n","5"],["t",")"]],
      fixtures: { pass: "fan-out = 4", fail: "fan-out = 7 (trend only, advisory)" },
      health: { fires: 9, fp: 0.11, unknown: 0.0, vacuous: false, overdue: false, last: "3h ago" },
    },

    /* ----- LLD : Design Rules ----- */
    {
      id: "DR-DIP-101", level: "lld", pack: "Design Rules", tier: "T3", type: "structural",
      title: "Domain layer must depend only on abstractions",
      owner: "payments", scope: ["layer:domain", "service:Checkout API"], severity: "high", mode: "blocking",
      evidence: "dependency-cruiser / ArchUnit", review_by: "2026-11-30", status: "active",
      primitive: "must-depend-only-on-abstractions",
      body: "Types in the domain layer must depend only on interfaces (ports), never on concrete infrastructure classes. This is the Dependency Inversion Principle expressed structurally.",
      predicate: [["k","type"],["t"," in "],["p","layer:domain"],["t","\n  "],["k","must-depend-only-on-abstractions"]],
      fixtures: { pass: "OrderService depends on PaymentPort", fail: "OrderService depends on StripeHttpClient" },
      health: { fires: 5, fp: 0.0, unknown: 0.04, vacuous: false, overdue: false, last: "40m ago" },
    },
    {
      id: "DR-LAYER-102", level: "lld", pack: "Design Rules", tier: "T3", type: "structural",
      title: "Controllers may not depend on repositories directly",
      owner: "payments", scope: ["layer:controller", "service:Checkout API"], severity: "high", mode: "blocking",
      evidence: "dependency-cruiser / ArchUnit", review_by: "2026-11-30", status: "active",
      primitive: "may-not-depend-on",
      body: "A controller may not import a repository. Controllers call application services; only services reach the persistence layer.",
      predicate: [["k","type"],["t"," in "],["p","layer:controller"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","layer:repository"]],
      fixtures: { pass: "CheckoutController -> CheckoutService", fail: "CheckoutController -> OrderRepository" },
      health: { fires: 8, fp: 0.12, unknown: 0.0, vacuous: false, overdue: false, last: "55m ago" },
    },
    {
      id: "DR-CYCLE-103", level: "lld", pack: "Design Rules", tier: "T4", type: "structural",
      title: "Modules must not form import cycles",
      owner: "inventory", scope: ["service:Inventory"], severity: "medium", mode: "blocking",
      evidence: "dependency-cruiser", review_by: "2026-09-15", status: "active",
      primitive: "must-not-cycle",
      body: "No set of modules within the service may form a directed import cycle. Cycles couple release units and make reasoning local-impossible.",
      predicate: [["k","modules"],["t"," in "],["p","service:Inventory"],["t","\n  "],["k","must-not-cycle"]],
      fixtures: { pass: "acyclic import graph", fail: "stock -> ledger -> stock" },
      health: { fires: 2, fp: 0.0, unknown: 0.0, vacuous: false, overdue: false, last: "6h ago" },
    },
    {
      id: "DR-PORT-104", level: "lld", pack: "Design Rules", tier: "T3", type: "structural",
      title: "Persistence must be reached through a port interface",
      owner: "payments", scope: ["layer:application"], severity: "medium", mode: "advisory",
      evidence: "ArchUnit", review_by: "2026-12-31", status: "active",
      primitive: "must-cross-via",
      body: "Application services must reach the database only through a declared persistence port, never by constructing a concrete client inline.",
      predicate: [["k","type"],["t"," in "],["p","layer:application"],["t","\n  "],["k","must-cross-via"],["t"," "],["s","stereotype:PersistencePort"]],
      fixtures: { pass: "service uses OrderStorePort", fail: "service news up PgConnection" },
      health: { fires: 3, fp: 0.33, unknown: 0.06, vacuous: false, overdue: false, last: "1d ago" },
    },
    {
      id: "DR-EXPORT-105", level: "lld", pack: "Design Rules", tier: "T4", type: "structural",
      title: "Internal aggregates must not be exported from the package",
      owner: "inventory", scope: ["stereotype:Aggregate"], severity: "low", mode: "advisory",
      evidence: "dependency-cruiser", review_by: "2026-10-01", status: "vacuous",
      primitive: "must-not-be-exported",
      body: "Aggregate roots are internal; the package barrel must not re-export them. Consumers use the repository, not the aggregate type.",
      predicate: [["k","type"],["t"," annotated "],["p","@Aggregate"],["t","\n  "],["k","must-not-be-exported"]],
      fixtures: { pass: "index.ts omits Stock", fail: "index.ts re-exports Stock" },
      health: { fires: 0, fp: 0.0, unknown: 0.0, vacuous: true, overdue: false, last: "—" },
    },
  ];

  /* ---- Exception register (ADR-backed, expiring) ---- */
  const exceptions = [
    { id: "EXC-041", rule: "DOM-ORD-003", scope: "Orders API -> Legacy.Billing", approver: "j.okafor (ARB)", adr: "ADR-207", expiry: "2026-03-31", status: "active", reason: "Staged strangler migration; ACL in progress." },
    { id: "EXC-039", rule: "SVC-INV-021", scope: "Inventory fan-out budget 5 -> 7", approver: "m.li (Domain)", adr: "ADR-198", expiry: "2026-02-15", status: "expiring", reason: "Peak-season read amplification." },
    { id: "EXC-030", rule: "DR-LAYER-102", scope: "ReportingController -> ReadModelRepository", approver: "s.diaz (Team)", adr: "ADR-181", expiry: "2025-12-31", status: "expired", reason: "Legacy reporting path; now a finding in its own right." },
  ];

  /* ---- Continuous review activity feed ---- */
  const activity = [
    { t: "2m ago", kind: "fail", text: "PR #482 <b>blocked</b> — PAY-014 (Checkout → Profile sync) on <span class='mono'>checkout-svc</span>" },
    { t: "14m ago", kind: "pass", text: "PR #481 <b>passed</b> all 12 applicable rules on <span class='mono'>inventory-svc</span>" },
    { t: "40m ago", kind: "info", text: "Rule <b>DR-DIP-101</b> compiled & merged via policy PR #77 (authoring time)" },
    { t: "2h ago", kind: "fail", text: "PR #478 <b>blocked</b> — ORG-DATA-001 (Orders → InventoryDB) on <span class='mono'>orders-svc</span>" },
    { t: "5h ago", kind: "warn", text: "Nightly sweep flagged <b>drift</b>: deployed topology diverges from declared model in <span class='mono'>eu-west</span>" },
    { t: "1d ago", kind: "pass", text: "Merge-queue re-evaluation caught a violation two clean PRs introduced together" },
  ];

  /* ---- Trend data (continuous review, not one-off) ---- */
  const driftTrend = {
    labels: ["Wk1", "Wk2", "Wk3", "Wk4", "Wk5", "Wk6", "Wk7", "Wk8"],
    prs: [22, 31, 28, 40, 37, 45, 52, 49],
    blocked: [5, 6, 3, 7, 4, 3, 2, 2],
  };

  const scorecard = {
    team: {
      name: "Payments",
      ownRulePass: 0.94, orgRulePass: 0.88,
      activeExceptions: 1, recurring: ["DR-LAYER-102 (8 fires / 30d)"],
      debt: 3, ratchet: "No new cross-boundary deps: holding",
    },
    org: [
      { domain: "Payments", posture: "Good", high: 0, blocked30d: 4 },
      { domain: "Orders", posture: "At risk", high: 2, blocked30d: 9 },
      { domain: "Inventory", posture: "Good", high: 0, blocked30d: 2 },
      { domain: "Profile", posture: "Watch", high: 1, blocked30d: 3 },
    ],
  };

  /* =========================================================================
     Scenarios for the developer PR gate + the interactive iterate view.
     Graphs follow the prototype engine's shape (archguard/model.py):
       nodes: id, name, tier(hld|lld), context
       edges: source, target, tier, relation(ALLOWS|CALLS|DEPLOYS_WITH), mode, artifact, line, confidence
     ========================================================================= */
  function baseNodes() {
    return [
      { id: "hld:order", name: "Order", tier: "hld", context: "order" },
      { id: "hld:inventory", name: "Inventory", tier: "hld", context: "inventory" },
      { id: "hld:payments", name: "Checkout", tier: "hld", context: "payments" },
      { id: "hld:profile", name: "Profile", tier: "hld", context: "profile" },
      { id: "hld:gateway", name: "API Gateway", tier: "hld", context: "gateway" },
      { id: "hld:legacy", name: "Legacy", tier: "hld", context: "legacy" },
      { id: "lld:order", name: "src/order/client.ts", tier: "lld", context: "order" },
      { id: "lld:inventory", name: "src/inventory/db.ts", tier: "lld", context: "inventory" },
      { id: "lld:payments", name: "src/checkout/profile.ts", tier: "lld", context: "payments" },
      { id: "lld:profile", name: "src/profile/api.ts", tier: "lld", context: "profile" },
    ];
  }
  const declaredBaseline = [
    { source: "hld:gateway", target: "hld:order", tier: "hld", relation: "ALLOWS", mode: "sync", artifact: "workspace.dsl" },
    { source: "hld:order", target: "hld:inventory", tier: "hld", relation: "ALLOWS", mode: "async", artifact: "workspace.dsl" },
    { source: "hld:payments", target: "hld:profile", tier: "hld", relation: "ALLOWS", mode: "async", artifact: "workspace.dsl" },
  ];

  const scenarios = [
    {
      id: "clean",
      name: "Clean baseline",
      subtitle: "A change that respects the declared architecture",
      risk: "none",
      pr: { title: "feat: add gift-note to order payload", author: "a.rivera", branch: "feat/gift-note", num: 481,
            files: [ { path: "src/order/client.ts", changed: true }, { path: "src/order/model.ts", changed: true } ] },
      graph: {
        nodes: baseNodes(),
        edges: declaredBaseline.concat([
          { source: "lld:order", target: "lld:inventory", tier: "lld", relation: "CALLS", mode: "async", artifact: "src/order/client.ts", line: 22, confidence: 1.0 },
          { source: "lld:payments", target: "lld:profile", tier: "lld", relation: "CALLS", mode: "async", artifact: "src/checkout/profile.ts", line: 14, confidence: 1.0 },
        ]),
      },
      ruleResults: [
        { rule: "ORG-DATA-001", v: "PASS" }, { rule: "ORG-GW-002", v: "PASS" },
        { rule: "PAY-014", v: "PASS" }, { rule: "DR-DIP-101", v: "PASS" },
        { rule: "DR-LAYER-102", v: "PASS" },
        { rule: "ORG-ISO-000", v: "SKIPPED", why: "Out of scope — no payment-data element touched" },
        { rule: "DR-CYCLE-103", v: "SKIPPED", why: "Out of scope — inventory service unchanged" },
      ],
    },
    {
      id: "boundary",
      name: "Boundary violation",
      subtitle: "Checkout adds a synchronous call to Profile",
      risk: "block",
      pr: { title: "fix: read live profile during checkout", author: "d.kim", branch: "fix/live-profile", num: 482,
            files: [ { path: "src/checkout/profile.ts", changed: true } ] },
      graph: {
        nodes: baseNodes(),
        edges: declaredBaseline.concat([
          { source: "lld:payments", target: "lld:profile", tier: "lld", relation: "CALLS", mode: "sync", artifact: "src/checkout/profile.ts", line: 41, confidence: 0.96 },
          { source: "lld:order", target: "lld:inventory", tier: "lld", relation: "CALLS", mode: "async", artifact: "src/order/client.ts", line: 22, confidence: 1.0 },
        ]),
      },
      ruleResults: [
        { rule: "PAY-014", v: "FAIL", why: "Synchronous Checkout → Profile dependency introduced" },
        { rule: "ORG-DATA-001", v: "PASS" }, { rule: "ORG-GW-002", v: "PASS" },
        { rule: "DR-DIP-101", v: "PASS" },
        { rule: "DR-PORT-104", v: "UNKNOWN", why: "Persistence port not resolvable — provider could not see symbol binding" },
        { rule: "ORG-ISO-000", v: "SKIPPED", why: "Out of scope — no payment-data element touched" },
      ],
    },
    {
      id: "shared-db",
      name: "Shared datastore",
      subtitle: "Orders reads InventoryDB directly (cross-domain)",
      risk: "block",
      pr: { title: "perf: query inventory table directly", author: "l.singh", branch: "perf/direct-inventory", num: 478,
            files: [ { path: "src/order/client.ts", changed: true }, { path: "infra/order.tf", changed: true } ] },
      graph: {
        nodes: baseNodes(),
        edges: declaredBaseline.concat([
          { source: "lld:order", target: "lld:inventory", tier: "lld", relation: "CALLS", mode: "sync", artifact: "src/order/client.ts", line: 63, confidence: 0.98 },
        ]),
      },
      ruleResults: [
        { rule: "ORG-DATA-001", v: "FAIL", why: "Cross-domain dependency Orders → InventoryDB" },
        { rule: "DOM-ORD-003", v: "PASS" }, { rule: "ORG-GW-002", v: "PASS" },
        { rule: "DR-LAYER-102", v: "PASS" },
        { rule: "SVC-INV-021", v: "UNKNOWN", why: "Metric source unbound in this PR context" },
        { rule: "DR-CYCLE-103", v: "SKIPPED", why: "Covered by live exception EXC-041 (expires 2026-03-31)" },
      ],
    },
    {
      id: "cycle",
      name: "Import cycle",
      subtitle: "A new import closes a cycle across unchanged modules",
      risk: "block",
      pr: { title: "refactor: extract shared ledger helper", author: "p.nour", branch: "refactor/ledger", num: 476,
            files: [ { path: "src/inventory/stock.ts", changed: true } ] },
      graph: { nodes: baseNodes(), edges: declaredBaseline.slice() },
      ruleResults: [
        { rule: "DR-CYCLE-103", v: "FAIL", why: "stock → ledger → stock cycle formed (evidence spans unchanged files)" },
        { rule: "DR-DIP-101", v: "PASS" }, { rule: "DR-EXPORT-105", v: "UNKNOWN", why: "Selector matched 0 elements — vacuously true, reported not passed" },
        { rule: "ORG-DATA-001", v: "PASS" },
        { rule: "ORG-ISO-000", v: "ERROR", why: "Architecture model failed to load — the check itself blocks, never silently green" },
      ],
    },
  ];

  /* ---- Interactive "iterate" model (live re-evaluation) ---- */
  const iterate = {
    nodes: [
      { id: "hld:payments", name: "Checkout API", tier: "hld", context: "payments" },
      { id: "hld:profile", name: "Profile", tier: "hld", context: "profile" },
      { id: "lld:payments", name: "src/checkout/profile.ts", tier: "lld", context: "payments" },
      { id: "lld:profile", name: "src/profile/api.ts", tier: "lld", context: "profile" },
    ],
  };

  /* ---- Ask ArchGuard (skill) canned answers ---- */
  const chatSuggestions = [
    "What is the blast radius of removing the API Gateway?",
    "Where is the single point of failure?",
    "Why is PAY-014 failing on my PR?",
    "What architecture changed since the last release?",
  ];
  const chatAnswers = {
    "what is the blast radius of removing the api gateway?": {
      text: "Removing <b>API Gateway</b> exposes <b>3 internal containers</b> directly to the internet and breaks fitness function <span class='inline-code'>ORG-GW-002</span> (must-cross-via). Everything currently entering through the gateway loses its single enforcement point for auth, rate-limiting and TLS termination.",
      ascii: "  Internet\n     │            ✗ removed\n  ┌──┴───┐   ┌───────────┐\n  │ Gateway│──│  (was here) │\n  └──┬───┘   └───────────┘\n  ┌──┴──────────────┐\n  ▼        ▼         ▼\nOrders  Checkout  Inventory   ← now internet-facing",
      foot: "Impacted rules: ORG-GW-002 (block), ORG-ISO-000 (block). 3 containers, 5 declared relationships affected.",
    },
    "where is the single point of failure?": {
      text: "The <b>Profile</b> service is a shared synchronous dependency for <b>Checkout</b>, <b>Orders</b> and <b>Account</b>. If Checkout is allowed to call it synchronously (see <span class='inline-code'>PAY-014</span>), a Profile outage stops checkout. The declared architecture routes this through a local event-fed projection to remove the SPOF.",
      ascii: "Checkout ─┐\nOrders  ─┼─sync─▶ Profile   ◀── SPOF\nAccount ─┘",
      foot: "Recommendation: keep the async projection (PAY-014 PASS) rather than a live call.",
    },
    "why is pay-014 failing on my pr?": {
      text: "Your PR adds a <b>synchronous</b> call <span class='inline-code'>src/checkout/profile.ts:41</span> from Checkout to Profile. <span class='inline-code'>PAY-014</span> declares that dependency must be <b>async</b> (event-fed projection). The gate replays the same compiled predicate every PR, so this is deterministic — same input, same verdict.",
      ascii: "PAY-014  may-not-depend-on  container:Profile  where mode == sync\n         └── evidence: src/checkout/profile.ts:41 (confidence 0.96) → FAIL",
      foot: "Fix: read the local profile projection instead of calling Profile over HTTP.",
    },
    "what architecture changed since the last release?": {
      text: "Since <b>v3.4.0</b>: 2 new declared relationships, 1 container renamed (Billing → Ledger), and the Orders→Legacy edge is now covered by expiring exception <span class='inline-code'>EXC-041</span>. Continuous review ran on <b>49 PRs</b> in that window and blocked <b>2</b>.",
      ascii: "v3.4.0 ───▶ HEAD\n + Checkout → Profile (async, declared)\n + Ledger container (was Billing)\n ~ Orders → Legacy now via EXC-041 (expires 2026-03-31)",
      foot: "This is the delta the ARB packet is generated from — no one re-reads every PR.",
    },
    "__default__": {
      text: "This prototype answers a fixed set of architecture questions using the compiled rules and the declared graph. Try one of the suggested questions — for example the <b>blast radius</b> of removing a container, or where a <b>single point of failure</b> is.",
      ascii: null,
      foot: "In production, the skill answers over your real model; the gate decision still runs deterministic compiled predicates — no LLM in the decision path.",
    },
  };

  /* =========================================================================
     Mock compiler (authoring time). The LLM never emits executable code; it
     emits a declarative predicate from the closed vocabulary. Here we fake
     that with curated outputs for the starter rules + a small heuristic.
     Outcomes: "expressible" | "clarify" | "rejected".
     ========================================================================= */
  const starterRules = [
    "Payment systems must not synchronously depend on customer profile services during checkout.",
    "Controllers must never talk to repositories directly; they must go through a service.",
    "No domain may share a database with another domain.",
    "Every new feature must reuse the shared Notification Service instead of adding its own.",
    "Flag any function with a cyclomatic complexity over 10.",
    "Services should be fast and clean.",
  ];
  const compiledExamples = {
    "payment systems must not synchronously depend on customer profile services during checkout.": {
      outcome: "expressible", confidence: 0.93, primitive: "may-not-depend-on", level: "hld",
      restatement: "Container:Checkout API may-not-depend-on Container:Profile where mode == sync.",
      predicate: [["k","container:Checkout API"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","container:Profile"],["t","\n  "],["t","where "],["p","mode == sync"]],
      fixtures: { pass: "Checkout reads local profile projection (async)", fail: "Checkout → Profile over HTTP (sync)" },
    },
    "controllers must never talk to repositories directly; they must go through a service.": {
      outcome: "expressible", confidence: 0.9, primitive: "may-not-depend-on", level: "lld",
      restatement: "Type in layer:controller may-not-depend-on layer:repository.",
      predicate: [["k","type"],["t"," in "],["p","layer:controller"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","layer:repository"]],
      fixtures: { pass: "CheckoutController → CheckoutService", fail: "CheckoutController → OrderRepository" },
    },
    "no domain may share a database with another domain.": {
      outcome: "expressible", confidence: 0.88, primitive: "may-not-depend-on", level: "hld",
      restatement: "Container where domain != db.domain may-not-depend-on kind:database.",
      predicate: [["k","container"],["t"," where "],["p","domain != db.domain"],["t","\n  "],["k","may-not-depend-on"],["t"," "],["s","kind:database"]],
      fixtures: { pass: "Orders → OrdersDB", fail: "Orders → InventoryDB" },
    },
    "every new feature must reuse the shared notification service instead of adding its own.": {
      outcome: "expressible", confidence: 0.86, primitive: "must-obtain-capability-via", level: "hld",
      restatement: "Feature needing capability:notifications must-obtain-capability-via service:Notification Service.",
      predicate: [["k","feature"],["t"," needing "],["p","capability:notifications"],["t","\n  "],["k","must-obtain-capability-via"],["t"," "],["s","service:Notification Service"]],
      fixtures: { pass: "Promo feature → Notification Service", fail: "Promo feature ships its own SMS sender" },
      note: "Uses a reuse primitive — asks whether a new app should exist at all, not just how things depend.",
    },
    "flag any function with a cyclomatic complexity over 10.": {
      outcome: "rejected", primitive: null, level: null,
      nonGoal: "No primitive inspects a value, follows data, or reasons about control flow. That absence is the CodeQL boundary — this belongs in a linter / CodeQL, not in an architecture gate.",
    },
    "services should be fast and clean.": {
      outcome: "clarify", primitive: null, level: null,
      clarify: "\"fast\" and \"clean\" are not measurable as stated. Did you mean a bound like \"p99 latency must-not-exceed 300ms\" (operational, trend-only) or a structural rule like \"service must-not-cycle\"? The compiler will not guess.",
      suggestion: "Try: \"The Inventory service fan-out must not exceed 5 downstream services.\"",
    },
  };

  /* ---- Realistic company hierarchy: organization -> department -> sub-department -> team -> service ---- */
  const org = {
    name: "Northwind Retail Group",
    architect: "Enterprise Architecture Board",
    departments: [
      {
        name: "Payments", architect: "j.okafor",
        subs: [
          { name: "Checkout", lead: "d.kim", teams: [
            { name: "Checkout Core", services: ["checkout-api", "checkout-web"] },
            { name: "Payment Methods", services: ["cards-svc", "wallet-svc"] },
          ]},
          { name: "Billing", lead: "s.diaz", teams: [
            { name: "Invoicing", services: ["invoice-svc", "ledger-svc"] },
          ]},
        ],
      },
      {
        name: "Commerce", architect: "m.li",
        subs: [
          { name: "Orders", lead: "l.singh", teams: [
            { name: "Order Management", services: ["orders-svc", "fulfilment-svc"] },
          ]},
          { name: "Catalog", lead: "p.nour", teams: [
            { name: "Inventory", services: ["inventory-svc"] },
            { name: "Search", services: ["search-svc"] },
          ]},
        ],
      },
      {
        name: "Platform", architect: "a.rivera",
        subs: [
          { name: "Edge", lead: "t.walsh", teams: [
            { name: "Gateway", services: ["api-gateway"] },
          ]},
          { name: "Identity", lead: "r.gomez", teams: [
            { name: "Profile", services: ["profile-svc"] },
          ]},
        ],
      },
    ],
  };

  /* ---- Evidence providers (native parsers; facts in, no new frontends) ---- */
  const providers = [
    { name: "C4 / Structurizr model", parses: "Declared systems, containers, boundaries", blind: "Only what is modeled" },
    { name: "Dependency parser", parses: "Imports, calls, module graph", blind: "Reflection, dynamic dispatch" },
    { name: "IaC plan (Terraform / Bicep)", parses: "Planned resources and references", blind: "Runtime-only wiring" },
    { name: "Threat-model boundaries", parses: "Trust boundaries", blind: "Non-security intent" },
    { name: "Runtime traces (optional)", parses: "Observed calls and modes", blind: "Unsampled paths" },
  ];

  /* ---- Permanent non-goals (the anti-CodeQL boundary) ---- */
  const nonGoals = [
    "Injection / XSS / SSRF / CWE detection", "Taint tracking", "Null / leak / off-by-one",
    "Dead code", "Formatting / naming lint", "Secret scanning", "SCA / CVE / license",
    "Coverage policing", "Perf micro-optimization", "Generic code-smell scoring", "Statement-level fixes",
  ];

  /* ---- What may block (capability matrix) ---- */
  const capabilityMatrix = [
    { family: "Layer direction, allowed dependencies, cycles, placement, ownership", gate: "May block" },
    { family: "C4 intent vs an unambiguous IaC-plan relationship", gate: "May block" },
    { family: "Coupling / instability budgets, structural SOLID proxies", gate: "May block (as proxies)" },
    { family: "SRP / OCP, Liskov, semantic contract compatibility, resilience", gate: "Advisory only" },
    { family: "Latency, cost, error budgets (external metrics)", gate: "Trend only" },
    { family: "Trade-offs and taste", gate: "Routed to the review board" },
  ];

  /* ---- vs AI review skills / agents ---- */
  const differentiation = [
    { dim: "Where the rule lives", agent: "Prose re-read each run", ag: "Compiled predicate in git" },
    { dim: "Who decides", agent: "The model, every PR", ag: "A human, once, approving the predicate" },
    { dim: "Reproducibility", agent: "Re-decides; verdicts drift", ag: "Re-plays; same input, same verdict" },
    { dim: "At scale", agent: "200 repos, 200 interpretations", ag: "One predicate, evaluated identically" },
    { dim: "Evidence", agent: "A prose opinion", ag: "Rule id, file:line, traversal path" },
    { dim: "Required check?", agent: "No", ag: "Yes — the point" },
    { dim: "Testability", agent: "Cannot unit-test a prompt", ag: "Every rule ships pass/fail fixtures in CI" },
    { dim: "Governance", agent: "None", ag: "Tiers, only-stricter, CODEOWNERS, expiring exceptions" },
    { dim: "When wrong", agent: "You argue with it", ag: "You PR the predicate, or file an expiring exception" },
  ];

  /* ---- Intent vs reality: declared C4 model vs planned IaC ---- */
  const driftExample = {
    declared: ["web → gateway (https)", "gateway → orders (sync)", "orders → orders-db (owns)", "checkout → profile (async, events)"],
    planned: ["web → gateway (https)", "gateway → orders (sync)", "orders → orders-db (owns)", "orders → inventory-db (sync)  ⟵ undeclared", "checkout → profile (sync)  ⟵ mode drift"],
    findings: [
      { sev: "block", rule: "ORG-DATA-001", text: "The IaC plan permits orders → inventory-db, a cross-domain path the model never declared." },
      { sev: "block", rule: "PAY-014", text: "Planned checkout → profile is synchronous; the declared model requires async (event projection)." },
    ],
  };

  return {
    product, tiers, primitives, verdicts, modeBadge,
    rules, exceptions, activity, driftTrend, scorecard, org,
    scenarios, iterate, chatSuggestions, chatAnswers,
    starterRules, compiledExamples,
    providers, nonGoals, capabilityMatrix, differentiation, driftExample,
  };
})();
