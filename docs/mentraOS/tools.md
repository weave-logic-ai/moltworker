# Tools (AI Tool Calls)

> Source: https://docs.mentraglass.com/app-devs/core-concepts/app-server (onToolCall method)

## Overview

MentraOS apps can integrate with the Mira AI assistant through tool calls. When the AI assistant determines it needs to execute a function from your app, it invokes a tool call that your AppServer handles.

## onToolCall Method

Override the `onToolCall()` method on your AppServer to handle tool calls from Mira AI:

```typescript
class MyAppServer extends AppServer {
  protected async onToolCall(toolName: string, params: any): Promise<any> {
    switch (toolName) {
      case 'get_weather':
        return await fetchWeather(params.location);
      case 'set_reminder':
        return await createReminder(params.text, params.time);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }
}
```

## How It Works

1. User speaks a command to the Mira AI assistant
2. Mira determines which app and tool to invoke
3. MentraOS Cloud routes the tool call to your AppServer
4. Your `onToolCall()` handler processes the request
5. The result is returned to Mira for the user

## Integration

Tool definitions are configured in the Developer Console alongside your app registration. Each tool specifies:

- Tool name
- Description for the AI to understand when to use it
- Parameter schema
- Return type
