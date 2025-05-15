# Environment Configuration Guide

This document explains how to set up environment variables for the MenuMitra Statistics Dashboard.

## Environment Files

Create the following environment files in the project root:

### For Development (.env.development)

```
# Development environment configuration
VITE_API_URL=https://men4u.xyz
VITE_APP_ENV=development
```

### For Production (.env.production)

```
# Production environment configuration
VITE_API_URL=https://api.menumitra.com
VITE_APP_ENV=production
```

## Environment Switching

The application automatically uses the appropriate environment based on the build mode:

- Running `npm run dev` uses the development environment
- Running `npm run build` uses the production environment

## Accessing Environment Variables

In the code, you can access environment variables using:

```javascript
const apiUrl = import.meta.env.VITE_API_URL;
const appEnv = import.meta.env.VITE_APP_ENV;
```

## API Configuration

The API configuration in `src/config/apiConfig.js` already handles environment switching based on `process.env.NODE_ENV`. This is configured to work with Vite's build system.

## Proxy Configuration

For local development, the proxy in `vite.config.js` forwards API requests to the development API server. This proxy helps avoid CORS issues during development. 