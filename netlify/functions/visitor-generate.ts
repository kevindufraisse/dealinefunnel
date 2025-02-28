import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

console.log('Debug - Supabase Config:', {
  url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY
});

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Accept, Origin, client-ip, x-forwarded-for',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400'
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
    const parsedBody = JSON.parse(event.body || '{}');
    const { fingerprint, userAgent } = parsedBody;
    const now = new Date();

    // Extraire l'IP depuis le header "client-ip" ou "x-forwarded-for"
    const ipAddress = event.headers['client-ip'] || event.headers['x-forwarded-for'] || event.headers['x-real-ip'] || '';
    if (!ipAddress) {
      console.warn('IP introuvable dans les headers');
    }
    
    console.log('IP récupérée:', ipAddress);

    // Création d'une nouvelle campagne
    const campaignId = uuidv4();
    const { error: campaignError } = await supabase
      .from('campaigns')
      .insert([{
        id: campaignId,
        title: 'Test Campaign',
        type: 'evergreen',
        duration_minutes: 1440, // 24 heures
        target_urls: ['*'],
        expiration_action: { type: 'message', content: 'Offer expired' },
        styles: { background: '#f3f4f6', text: '#111827', button: '#3b82f6' }
      }]);

    if (campaignError) {
      console.error('❌ [visitor-generate] Campaign creation error:', campaignError);
      throw campaignError;
    }

    const visitorId = uuidv4();
    const deadline = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 heures

    console.log('📝 [visitor-generate] Creating visitor:', {
      visitor_id: visitorId,
      ip: ipAddress,
      fingerprint,
      userAgent,
      campaign_id: campaignId,
      deadline: deadline.toISOString()
    });

    // Création de l'entrée visitor avec .select() pour vérifier l'insertion
    const { data: visitorData, error: visitorError } = await supabase
      .from('visitors')
      .insert([{
        id: uuidv4(),
        visitor_id: visitorId,
        ip_address: ipAddress,
        user_agent: userAgent,
        fingerprint,
        campaign_id: campaignId,
        deadline: deadline.toISOString(),
        last_seen: now.toISOString()
      }])
      .select();

    if (visitorError) {
      console.error('❌ [visitor-generate] Visitor creation error:', visitorError);
      throw visitorError;
    }

    console.log('Donnée insérée dans visitors:', visitorData);

    // Création de la session visitor
    const { error: sessionError } = await supabase
      .from('visitor_sessions')
      .insert([{
        visitor_id: visitorId,
        ip_address: ipAddress,
        user_agent: userAgent,
        fingerprint
      }]);

    if (sessionError) {
      console.error('❌ [visitor-generate] Session creation error:', sessionError);
      throw sessionError;
    }

    console.log('📊 [visitor-generate] Database response:', {
      success: true,
      timestamp: now.toISOString()
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
        campaign_id: campaignId,
        created_at: now.toISOString(),
        deadline: deadline.toISOString()
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
      body: JSON.stringify({ 
        error: 'Failed to generate visitor ID',
        details: error.message
      })
    };
  }
};
