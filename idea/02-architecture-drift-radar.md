# Idea 2: Architecture Drift Radar

## One-line pitch

ArchGuard AI compares intended C4 architecture with Terraform/Bicep infrastructure reality and highlights drift before it becomes an outage or compliance issue.

## Problem

Architecture diagrams often say one thing while deployed cloud resources say another. A team may document asynchronous messaging in Structurizr but deploy a direct private endpoint, shared database, or unapproved network path in Terraform or Bicep.

## Proposed experience

- Ingest intended architecture from Structurizr DSL/C4.
- Ingest deployed topology intent from Terraform plan JSON or Bicep/ARM JSON.
- Normalize both into a simple architecture graph.
- Compare expected relationships with actual infrastructure relationships.
- Produce a drift report with severity, affected domain, and recommended alignment.

## Demo story

The architecture model says `Order Service` publishes events to `Inventory Topic`. The infrastructure change adds a direct database connection from Order to Inventory. ArchGuard AI flags:

> Drift detected: deployed infrastructure permits a path that the approved C4 model does not declare.

## MVP scope

- Use a small sample system with 4-6 components.
- Represent cloud resources at a high level: service, database, queue/topic, network link.
- Detect one or two drift categories:
  - undeclared direct service/database link,
  - missing required message queue/topic.

## Wow factor

Judges see two views side by side: “architecture promise” versus “deployment reality.” The AI explains why the difference matters and which file likely caused it. This is the most defensible novelty claim because most existing tools validate architecture models or infrastructure separately, not whether the infrastructure implements the approved C4 intent.

## Why judges will care

- **Impact:** addresses a real enterprise pain: architecture drift.
- **Feasibility:** starts with IaC files that already exist in mature teams.
- **Novelty:** combines Architecture as Code, Infrastructure as Code, and AI reasoning in a cross-layer drift check.
- **Demo clarity:** visual drift is easy to show.

## Risks and mitigations

- **Risk:** cloud topology parsing can become too broad.
  - **Mitigation:** support a narrow Terraform/Bicep subset for the hackathon.
- **Risk:** false positives when infrastructure allows but apps do not use a path.
  - **Mitigation:** report as “possible drift” unless confirmed by architecture or code evidence.
