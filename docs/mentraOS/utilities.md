# Utilities

> Source: https://docs.mentraglass.com/app-devs/reference/token-utils
> Source: https://docs.mentraglass.com/app-devs/reference/utilities

## Token Utilities

The MentraOS SDK provides authentication utilities through the `TokenUtils` namespace.

### createToken

Creates a signed JWT token for App authentication.

```typescript
TokenUtils.createToken(payload: AppTokenPayload, config: { secret: string }): string
```

### validateToken

Checks JWT validity and returns either decoded payload data or an error message.

```typescript
TokenUtils.validateToken(token: string, config: { secret: string }): TokenValidationResult
```

### generateWebviewUrl

Appends a JWT token as a query parameter to a base URL.

```typescript
TokenUtils.generateWebviewUrl(baseUrl: string, token: string): string
```

### extractTokenFromUrl

Retrieves the token from a URL's query parameters.

```typescript
TokenUtils.extractTokenFromUrl(url: string): string | null
```

### AppTokenPayload

```typescript
interface AppTokenPayload {
  userId: string;
  packageName: string;
  sessionId: string;
  // automatic timestamp generation
}
```

### TokenValidationResult

```typescript
interface TokenValidationResult {
  valid: boolean;
  payload?: AppTokenPayload;
  error?: string;
}
```

### Security Best Practices

- Protect secret keys server-side
- Set appropriate token expiration windows
- Enforce HTTPS connections
- Validate tokens before granting access
- Minimize payload size

## ResourceTracker

Manages resource lifecycles and cleanup operations.

### Creating a ResourceTracker

```typescript
const tracker = createResourceTracker();
```

### Methods

#### track

Register cleanup functions:

```typescript
tracker.track(() => {
  // cleanup logic
});
```

#### trackDisposable

Manages objects with `.dispose()` or `.close()` methods:

```typescript
tracker.trackDisposable(someResource);
```

#### trackTimeout / trackInterval

Clears Node.js timers automatically:

```typescript
tracker.trackTimeout(timeoutId);
tracker.trackInterval(intervalId);
```

#### setTimeout / setInterval

Convenience methods that create and track timers simultaneously:

```typescript
tracker.setTimeout(() => { /* ... */ }, 5000);
tracker.setInterval(() => { /* ... */ }, 1000);
```

#### dispose

Execute all registered cleanup operations:

```typescript
tracker.dispose();
```

#### disposed (property)

Returns a boolean indicating whether cleanup has occurred.

## Stream Utility Functions

### parseLanguageStream

Parses stream identifiers like `"transcription:en-US"`:

```typescript
parseLanguageStream(streamId: string): LanguageStreamInfo
```

### createTranscriptionStream

Generates transcription stream identifiers:

```typescript
createTranscriptionStream(language: string): string
```

### createTranslationStream

Generates translation stream identifiers:

```typescript
createTranslationStream(sourceLanguage: string, targetLanguage: string): string
```

### isValidStreamType

Validates stream type values:

```typescript
isValidStreamType(value: string): boolean
```

### getBaseStreamType

Extracts base StreamType enums:

```typescript
getBaseStreamType(streamId: string): StreamType
```

### isLanguageStream

Determines if a value represents language-specific streaming:

```typescript
isLanguageStream(value: string): boolean
```

### LanguageStreamInfo

```typescript
interface LanguageStreamInfo {
  type: string;
  baseType: StreamType;
  transcribeLanguage?: string;
  translateLanguage?: string;
}
```
