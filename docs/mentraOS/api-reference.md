# MentraOS Cloud API Reference

> Source: https://cloud-docs.mentra.glass/api-reference/introduction

## Overview

MentraOS Cloud provides two API communication methods:

**WebSocket APIs**: Real-time bidirectional communication for glasses and apps

**REST APIs**: HTTP endpoints for authentication, management, and configuration

## Base URLs

| Environment | REST | WebSocket |
|---|---|---|
| Production | `https://api.mentra.glass` | `wss://api.mentra.glass` |
| Development | `https://devapi.mentra.glass` | `wss://devapi.mentra.glass` |
| Local | `http://localhost:8002` | `ws://localhost:8002` |

## Authentication Methods

**WebSocket**: Uses JWT tokens in Authorization header with Bearer prefix

**REST API**: Bearer token authentication via Authorization header

## Rate Limits (Per User)

- REST API: 100 requests per minute
- WebSocket messages: 50 per second
- Display updates: 1 per 200ms

## Response Formats

Success response structure includes `success`, `data`, and `error` fields.

Error responses contain error code and descriptive message within an error object.

WebSocket messages use JSON format with required `type` field and message-specific data.

## Endpoint Categories

**WebSocket Endpoints**:

- `/glasses-ws` for mobile app connections
- `/app-ws` for third-party app connections

**REST Endpoints**:

- Authentication (login, token refresh, logout)
- User Management (profile, settings, preferences)
- App Management (install, uninstall, configure)

## SDK Integration

The MentraOS SDK handles all API communication for you internally, requiring only package name and API key configuration.
