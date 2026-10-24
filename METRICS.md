# Project Metrics

Use this file to track development and runtime metrics for the API Schema Coverage Dashboard. Update the run log after meaningful coding, test, build, or API-check sessions.

## Baseline

This project is vibe-coded. The initial estimate starts from the filesystem birth time of `index.js`: `2026-09-20 15:28:19 +0400`.

Current measured snapshot:

| Metric | Value | Notes |
| --- | ---: | --- |
| Tracked project text lines | 11,543 | Excludes `node_modules/`, `dist/`, `dist-server/`, `.git`, and binary PNG assets; includes this file. |
| Tests | 18 pass / 0 fail | Measured with `npm test` on `2026-10-14`. |
| Test duration | 522.051954ms | Reported by Node test runner. |
| Build duration | 2.76s | Vite-reported client build duration on `2026-10-15`; server TypeScript compile also completed. |
| Lint result | pass | Measured with `npm run lint` on `2026-10-15`. |
| First project file birth | 2026-09-20 15:28:19 +0400 | Historical root `index.js`, removed during TypeScript migration. |
| Last pre-metrics app artifact | 2026-09-21 15:17:48 +0400 | `dist/` build artifacts. |
| Metrics tracker created | 2026-09-22 09:37:05 +0400 | `METRICS.md`. |

Token, cache, and thinking-time values below are estimates unless marked as measured. Provider telemetry was not available when this file was populated.

User-reported usage on `2026-10-12`: 9% remained in a 258,000-token window, or approximately 234,780 tokens used. This is window-level usage, not a project-specific total; input/output split and cache telemetry are unavailable. The run-log estimate below remains an estimate of this project's work and is not added to the window-level figure.

## Run Log

| Date | Session | Model/Tool | Task | Input Tokens | Output Tokens | Total Tokens | Cache Hits | Cache Hit Rate | Thinking Time | Wall Time | Result | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 2026-09-20 | bootstrap | Codex | Create React/Vite client, Express API, schema coverage logic, and initial project structure | 80,000 | 14,000 | 94,000 | n/a | n/a | ~45m | ~1h 30m | pass | Estimated from `index.js` birth time and first-day file timestamps. |
| 2026-09-21 | hardening | Codex | Add outbound fetch protection, tests, README notes, infra files, lint/build cleanup | 115,000 | 20,000 | 135,000 | n/a | n/a | ~1h 10m | ~2h 15m | pass | Estimated from server, test, infra, README, package, and build artifact timestamps. |
| 2026-09-22 | metrics | Codex | Add and populate project metrics tracker | 10,000 | 2,000 | 12,000 | n/a | n/a | ~2m | ~12m | pass | Estimated from this metrics session; test/build/lint values are measured. |
| 2026-09-24 | typescript-migration | Codex | Rewrite backend and frontend JavaScript to TypeScript, update tooling, release packaging, docs, and verification scripts | ~145,000 | ~24,000 | ~169,000 | n/a | n/a | ~50m | ~1h 10m | pass | Token and thinking-time values are estimates; lint/build/test values are measured from this session. |
| 2026-09-24 | claude-skill-metrics | Codex | Update metrics regarding `.claude/skills/project-metrics-update` | ~4,000 | ~700 | ~4,700 | n/a | n/a | ~3m | ~8m | pass | Token and thinking-time values are estimates; cache telemetry unavailable. Run completed on `2026-09-24`; the referenced skill file already existed before this session. No tests, lint, or build were run for this docs-only metrics update. |
| 2026-10-11 | response-coverage-ui | Codex | Add required/optional/unlisted response field reporting, YAML/JSON highlighting, light theme switcher, info tooltips, scrollbar polish, and UI consistency fixes | ~190,000 | ~34,000 | ~224,000 | n/a | n/a | ~1h 10m | ~3h active | pass | Token and thinking-time values are estimates; cache telemetry unavailable. `npm run lint`, `npm run build`, and `npm test` passed on `2026-10-11`. |
| 2026-10-12 | vanta-fog-light-default | Codex | Integrate and tune animated Vanta fog, remove obsolete fog CSS overrides, and set light theme as the default | ~12,000 | ~2,000 | ~14,000 | n/a | n/a | ~8m | ~20m | pass | Token, thinking-time, and wall-time values are estimates; cache telemetry unavailable. `npm run lint` and `npm run build` passed; build duration measured at 2.91s. No tests were run. |
| 2026-10-14 | editor-ui-yaml-sample-flow | Codex | Polish editor/search UI, nav and action controls, privacy modal placement, saved YAML workflow, OpenAPI URL derivation, and Wikimedia sample tests | ~175,000 | ~31,000 | ~206,000 | n/a | n/a | ~1h 20m | ~3h active | pass | Token, thinking-time, and wall-time values are estimates; cache telemetry unavailable. `npm test`, `npm run lint`, and `npm run build` passed on `2026-10-14`; committed as `465c3b2`. |
| 2026-10-15 | request-workflow-accessibility | Codex | Refine request controls and YAML editor accessibility, add public API YAML samples, and replace app-managed URL suggestions with browser-native form-history eligibility | ~64,000 | ~9,000 | ~73,000 | n/a | n/a | ~28m | ~1h 20m active | pass | Token, thinking-time, and wall-time values are estimates; cache telemetry unavailable. `npm run lint` and `npm run build` passed on `2026-10-15`; Vite-reported build duration was 2.76s. No tests were run for the final UI-only change. |
| 2026-09-20..2026-10-15 | **Total aggregation** | Codex | Vibe-coded project baseline through latest metrics update | ~795,000 | ~136,700 | ~931,700 | n/a | n/a | ~5h 56m | ~12h 55m active / ~25d elapsed | pass | Manual sum of all run-log rows above, including the `2026-10-15` request workflow and accessibility session; elapsed range starts at `index.js` creation and ends after this metrics update. |

## Metrics Dictionary

| Metric | What It Means | Suggested Source |
| --- | --- | --- |
| Input Tokens | Tokens sent to the model, including prompts, code context, and tool results. | Model/API usage metadata, local session summary, or manual estimate. |
| Output Tokens | Tokens generated by the model in responses, edits, and summaries. | Model/API usage metadata or local session summary. |
| Total Tokens | `Input Tokens + Output Tokens`. | Calculated. |
| Cache Hits | Number of cached prompt/context reads used by the model provider. | Provider usage metadata when available. |
| Cache Hit Rate | `Cache Hits / cacheable reads` or provider-reported cache hit percentage. | Provider usage metadata when available. |
| Thinking Time | Time spent reasoning before or between visible actions. | Session timer, model telemetry, or manual stopwatch. |
| Wall Time | Real elapsed time from task start to completion. | Shell `time`, CI timestamps, or manual stopwatch. |
| Test Duration | Time spent running `npm test`. | Terminal output or CI run logs. |
| Build Duration | Time spent running `npm run build`. | Terminal output or CI run logs. |
| Lint Duration | Time spent running `npm run lint`. | Terminal output or CI run logs. |
| API Check Latency | Time for `POST /api/check` to return a coverage report. | Browser devtools, server logs, or request timing. |
| Endpoint Fetch Latency | Time spent fetching the target API endpoint from the server. | Server instrumentation around outbound fetch. |
| Schema Parse Time | Time spent parsing user-provided YAML schema. | Server instrumentation around schema parsing. |
| Validation Time | Time spent validating response JSON against the schema. | Server instrumentation around validation. |
| Coverage Score | Percentage of expected schema fields found in the response. | `/api/check` response. |
| Missing Field Count | Number of expected fields absent from the response. | `/api/check` response. |
| Extra Field Count | Number of unexpected response fields. | `/api/check` response. |
| Error Count | Number of validation, fetch, parse, or runtime errors. | Server response, logs, or tests. |

## Session Template

Copy this block when a session deserves more detail than the table row.

```text
Date:
Session:
Task:
Model/Tool:

Token usage:
- Input:
- Output:
- Total:
- Cache hits:
- Cache hit rate:

Timing:
- Thinking time:
- Wall time:
- Test duration:
- Build duration:
- Lint duration:

Application metrics:
- API check latency:
- Endpoint fetch latency:
- Schema parse time:
- Validation time:
- Coverage score:
- Missing fields:
- Extra fields:
- Errors:

Outcome:
Notes:
```

## Collection Notes

- Prefer exact provider or CI telemetry when it is available.
- Mark unavailable values as `n/a` instead of guessing.
- Treat current token, cache, thinking-time, and active wall-time values as estimates, not billing records.
- Keep secrets, request headers, authorization values, and private endpoint URLs out of this file.
- For repeatable command timings, prefix commands with `time`, for example `time npm test`.
- If these metrics become important for product behavior, move runtime collection into structured server logs or a dedicated observability tool instead of relying only on this manual tracker.
