import { Handler } from '@netlify/functions';
import FingerprintJS from '@fingerprintjs/fingerprintjs';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://dealinefunnel.netlify.app',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

export const handler: Handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const fp = await FingerprintJS.load();
    const result = await fp.get();
    const visitorId = result.visitorId;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visitorId })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to generate visitor ID' })
    };
  }
}