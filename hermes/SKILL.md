---
name: clawmem
description: "Use when the user asks to search, recall, store, or inspect long-term memory through a local ClawMem REST API. Provides clawmem_search, clawmem_get, clawmem_store, clawmem_session_log, clawmem_similar tools."
version: 0.0.2
author: ClawMem
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [memory, clawmem, local-first, retrieval]
    related_skills: [hermes-agent]
---

# ClawMem Memory Bridge for Hermes

## Overview

ClawMem is a local-first memory layer backed by a REST API. This skill provides
5 tools that let Hermes Agent search, recall, store, and inspect long-term
memory without depending on any specific agent runtime.

The bridge module (`hermes/bridge.ts`) is part of the `clawmem-openclaw-plugin`
package and reuses the shared HTTP client. It works with any ClawMem REST API
that supports the standard endpoints.

## When to Use

- User asks to search past memories, decisions, or project context
- User asks to store an important fact for future sessions
- User wants to review session history or find similar documents
- You need to recall context before answering a question that may relate to past work

**Don't use for:**
- Hermes's built-in memory tool (that's a different system)
- Temporary notes that don't need persistence
- Code review, file search, or git operations

## Configuration

### Required

| Key | Default | Description |
| --- | ------- | ----------- |
| `apiBaseUrl` | `http://127.0.0.1:7438` | ClawMem REST API endpoint |

### Optional

| Key | Default | Description |
| --- | ------- | ----------- |
| `apiToken` | undefined | Bearer token for authenticated access |

### Environment variables

```bash
CLAWMEM_API_BASE_URL=http://127.0.0.1:7438
CLAWMEM_API_TOKEN=optional-secret
```

## Available Tools

### clawmem_search

Search long-term memory with keyword, semantic, or hybrid modes.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `query` | string | Yes | — | Search query |
| `mode` | string | No | `auto` | `auto`, `keyword`, `semantic`, `hybrid` |
| `collection` | string | No | all | Limit to specific collection |
| `limit` | number | No | 10 | Max results (max: 50) |
| `compact` | boolean | No | true | Return compact results |

**Example:**

```json
{
  "query": "release decisions",
  "mode": "hybrid",
  "limit": 5
}
```

**Response format:**

```
Found N results:

1. [note] Release notes (score: 0.91)
   0.0.2 Hermes integration
2. [note] Architecture decisions (score: 0.78)
   ...
```

### clawmem_get

Retrieve full content of a specific memory document.

**Parameters:**

| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `docid` | string | Yes | Document ID (6-char hex prefix) or path |

**Example:**

```json
{ "docid": "abc123" }
```

### clawmem_store

Save a new memory entry.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `text` | string | Yes | — | Memory content |
| `collection` | string | No | `memory` | Collection name |
| `title` | string | No | — | Optional title |

**Example:**

```json
{
  "text": "Project uses TypeScript with ESM modules",
  "collection": "memory",
  "title": "Project tech stack"
}
```

### clawmem_session_log

List recent session summaries.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `limit` | number | No | 5 | Number of sessions to return |

### clawmem_similar

Find semantically similar documents.

**Parameters:**

| Param | Type | Required | Default | Description |
| --- | --- | --- | --- | --- |
| `docid` | string | Yes | — | Document ID (6-char hex prefix) |
| `limit` | number | No | 5 | Max results |

## Usage Patterns

### Search before answering

When a user asks something that may relate to past context:

1. Call `clawmem_search` with relevant keywords
2. If results found, use them to inform your answer
3. If no results, answer based on available knowledge

### Store important facts

When the user shares something important:

1. Call `clawmem_store` with a clear title and the fact
2. Use the `memory` collection for general facts
3. Use a specific collection name for project-specific data

### Review session history

When asked about past work:

1. Call `clawmem_session_log` to list recent sessions
2. Optionally call `clawmem_search` for specific topics within sessions

### Expand context

After finding a relevant document:

1. Call `clawmem_similar` with the document's docid
2. Review similar documents for additional context

## Fail-open Behavior

All tools fail open — when the ClawMem API is unreachable, they return a
readable error message instead of crashing. The tool never blocks Hermes
from continuing its work.

If all API calls fail, inform the user that memory is temporarily
unavailable but continue working with available knowledge.

## Security Notes

- ClawMem runs locally (default: `127.0.0.1:7438`) — no external network calls
- `apiToken` is passed as Bearer header — never log or echo it
- Do not store secrets in memory entries
- The bridge module makes no assumptions about API authentication beyond
  optionally attaching the Bearer token

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| "ClawMem API unreachable" | API not running | Start ClawMem service (`clawmem serve`) |
| "connection refused" | Wrong port or host | Check `apiBaseUrl` matches the running instance |
| "Failed to store memory" | Write permission or API error | Check collection exists, API token is valid |
| "No relevant memories found" | No matches for query | Try broader keywords or check collection name |
| "Document not found" | Invalid docid or deleted | Verify docid from search results |

## Verification Checklist

- [ ] ClawMem REST API is running (`curl http://127.0.0.1:7438`)
- [ ] `apiBaseUrl` configured correctly
- [ ] `apiToken` set if API requires authentication
- [ ] Tools return results for a test search
- [ ] `clawmem_store` successfully creates a memory
- [ ] Fail-open works (error message, not crash, when API is down)
