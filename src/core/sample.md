---
projects: true
chips: true
---

# Jordan Avery
Software Engineer
Bristol, United Kingdom | +44 7700 900123
jordan.avery@example.com
linkedin.com/in/jordanavery
github.com/jordanavery

## Summary
Software engineer with 10+ years building and running production systems across
payments, logistics and developer tooling. Comfortable owning a service from first
commit through to on-call: designing the data model, shipping the API, and holding
the pager afterwards. Most effective on small teams where the distance between a
decision and its consequences is short.

## Skills
Languages: Python, Go, TypeScript, SQL, Kotlin, Bash
Backend: PostgreSQL, Redis, Kafka, gRPC, REST, event sourcing, schema migration
Frontend: React, Next.js, TanStack Query, Playwright, Vite, design systems
Infrastructure: Docker, Kubernetes, Terraform, GitHub Actions, AWS, observability
Practices: Trunk-based development, contract testing, incident review, mentoring

## Experience
### [Northwind Systems](https://northwind.example) | March 2023 – Present
Senior Software Engineer | Remote
- Cut checkout p95 latency from 840ms to 310ms by adding read replicas and moving
  price resolution behind a Redis cache, lifting conversion 4% on mobile.
- Led the migration of 60+ services off a shared database onto per-service schemas,
  running old and new paths in parallel for six weeks so no cutover needed a
  maintenance window.
- Designed the idempotency layer behind the payments API, making retried requests
  safe by default and removing the duplicate-charge class of incident entirely.
- Introduced contract tests between the web client and the order service, catching
  breaking changes in CI instead of in staging.
- Mentor two engineers through weekly design reviews; both now lead their own
  projects end to end.
Tech: Go, Python, PostgreSQL, Redis, Kafka, Kubernetes, Terraform, AWS

### [Harbour Analytics](https://harbour-analytics.example) | January 2021 – February 2023
Software Engineer | Bristol, UK
- Inherited a nightly reporting job that had been failing roughly twice a week and
  needed a rewrite before the next quarter close. Rebuilt it as a chunked,
  resumable pipeline with per-stage checkpoints, then backfilled three years of
  history. It has run unattended since, and quarter close dropped from four days
  to one.
- Built the customer-facing metrics API in `Go`, serving 40M requests a month at a
  99.97% success rate.
- Replaced hand-rolled CSV exports with a streaming writer, cutting peak memory on
  the largest tenant from 6GB to 200MB.
- Wrote the team's first runbooks after a five-hour outage, and ran the blameless
  review that produced them.
Tech: Go, Python, PostgreSQL, Kafka, Docker, GitHub Actions

### [Kestrel Software](https://kestrel.example) | June 2019 – December 2020
Software Engineer | Bristol, UK
- Faced a mobile release process that took two engineers a full day and slipped
  most weeks. Automated the build, signing and staged rollout behind one command,
  bringing releases to under 20 minutes and letting the team ship weekly.
- Rebuilt the scheduling screen in **React**, replacing a table that reflowed on
  every keystroke with a virtualised list that stayed responsive at 10,000 rows.
- Added structured logging and traces across six services, cutting median time to
  identify a failing dependency from 40 minutes to under 5.
- Shipped the public API's first versioning scheme, documented at
  [the developer portal](https://kestrel.example/docs), so integrators could
  upgrade on their own schedule.
Tech: TypeScript, React, Kotlin, PostgreSQL, Docker

### [Tessellate Labs](https://tessellate.example) | September 2017 – May 2019
Junior Software Engineer | Remote
- Built the internal design-system package that 12 product teams now depend on,
  consolidating four divergent button implementations into one.
- Reduced the CI pipeline from 22 minutes to 6 by parallelising the test suite and
  caching dependency installs, saving roughly 30 engineer-hours a month.
- Automated onboarding provisioning that previously took a week of tickets, so new
  starters had every access they needed on day one.
- Migrated 200+ legacy tests off a deprecated runner with no loss of coverage.
Tech: TypeScript, React, Node.js, Jest, GitHub Actions

### Bramble & Co | July 2016 – August 2017
Software Developer | Bristol, UK
- Built the stock reconciliation tool that replaced a spreadsheet three people
  maintained by hand, eliminating a recurring source of end-of-month errors.
- Wrote the company's first automated test suite, taking coverage from zero to 65%
  and making refactoring possible.
- Shipped a customer portal used by 400 trade accounts to track orders without
  phoning the office.

## Projects
### [Ledgerly](https://ledgerly.example) | 2023 – Present · ledgerly.example
- Self-hosted expense tracker used daily by 200+ people, built because every
  alternative wanted a bank connection it did not need.
- Runs entirely offline against a local SQLite file, with an optional encrypted
  sync layer for people using more than one machine.
- Maintained continuously since launch — see the changelog at
  https://ledgerly.example/changelog for the release cadence.
Tech: Python, SQLite, FastAPI, HTMX

### [Tidepool](https://github.com/jordanavery/tidepool) | 2022 – Present · github.com/jordanavery/tidepool
- Command-line tool that diffs database schemas across environments and emits the
  migration to reconcile them; used by three teams at work and a handful of
  strangers who filed good bug reports.
- Handles the awkward cases most tools skip: renamed columns, partial indexes, and
  enum value ordering.
- Ships as a single static binary, so adopting it needs no runtime.
Tech: Go, PostgreSQL, SQLite

### Cadence
- Personal habit tracker built to answer one question — whether a habit survived a
  holiday — that no existing app reported on.
- Used every day since 2021; the data model has survived two rewrites of the UI,
  which is the only real test of a schema.
Tech: Kotlin, Android, SQLDelight

## Education
### [Northgate University](https://northgate.example) | 2022
M.Sc. Software Engineering

### [Riverbend Institute](https://riverbend.example) | 2012 – 2016
B.Sc. Computer Science
