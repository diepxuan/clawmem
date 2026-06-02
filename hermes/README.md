# ClawMem Hermes Integration

Hermes-compatible bridge for the ClawMem REST API — search, recall, store, and inspect long-term memory from Hermes Agent.

## Quick Start

### 1. Ensure ClawMem API is running

The bridge connects to an already-running ClawMem REST API (default: `http://127.0.0.1:7438`).

```bash
curl http://127.0.0.1:7438
# Should return 200 OK
```

### 2. Install the package

```bash
cd /path/to/clawmem
npm install
npm run build
```

### 3. Use the skill template

Copy `hermes/SKILL.md` to your Hermes skills directory or install it:

```bash
# Option A: Copy to user-local skills
mkdir -p ~/.hermes/skills/memory/clawmem
cp hermes/SKILL.md ~/.hermes/skills/memory/clawmem/SKILL.md

# Option B: Install via Hermes CLI (if supported)
hermes skills install /path/to/clawmem/hermes/SKILL.md
```

### 4. Configure

The bridge module accepts a `ClawMemConfig` object:

```typescript
import { createHermesClawMemTools } from "./hermes/bridge.js";

const cfg = {
  apiBaseUrl: "http://127.0.0.1:7438",
  apiToken: process.env.CLAWSMEM_API_TOKEN, // optional
  tokenBudget: 800,
  profile: "balanced",
  enableTools: true,
};

const tools = createHermesClawMemTools(cfg);
// tools is an array of 5 Hermes-compatible tool definitions
```

## Architecture

```
Hermes Agent
  └─ Bridge tools (hermes/bridge.ts)
       └─ Shared API client (api.ts)
            └─ ClawMem REST API (external service)
```

The bridge:
- Reuses `apiCall` from the shared API client
- Has zero OpenClaw dependencies
- Fails open when API is unreachable
- Returns plain text results suitable for any agent

## Available Tools

| Tool | Endpoint | Purpose |
| --- | --- | --- |
| `clawmem_search` | `POST /search` | Search memory |
| `clawmem_get` | `GET /documents/:docid` | Get document content |
| `clawmem_store` | `POST /documents` | Save new memory |
| `clawmem_session_log` | `GET /sessions` | List session history |
| `clawmem_similar` | `GET /graph/similar/:docid` | Find similar documents |

## Development

```bash
npm run typecheck
npm test
```

See `hermes/SKILL.md` for detailed tool documentation.

## Security

- ClawMem runs locally — no external network calls by default
- Bearer token (`apiToken`) is optional and passed only in HTTP headers
- Do not store secrets in memory entries
- The bridge does not log or persist tokens

## Troubleshooting

See `hermes/SKILL.md` → Troubleshooting section.
