# Kiro Testing Session Handoff

## Context

We're systematically testing Kiro.dev (AWS's agentic IDE) in preparation for a meeting with Amazon/AWS in Seattle next week. The goal is to have hands-on experience, formed opinions, and smart questions ready.

## What's Done

**Phase 1: Spec-Driven Development — COMPLETE**

- Created a fresh repo `~/repos/kiro-test-service` (AWS serverless task tracker API)
- Ran Kiro's full spec pipeline: requirements → design → tasks → implementation
- Kiro generated a complete working API: 5 Lambda handlers, 3 shared modules, full Terraform, 94 passing tests, 93% coverage
- All findings are logged in the Obsidian vault: `Vault 687/Meetings/2026-02-11 - Kiro Testing & AWS Meeting Prep.md`
- Key findings so far: spec pipeline is genuinely good (4/5), terminal integration is flaky (2/5), skipped its own property tests

## What's Next

**Phase 2: Hooks — Kiro's biggest differentiator vs Claude Code**

The testing plan (from the vault note) says:

1. Create a hook that runs tests on file save
2. Create a hook that generates commit messages
3. Create a hook that runs security scan before commit
4. Test hook with an actual code change — modify a handler and watch what happens
5. Test hook failure handling — what happens when the hook action fails

Questions to answer:
- How responsive are hooks? (Blog says 2-5s for simple, 2+ min for complex)
- Can hooks chain together?
- How is hook configuration structured?
- How do hooks compare to our Python-based hooks in `~/.claude/hooks/`?

**After Phase 2, remaining phases:**
- Phase 3: Steering refinement (30 min)
- Phase 4: Autonomous agent on real tasks (30 min)
- Phase 5: Powers & MCP (20 min)
- Phase 6: CLI evaluation (15 min)
- Phase 7: Enterprise evaluation (20 min)

## Key Files

| File | Purpose |
|------|---------|
| `Vault 687/Meetings/2026-02-11 - Kiro Testing & AWS Meeting Prep.md` | Master notes — update findings here as we test |
| `~/repos/kiro-test-service/` | Test project (Kiro-generated AWS serverless API) |
| `~/repos/kiro-test-service/.kiro/specs/engineering-task-api/` | Kiro's generated spec (requirements, design, tasks) |
| `~/repos/ee-plugins/.kiro/` | Earlier Kiro testing (steering + specs on ee-plugins repo) |

## How We Work

- I guide you step-by-step through what to do in Kiro
- You do it and report back what happened
- I analyze findings, compare to Claude Code, and update the vault note automatically
- The vault note has a comparison matrix, questions for AWS, and meeting prep checklist that get filled in as we go

## Resume Prompt

> We're testing Kiro.dev for a Seattle meeting with AWS next week. Phase 1 (spec-driven development) is done — findings are in `Vault 687/Meetings/2026-02-11 - Kiro Testing & AWS Meeting Prep.md`. Read that file first to get caught up, then guide me through Phase 2: testing Kiro hooks on the `~/repos/kiro-test-service` project. Update the vault note with findings as we go.
