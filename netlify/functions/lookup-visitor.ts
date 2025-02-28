import { Handler } from '@netlify/functions';
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
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { campaignId, visitorId } = JSON.parse(event.body || '{}');

    if (!campaignId || !visitorId) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    const { data: visitor, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('visitor_id', visitorId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ visitor })
    };
  } catch (error) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to lookup visitor' })
    };
  }
}