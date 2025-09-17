workers.ts;
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};
export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        // Health check
        if (url.pathname === '/api/health') {
            return Response.json({
                status: 'healthy',
                environment: env.ENVIRONMENT,
                timestamp: new Date().toISOString()
            }, { headers: corsHeaders });
        }
        // Contact form submission
        if (url.pathname === '/api/contact' && request.method === 'POST') {
            try {
                const data = await request.json();
                // Validate required fields
                if (!data.name || !data.email || !data.message) {
                    return Response.json({ error: 'Missing required fields: name, email, message' }, { status: 400, headers: corsHeaders });
                }
                // Email validation
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(data.email)) {
                    return Response.json({ error: 'Invalid email format' }, { status: 400, headers: corsHeaders });
                }
                // Generate contact ID and timestamp
                const contactId = `contact_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const timestamp = new Date().toISOString();
                // Enhanced contact data with additional fields
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
                // Send email notification (if email service is configured)
                try {
                    await sendEmailNotification(contactData, env);
                }
                catch (emailError) {
                    console.error('Email notification failed:', emailError);
                    // Continue without failing the request
                }
                // Send auto-reply to customer
                try {
                    await sendAutoReply(contactData, env);
                }
                catch (replyError) {
                    console.error('Auto-reply failed:', replyError);
                    // Continue without failing the request
                }
                return Response.json({
                    success: true,
                    message: 'Thank you for your inquiry! We will get back to you within 24 hours.',
                    id: contactId,
                    timestamp
                }, { headers: corsHeaders });
            }
            catch (error) {
                return Response.json({ error: 'Invalid request format' }, { status: 400, headers: corsHeaders });
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
            }
            catch (error) {
                return Response.json({ error: 'Failed to retrieve portfolio data' }, { status: 500, headers: corsHeaders });
            }
        }
        // 404 for unmatched routes
        return Response.json({ error: 'Not found' }, { status: 404, headers: corsHeaders });
    },
};
// Email notification functions
async function sendEmailNotification(contactData, env) {
    // This would integrate with your email service (SendGrid, Mailgun, etc.)
    // For now, we'll store notification data in KV as a queue
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
async function sendAutoReply(contactData, env) {
    // Auto-reply to customer
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
