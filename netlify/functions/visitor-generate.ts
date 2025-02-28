import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

console.log('Debug - Supabase Config:', {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  hasKey: !!(process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
});

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dealinefunnel.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

export const handler: Handler = async (event) => {
  console.log('🔍 [visitor-generate] Request:', {
    method: event.httpMethod,
    headers: event.headers,
    body: event.body ? JSON.parse(event.body) : null
  });

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { fingerprint, userAgent } = JSON.parse(event.body || '{}');
    const visitorId = uuidv4();
    const ipAddress = event.headers['client-ip'] || '';

    console.log('📝 [visitor-generate] Creating visitor:', {
      visitor_id: visitorId,
      ip: ipAddress,
      fingerprint,
      userAgent
    });
    // Create visitor session
    await supabase
      .from('visitor_sessions')
      .insert([{
        visitor_id: visitorId,
        ip_address: ipAddress,
        user_agent: userAgent,
        fingerprint
      }]);

      console.log('📊 [visitor-generate] Database response:', {
        success: true,
        timestamp: new Date().toISOString()
      });

    console.log('✅ [visitor-generate] Visitor created successfully');

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        visitor_id: visitorId,
        created_at: new Date().toISOString()
      })
    };
  } catch (error) {
    console.error('❌ [visitor-generate] Error:', {
      message: error.message,
      code: error.code,
      details: error.details,
      stack: error.stack
    });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to generate visitor ID' })
    };
  }
};