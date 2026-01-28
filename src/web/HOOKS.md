# React Hooks for DMARC Report Manager

Call your API routes from React with `useAPI`, `useWebsocket`, and `useEventStream` hooks from `@agentuity/react`.

## Installation

The `@agentuity/react` package is already installed in this project. If you need to install it in another project:

```bash
bun add @agentuity/react
```

## Basic Usage with useAPI

The `useAPI` hook calls your API routes with full type safety:

```tsx
import { useAPI } from '@agentuity/react';

// For POST/PUT/PATCH/DELETE requests
function ReportActions() {
  const { invoke, isLoading, data, error } = useAPI('POST /api/reports/analyze');

  const handleAnalyze = async (reportId: string) => {
    try {
      await invoke({ reportId });
      // Handle successful analysis
    } catch (err) {
      // Error is also available via the error state
      console.error('Analysis failed:', err);
    }
  };

  return (
    <button 
      onClick={() => handleAnalyze('report-123')}
      disabled={isLoading}
    >
      {isLoading ? 'Analyzing...' : 'Analyze Report'}
    </button>
  );
}

// For GET requests (auto-fetches on mount)
function ReportSummary({ reportId }: { reportId: string }) {
  const { data, isLoading, error, refetch } = useAPI('GET /api/reports/:id/summary');
  
  useEffect(() => {
    // Invoke with params for route parameters
    refetch({ params: { id: reportId } });
  }, [reportId]);

  if (isLoading) return <div>Loading summary...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return <div>No summary available</div>;

  return <div>{data.summary}</div>;
}
```

### API Hook Return Values

**For POST/PUT/PATCH/DELETE requests:**

| Property | Type | Description |
|----------|------|-------------|
| `invoke` | `(input) => Promise<TOutput>` | Execute the request |
| `isLoading` | `boolean` | True while request is pending |
| `data` | `TOutput \| undefined` | Last successful response |
| `error` | `Error \| null` | Last error, if any |
| `reset` | `() => void` | Reset state to initial values |

**For GET requests** (auto-fetches on mount):

| Property | Type | Description |
|----------|------|-------------|
| `refetch` | `() => Promise<TOutput>` | Manually refetch data |
| `isLoading` | `boolean` | True while request is pending |
| `data` | `TOutput \| undefined` | Last successful response |
| `error` | `Error \| null` | Last error, if any |
| `reset` | `() => void` | Reset state to initial values |

## Real-Time with useWebsocket

For bidirectional real-time communication, use `useWebsocket`:

```tsx
import { useWebsocket } from '@agentuity/react';
import { useEffect, useState } from 'react';

function RealtimeReportUpdates() {
  const [updates, setUpdates] = useState<any[]>([]);
  const { isConnected, send, data } = useWebsocket('/api/reports/live');

  // Handle incoming messages
  useEffect(() => {
    if (data) {
      setUpdates((prev) => [...prev, data]);
    }
  }, [data]);

  // Subscribe to updates for a specific report
  const subscribeToReport = (reportId: string) => {
    send({ action: 'subscribe', reportId });
  };

  return (
    <div>
      <p>Status: {isConnected ? 'Connected' : 'Connecting...'}</p>
      <button onClick={() => subscribeToReport('report-123')}>
        Subscribe to Report Updates
      </button>
      <ul>
        {updates.map((update, i) => (
          <li key={i}>
            {update.type}: {update.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

WebSocket connections automatically reconnect with exponential backoff if the connection drops. Messages sent while disconnected are queued and sent when the connection is restored.

### WebSocket Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | True when WebSocket is open |
| `send` | `(data: TInput) => void` | Send a message |
| `data` | `TOutput \| undefined` | Last received message |
| `error` | `Error \| null` | Connection or message error |
| `close` | `() => void` | Close the connection |
| `reset` | `() => void` | Clear error state |

## Streaming with useEventStream

For one-way streaming from server to client, use Server-Sent Events:

```tsx
import { useEventStream } from '@agentuity/react';

function IPAnalysisProgress({ ipAddress }: { ipAddress: string }) {
  const { isConnected, data, error } = useEventStream(`/api/ip-analysis/${ipAddress}/progress`);

  if (!isConnected) {
    return <p>Connecting to analysis feed...</p>;
  }

  if (error) {
    return <p>Error: {error.message}</p>;
  }

  return (
    <div>
      <p>Analysis Progress: {data?.progress ?? 0}%</p>
      <p>Current Step: {data?.currentStep ?? 'Initializing...'}</p>
      <p>Last updated: {data?.timestamp ? new Date(data.timestamp).toLocaleTimeString() : '-'}</p>
    </div>
  );
}
```

Use `useEventStream` when you only need server-to-client updates (e.g., progress indicators, live dashboards, notifications). For bidirectional communication, use `useWebsocket`.

### EventStream Hook Return Values

| Property | Type | Description |
|----------|------|-------------|
| `isConnected` | `boolean` | True when SSE connection is open |
| `data` | `TOutput \| undefined` | Last received message |
| `error` | `Error \| null` | Connection error |

## Choosing the Right Hook

| Hook | Use Case | Direction | Examples |
|------|----------|-----------|---------|
| `useAPI` | Request/response | One-time | Fetch reports, submit analysis, update settings |
| `useWebsocket` | Bidirectional streaming | Client ↔ Server | Live updates, chat with analysts, collaborative investigation |
| `useEventStream` | Server push | Server → Client | Analysis progress, report processing status, notification stream |

## Request Options

Hooks accept options for customizing requests:

```tsx
const { invoke } = useAPI('POST /api/reports/analyze');

// Add query parameters
await invoke(input, {
  query: new URLSearchParams({ detailed: 'true' }),
});

// Add custom headers
await invoke(input, {
  headers: { 'X-Custom-Header': 'value' },
});

// Cancel request with AbortSignal
const controller = new AbortController();
await invoke(input, { signal: controller.signal });
setTimeout(() => controller.abort(), 5000); // Timeout after 5 seconds
```

## Implementation Examples

Check the `hooks` directory for example implementations:

- `ExampleUseAPI.tsx`: Shows how to use the `useAPI` hook for a chat interface
- `ExampleUseWebsocket.tsx`: Demonstrates bidirectional communication with `useWebsocket`
- `ExampleUseEventStream.tsx`: Shows server-to-client streaming with `useEventStream`