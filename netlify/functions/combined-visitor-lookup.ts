import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_ANON_KEY!
);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export const handler: Handler = async (event) => {
  console.log('🔍 [combined-visitor-lookup] Request:', {
    method: event.httpMethod,
    params: event.queryStringParameters,
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
    const visitorId = event.queryStringParameters?.visitor_id;
    
    if (!visitorId) {
      console.warn('❌ [combined-visitor-lookup] Missing visitor ID');
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Visitor ID is required' })
      };
    }

    // Get visitor and their latest deadline
    const { data, error } = await supabase
      .from('visitors')
      .select(`
        id,
        visitor_id,
        created_at,
        last_seen,
        deadline,
        campaigns (
          id,
          title,
          type,
          styles
        )
      `)
      .eq('visitor_id', visitorId)
      .single();

    if (error) {
      console.error('❌ [combined-visitor-lookup] Database error:', {
        code: error.code,
        message: error.message,
        details: error.details,
        query: error.query
      });
      throw error;
    }

    console.log('✅ [combined-visitor-lookup] Success:', {
      visitor_id: visitorId,
      data: data
    });
    // Update last_seen
    await supabase
      .from('visitors')
      .update({ last_seen: new Date().toISOString() })
      .eq('visitor_id', visitorId);

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        visitor: {
          id: data.id,
          created_at: data.created_at,
          last_seen: data.last_seen
        },
        deadline: {
          timestamp: data.deadline,
          campaign_id: data.campaigns?.id
        }
      })
    };
  } catch (error) {
    console.error('❌ [combined-visitor-lookup] Error:', {
      type: error.name,
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to lookup visitor' })
    };
  }
};