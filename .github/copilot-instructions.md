# GitHub Copilot Instructions

The single source of truth for AI agent rules in this repository is
[AGENTS.md](../AGENTS.md) at the repo root. **Read it before suggesting
or applying any changes.** Do not duplicate rules here.

Quick highlights (full detail in AGENTS.md):

- Cloudflare Workers only — never mention "Netlify" (legacy, fully removed).
- Don't push to `master` or trigger production deploys without explicit user instruction.
- Don't add files >3MB or any secret files (`.env`, `.dev.vars`, `credentials.json`, etc.) — pre-commit blocks them.
- Bump `sw.js` `CACHE_VERSION` (+1) whenever HTML/JS/CSS/image/font changes.
- When committing, append `Co-Authored-By: Copilot <noreply@github.com>` so the change is traceable.

For the full responsibility matrix between Codex / Claude Code / Copilot,
asset optimization workflow, deploy URLs, and project conventions, see
[AGENTS.md](../AGENTS.md).
