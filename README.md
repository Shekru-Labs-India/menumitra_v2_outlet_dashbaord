# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript and enable type-aware lint rules. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## API Configuration

This project uses a configurable API setup that supports both development and production environments:

- **Development**: Uses a proxy to forward requests to `https://men4u.xyz`
- **Production**: Directly sends requests to the production API server

### Environment Setup

Create the following environment files for local development:

1. `.env.development` for development mode
```
VITE_API_URL=https://men4u.xyz
VITE_APP_ENV=development
```

2. `.env.production` for production builds
```
VITE_API_URL=https://api.menumitra.com
VITE_APP_ENV=production
```

See `ENV_SETUP.md` for more details on environment configuration.

## API Structure

All API endpoints are organized with common prefixes:

- `/v2` - API version prefix
- `/v2/common` - Common API endpoints
- `/v2/outlet_statistics` - Statistics API endpoints

These prefixes are defined in `src/config/apiConfig.js` for easy maintenance.
