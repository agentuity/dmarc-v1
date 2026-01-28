# DMARC First-Pass Classification System

A simple LLM-based prompt system for analyzing DMARC aggregate reports and classifying records according to strict rules.

## Overview

This module ingests parsed DMARC aggregate report data and outputs a structured JSON decision object. It classifies records without performing any enrichment or external lookups.

## Architecture

```
┌──────────────────────────────────┐
│     POST /api/classify           │
│  Option A: { file: {...} }       │
│  Option B: { records: [...] }    │
└────────────┬─────────────────────┘
             │
             ▼
┌──────────────────────────────────┐
│     dmarc-processor Agent        │
│  - Detects input type            │
│  - Routes to parser if needed    │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌─────────┐    ┌──────────────┐
│ Records │    │ DmarcParser  │
│ (skip)  │    │ - Unzip      │
└────┬────┘    │ - Parse XML  │
     │         │ - Extract    │
     │         └──────┬───────┘
     │                │
     └────────┬───────┘
              ▼
┌──────────────────────────────────┐
│       DmarcClassifier            │
│  - System Prompt                 │
│  - Claude API                    │
│  - JSON Validation               │
└────────────┬─────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
    ▼                 ▼
┌───────────────┐  ┌──────────┐
│ Classification│  │  Slack   │
│ Output (JSON) │  │  Message │
└───────────────┘  └──────────┘
```

## Files

### Core System
- **`src/lib/classification-types.ts`** - TypeScript type definitions and schemas
- **`src/lib/classification-prompts.ts`** - System and user prompts for LLM
- **`src/lib/dmarc-classifier.ts`** - Main classifier implementation
- **`src/lib/dmarc-parser.ts`** - ZIP/XML parser for DMARC reports
- **`src/lib/slack.ts`** - Slack notification integration

### Agent & API
- **`src/agent/dmarc-processor/agent.ts`** - Main agent orchestrator
- **`src/agent/dmarc-processor/schema.ts`** - Input/output schemas
- **`src/api/index.ts`** - HTTP API endpoint

## Quick Start

### 1. Set Environment Variables

```bash
# Agentuity automatically provides ANTHROPIC_API_KEY
# Only set these if running locally outside Agentuity:
export ANTHROPIC_API_KEY="your-api-key-here"  # Optional (Agentuity provides)

# Optional Slack integration:
export SLACK_BOT_TOKEN="xoxb-your-token"
export DMARC_CHANNEL_ID="C1234567890"
```

### 2. Start the Server

```bash
cd dmarc-v1
bun run dev
```

### 3. Send Classification Request

**Option A: Send ZIP/XML file**

```bash
# Convert zip file to base64
BASE64_CONTENT=$(base64 -i dmarc-report.zip)

curl -X POST http://localhost:8787/api/classify \
  -H "Content-Type: application/json" \
  -d "{
    \"file\": {
      \"content\": \"$BASE64_CONTENT\",
      \"filename\": \"dmarc-report.zip\"
    }
  }"
```

**Option B: Send pre-parsed records**

```bash
curl -X POST http://localhost:8787/api/classify \
  -H "Content-Type: application/json" \
  -d '{
    "records": [
      {
        "source_ip": "192.0.2.1",
        "count": 150,
        "policy_evaluated": {
          "disposition": "none",
          "dkim": "pass",
          "spf": "pass"
        },
        "identifiers": {
          "header_from": "example.com",
          "envelope_from": "example.com"
        },
        "auth_results": {
          "dkim": [{ "domain": "example.com", "result": "pass" }],
          "spf": [{ "domain": "example.com", "result": "pass" }]
        }
      }
    ]
  }'
```

## API Response Example

```json
{
  "summary": {
    "total_records": 3,
    "investigate_count": 1,
    "monitor_count": 0,
    "all_passing": false
  },
  "records": [
    {
      "source_ip": "192.0.2.1",
      "status": "ok",
      "reason_codes": ["DMARC_PASS"],
      "confidence": 1.0
    },
    {
      "source_ip": "198.51.100.42",
      "status": "investigate",
      "reason_codes": ["DMARC_FAIL", "SPF_FAIL", "DKIM_FAIL"],
      "confidence": 1.0
    }
  ],
  "investigation_queue": [
    {
      "ip": "198.51.100.42",
      "trigger": ["DMARC_FAIL", "SPF_FAIL"],
      "priority": "high"
    }
  ],
  "slack_delivered": true
}
```

## Classification Rules

### Status: `ok`
All conditions must be true:
- DMARC passes
- At least one of SPF or DKIM passes
- Authentication is aligned
- `disposition = "none"`

### Status: `monitor`
Conditions:
- Authentication and alignment pass
- Sender context is unknown or first-seen
- Message volume is low

### Status: `investigate`
Any condition is true:
- `dkim = "fail"` AND `spf = "fail"`
- Alignment failure
- `disposition = "quarantine"` OR `"reject"`

## Reason Codes

### Authentication
- `DMARC_PASS`
- `DMARC_FAIL`
- `SPF_FAIL`
- `DKIM_FAIL`
- `MISALIGNED`

### Sender Context
- `UNKNOWN_SENDER`
- `UNEXPECTED_DOMAIN`
- `FIRST_SEEN_IP`

### Behavior
- `LOW_VOLUME`
- `VOLUME_SPIKE`
- `MULTI_IP_PATTERN`

## Investigation Priority

- **High** - DMARC fail + enforcement (`quarantine`/`reject`)
- **Medium** - Authentication failure without enforcement
- **Low** - Structural or behavioral anomaly

## Design Principles

1. **Zero Hallucination** - LLM follows strict rules, no creative interpretation
2. **Deterministic** - Same input always produces same output (temperature=0)
3. **Validation** - Output schema is validated before returning
4. **No Enrichment** - No IP lookups, geo data, or external queries
5. **JSON Only** - Pure structured output, no natural language
6. **Slack Integration** - Optional notifications for results

## Limitations

This module intentionally does NOT:
- Perform IP reputation lookups
- Query ASN, geolocation, or provider databases
- Make DNS queries
- Analyze historical trends
- Store results (stateless operation)
- Process DMARC forensic reports (only aggregate reports)

These capabilities can be added in downstream pipeline stages.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Auto | Automatically provided by Agentuity |
| `SLACK_BOT_TOKEN` | No | Slack bot token for notifications |
| `DMARC_CHANNEL_ID` | No | Slack channel ID for notifications |

## Slack Notification Format

When Slack integration is configured, the agent sends a formatted message:

```
📊 *DMARC Classification Report*

*Summary:*
• Total Records: 3
• Status: ⚠️ Issues Found
• Investigate: 1
• Monitor: 0

*🔍 Investigation Queue (1 IPs):*
🔴 198.51.100.42 - Priority: high
   Triggers: DMARC_FAIL, SPF_FAIL
```
