'use client';

import { useEffect, useState } from 'react';

export default function ClarityProvider() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for React to fully hydrate
    if (typeof window !== 'undefined') {
      const checkReady = setInterval(() => {
        // Check if your app content exists
        const appContent = document.querySelector('[class*="flex-col"]');
        const hasContent = document.body.textContent.length > 500;
        
        if (appContent && hasContent) {
          clearInterval(checkReady);
          setIsReady(true);
        }
      }, 500);

      return () => clearInterval(checkReady);
    }
  }, []);

  useEffect(() => {
    if (isReady && typeof window !== 'undefined' && !window.clarity) {
      // Only load Clarity after app is ready
      (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        const script=l.createElement(r);
        script.async=1;
        script.src="https://www.clarity.ms/tag/"+i;
        const firstScript=l.getElementsByTagName(r)[0];
        firstScript.parentNode.insertBefore(script,firstScript);
      })(window, document, "clarity", "script", "s5o54foyqw");
    }
  }, [isReady]);

  return null;
}