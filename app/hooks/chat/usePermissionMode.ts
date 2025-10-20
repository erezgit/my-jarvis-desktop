import { useState, useCallback } from "react";
import type { PermissionMode } from "../../types";

export interface UsePermissionModeResult {
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  isPlanMode: boolean;
  isDefaultMode: boolean;
  isAcceptEditsMode: boolean;
}

/**
 * Hook for managing PermissionMode state within a browser session.
 * State is preserved across component re-renders but resets on page reload.
 * No localStorage persistence - simple React state management.
 *
 * Defaults to acceptEdits mode to auto-approve file operations while maintaining safety.
 * Works in Docker containers as root user (unlike bypassPermissions which is blocked).
 */
export function usePermissionMode(): UsePermissionModeResult {
  const [permissionMode, setPermissionModeState] =
    useState<PermissionMode>("acceptEdits");

  const setPermissionMode = useCallback((mode: PermissionMode) => {
    setPermissionModeState(mode);
  }, []);

  return {
    permissionMode,
    setPermissionMode,
    isPlanMode: permissionMode === "plan",
    isDefaultMode: permissionMode === "default",
    isAcceptEditsMode: permissionMode === "acceptEdits",
  };
}
