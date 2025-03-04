import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

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
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
};

export const handler: Handler = async (event) => {
  console.log('🔍 [visitor-storage-set] Request:', {
    method: event.httpMethod,
    body: event.body ? JSON.parse(event.body) : null,
    headers: event.headers
  });

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { visitor_id, campaign_id, deadline } = JSON.parse(event.body || '{}');

    if (!visitor_id || !campaign_id || !deadline) {
      console.warn('❌ [visitor-storage-set] Missing required parameters:', {
        visitor_id: !!visitor_id,
        campaign_id: !!campaign_id,
        deadline: !!deadline
      });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Update or insert visitor deadline
    const { data, error } = await supabase
      .from('visitors')
      .upsert({
        visitor_id,
        campaign_id,
        deadline,
        last_seen: new Date().toISOString()
      })
      .select()
      .single();
    
    console.log('✅ [visitor-storage-set] Storage updated:', {
      visitor_id,
      campaign_id,
      deadline,
      result: data
    });

    if (error) throw error;

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        success: true,
        deadline: data.deadline
      })
    };
  } catch (error) {
    console.error('Error setting visitor storage:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to set visitor storage' })
    };
  }
};