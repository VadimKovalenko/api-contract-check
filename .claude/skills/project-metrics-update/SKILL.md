---
name: project-metrics-update
description: Update this project's METRICS.md with metrics for the recent session and refresh the Total aggregation row, preserving the existing baseline and older run-log rows.
---

# Project Metrics Update

Use this skill when asked to update `METRICS.md`, project metrics, token usage, cache hits, thinking time, or session metrics after recent work in this repository.

## Scope

- Update metrics for the recent session or current turn only.
- Preserve the existing baseline and older run-log rows unless explicitly asked to revise them.
- Always update the `Total aggregation` row so it includes the newly added or updated recent-session row.
- Do not revise baseline facts from the beginning of the project; use the existing run-log rows plus the recent-session row to refresh aggregate sums.
- Keep estimates honest: mark unavailable values as `n/a` and label approximations with `~` or an explanatory note.

## Workflow

1. Open `METRICS.md` and understand its current structure before editing.
2. Gather recent-session facts that are available locally, such as:
   - commands run and their results
   - test, lint, build, or validation durations
   - relevant file timestamps or changed files
   - user-provided token/cache telemetry, if any
3. If exact model telemetry is unavailable, estimate only the recent session values and say they are estimates in the row or notes.
4. Add a new run-log row for the recent session, or update the current-day metrics row if it clearly refers to the same session.
5. Recalculate the `Total aggregation` row from every run-log row, including the new or updated session. Update its date range, input, output, total tokens, thinking time, wall time, and note; keep approximate markers (`~`) when any included values are estimates.
6. Update measured snapshot values only when the session actually produced fresher measured values.
7. Leave application metrics as `n/a` unless they were measured during the session.
8. After editing, read back the changed section to check table formatting and totals. Do not complete a metrics update if the new session is absent from `Total aggregation` or its totals remain unchanged.

## Estimation Guidance

- Prefer exact provider usage metadata when the user supplies it.
- If provider telemetry is unavailable, estimate recent-session token usage from visible context, tool output volume, and edits performed.
- Keep thinking-time estimates conservative. For a brief documentation or metrics edit, thinking time is usually minutes, not hours.
- Cache hits and cache hit rate should remain `n/a` unless provider telemetry is available.
- Aggregate rows should be changed on every metrics update to include the latest session, and the note should explain that the aggregate is a manual sum of the run-log rows.

## Row Notes

Good notes distinguish measured data from estimates, for example:

- `Estimated from this session; test duration is measured.`
- `Token and thinking-time values are estimates; cache telemetry unavailable.`
- `Measured with npm test on YYYY-MM-DD.`

Keep secrets, private endpoint URLs, authorization headers, and local-only credentials out of `METRICS.md`.
