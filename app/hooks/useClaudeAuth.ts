import { useState, useEffect } from 'react';
import { isElectronMode } from '@/app/config/deployment';

export interface ClaudeAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  userId: string;
  subscriptionType: string;
  account: {
    email_address: string;
    uuid: string;
  };
}

export interface AuthState {
  isAuthenticated: boolean;
  session: ClaudeAuthSession | null;
  isLoading: boolean;
  error: string | null;
  hasPendingAuth: boolean;
}

export function useClaudeAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    session: null,
    isLoading: true,
    error: null,
    hasPendingAuth: false
  });

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      console.log("[DEBUG AUTH] Checking authentication status...");
      console.log("[DEBUG AUTH] Deployment mode:", isElectronMode() ? 'Electron' : 'Web');
      console.log("[DEBUG AUTH] ElectronAPI available:", !!window?.electronAPI);
      console.log("[DEBUG AUTH] Auth API available:", !!window?.electronAPI?.auth);

      // Check if we have access to electronAPI (only available in Electron context)
      if (isElectronMode() && window.electronAPI?.auth) {
        console.log("[DEBUG AUTH] Calling electronAPI.auth.checkStatus()...");
        const result = await window.electronAPI.auth.checkStatus();
        console.log("[DEBUG AUTH] Auth status result:", result);

        if (result.success) {
          setAuthState({
            isAuthenticated: result.isAuthenticated,
            session: result.session || null,
            isLoading: false,
            error: null,
            hasPendingAuth: false
          });
        } else {
          setAuthState({
            isAuthenticated: false,
            session: null,
            isLoading: false,
            error: result.error || 'Authentication check failed',
            hasPendingAuth: false
          });
        }
      } else {
        // No Electron API available (probably running in browser)
        console.log("[DEBUG AUTH] No Electron API available, setting unauthenticated state");
        setAuthState({
          isAuthenticated: false,
          session: null,
          isLoading: false,
          error: null,
          hasPendingAuth: false
        });
      }
    } catch (error) {
      console.error('Failed to check auth status:', error);
      setAuthState({
        isAuthenticated: false,
        session: null,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Authentication check failed',
        hasPendingAuth: false
      });
    }
  };

  const signIn = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      if (!isElectronMode() || !window.electronAPI?.auth) {
        throw new Error('Authentication is only available in the Electron app');
      }

      console.log('[AUTH] Starting OAuth flow, waiting for completion...');
      const result = await window.electronAPI.auth.startOAuth();

      if (result.success) {
        console.log('[AUTH] OAuth completed successfully, updating state');

        // If we got a session back, update state directly
        if (result.session) {
          setAuthState({
            isAuthenticated: true,
            session: result.session,
            isLoading: false,
            error: null,
            hasPendingAuth: false
          });
        } else {
          // Fallback: Check auth status if no session in response
          await checkAuthStatus();
        }
      } else {
        throw new Error(result.error || 'OAuth flow failed');
      }
    } catch (error) {
      console.error('Sign in failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign in failed',
        hasPendingAuth: false
      }));
    }
  };

  const signOut = async () => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true, error: null }));

      if (isElectronMode() && window.electronAPI?.auth) {
        const result = await window.electronAPI.auth.signOut();

        if (!result.success) {
          throw new Error(result.error || 'Sign out failed');
        }
      }

      setAuthState({
        isAuthenticated: false,
        session: null,
        isLoading: false,
        error: null,
        hasPendingAuth: false
      });
    } catch (error) {
      console.error('Sign out failed:', error);
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Sign out failed',
        hasPendingAuth: false
      }));
    }
  };

  const refreshToken = async () => {
    // This would implement token refresh logic
    await checkAuthStatus();
  };

  return {
    ...authState,
    signIn,
    signOut,
    refreshToken,
    checkAuthStatus
  };
}
