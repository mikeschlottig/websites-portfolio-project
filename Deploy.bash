 Deploy.sh

#!/bin/bash

# LEVERAGEAI LLC - Cloudflare Workers Deployment Script
# Run this script to create KV namespaces and deploy your portfolio API

set -e

echo "🚀 LEVERAGEAI Portfolio Deployment"
echo "=================================="

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Wrangler CLI not found. Installing..."
    npm install -g wrangler
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create staging KV namespaces
echo "🔧 Creating staging KV namespaces..."
STAGING_PORTFOLIO_KV=$(wrangler kv:namespace create "PORTFOLIO_KV" --env staging --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
STAGING_CONTACTS_KV=$(wrangler kv:namespace create "CONTACTS_KV" --env staging --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

# Create production KV namespaces
echo "🔧 Creating production KV namespaces..."
PRODUCTION_PORTFOLIO_KV=$(wrangler kv:namespace create "PORTFOLIO_KV" --env production --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
PRODUCTION_CONTACTS_KV=$(wrangler kv:namespace create "CONTACTS_KV" --env production --preview false | grep -o 'id = "[^"]*"' | cut -d'"' -f2)

# Update wrangler.toml with actual KV namespace IDs
echo "📝 Updating wrangler.toml with KV namespace IDs..."
sed -i.bak "s/your_staging_kv_namespace_id/$STAGING_PORTFOLIO_KV/g" wrangler.toml
sed -i.bak "s/your_staging_contacts_kv_namespace_id/$STAGING_CONTACTS_KV/g" wrangler.toml
sed -i.bak "s/your_production_kv_namespace_id/$PRODUCTION_PORTFOLIO_KV/g" wrangler.toml
sed -i.bak "s/your_production_contacts_kv_namespace_id/$PRODUCTION_CONTACTS_KV/g" wrangler.toml

# Remove backup file
rm wrangler.toml.bak

# Type check
echo "🔍 Type checking..."
npm run type-check

# Deploy to staging first
echo "🚀 Deploying to staging..."
npm run deploy:staging

# Ask for production deployment
echo ""
read -p "Deploy to production? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🚀 Deploying to production..."
    npm run deploy:production
    echo "✅ Production deployment complete!"
else
    echo "⏭️  Skipping production deployment"
fi

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📊 KV Namespace IDs created:"
echo "Staging Portfolio: $STAGING_PORTFOLIO_KV"
echo "Staging Contacts: $STAGING_CONTACTS_KV"
echo "Production Portfolio: $PRODUCTION_PORTFOLIO_KV"
echo "Production Contacts: $PRODUCTION_CONTACTS_KV"
echo ""
echo "🔗 Test your API endpoints:"
echo "Health: https://staging.leverageai.com/api/health"
echo "Portfolio: https://staging.leverageai.com/api/portfolio"
echo ""
echo "📝 To test contact form:"
echo 'curl -X POST https://staging.leverageai.com/api/contact \
  -H "Content-Type: application/json" \
  -d '"'"'{"name":"Test","email":"test@example.com","message":"Hello"}'"'"''