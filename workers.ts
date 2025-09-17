 workers.ts

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

        // Store contact with timestamp
        const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const contactData = {
          ...data,
          timestamp: new Date().toISOString(),
          id: contactId,
          environment: env.ENVIRONMENT
        };

        await env.CONTACTS_KV.put(contactId, JSON.stringify(contactData));

        return Response.json(
          { 
            success: true, 
            message: 'Contact form submitted successfully',
            id: contactId
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
        // Get cached portfolio data or return default
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
