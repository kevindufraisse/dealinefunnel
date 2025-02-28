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
  console.log('🔍 [visitor-storage-get] Request:', {
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
    const campaignId = event.queryStringParameters?.campaign_id;

    if (!visitorId || !campaignId) {
      console.warn('❌ [visitor-storage-get] Missing required parameters:', {
        visitor_id: !!visitorId,
        campaign_id: !!campaignId
      });
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Get visitor deadline and campaign config
    const { data, error } = await supabase
      .from('visitors')
      .select(`
        deadline,
        campaigns (
          title,
          styles,
          target_urls
        )
      `)
      .eq('visitor_id', visitorId)
      .eq('campaign_id', campaignId)
      .single();

    if (error) {
      console.error('❌ [visitor-storage-get] Database error:', error);
      throw error;
    }

    console.log('✅ [visitor-storage-get] Storage retrieved:', {
      visitor_id: visitorId,
      campaign_id: campaignId,
      data: data
    });

    return {
      statusCode: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deadline: data.deadline,
        campaign_config: {
          text_template: data.campaigns.title,
          styles: data.campaigns.styles,
          target_pages: data.campaigns.target_urls
        }
      })
    };
  } catch (error) {
    console.error('Error getting visitor storage:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Failed to get visitor storage' })
    };
  }
};