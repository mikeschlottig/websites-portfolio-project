# LEVERAGEAI Portfolio - Cloudflare Workers Deployment Playbook

**Complete step-by-step guide for deploying a TypeScript Cloudflare Worker with KV storage and email automation**

## 📋 Prerequisites

### Required Tools
- Node.js >= 18.0.0
- Git
- GitHub CLI (optional but recommended)
- Cloudflare account with Workers enabled

### Authentication
```bash
# Install Wrangler globally (optional)
npm install -g wrangler

# Login to Cloudflare
npx wrangler login
```

## 🚀 Step-by-Step Deployment Process

### 1. Project Structure Setup

Create the following directory structure:
```
├── css/
│   ├── style.css
│   └── contact-form.css
├── js/
│   ├── portfolio.js
│   └── contact-form.js
├── workers.ts
├── package.json
├── wrangler.toml
├── tsconfig.json
├── .gitignore
├── index.html
├── contact.html
└── CLAUDE.md
```

### 2. Package.json Configuration

**✅ CORRECT SYNTAX:**
```json
{
  "name": "leverageai-portfolio-api",
  "version": "1.0.0",
  "description": "Cloudflare Workers API for LEVERAGEAI LLC portfolio",
  "private": true,
  "scripts": {
    "build": "tsc",
    "dev": "wrangler dev",
    "deploy": "wrangler deploy",
    "deploy:staging": "wrangler deploy --env staging",
    "deploy:production": "wrangler deploy --env production",
    "type-check": "tsc --noEmit"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20240909.0",
    "typescript": "^5.5.4",
    "wrangler": "^4.37.1"
  },
  "dependencies": {},
  "engines": {
    "node": ">=18.0.0"
  }
}
```

**❌ COMMON ERRORS:**
- Using old Wrangler v3 syntax: `"wrangler publish"` instead of `"wrangler deploy"`
- Missing TypeScript configuration
- Corrupted JSON (watch for invisible characters)

### 3. TypeScript Configuration

**✅ CORRECT SYNTAX (tsconfig.json):**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "allowSyntheticDefaultImports": true,
    "types": ["@cloudflare/workers-types"]
  },
  "include": ["workers.ts"],
  "exclude": ["node_modules"]
}
```

### 4. Wrangler Configuration

**✅ CORRECT SYNTAX (wrangler.toml):**
```toml
name = "leverageai-portfolio"
main = "workers.ts"
compatibility_date = "2024-09-16"
compatibility_flags = ["nodejs_compat"]

[env.production]
name = "leverageai-portfolio"
# route = { pattern = "leverageai.com/api/*", zone_name = "leverageai.com" }

[[env.production.kv_namespaces]]
binding = "PORTFOLIO_KV"
id = "your_production_kv_namespace_id"

[[env.production.kv_namespaces]]
binding = "CONTACTS_KV"
id = "your_production_contacts_kv_namespace_id"

[env.production.vars]
ENVIRONMENT = "production"

[env.staging]
name = "leverageai-portfolio-staging"
# route = { pattern = "staging.leverageai.com/api/*", zone_name = "leverageai.com" }

[[env.staging.kv_namespaces]]
binding = "PORTFOLIO_KV"
id = "your_staging_kv_namespace_id"

[[env.staging.kv_namespaces]]
binding = "CONTACTS_KV"
id = "your_staging_contacts_kv_namespace_id"

[env.staging.vars]
ENVIRONMENT = "staging"
```

**❌ COMMON ERRORS:**
- File corruption (invisible characters at start of file)
- Missing `main = "workers.ts"` entry point
- Wrong environment variable placement (`[vars]` vs `[env.production.vars]`)
- Uncommenting routes before domain setup

### 5. Worker TypeScript Code

**✅ CORRECT SYNTAX (workers.ts):**
```typescript
interface Env {
  PORTFOLIO_KV: KVNamespace;
  CONTACTS_KV: KVNamespace;
  ENVIRONMENT: string;
}

interface ContactRequest {
  name: string;
  email: string;
  message: string;
  company?: string;
  'project-type'?: string;
  budget?: string;
  timeline?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (url.pathname === '/api/health') {
      return Response.json(
        {
          status: 'healthy',
          environment: env.ENVIRONMENT,
          timestamp: new Date().toISOString()
        },
        { headers: corsHeaders }
      );
    }

    // Contact form submission
    if (url.pathname === '/api/contact' && request.method === 'POST') {
      try {
        const data: ContactRequest = await request.json();

        // Validate required fields
        if (!data.name || !data.email || !data.message) {
          return Response.json(
            { error: 'Missing required fields: name, email, message' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          return Response.json(
            { error: 'Invalid email format' },
            { status: 400, headers: corsHeaders }
          );
        }

        // Generate contact ID and timestamp
        const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = new Date().toISOString();

        // Enhanced contact data
        const contactData = {
          ...data,
          timestamp,
          id: contactId,
          environment: env.ENVIRONMENT,
          source: 'website_contact_form',
          status: 'new'
        };

        // Store contact in KV
        await env.CONTACTS_KV.put(contactId, JSON.stringify(contactData));

        // Email automation (stores in KV queue)
        try {
          await sendEmailNotification(contactData, env);
          await sendAutoReply(contactData, env);
        } catch (emailError) {
          console.error('Email automation failed:', emailError);
        }

        return Response.json(
          {
            success: true,
            message: 'Thank you for your inquiry! We will get back to you within 24 hours.',
            id: contactId,
            timestamp
          },
          { headers: corsHeaders }
        );
      } catch (error) {
        return Response.json(
          { error: 'Invalid request format' },
          { status: 400, headers: corsHeaders }
        );
      }
    }

    // Portfolio data endpoint
    if (url.pathname === '/api/portfolio' && request.method === 'GET') {
      try {
        const portfolioData = await env.PORTFOLIO_KV.get('portfolio_data', 'json') || {
          company: 'LEVERAGEAI LLC',
          location: 'Oregon',
          focus: 'AI-Driven Solutions',
          projects: [],
          services: [
            'Systems Architecture',
            'AI Implementation',
            'Technical Strategy',
            'Digital Transformation'
          ],
          contact: {
            email: 'hello@leverageai.com',
            phone: 'Available upon request'
          }
        };

        return Response.json(portfolioData, { headers: corsHeaders });
      } catch (error) {
        return Response.json(
          { error: 'Failed to retrieve portfolio data' },
          { status: 500, headers: corsHeaders }
        );
      }
    }

    // 404 for unmatched routes
    return Response.json(
      { error: 'Not found' },
      { status: 404, headers: corsHeaders }
    );
  },
};

// Email notification functions
async function sendEmailNotification(contactData: any, env: Env) {
  const notificationId = `notification_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const notification = {
    type: 'new_contact',
    contactId: contactData.id,
    timestamp: new Date().toISOString(),
    to: 'hello@leverageai.com',
    subject: `New Project Inquiry from ${contactData.name}`,
    data: contactData
  };

  await env.CONTACTS_KV.put(`notification_${notificationId}`, JSON.stringify(notification));
}

async function sendAutoReply(contactData: any, env: Env) {
  const autoReplyId = `autoreply_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const autoReply = {
    type: 'auto_reply',
    contactId: contactData.id,
    timestamp: new Date().toISOString(),
    to: contactData.email,
    subject: 'Thank you for your inquiry - LEVERAGEAI LLC',
    template: 'contact_confirmation',
    data: contactData
  };

  await env.CONTACTS_KV.put(`autoreply_${autoReplyId}`, JSON.stringify(autoReply));
}
```

**❌ COMMON ERRORS:**
- File corruption at first line (invisible characters)
- Missing export default
- Incorrect TypeScript interfaces
- Missing CORS headers

### 6. GitIgnore Configuration

**✅ CORRECT SYNTAX (.gitignore):**
```gitignore
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Build outputs
dist/
build/
.output/

# Environment files
.env
.env.*
!.env.example

# Wrangler files
.wrangler/

# IDE files
.vscode/
.idea/
*.swp
*.swo
*~

# OS files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Desktop.ini
Thumbs.db

# Temporary files
*.tmp
*.temp
*.log

# Development artifacts
.cache/
coverage/
.nyc_output/
*.tgz
*.tar.gz

# Cloudflare specific
wrangler.toml.bak
```

## 🔧 Deployment Steps

### 1. Install Dependencies

```bash
# Install project dependencies
npm install

# Update to latest Wrangler (CRITICAL)
npm install --save-dev wrangler@4
```

**🚨 IMPORTANT:** Always use Wrangler v4.x for modern deployment syntax.

### 2. Authentication Check

```bash
# Verify authentication
npx wrangler whoami

# Should show:
# Account Name: Your Account
# Account ID: your-account-id
# Token Permissions: [list of permissions]
```

### 3. Create KV Namespaces

**Production Namespaces:**
```bash
# Create production PORTFOLIO_KV
npx wrangler kv:namespace create "PORTFOLIO_KV" --preview false

# Output: Add to config: id = "0156f1b6a9b94dcb9c1aafed50b61c3f"

# Create production CONTACTS_KV
npx wrangler kv:namespace create "CONTACTS_KV" --preview false

# Output: Add to config: id = "9ea9c8d991a84797bc711f79caae67f9"
```

**Staging Namespaces:**
```bash
# Create staging PORTFOLIO_KV
npx wrangler kv:namespace create "PORTFOLIO_KV" --env staging --preview false

# Output: Add to config: id = "9f83b25f5d86412f8e74993f71fa69f3"

# Create staging CONTACTS_KV
npx wrangler kv:namespace create "CONTACTS_KV" --env staging --preview false

# Output: Add to config: id = "90058e70f6904931af0c8311ff88fe9c"
```

### 4. Update Wrangler Configuration

Replace the placeholder IDs in `wrangler.toml` with the actual namespace IDs from step 3.

**Before:**
```toml
id = "your_production_kv_namespace_id"
```

**After:**
```toml
id = "0156f1b6a9b94dcb9c1aafed50b61c3f"
```

### 5. TypeScript Compilation Check

```bash
# Verify TypeScript compiles without errors
npm run type-check

# Should complete without output (success)
```

### 6. Deploy to Staging

```bash
# Deploy to staging environment
npx wrangler deploy --env staging

# Expected output:
# ⛅️ wrangler 4.37.1
# Total Upload: 4.70 KiB / gzip: 1.46 KiB
# Your Worker has access to the following bindings:
# Binding                                      Resource
# env.PORTFOLIO_KV (9f83b25f...)              KV Namespace
# env.CONTACTS_KV (90058e70...)               KV Namespace
# env.ENVIRONMENT ("staging")                 Environment Variable
#
# Deployed leverageai-portfolio-staging triggers
# https://leverageai-portfolio-staging.your-subdomain.workers.dev
```

### 7. Test Staging Endpoints

```bash
# Test health endpoint
curl "https://leverageai-portfolio-staging.your-subdomain.workers.dev/api/health"
# Expected: {"status":"healthy","environment":"staging","timestamp":"..."}

# Test portfolio endpoint
curl "https://leverageai-portfolio-staging.your-subdomain.workers.dev/api/portfolio"
# Expected: {"company":"LEVERAGEAI LLC",...}

# Test contact form
curl -X POST "https://leverageai-portfolio-staging.your-subdomain.workers.dev/api/contact" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com","message":"Test message","company":"Test Co","project-type":"website","budget":"5k-15k","timeline":"1-month"}'
# Expected: {"success":true,"message":"Thank you for your inquiry!","id":"contact_...","timestamp":"..."}
```

### 8. Deploy to Production

```bash
# Deploy to production environment
npx wrangler deploy --env production

# Expected output:
# ⛅️ wrangler 4.37.1
# Total Upload: 4.70 KiB / gzip: 1.46 KiB
# Your Worker has access to the following bindings:
# Binding                                      Resource
# env.PORTFOLIO_KV (0156f1b6...)              KV Namespace
# env.CONTACTS_KV (9ea9c8d9...)               KV Namespace
# env.ENVIRONMENT ("production")              Environment Variable
#
# Deployed leverageai-portfolio triggers
# https://leverageai-portfolio.your-subdomain.workers.dev
```

### 9. Test Production Endpoints

```bash
# Test production health endpoint
curl "https://leverageai-portfolio.your-subdomain.workers.dev/api/health"
# Expected: {"status":"healthy","environment":"production","timestamp":"..."}
```

## 📧 Email System Architecture

### KV-Based Email Queue

The email system uses KV storage as a queue for email notifications:

1. **Contact Submission** → Stores contact data in `CONTACTS_KV`
2. **Email Notification** → Stores notification job in `CONTACTS_KV` with prefix `notification_`
3. **Auto-Reply** → Stores auto-reply job in `CONTACTS_KV` with prefix `autoreply_`

### Email Data Structure

**Contact Entry:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Project inquiry",
  "company": "Acme Corp",
  "project-type": "website",
  "budget": "5k-15k",
  "timeline": "1-month",
  "timestamp": "2025-09-17T05:53:00.250Z",
  "id": "contact_1758088380250_8tro8mhoo",
  "environment": "production",
  "source": "website_contact_form",
  "status": "new"
}
```

**Notification Entry:**
```json
{
  "type": "new_contact",
  "contactId": "contact_1758088380250_8tro8mhoo",
  "timestamp": "2025-09-17T05:53:00.251Z",
  "to": "hello@leverageai.com",
  "subject": "New Project Inquiry from John Doe",
  "data": { /* contact data */ }
}
```

**Auto-Reply Entry:**
```json
{
  "type": "auto_reply",
  "contactId": "contact_1758088380250_8tro8mhoo",
  "timestamp": "2025-09-17T05:53:00.252Z",
  "to": "john@example.com",
  "subject": "Thank you for your inquiry - LEVERAGEAI LLC",
  "template": "contact_confirmation",
  "data": { /* contact data */ }
}
```

### Processing Email Queue

To process the email queue, you can create a separate Worker or cron job that:

1. Lists KV keys with prefixes `notification_` and `autoreply_`
2. Processes each email through your email service (SendGrid, Mailgun, etc.)
3. Deletes processed items from KV

## 🛠️ Common Errors & Solutions

### 1. "Invalid character, expected '='" in wrangler.toml

**Problem:** File corruption or invisible characters
**Solution:** Recreate the file with proper syntax, ensure first line starts with `name =`

### 2. "Cannot find name 'workers'" TypeScript Error

**Problem:** File corruption in workers.ts
**Solution:** Recreate workers.ts ensuring first line is clean interface definition

### 3. "Command failed: npm run build"

**Problem:** Old Wrangler v3 syntax in package.json
**Solution:** Update to v4 syntax: `"deploy": "wrangler deploy"` not `"wrangler publish"`

### 4. "Could not find zone for domain"

**Problem:** Custom domain routes without DNS setup
**Solution:** Comment out route configurations until domain is added to Cloudflare

### 5. Missing Environment Variables

**Problem:** `[vars]` at top level instead of `[env.production.vars]`
**Solution:** Move environment variables under environment-specific sections

## 🎯 Success Criteria

✅ **TypeScript compiles without errors**
✅ **Staging deployment successful**
✅ **Production deployment successful**
✅ **All API endpoints respond correctly**
✅ **Contact form submissions store in KV**
✅ **Email automation creates queue entries**
✅ **Environment variables set correctly**
✅ **CORS headers work for frontend integration**

## 🔄 Future Enhancements

1. **Email Service Integration:** Connect to SendGrid/Mailgun for actual email sending
2. **Custom Domain Setup:** Add domain to Cloudflare and enable routes
3. **Cron Job:** Add scheduled email queue processing
4. **Analytics:** Add submission tracking and metrics
5. **Rate Limiting:** Implement contact form rate limiting
6. **Validation:** Enhanced form validation and sanitization

## 📝 Quick Reference Commands

```bash
# Check authentication
npx wrangler whoami

# Create KV namespace
npx wrangler kv:namespace create "NAMESPACE_NAME" --preview false

# Deploy to staging
npx wrangler deploy --env staging

# Deploy to production
npx wrangler deploy --env production

# Check TypeScript
npm run type-check

# Test endpoint
curl "https://your-worker.workers.dev/api/health"

# View KV namespaces
npx wrangler kv:namespace list

# View KV keys
npx wrangler kv:key list --binding CONTACTS_KV --env production
```

---

**This playbook captures the exact process and syntax that led to successful deployment. Follow it step-by-step for reliable, repeatable deployments.** 🚀