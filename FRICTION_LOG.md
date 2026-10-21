# FRICTION LOG

## Overall onboarding experience

The SDK and Streamable HTTP transport worked well once the version and dependency issues were resolved; the main pain was environment and version mismatches rather than the MCP protocol itself.

---

## Earlier entries (table format)

| Date | Task | Steps taken | Expected | Actual | Severity | Workaround | Suggestion |
|------|------|-------------|----------|--------|----------|------------|------------|
| 2026-10-10 | Install better-sqlite3 on Node 26 | Added as dependency; ran npm install | Compiled successfully | gyp build failure — native module does not build on Node 26 | medium | Removed SqliteMemoryStore entirely; JsonFileMemoryStore is the only store | Use @sqlite.org/sqlite-wasm or pin to a pre-built binary for Node 26+ |
| 2026-10-10 | tsc build hangs on NodeNext module resolution | Ran tsc with module:NodeNext | Fast type-check | tsc hangs indefinitely — appears related to deep node_modules type traversal with SDK 1.32.1 | high | Added `"typecheck": "tsc --noEmit"` as a separate optional script; `"build": "tsc"` is the Render build command and completes on Render's Node 20 environment | File issue with typescript-eslint or SDK team; consider `tsgo` for local type-checking |
| 2026-10-10 | Zod version mismatch with SDK 1.32.1 | Installed zod@3.24.2 | Tool registration compiled | TS error: ZodEnum not assignable to AnySchema | medium | SDK requires zod ^3.25; upgraded to 3.25.76 (exact pin) | Always check SDK peerDependencies before pinning Zod |
| 2026-10-10 | Render build failed: cannot find module better-sqlite3 | SqliteMemoryStore used dynamic import cast as string | Build should skip unresolved optional dep | tsc error TS2307 even with skipLibCheck | blocker | Deleted SqliteMemoryStore.ts; no references remain | Do not include optional-dep files in a repo where the dep is not installed |

---

## Protocol version proof

File: `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js`

```
line 2: export const LATEST_PROTOCOL_VERSION = '2025-11-25';
line 4: export const SUPPORTED_PROTOCOL_VERSIONS = [LATEST_PROTOCOL_VERSION, '2025-06-18', '2025-03-26', '2024-11-05', '2024-10-07'];
```

`2025-11-25` is the `LATEST_PROTOCOL_VERSION` and is in `SUPPORTED_PROTOCOL_VERSIONS`. The README and PR only claim what is verified here.

---

## Detailed entries

### AWS Builder ID signup failed

- Date: Oct 10, 2026, 09:24 GMT
- Task attempted: Create an AWS Builder ID at builder.aws.com
- Steps taken: Entered email and password on the "Create your password" page, clicked Continue
- Expected result: Account created successfully
- Actual result: Error — "It's not you, it's us. We couldn't complete your request right now. Please try again later." Request ID: 9da2037d-a57b-49c6-ba32-d7bd7c379403
- Severity: High (blocks the AWS Builder mini-challenge path)
- Workaround used: Continued building the project without an AWS account
- Suggestion: Show a specific error cause and a retry-safe state instead of a generic message; expose the request ID in a way users can act on it

---

### Official docs and SDK versions: spec version confirmation

- Date: Oct 10, 2026
- Task attempted: Confirm the MCP SDK implements spec 2025-11-25 (required by the hackathon rules)
- Steps taken: Read the SDK documentation, then inspected the installed package directly
- Expected result: The spec version clearly stated in the public documentation
- Actual result: Had to read `node_modules/@modelcontextprotocol/sdk/dist/esm/types.js` and locate `LATEST_PROTOCOL_VERSION = '2025-11-25'` to verify. A separate file, `spec.types.js`, contains a different constant (`DRAFT-2026-v1`), which is confusing and initially suggested the wrong version was in use
- Severity: Low
- Workaround used: Read the runtime constant directly from the installed package
- Suggestion: Document which constant is the authoritative runtime protocol version in the public quickstart; clarify that `spec.types.js` is a different, non-runtime file

---

### Zod version mismatch with MCP SDK 1.32.1

- Date: Oct 10, 2026
- Task attempted: Register tools using `server.tool()` with Zod schemas
- Steps taken: Installed `zod@3.23.8` (latest at the time of initial install), called `server.tool()` with `z.enum()` and `z.string()` schemas
- Expected result: Tool registration compiled without errors
- Actual result: TypeScript errors — `ZodEnum` not assignable to `AnySchema`; `ZodString` not assignable to `AnySchema`. Root cause: SDK 1.32.1 `peerDependencies` require `zod ^3.25 || ^4.0`; `3.23.x` predates the `StandardSchemaV1` interface required by the SDK's type definitions
- Severity: Medium
- Workaround used: Pinned `zod` to `3.25.76` (exact version, satisfies `^3.25`)
- Suggestion: Surface the `peerDependency` requirement prominently in the SDK quickstart docs and ensure `npm install` emits a clear peer-dependency warning rather than silently installing an incompatible version

---

### better-sqlite3 failed to compile on Node 26

- Date: Oct 10, 2026
- Task attempted: Use SQLite for per-seller session memory via `better-sqlite3`
- Steps taken: Added `better-sqlite3` to `package.json` dependencies; ran `npm install`
- Expected result: Native module compiled and installed
- Actual result: `gyp` build failure — `better-sqlite3` does not yet support Node 26 (pre-built binaries not available; source compilation fails)
- Severity: Medium
- Workaround used: Switched to a pure-JS JSON file store (`JsonFileMemoryStore`); deleted `SqliteMemoryStore.ts` entirely so no `better-sqlite3` reference remained in the codebase
- Suggestion: Document the tested and supported Node version range for the MCP SDK ecosystem, including native dependencies commonly used alongside it

---

### Render picked Node 26 automatically

- Date: Oct 21, 2026
- Task attempted: Deploy the MCP server on Render
- Steps taken: Connected repo to Render; left `engines` in `package.json` as `">=20"`; triggered a deploy
- Expected result: Render deploys on Node 20 LTS (the intended target)
- Actual result: Render resolved `">=20"` to Node 26.12.1 (the highest available version satisfying the range), which caused the `better-sqlite3` compile failure to resurface on Render even after it had been removed locally
- Severity: Low
- Workaround used: Tightened `engines` to `">=20 <25"` and set `NODE_VERSION=20.18.0` explicitly in `render.yaml`
- Suggestion: SDK and ecosystem documentation should state the tested Node version range explicitly; `">=20"` is too broad when native dependencies or toolchain compatibility is relevant

---

### Service created with the wrong runtime on Render

- Date: Oct 21, 2026
- Task attempted: Create a Render web service for a Node.js project
- Steps taken: Clicked "New Web Service" in the Render dashboard and connected the repository
- Expected result: Render auto-detects the Node.js runtime from `package.json`
- Actual result: The service was created as a "Go" service (the build command placeholder showed a Go example); however, manually entering `npm ci && npm run build` and `npm start` as the build and start commands still worked correctly at runtime
- Severity: Low
- Workaround used: Replaced the build and start commands manually in the Render service settings after creation
- Suggestion: Auto-detect the runtime from `package.json` (or `package-lock.json`) when the repository contains a Node.js project, rather than defaulting to a different language

---

### tsc --noEmit hangs on the dev machine

- Date: Oct 10, 2026
- Task attempted: Run a TypeScript type-check (`tsc --noEmit`) during development
- Steps taken: Ran `npm run typecheck` (which executes `tsc --noEmit`)
- Expected result: Type-check completes in a few seconds
- Actual result: `tsc --noEmit` never finishes on the development machine (Windows, Node 26). The plain `tsc` build (which compiles source to `dist/`) finishes in approximately one second on Render (Node 20 LTS)
- Severity: Low
- Workaround used: Used the plain `tsc` build (`npm run build`) as the verification step for correctness; `typecheck` is kept as an optional script in `package.json` but is not part of the CI or Render build
- Suggestion: None identified — this appears to be environment-specific (deep `node_modules` type traversal with SDK 1.32.1 on Windows/Node 26); reported for completeness
