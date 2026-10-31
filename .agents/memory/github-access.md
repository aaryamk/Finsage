---
name: GitHub access
description: Distinguish GitHub API connector authorization from native Git transport access.
---

Do not infer that GitHub pushes are blocked merely because the API connector returns no accessible connections. When the user supplies a repository URL, test native Git HTTPS access without interactive prompting.

**Why:** The GitHub connector repeatedly showed authorization but exposed no account to the API sandbox. Native Git nevertheless authenticated through Replit's Git transport and successfully pushed to the user-specified repository.

**How to apply:** Use `GIT_TERMINAL_PROMPT=0 git ls-remote` to check access, then a normal non-force push when authorized. Do not inspect credential helpers, retrieve tokens or keep asking the user to reconnect the API connector.
