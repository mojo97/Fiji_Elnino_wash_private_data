# Fiji private assessment processing

This repository **must be private before the sync can run or assessment records can be uploaded**. The scheduled workflow and the Node script both refuse to process assessment data from public GitHub Actions runs.

The five supplied forms have been resolved to their deployed API UIDs. All five currently allow the requested API reads without authentication. `KOBO_TOKEN` is optional now and can be added as an Actions secret if access is restricted in future. Never put a token in code or chat.

`node scripts/fetch-tikina-evidence.mjs` reads all paginated submissions and their deployed schemas. It creates:

- `data/private-evidence.json`: latest allowlisted location-level observations, with household codes hashed and no respondent/assessor names, contacts, household GPS, attachments or free-text notes. It retains community/facility names for response-team review. No raw Kobo submissions are committed.
- `data/tikina-evidence.json`: strict Tikina/source/date aggregates for the public dashboard. Household-member counts in groups of fewer than five reports are suppressed.

Latest per-community estimate from the community-water form supplies the reported affected-person count. Household members are deduplicated by community + stable household code and shown separately. School enrolment and HCF catchments are not added to either population total. Exact canonical Tikina + province names are required; no fuzzy geographic joins are made. Explicit test/training locations, invalid dates and declined household consent are excluded with counts. Repeated community sources can still have unreviewed spelling aliases, so the reported numbers remain unverified and coverage-limited.

The workflow refreshes at minutes 9, 24, 39 and 54. GitHub schedules can be delayed. Failed form access preserves the previous complete snapshot rather than publishing partial totals.

To automatically update the public site, add **DASHBOARD_TOKEN** as an Actions secret: a fine-grained GitHub token restricted to `mojo97/Fiji_Elnino_wash_priortiziedlocations` with repository Contents read/write. This optional token is used only to update `docs/data/tikina-evidence.json`. The script validates a strict aggregate schema before publication. Without it, the aggregate updates in this private repository but the public website retains its last published snapshot. No persistent access token is created automatically.

The geometry and official FBOS 2026 population estimates copied into `docs/data/tikinas.json` are public statistical inputs. Their provenance and coastline coverage limitation are embedded in that file and in the public dashboard. Population estimates are sums of 100m raster-cell centres inside 86 boundary polygons, not an independent projection.

Public dashboard: https://mojo97.github.io/Fiji_Elnino_wash_priortiziedlocations/

Current source counts at initial analysis: 97 KII, 40 schools, 71 household, 107 community-water, 44 HCF submissions (359 total). Exact latest/deduplication and exclusion counts are recorded in source metadata.
