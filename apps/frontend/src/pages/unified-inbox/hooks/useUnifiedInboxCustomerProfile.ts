import { useState, useRef, useCallback, useEffect } from 'react';
import { apiClient } from '@/services/apiClient';
import type {
  CustomerProfile,
  UnifiedConversation,
} from '../types/unifiedInboxTypes';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | { code: string; message: string };
}

export const useUnifiedInboxCustomerProfile = (
  selectedConversation: UnifiedConversation | null,
) => {
  const [customerProfile, setCustomerProfile] =
    useState<CustomerProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileActiveTab, setProfileActiveTab] = useState<
    'timeline' | 'orders' | 'info'
  >('timeline');
  const [editNote, setEditNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const profileAbortRef = useRef<AbortController | null>(null);

  const loadCustomerProfile = useCallback(async (customerId: string) => {
    profileAbortRef.current?.abort();
    const ac = new AbortController();
    profileAbortRef.current = ac;

    try {
      setLoadingProfile(true);
      const response = await apiClient.get<ApiResponse<CustomerProfile>>(
        `/api/v1/unified-inbox/customer/${customerId}`,
        { signal: ac.signal },
      );
      if (response.data?.success) {
        setCustomerProfile(response.data.data ?? null);
      }
    } catch (error: any) {
      if (ac.signal.aborted) return;
      console.error('Error loading customer:', error);
      setCustomerProfile(null);
    } finally {
      if (profileAbortRef.current === ac) {
        setLoadingProfile(false);
      }
    }
  }, []);

  const handleSaveNote = useCallback(async () => {
    if (!selectedConversation || !customerProfile) return;
    try {
      await apiClient.put(
        `/api/v1/unified-inbox/customer/${customerProfile.id}`,
        {
          notes: noteText,
        },
      );
      setCustomerProfile((prev) => (prev ? { ...prev, notes: noteText } : null));
      setEditNote(false);
    } catch (err) {
      console.error('Error saving note:', err);
    }
  }, [selectedConversation, customerProfile, noteText]);

  useEffect(() => {
    return () => {
      profileAbortRef.current?.abort();
    };
  }, []);

  return {
    customerProfile,
    setCustomerProfile,
    loadingProfile,
    profileActiveTab,
    setProfileActiveTab,
    editNote,
    setEditNote,
    noteText,
    setNoteText,
    loadCustomerProfile,
    handleSaveNote,
  };
};
