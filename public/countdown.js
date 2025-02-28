// Import required dependencies from CDN
import FingerprintJS from 'https://cdn.jsdelivr.net/npm/@fingerprintjs/fingerprintjs@4.2.1/dist/esm.min.js';

// Configuration
const API_BASE_URL = window.location.origin;

// Default styles
const defaultStyles = {
  background: '#f3f4f6',
  text: '#374151',
  padding: '1rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

// Initialize countdown
function initializeCountdown() {
  // Wrap in a try-catch to handle errors gracefully
  try {
    // Find all countdown containers on the page
    const containers = document.querySelectorAll('[data-countdown-widget]');
    
    containers.forEach(async (container) => {
      try {
        console.log('🔄 Starting countdown initialization');

        const campaignId = container.getAttribute('data-campaign-id');
        if (!campaignId) {
          console.error('❌ No campaign ID provided');
          throw new Error('No campaign ID provided');
        }

        console.log('📋 Campaign ID:', campaignId);

        // Show loading state
        Object.assign(container.style, defaultStyles);
        container.innerHTML = '<div>Loading countdown...</div>';

        // Initialize FingerprintJS
        const fp = await FingerprintJS.load();
        const result = await fp.get();
        const fingerprint = result.visitorId;
        const userAgent = navigator.userAgent;

        // Initialize tracking
        console.log('🔍 Generating visitor ID');
        const visitorResponse = await fetch(`${API_BASE_URL}/api/visitor-generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({
            userAgent,
            fingerprint
          })
        });

        if (!visitorResponse.ok) {
          throw new Error(`Failed to generate visitor: ${visitorResponse.status}`);
        }

        const { visitorId } = await visitorResponse.json();
        console.log('✅ Visitor ID generated:', visitorId);

        // Look up visitor data
        console.log('🔍 Looking up visitor data');
        const lookupResponse = await fetch(
          `${API_BASE_URL}/api/combined-visitor-lookup?visitor_id=${encodeURIComponent(visitorId)}`,
          {
            headers: {
              'Accept': 'application/json'
            }
          }
        );

        if (!lookupResponse.ok) {
          throw new Error(`Failed to lookup visitor: ${lookupResponse.status}`);
        }

        const { visitor } = await lookupResponse.json();
        console.log('📋 Visitor data:', visitor);

        let deadline;
        if (!visitor) {
          console.log('🆕 Creating new visitor');
          const setResponse = await fetch(`${API_BASE_URL}/api/visitor-storage/set`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              visitor_id: visitorId,
              campaign_id: campaignId,
              deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
            })
          });
          const { deadline: newDeadline } = await setResponse.json();
          deadline = newDeadline;
        } else {
          deadline = visitor.deadline;
          console.log('⏰ Using existing deadline:', deadline);
        }

        // Get campaign configuration
        console.log('📋 Getting campaign config');
        const configResponse = await fetch(
          `${API_BASE_URL}/api/visitor-storage-get?visitor_id=${encodeURIComponent(visitorId)}&campaign_id=${encodeURIComponent(campaignId)}`
        );
        const { campaign_config: config } = await configResponse.json();
        console.log('✅ Campaign config:', config);

        // Apply campaign styles
        Object.assign(container.style, {
          backgroundColor: config.styles.background,
          color: config.styles.text,
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
            container.innerHTML = '<div>Offer expired</div>';
            return;
          }

          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          container.innerHTML = `
            <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">${config.text_template}</div>
            <div style="font-size: 1.5rem; font-weight: 600;">
              ${days}d ${hours}h ${minutes}m ${seconds}s
            </div>
          `;
        }

        updateDisplay();
        const interval = setInterval(updateDisplay, 1000);
        
        // Clean up interval when the container is removed
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
              if (node === container) {
                clearInterval(interval);
                observer.disconnect();
              }
            });
          });
        });
        
        observer.observe(container.parentNode, { childList: true });
        
      } catch (error) {
        console.error('❌ Error initializing countdown for container:', error);
        Object.assign(container.style, defaultStyles);
        container.innerHTML = '<div>Error loading countdown timer</div>';
      }
    });
  } catch (error) {
    console.error('❌ Error in countdown initialization:', error);
  }
}

// Initialize when the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeCountdown);
} else {
  initializeCountdown();
}

// Re-initialize on dynamic content changes
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      initializeCountdown();
    }
  });
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});