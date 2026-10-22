# FRICTION LOG

| Date | Task | Steps taken | Expected | Actual | Severity | Workaround | Suggestion |
|------|------|-------------|----------|--------|----------|------------|------------|
| 2026-10-10 | Install better-sqlite3 on Node 26 | Added as dependency; ran npm install | Compiled successfully | gyp build failure — native module does not build on Node 26 | medium | Removed SqliteMemoryStore entirely; JsonFileMemoryStore is the only store | Use @sqlite.org/sqlite-wasm or pin to a pre-built binary for Node 26+ |
| 2026-10-10 | tsc build hangs on NodeNext module resolution | Ran tsc with module:NodeNext | Fast type-check | tsc hangs indefinitely — appears related to deep node_modules type traversal with SDK 1.32.1 | high | Added `"typecheck": "tsc --noEmit"` as a separate optional script; `"build": "tsc"` is the Render build command and completes on Render's Node 20 environment | File issue with typescript-eslint or SDK team; consider `tsgo` for local type-checking |
| 2026-10-10 | Zod version mismatch with SDK 1.32.1 | Installed zod@3.24.2 | Tool registration compiled | TS error: ZodEnum not assignable to AnySchema | medium | SDK requires zod ^3.25; upgraded to 3.25.76 (exact pin) | Always check SDK peerDependencies before pinning Zod |
| 2026-10-10 | Render build failed: cannot find module better-sqlite3 | SqliteMemoryStore used dynamic import cast as string | Build should skip unresolved optional dep | tsc error TS2307 even with skipLibCheck | blocker | Deleted SqliteMemoryStore.ts; no references remain | Do not include optional-dep files in a repo where the dep is not installed |

---

## Protocol version proof (item 4 from requirements)

File: `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js`

```
line 2: export const LATEST_PROTOCOL_VERSION = '2025-11-25';
line 4: export const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
```

2025-11-25 is the LATEST and is in SUPPORTED_PROTOCOL_VERSIONS. The README and PR only claim what is verified here.
