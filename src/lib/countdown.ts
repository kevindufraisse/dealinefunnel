// Countdown Timer Script
import { createClient } from '@supabase/supabase-js';
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const SUPABASE_URL = 'https://vyovwrqbmtfobiktvzgn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5b3Z3cnFibXRmb2Jpa3R2emduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA3MzcxNTUsImV4cCI6MjA1NjMxMzE1NX0.0UEyy8rqpt4Kg48LfQ-6q8FyqZnpZ3HxISQE0q2tJmM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
const fpPromise = FingerprintJS.load();

// Default styles for error states
const defaultStyles = {
  background: '#f3f4f6',
  text: '#374151',
  padding: '1rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

async function getVisitorId() {
  const fp = await fpPromise;
  const result = await fp.get();
  return result.visitorId;
}

async function initializeCountdown() {
  try {
    // Get container early to show loading state
    const container = document.getElementById('countdown-timer');
    if (!container) return;
    
    const campaignId = container.getAttribute('data-campaign-id');
    if (!campaignId) {
      throw new Error('No campaign ID provided');
    }

    // Show loading state
    Object.assign(container.style, defaultStyles);
    container.innerHTML = '<div>Loading countdown...</div>';

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      console.error('Campaign not found:', campaignError);
      container.innerHTML = '<div>Campaign not found</div>';
      return;
    }

    // Get or create visitor record
    const visitorId = await getVisitorId();
    const { data: visitor, error: visitorError } = await supabase
      .from('visitors')
      .select('*')
      .eq('campaign_id', campaignId)
      .eq('visitor_id', visitorId)
      .single();

    let deadline;
    if (!visitor) {
      // Calculate deadline based on campaign type
      if (campaign.type === 'evergreen') {
        deadline = new Date(Date.now() + campaign.duration_minutes * 60 * 1000).toISOString();
      } else {
        deadline = campaign.fixed_deadline;
      }

      // Create visitor record
      await supabase
        .from('visitors')
        .insert([{
          visitor_id: visitorId,
          ip_address: '',
          fingerprint: visitorId,
          deadline,
          campaign_id: campaignId
        }]);
    } else {
      deadline = visitor.deadline;
    }

    // Apply campaign styles
    Object.assign(container.style, {
      backgroundColor: campaign.styles.background,
      color: campaign.styles.text,
      padding: '1rem',
      borderRadius: '0.5rem',
      textAlign: 'center',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    });

    function updateDisplay() {
      const now = new Date().getTime();
      const end = new Date(deadline).getTime();
      const distance = end - now;

      if (distance < 0) {
        container.innerHTML = campaign.expiration_action.content;
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      container.innerHTML = `
        <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">${campaign.title}</div>
        <div style="font-size: 1.5rem; font-weight: 600;">
          ${days}d ${hours}h ${minutes}m ${seconds}s
        </div>
      `;
    }

    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    window.addEventListener('unload', () => clearInterval(interval));
  } catch (error) {
    console.error('Error initializing countdown:', error);
    const container = document.getElementById('countdown-timer');
    if (container) {
      Object.assign(container.style, defaultStyles);
      container.innerHTML = '<div>Error loading countdown timer</div>';
    }
  }
}

// Initialize when DOM is ready
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  initializeCountdown();
} else {
  document.addEventListener('DOMContentLoaded', initializeCountdown);
}