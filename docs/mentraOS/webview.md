# Webviews

> Source: https://docs.mentraglass.com/app-devs/core-concepts/webviews/react-webviews
> Source: https://docs.mentraglass.com/app-devs/core-concepts/webviews/webview-authentication

## React Webviews

The `@mentra/react` library enables developers to build React-based webviews that integrate with MentraOS authentication. These webviews run inside the MentraOS Mobile App and handle authentication automatically when users access them through the mobile application.

### Use Cases

- Settings and configuration interfaces
- Data visualization through charts and graphs
- Content management systems
- Dashboard and personalized information displays

### Installation

```bash
npm install @mentra/react
```

### Setup

1. Wrap the application with the `MentraAuthProvider` component at the root level
2. Access authentication state via the `useMentraAuth` hook

### Authentication Hook

The `useMentraAuth` hook provides:

- `userId` - User identifier
- `frontendToken` - JWT token for backend requests
- `isLoading` - Loading state flag
- `error` - Error state
- `isAuthenticated` - Authentication status
- `logout()` - Session termination function

### Making API Calls

Use the `frontendToken` in the Authorization header for authenticated requests:

```typescript
const response = await fetch('/api/data', {
  headers: {
    'Authorization': `Bearer ${frontendToken}`
  }
});
```

## Webview Authentication

MentraOS provides webview authentication enabling apps to identify users without separate login processes.

### Automatic Authentication Flow

When accessed via MentraOS app, the manager automatically appends temporary tokens to URLs. The SDK middleware exchanges these tokens for user IDs, enabling personalized content delivery.

### Browser Fallback (OAuth)

Users opening websites in regular browsers can be redirected to the `/mentra-auth` endpoint, triggering an OAuth flow that exchanges tokens for user identification.

### Implementation Steps

1. Configure webview URL in MentraOS Developer Console
2. Initialize AppServer with SDK, providing package name and API key
3. Access authenticated user ID via `req.authUserId` in Express route handlers
4. Implement conditional logic to show personalized or login content

### Usage Pattern

Routes check if `userId` exists to determine whether to display personalized dashboards or login prompts.

### Use Cases

- Personalized dashboards
- User-specific settings
- Database integration
- Seamless experiences without additional authentication steps
