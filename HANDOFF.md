# Kiro Testing Session Handoff

## Context

We're systematically testing Kiro.dev (AWS's agentic IDE + CLI + autonomous agent) in preparation for a meeting with Amazon/AWS in Seattle next week. The goal is to have hands-on experience, formed opinions, and smart questions ready.

## Status

- **Phase 1**: Spec-Driven Development — **COMPLETE** (4/5)
- **Phase 2b**: Kiro CLI Evaluation — **COMPLETE** (12/12 tests, 4/5 overall)
- **Phase 2**: BigWeaver Autonomous Agent — **BLOCKED** (waiting on access)

## What's Done

### Phase 1: Spec-Driven Development (COMPLETE)
- Kiro's full spec pipeline: requirements → design → tasks → implementation
- 5 Lambda handlers, 3 shared modules, full Terraform, 94 tests, 93% coverage
- Spec pipeline is Kiro's strongest feature — traceability chain is genuinely valuable
- Terminal integration is flaky (2/5), skipped its own property tests

### Phase 2b: Kiro CLI Evaluation (COMPLETE — 12/12 tests)

| Test | Rating | Winner |
|------|--------|--------|
| D.1 Install + auth | 4/5 | Tie |
| D.2 Codebase understanding | 4/5 | Tie |
| D.3 Email validation | 4/5 | Tie |
| D.4 API key auth (12 files) | 5/5 | Slight Kiro edge |
| D.5 MCP integration | 5/5 | Tie |
| E.1 Knowledge bases | 4/5 | Kiro advantage |
| E.2 Custom agents | 4/5 | Kiro advantage |
| E.3 Subagents/parallel | 4/5 | Slight Kiro edge |
| E.4 Translate command | 2/5 | Neither |
| E.5 Steering files | 4/5 | Tie |
| E.6 Hooks | 4/5 | Tie |
| E.7 Head-to-head (pagination) | 4/5 | Tie |

### Key Findings

**Kiro CLI Advantages:** Knowledge bases, custom agent configs (per-agent MCP/tools/hooks), auto-parallel detection, auto model selection, MCP CLI UX, permission UX (`y/n/t`)

**Claude Code Advantages:** Agent teams (peer-to-peer comms), Opus 4.6, mature ecosystem, plan mode, terminal reliability, speed

**Tie:** Code generation quality, MCP support, hooks, steering/config

## What's Remaining

1. **BigWeaver autonomous agent** — setup + 7 test scenarios (C.1-C.7) when access arrives
2. **Prepare demo scenarios** for meeting
3. **Draft concrete proposals** for AWS team

## Key Files

| File | Purpose |
|------|---------|
| `Vault 687/Meetings/2026-02-11 - Kiro Testing & AWS Meeting Prep.md` | Master notes with all findings |
| `~/repos/kiro-test-service/` | Test project (serverless API) |
| `~/repos/kiro-test-service/.kiro/` | Specs, steering, agent configs |
| `~/.kiro/agents/api-reviewer.json` | Custom agent (global) |

## Gotchas

- `GITHUB_TOKEN` env var points to GHE — use `GITHUB_TOKEN="" gh ...` for github.com
- Kiro CLI auth is via IAM Identity Center (awskiro account)
- Knowledge base indexing is slow (~9 min) but persists
- `translate` command has escaping bugs
- Kiro agent JSON doesn't tolerate special chars (arrows, literal newlines in strings)
- BigWeaver PDF: `/Users/connor.tyndall/Library/CloudStorage/OneDrive-CoxAutomotive/Desktop/bigweaver-beta-v1.pdf`

## Resume Command

> Continue Kiro evaluation for Seattle AWS meeting. Working in `~/repos/kiro-test-service`. Phase 1 (spec-driven dev) and Phase 2b (CLI, 12/12 tests) complete. Read the vault note at `Vault 687/Meetings/2026-02-11 - Kiro Testing & AWS Meeting Prep.md` for full findings. Next steps: (1) BigWeaver autonomous agent setup when access arrives (7 test scenarios C.1-C.7), (2) Prepare demo scenarios and concrete proposals for meeting.
