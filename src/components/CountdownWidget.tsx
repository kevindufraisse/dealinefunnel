import React, { useEffect, useRef } from 'react';

interface CountdownWidgetProps {
  campaignId: string;
}

export const CountdownWidget: React.FC<CountdownWidgetProps> = ({ campaignId }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptRef = useRef<HTMLScriptElement | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Nettoyer l'ancien script s'il existe
    if (scriptRef.current) {
      scriptRef.current.remove();
    }

    // Créer le nouveau script
    const script = document.createElement('script');
    script.type = 'module';
    script.src = 'https://comfy-blancmange-30c2ff.netlify.app/countdown.js';
    scriptRef.current = script;

    // Ajouter le script au body
    document.body.appendChild(script);

    return () => {
      // Nettoyer le script lors du démontage du composant
      if (scriptRef.current) {
        scriptRef.current.remove();
      }
    };
  }, [campaignId]); // Réexécuter si le campaignId change

  return (
    <div 
      ref={containerRef}
      id="countdown-timer" 
      data-campaign-id={campaignId}
      style={{ minHeight: '100px' }} // Pour éviter le flash de contenu
    />
  );
}; 