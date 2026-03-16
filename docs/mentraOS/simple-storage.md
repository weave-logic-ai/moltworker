# Simple Storage

> Source: https://docs.mentraglass.com/app-devs/core-concepts/simple-storage

> Persistent key-value storage for user data

## Overview

Simple Storage provides persistent key-value storage for user data within the MentraOS platform. It offers automatic cloud synchronization, user isolation, and app-scoped access with local caching for performance.

Key features:

- **Automatic sync** between servers and cloud infrastructure
- **User isolation** -- each user has separate storage
- **App-scoped** -- other applications cannot access your data
- **Local caching** for performance (cache is per-session; new sessions retrieve fresh data from cloud)

## Core Methods

### set

```typescript
await session.storage.set(key: string, value: string): Promise<void>
```

### get

```typescript
const value = await session.storage.get(key: string): Promise<string | null>
```

### hasKey

```typescript
const exists = await session.storage.hasKey(key: string): Promise<boolean>
```

### delete

```typescript
await session.storage.delete(key: string): Promise<void>
```

### clear

```typescript
await session.storage.clear(): Promise<void>
```

## Working with Complex Data

The system handles string values. Use JSON serialization for complex objects:

```typescript
// Store complex data
const userData = { theme: 'dark', fontSize: 14 };
await session.storage.set('preferences', JSON.stringify(userData));

// Retrieve complex data
const raw = await session.storage.get('preferences');
const preferences = raw ? JSON.parse(raw) : { theme: 'light', fontSize: 12 };
```

## Common Use Cases

### User Preferences

```typescript
await session.storage.set('theme', 'dark');
await session.storage.set('language', 'en-US');
```

### Session State Restoration

```typescript
await session.storage.set('currentPage', '3');
await session.storage.set('scrollPosition', '450');
```

### Usage Analytics

```typescript
const count = parseInt(await session.storage.get('appOpens') || '0');
await session.storage.set('appOpens', String(count + 1));
```

### First-Time User Detection

```typescript
const hasVisited = await session.storage.hasKey('hasVisited');
if (!hasVisited) {
  // Show onboarding
  await session.storage.set('hasVisited', 'true');
}
```

## Technical Constraints

- ~1MB per individual value
- ~10MB total per user
- Cache is per-session; new sessions retrieve fresh data from cloud

## Security

- Do NOT store secrets (API keys, passwords) in user storage
- Use environment variables for API keys instead
- Storage is app-scoped but not encrypted
