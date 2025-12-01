/**
 * Utility for handling HTML responses that indicate authentication redirects
 * When a machine is stopped, API calls return HTML login pages instead of JSON
 */

/**
 * Checks if a response string is HTML (indicating redirect to login)
 * @param responseText - The response text to check
 * @returns true if the response is HTML
 */
export function isHtmlResponse(responseText: string): boolean {
  const trimmed = responseText.trim();
  return (
    trimmed.startsWith('<!DOCTYPE') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<HTML')
  );
}

/**
 * Redirects to login page silently when machine restart is detected
 * This happens when the machine auto-stops and API calls return HTML
 * NOTE: This function is kept for compatibility but should not be used
 * in app context - use the reconnect modal instead
 */
export function redirectToLogin(): void {
  // Use window.location.href for a clean redirect
  // This will trigger the authentication flow
  window.location.href = '/login';
}

/**
 * Handles potential HTML responses in API calls
 * @param responseText - The response text to check
 * @param context - Whether this is during 'login' (silent retry) or 'app' (show modal)
 * @returns true if HTML was detected, false otherwise
 */
export function handleHtmlResponse(responseText: string, context: 'login' | 'app' = 'app'): boolean {
  if (isHtmlResponse(responseText)) {
    if (context === 'login') {
      console.log('Detected HTML response during login - machine is starting, will retry silently...');
      // Don't redirect - just return true to indicate HTML was detected
      // The calling code should handle retry logic
      return true;
    } else {
      console.log('Detected HTML response during app usage - signaling to show reconnect modal...');
      // Return true to signal HTML detected - the calling code should show reconnect modal
      // We no longer throw an error here
      return true;
    }
  }
  return false;
}