import { useState, useCallback } from "react";
import type { PermissionMode } from "../../types";

export interface UsePermissionModeResult {
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  isPlanMode: boolean;
  isDefaultMode: boolean;
  isAcceptEditsMode: boolean;
  isBypassPermissionsMode: boolean;
}

/**
 * Hook for managing PermissionMode state within a browser session.
 * State is preserved across component re-renders but resets on page reload.
 * No localStorage persistence - simple React state management.
 *
 * Defaults to bypassPermissions mode to eliminate all permission prompts.
 * Safe to use now that containers run as non-root user (node user, UID 1000).
 * Claude CLI's root user restriction no longer applies.
 */
export function usePermissionMode(): UsePermissionModeResult {
  const [permissionMode, setPermissionModeState] =
    useState<PermissionMode>("bypassPermissions");

  const setPermissionMode = useCallback((mode: PermissionMode) => {
    setPermissionModeState(mode);
  }, []);

  return {
    permissionMode,
    setPermissionMode,
    isPlanMode: permissionMode === "plan",
    isDefaultMode: permissionMode === "default",
    isAcceptEditsMode: permissionMode === "acceptEdits",
    isBypassPermissionsMode: permissionMode === "bypassPermissions",
  };
}
