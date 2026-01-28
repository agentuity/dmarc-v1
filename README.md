# DMARC v1 Agent

A streamlined DMARC classification agent that uses LLM prompts to analyze DMARC records and output structured JSON results.

## What It Does

- **Accepts** DMARC aggregate reports as ZIP/XML files or pre-parsed JSON
- **Parses** XML reports and extracts DMARC records
- **Classifies** each record using strict LLM-based rules
- **Outputs** structured classification with investigation queue
- **Notifies** via Slack (optional)

## Project Structure

```
dmarc-v1/
├── src/
│   ├── agent/
│   │   └── dmarc-processor/           # Main agent
│   │       ├── agent.ts                # Agent logic + Slack integration
│   │       ├── schema.ts               # Input/output schemas
│   │       └── index.ts                # Export
│   ├── lib/
│   │   ├── classification-types.ts     # TypeScript types
│   │   ├── classification-prompts.ts   # LLM system prompt
│   │   ├── dmarc-classifier.ts         # Claude API integration
│   │   ├── dmarc-parser.ts             # ZIP/XML parser
│   │   └── slack.ts                    # Slack notification
│   └── api/
│       └── index.ts                    # POST /api/classify endpoint
├── CLASSIFICATION.md                   # Detailed documentation
├── app.ts                              # Application entry point
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Dependencies and scripts
└── README.md                           # This file
```

## Setup

1. **Install dependencies**
```bash
bun install
```

2. **Set environment variables**
```bash
# Agentuity automatically provides ANTHROPIC_API_KEY
# Only set if running locally:
export ANTHROPIC_API_KEY="your-api-key"  # Optional (auto-provided)

# Optional Slack integration:
export SLACK_BOT_TOKEN="xoxb-..."
export DMARC_CHANNEL_ID="C1234567890"
```

3. **Run development server**
```bash
bun run dev
```

## Usage

The agent accepts two input formats:

### Option 1: Send a ZIP/XML file (base64-encoded)

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

### Option 2: Send pre-parsed DMARC records

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
          "dkim": [{"domain": "example.com", "result": "pass"}],
          "spf": [{"domain": "example.com", "result": "pass"}]
        }
      }
    ]
  }'
```

## Response Format

```json
{
  "summary": {
    "total_records": 1,
    "investigate_count": 0,
    "monitor_count": 0,
    "all_passing": true
  },
  "records": [
    {
      "source_ip": "192.0.2.1",
      "status": "ok",
      "reason_codes": ["DMARC_PASS"],
      "confidence": 1.0
    }
  ],
  "investigation_queue": [],
  "slack_delivered": true
}
```

## Key Features

### ✅ What It Does

- **Parses** DMARC aggregate reports from ZIP/XML files
- **Classifies** DMARC records using LLM (Claude)
- Follows strict classification rules (see CLASSIFICATION.md)
- Outputs structured JSON only
- Sends Slack notifications (optional)
- Deterministic results (temperature=0)

### ❌ What It Doesn't Do

- Perform IP lookups or enrichment
- Store results or maintain state
- Make DNS queries or ASN lookups
- Process DMARC forensic reports (only aggregate reports)

## Development

```bash
# Run dev server
bun run dev

# Build project
bun run build

# Type check
bun run typecheck

# Deploy
bun run deploy
```

## Documentation

See [CLASSIFICATION.md](./CLASSIFICATION.md) for detailed documentation including:
- Classification rules
- Reason codes
- Investigation priority logic
- System prompt details

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Auto | Automatically provided by Agentuity |
| `SLACK_BOT_TOKEN` | ❌ | Slack bot token (optional) |
| `DMARC_CHANNEL_ID` | ❌ | Slack channel ID (optional) |

## Next Steps

This agent is designed to be the first stage in a DMARC processing pipeline. The `investigation_queue` output can feed into downstream services for:

- IP reputation lookups
- ASN and geolocation analysis
- Historical trend analysis
- Automated remediation
