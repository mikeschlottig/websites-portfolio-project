# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a portfolio website project for LEVERAGEAI LLC built with Cloudflare Workers. The project consists of:

- **Frontend**: A single-page portfolio website (`index.html`) showcasing completed projects
- **Backend**: TypeScript-based Cloudflare Worker (`workers.ts`) providing REST API endpoints
- **Infrastructure**: Cloudflare KV namespaces for data storage and contact form submissions

## Architecture

### Frontend Structure
- `index.html`: Complete portfolio page with embedded CSS and JavaScript
- Uses CSS Grid for responsive portfolio layout
- JavaScript filtering system for project categories (business, ai, tools, local)
- Intersection Observer for scroll animations

### Backend API Structure
- `workers.ts`: Main Worker handler with TypeScript interfaces
- **Endpoints**:
  - `GET /api/health`: Health check with environment info
  - `GET /api/portfolio`: Portfolio data from KV storage with fallback defaults
  - `POST /api/contact`: Contact form submission with validation and KV storage
- **Data Storage**: Two KV namespaces - `PORTFOLIO_KV` and `CONTACTS_KV`

### Configuration Files
- `wrangler.toml`: Cloudflare Workers configuration with staging/production environments
- `package.json`: Dependencies and deployment scripts
- TypeScript configuration embedded in project structure

## Development Commands

### Local Development
```bash
npm run dev                    # Start local development server
npm run type-check            # Run TypeScript type checking without emit
```

### Deployment
```bash
npm run setup                 # Run the automated deployment script (Deploy.sh)
npm run deploy:staging        # Deploy to staging environment
npm run deploy:production     # Deploy to production environment
npm run deploy                # Build and deploy (same as production)
```

### Automated Setup
```bash
bash Deploy.sh               # Complete setup: creates KV namespaces, updates config, deploys
```

## Environment Configuration

### Staging Environment
- Route: `staging.leverageai.com/api/*`
- Worker name: `leverageai-portfolio-staging`
- Automatic KV namespace creation via deployment script

### Production Environment
- Route: `leverageai.com/api/*`
- Worker name: `leverageai-portfolio`
- Automatic KV namespace creation via deployment script

## Data Models

### Contact Request Interface
```typescript
interface ContactRequest {
  name: string;
  email: string;
  message: string;
  company?: string;
}
```

### Environment Interface
```typescript
interface Env {
  PORTFOLIO_KV: KVNamespace;
  CONTACTS_KV: KVNamespace;
  ENVIRONMENT: string;
}
```

## Key Features

### Contact Form Processing
- Email validation with regex pattern
- Required field validation (name, email, message)
- Automatic ID generation with timestamp and random string
- Storage in CONTACTS_KV with metadata (timestamp, environment)

### Portfolio Data Management
- Dynamic portfolio data served from PORTFOLIO_KV
- Fallback to default company information if KV data unavailable
- Company: LEVERAGEAI LLC, Location: Oregon, Focus: AI-Driven Solutions

### CORS Configuration
- Allow all origins for development flexibility
- Support for GET, POST, OPTIONS methods
- Content-Type header allowed for JSON requests

## Deployment Process

The `Deploy.sh` script automates the complete setup:

1. **Dependency Check**: Verifies and installs Wrangler CLI if needed
2. **Package Installation**: Runs `npm install`
3. **KV Namespace Creation**: Creates staging and production KV namespaces
4. **Configuration Update**: Updates `wrangler.toml` with actual KV namespace IDs
5. **Type Checking**: Validates TypeScript before deployment
6. **Staged Deployment**: Deploys to staging first, then prompts for production

## Testing Endpoints

### Health Check
```bash
curl https://staging.leverageai.com/api/health
```

### Portfolio Data
```bash
curl https://staging.leverageai.com/api/portfolio
```

### Contact Form Submission
```bash
curl -X POST https://staging.leverageai.com/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"Hello"}'
```

## Important Notes

- **KV Namespace IDs**: Initially set to placeholder values in `wrangler.toml`, automatically replaced during deployment
- **Environment Variables**: `ENVIRONMENT` variable distinguishes between staging and production
- **Node.js Compatibility**: Requires Node.js >= 18.0.0 with nodejs_compat flag enabled
- **TypeScript**: Full TypeScript support with strict type checking enabled