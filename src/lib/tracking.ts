// Tracking script for countdown timer
const STORAGE_KEY = 'countdown_visitor';

interface VisitorData {
  visitorId: string;
  campaignId: string;
  deadline: string;
  lastUpdated: number;
}

export async function initializeTracking(campaignId: string): Promise<VisitorData> {
  try {
    // Check local storage first
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as VisitorData;
      if (data.campaignId === campaignId && Date.now() - data.lastUpdated < 24 * 60 * 60 * 1000) {
        return data;
      }
    }

    // Generate or get visitor ID
    const visitorResponse = await fetch('/.netlify/functions/generate-visitor');
    const { visitorId } = await visitorResponse.json();

    // Look up existing visitor data
    const lookupResponse = await fetch('/.netlify/functions/lookup-visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, visitorId })
    });
    const { visitor } = await lookupResponse.json();

    if (visitor) {
      const data: VisitorData = {
        visitorId,
        campaignId,
        deadline: visitor.deadline,
        lastUpdated: Date.now()
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return data;
    }

    // Create new visitor record
    const setResponse = await fetch('/.netlify/functions/set-visitor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaignId,
        visitorId,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      })
    });
    const { visitor: newVisitor } = await setResponse.json();

    const data: VisitorData = {
      visitorId,
      campaignId,
      deadline: newVisitor.deadline,
      lastUpdated: Date.now()
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return data;
  } catch (error) {
    console.error('Error initializing tracking:', error);
    throw error;
  }
}