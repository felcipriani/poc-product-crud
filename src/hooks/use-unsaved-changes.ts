"use client";

import { useEffect, useCallback, useRef } from 'react';

export interface UseUnsavedChangesProps {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasUnsavedChanges, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: UseUnsavedChangesProps) {
  const messageRef = useRef(message);
  
  // Update message ref when it changes
  useEffect(() => {
    messageRef.current = message;
  }, [message]);

  // Handle browser navigation (back button, refresh, etc.)
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = messageRef.current;
        return messageRef.current;
      }
    };

    if (hasUnsavedChanges) {
      window.addEventListener('beforeunload', handleBeforeUnload);
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [hasUnsavedChanges]);

  // Function to check for unsaved changes before navigation
  const checkUnsavedChanges = useCallback((navigationFn: () => void) => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(messageRef.current);
      if (confirmed) {
        navigationFn();
      }
    } else {
      navigationFn();
    }
  }, [hasUnsavedChanges]);

  return {
    checkUnsavedChanges
  };
}
