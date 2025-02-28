// Configuration
const API_BASE_URL = 'https://dealinefunnel.netlify.app';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Délais exponentiels

// Utility functions
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = `expires=${date.toUTCString()}`;
  document.cookie = `${name}=${value};${expires};path=/;SameSite=Lax`;
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

// Default headers for all API requests
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept': 'application/json',
  'Origin': window.location.origin
};

// Default styles
const defaultStyles = {
  background: '#f3f4f6',
  text: '#374151',
  padding: '1rem',
  borderRadius: '0.5rem',
  textAlign: 'center',
  fontFamily: 'system-ui, -apple-system, sans-serif'
};

// Fonction utilitaire pour les retries
async function withRetry(operation, name) {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      console.log(`🔄 [${name}] Tentative ${attempt + 1}/${MAX_RETRIES}`);
      const result = await operation();
      console.log(`✅ [${name}] Succès à la tentative ${attempt + 1}`);
      return result;
    } catch (error) {
      console.error(`❌ [${name}] Échec à la tentative ${attempt + 1}:`, error);
      if (attempt === MAX_RETRIES - 1) throw error;
      const delay = RETRY_DELAYS[attempt];
      console.log(`⏳ [${name}] Attente de ${delay}ms avant la prochaine tentative`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Fonction de validation des données
function validateCampaignData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid campaign data format');
  }
  if (!data.campaignId || typeof data.campaignId !== 'string') {
    throw new Error('Invalid campaign ID');
  }
  return true;
}

// Fonction de validation du visiteur
function validateVisitorData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid visitor data format');
  }
  if (!data.visitorId || typeof data.visitorId !== 'string') {
    throw new Error('Invalid visitor ID');
  }
  if (!data.deadline || !Date.parse(data.deadline)) {
    throw new Error('Invalid deadline format');
  }
  return true;
}

// Cache pour éviter les appels redondants
const processedContainers = new WeakSet();

// Fonction pour charger FingerprintJS de manière fiable
async function loadFingerprintJS() {
  try {
    console.log('🔍 Chargement de FingerprintJS');
    const FingerprintJS = await import('https://openfpcdn.io/fingerprintjs/v4');
    console.log('✅ FingerprintJS chargé avec succès');
    return FingerprintJS.default;
  } catch (error) {
    console.error('❌ Erreur lors du chargement de FingerprintJS:', error);
    throw new Error('Failed to load FingerprintJS');
  }
}

// Initialize countdown
async function initializeCountdown() {
  try {
    console.log('🔄 Démarrage de l\'initialisation du compte à rebours');

    // Find all countdown containers on the page
    const containers = document.querySelectorAll('[data-countdown-widget]');
    console.log(`🔍 Conteneurs trouvés: ${containers.length}`);
    
    if (containers.length === 0) {
      console.log('ℹ️ Aucun conteneur de compte à rebours trouvé');
      return;
    }

    // Load FingerprintJS once for all containers
    const FingerprintJS = await withRetry(
      () => loadFingerprintJS(),
      'loadFingerprintJS'
    );
    
    console.log('🔍 Initialisation de l\'instance FingerprintJS');
    const fp = await FingerprintJS.load();
    
    // Process each container
    for (const container of containers) {
      try {
        // Skip if already processed
        if (processedContainers.has(container)) {
          console.log('ℹ️ Conteneur déjà traité, ignoré');
          continue;
        }

        const campaignId = container.getAttribute('data-campaign-id');
        if (!campaignId) {
          console.error('❌ ID de campagne manquant');
          container.innerHTML = '<div style="color: red;">Configuration error: Missing campaign ID</div>';
          continue;
        }

        console.log(`📋 Traitement de la campagne: ${campaignId}`);

        // Show loading state
        Object.assign(container.style, defaultStyles);
        container.innerHTML = '<div>Chargement du compte à rebours...</div>';

        // Get fingerprint
        const result = await withRetry(
          async () => {
            console.log('🔍 Génération de l\'empreinte');
            const r = await fp.get();
            console.log('✅ Empreinte générée');
            return r;
          },
          'generateFingerprint'
        );

        const fingerprint = result.visitorId;
        const userAgent = navigator.userAgent;

        // Initialize tracking
        const visitorResponse = await withRetry(
          async () => {
            console.log('🔍 Génération de l\'ID visiteur');
            const response = await fetch(`${API_BASE_URL}/api/visitor-generate`, {
              method: 'POST',
              headers: defaultHeaders,
              body: JSON.stringify({
                userAgent,
                fingerprint,
                campaignId
              })
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
          },
          'generateVisitor'
        );

        const visitorData = await visitorResponse.json();
        validateVisitorData(visitorData);
        const { visitorId } = visitorData;

        // Look up visitor data
        const lookupResponse = await withRetry(
          async () => {
            console.log('🔍 Recherche des données visiteur');
            const response = await fetch(
              `${API_BASE_URL}/api/combined-visitor-lookup?visitor_id=${encodeURIComponent(visitorId)}`,
              { headers: defaultHeaders }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
          },
          'lookupVisitor'
        );

        const { visitor } = await lookupResponse.json();

        let deadline;
        if (!visitor) {
          console.log('🆕 Création d\'un nouveau visiteur');
          const setResponse = await withRetry(
            async () => {
              const response = await fetch(`${API_BASE_URL}/api/visitor-storage/set`, {
                method: 'POST',
                headers: defaultHeaders,
                body: JSON.stringify({
                  visitor_id: visitorId,
                  campaign_id: campaignId,
                  deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
                })
              });

              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }

              return response;
            },
            'setVisitorStorage'
          );

          const { deadline: newDeadline } = await setResponse.json();
          deadline = newDeadline;
        } else {
          deadline = visitor.deadline;
        }

        // Get campaign configuration
        const configResponse = await withRetry(
          async () => {
            console.log('📋 Récupération de la configuration de la campagne');
            const response = await fetch(
              `${API_BASE_URL}/api/visitor-storage-get?visitor_id=${encodeURIComponent(visitorId)}&campaign_id=${encodeURIComponent(campaignId)}`,
              { headers: defaultHeaders }
            );

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            return response;
          },
          'getCampaignConfig'
        );

        const { campaign_config: config } = await configResponse.json();

        // Mark container as processed
        processedContainers.add(container);

        // Apply campaign styles
        Object.assign(container.style, {
          backgroundColor: config.styles.background,
          color: config.styles.text,
          padding: '1rem',
          borderRadius: '0.5rem',
          textAlign: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        });

        // Debounced update function
        const debounce = (func, wait) => {
          let timeout;
          return function executedFunction(...args) {
            const later = () => {
              clearTimeout(timeout);
              func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
          };
        };

        const updateDisplay = () => {
          const now = new Date().getTime();
          const end = new Date(deadline).getTime();
          const distance = end - now;

          if (distance < 0) {
            container.innerHTML = '<div>Offre expirée</div>';
            return;
          }

          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);

          container.innerHTML = `
            <div style="font-size: 0.875rem; margin-bottom: 0.5rem;">${config.text_template}</div>
            <div style="font-size: 1.5rem; font-weight: 600;">
              ${days}j ${hours}h ${minutes}m ${seconds}s
            </div>
          `;
        };

        const debouncedUpdate = debounce(updateDisplay, 100);
        updateDisplay();
        const interval = setInterval(debouncedUpdate, 1000);

        // Cleanup on container removal
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

      } catch (containerError) {
        console.error('❌ Erreur lors du traitement du conteneur:', containerError);
        container.innerHTML = `<div style="color: red;">Une erreur est survenue: ${containerError.message}</div>`;
      }
    }
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    document.querySelectorAll('[data-countdown-widget]').forEach(container => {
      container.innerHTML = '<div style="color: red;">Une erreur système est survenue</div>';
    });
  }
}

// Initialize on load and handle dynamic content
document.addEventListener('DOMContentLoaded', initializeCountdown);

// Debounced observer for dynamic content
const contentObserver = new MutationObserver(
  debounce(() => {
    console.log('🔄 Contenu dynamique détecté, réinitialisation du compte à rebours');
    initializeCountdown();
  }, 500)
);

contentObserver.observe(document.body, {
  childList: true,
  subtree: true
});