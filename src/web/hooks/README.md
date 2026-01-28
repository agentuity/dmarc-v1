# React Hooks for DMARC Report Manager

This directory contains React hooks for interacting with the DMARC Report Manager API. These hooks are built on top of the `@agentuity/react` package.

## Available Hooks

- `useAPI`: For making standard API requests
- `useWebsocket`: For bidirectional real-time communication
- `useEventStream`: For one-way server-to-client streaming

## Usage

Import these hooks directly from `@agentuity/react` in your components:

```tsx
import { useAPI, useWebsocket, useEventStream } from '@agentuity/react';
```

See the examples below for specific usage patterns.