# FRICTION LOG

Template for recording blockers, unexpected behaviour, and improvement suggestions encountered during development.

| Date | Task | Steps taken | Expected | Actual | Severity | Workaround | Suggestion |
|------|------|-------------|----------|--------|----------|------------|------------|
| Date | Task | Steps taken | Expected | Actual | Severity | Workaround | Suggestion |
|------|------|-------------|----------|--------|----------|------------|------------|
| 2026-10-10 | Install better-sqlite3 on Node 26 | Added better-sqlite3 as dependency; ran npm install | Compiled successfully | gyp build failure — native module does not yet support Node 26 | medium | Replaced with JsonFileMemoryStore (pure-JS JSON file persistence). SqliteMemoryStore class is still in src/memory/ as an optional upgrade for Node ≤22. | Pin better-sqlite3 to a pre-built binary variant or use @sqlite.org/sqlite-wasm for Node 26+ |

---

## Entry format (copy for each new issue)

**Date:** YYYY-MM-DD  
**Task:** What you were trying to do  
**Steps taken:** What you did  
**Expected:** What should have happened  
**Actual:** What actually happened  
**Severity:** low / medium / high / blocker  
**Workaround:** How you got past it  
**Suggestion:** What would prevent this next time  
