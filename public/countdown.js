// Configuration
const API_BASE_URL = 'https://dealinefunnel.netlify.app';
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Délais exponentiels
const DEBOUNCE_DELAY = 1000; // 1 seconde de délai pour le debounce

// Cache pour éviter les appels redondants
const processedContainers = new WeakSet();
const processingContainers = new WeakSet();

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

// Fonction pour vérifier si un container est en cours de traitement
function isProcessing(container) {
  return processingContainers.has(container);
}

// Fonction pour marquer un container comme en cours de traitement
function markProcessing(container) {
  processingContainers.add(container);
}

// Fonction pour terminer le traitement d'un container
function finishProcessing(container) {
  processingContainers.delete(container);
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

    // Process each container
    for (const container of containers) {
      try {
        // Skip if already processed or processing
        if (processedContainers.has(container)) {
          console.log('ℹ️ Conteneur déjà traité, ignoré');
          continue;
        }

        if (isProcessing(container)) {
          console.log('ℹ️ Conteneur en cours de traitement, ignoré');
          continue;
        }

        markProcessing(container);

        const campaignId = container.getAttribute('data-campaign-id');
        if (!campaignId) {
          console.error('❌ ID de campagne manquant');
          container.innerHTML = '<div style="color: red;">Erreur de configuration: ID de campagne manquant</div>';
          finishProcessing(container);
          continue;
        }

        console.log(`📋 Traitement de la campagne: ${campaignId}`);

        // Show loading state
        Object.assign(container.style, defaultStyles);
        container.innerHTML = '<div>Chargement du compte à rebours...</div>';

        // Load FingerprintJS
        console.log('🔍 Chargement de FingerprintJS');
        const FingerprintJS = await import('https://openfpcdn.io/fingerprintjs/v4')
          .catch(error => {
            console.error('❌ Erreur lors du chargement de FingerprintJS:', error);
            throw new Error('Impossible de charger FingerprintJS');
          });

        console.log('✅ FingerprintJS chargé, initialisation...');
        const fp = await FingerprintJS.default.load();
        
        console.log('🔍 Génération de l\'empreinte');
        const result = await fp.get();
        const fingerprint = result.visitorId;
        const userAgent = navigator.userAgent;

        console.log('📡 Appel API pour générer l\'ID visiteur');
        const visitorResponse = await fetch(`${API_BASE_URL}/api/visitor-generate`, {
          method: 'POST',
          headers: defaultHeaders,
          body: JSON.stringify({
            userAgent,
            fingerprint,
            campaignId
          })
        });

        if (!visitorResponse.ok) {
          throw new Error(`Erreur HTTP: ${visitorResponse.status}`);
        }

        const visitorData = await visitorResponse.json();
        console.log('✅ Données visiteur reçues:', visitorData);

        const { visitorId } = visitorData;
        if (!visitorId) {
          throw new Error('ID visiteur manquant dans la réponse');
        }

        console.log('📡 Recherche des données visiteur');
        const lookupResponse = await fetch(
          `${API_BASE_URL}/api/combined-visitor-lookup?visitor_id=${encodeURIComponent(visitorId)}`,
          { headers: defaultHeaders }
        );

        if (!lookupResponse.ok) {
          throw new Error(`Erreur HTTP lookup: ${lookupResponse.status}`);
        }

        const lookupData = await lookupResponse.json();
        console.log('✅ Données lookup reçues:', lookupData);

        if (!lookupData.visitor) {
          throw new Error('Données visiteur manquantes dans la réponse lookup');
        }

        const deadline = lookupData.visitor.deadline;
        if (!deadline) {
          throw new Error('Date limite manquante dans les données visiteur');
        }

        // Mark container as processed
        processedContainers.add(container);

        // Update display
        const updateDisplay = () => {
          try {
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
              <div style="font-size: 1.5rem; font-weight: 600;">
                ${days}j ${hours}h ${minutes}m ${seconds}s
              </div>
            `;
          } catch (error) {
            console.error('❌ Erreur lors de la mise à jour de l\'affichage:', error);
            container.innerHTML = '<div style="color: red;">Erreur d\'affichage</div>';
          }
        };

        // Initial update
        updateDisplay();
        
        // Set up interval
        const interval = setInterval(updateDisplay, 1000);

        // Cleanup on container removal
        const observer = new MutationObserver((mutations) => {
          mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
              if (node === container) {
                clearInterval(interval);
                observer.disconnect();
                processedContainers.delete(container);
                finishProcessing(container);
              }
            });
          });
        });

        observer.observe(container.parentNode, { childList: true });
        finishProcessing(container);

      } catch (containerError) {
        console.error('❌ Erreur lors du traitement du conteneur:', containerError);
        container.innerHTML = `<div style="color: red;">Une erreur est survenue: ${containerError.message}</div>`;
        finishProcessing(container);
      }
    }
  } catch (error) {
    console.error('❌ Erreur globale:', error);
    document.querySelectorAll('[data-countdown-widget]').forEach(container => {
      container.innerHTML = '<div style="color: red;">Une erreur système est survenue</div>';
      finishProcessing(container);
    });
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initializeCountdown);

// Debounced observer for dynamic content
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

const contentObserver = new MutationObserver(
  debounce(() => {
    console.log('🔄 Contenu dynamique détecté');
    const unprocessedContainers = Array.from(document.querySelectorAll('[data-countdown-widget]'))
      .filter(container => !processedContainers.has(container) && !isProcessing(container));
    
    if (unprocessedContainers.length > 0) {
      console.log(`🔄 ${unprocessedContainers.length} nouveaux conteneurs détectés`);
      initializeCountdown();
    }
  }, DEBOUNCE_DELAY)
);

contentObserver.observe(document.body, {
  childList: true,
  subtree: true
});