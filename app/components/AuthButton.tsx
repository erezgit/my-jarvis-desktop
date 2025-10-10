import { useState } from "react";
import { useClaudeAuth } from "../hooks/useClaudeAuth";
import {
  ArrowRightOnRectangleIcon,
  ArrowLeftOnRectangleIcon,
  UserIcon,
  KeyIcon,
} from "@heroicons/react/24/outline";

export function AuthButton() {
  const {
    isAuthenticated,
    session,
    isLoading,
    error,
    signIn,
    signOut,
  } = useClaudeAuth();

  if (isLoading) {
    return (
      <button
        className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-lg opacity-50 cursor-not-allowed"
        disabled
      >
        <div className="w-5 h-5 border-2 border-neutral-400 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          Loading...
        </span>
      </button>
    );
  }

  if (isAuthenticated && session) {
    return (
      <div className="space-y-3">
        {/* User Info */}
        <div className="flex items-center gap-3 px-4 py-3 bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-lg">
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100 truncate">
              {session.account?.email_address || "Authenticated"}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400">
              {session.subscriptionType || "Claude User"}
            </div>
          </div>
        </div>

        {/* Sign Out Button */}
        <button
          onClick={signOut}
          className="flex items-center gap-3 px-4 py-3 w-full bg-neutral-50 dark:bg-neutral-700/50 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-all duration-200"
          title="Sign out of Claude"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5 text-neutral-600 dark:text-neutral-400" />
          <span className="text-sm font-medium text-neutral-800 dark:text-neutral-100">
            Sign Out
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="text-xs text-red-700 dark:text-red-400">{error}</div>
        </div>
      )}

      <button
        onClick={signIn}
        className="flex items-center gap-3 px-4 py-3 w-full bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors duration-200"
        title="Sign in with Claude subscription"
      >
        <ArrowRightOnRectangleIcon className="w-5 h-5" />
        <span className="text-sm font-medium">Sign In to Claude</span>
      </button>

      <div className="text-xs text-neutral-500 dark:text-neutral-400">
        Sign in with your Claude subscription. Your browser will open for one-click authentication.
      </div>
    </div>
  );
}
