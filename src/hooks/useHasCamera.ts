// ============================================================================
// CAMERA AVAILABILITY HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useHasCamera(): boolean {
  // Optimistically start with true if getUserMedia API exists
  // This prevents flash of missing button while checking for devices
  const [hasCam, setHasCam] = useState(() => {
    return !!(typeof window !== 'undefined' && navigator.mediaDevices?.getUserMedia);
  });

  useEffect(() => {
    async function checkCamera() {
      try {
        // First check if mediaDevices API is available at all
        if (!navigator.mediaDevices?.getUserMedia) {
          console.log('📷 No getUserMedia API available');
          setHasCam(false);
          return;
        }
        
        // For USB cameras and better compatibility, we optimistically show the button
        // if getUserMedia is available. The actual camera check happens in the modal.
        // This prevents the issue where USB cameras aren't enumerated until after permission.
        
        try {
          // Try to enumerate devices without requesting permission
          const devices = await navigator.mediaDevices.enumerateDevices();
          const videoDevices = devices.filter(device => device.kind === 'videoinput');
          
          console.log('📷 Video devices found:', videoDevices.length, videoDevices);
          
          if (videoDevices.length > 0) {
            // Found devices directly
            setHasCam(true);
            return;
          }
          
          // If no devices found but getUserMedia exists, assume camera might be available
          // This handles USB cameras and permission-gated device enumeration
          console.log('📷 No devices enumerated yet, but getUserMedia available - showing button');
          setHasCam(true);
          
        } catch (enumError) {
          console.log('📷 Enumerate error, but getUserMedia exists - showing button:', enumError);
          // Even if enumerate fails, if getUserMedia exists, show the button
          setHasCam(true);
        }
        
      } catch (error) {
        console.error('Error in camera check:', error);
        setHasCam(false);
      }
    }
    
    checkCamera();
  }, []);

  return hasCam;
}

