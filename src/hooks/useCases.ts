import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Database } from '../types/database';

type Case = Database['public']['Tables']['cases']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

export interface CaseWithDetails extends Case {
  foster_carer?: Profile | null;
  social_worker?: Profile | null;
  child_name?: string; // Anonymized display name
}

export function useCases() {
  const { user, profile } = useAuth();
  const [cases, setCases] = useState<CaseWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCases = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user) {
        setCases([]);
        return;
      }

      let query = supabase
        .from('cases')
        .select(
          `
          *,
          foster_carer:profiles!cases_foster_carer_id_fkey(*),
          social_worker:profiles!cases_social_worker_id_fkey(*)
        `,
        )
        .order('created_at', { ascending: false });

      if (profile?.role === 'social_worker') {
        query = query.eq('social_worker_id', user.id);
      } else if (profile?.role === 'foster_carer') {
        if (profile.household_id) {
          query = query.eq('household_id', profile.household_id);
        } else {
          query = query.eq('foster_carer_id', user.id);
        }
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      // Extract child names from metadata or use anonymized format
      const casesWithNames: CaseWithDetails[] = ((data as any[]) || []).map((c: any) => ({
        ...c,
        child_name:
          c.metadata?.child_name ||
          c.case_number ||
          `Case-${String(c.id).slice(0, 8).toUpperCase()}`,
      }));

      setCases(casesWithNames);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  }, [profile?.household_id, profile?.role, user]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  return { cases, loading, error, refetch: fetchCases };
}

export function useCase(caseId: string | null) {
  const [caseData, setCaseData] = useState<CaseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setLoading(false);
      return;
    }
    fetchCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  async function fetchCase() {
    if (!caseId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('cases')
        .select(
          `
          *,
          foster_carer:profiles!cases_foster_carer_id_fkey(*),
          social_worker:profiles!cases_social_worker_id_fkey(*)
        `,
        )
        .eq('id', caseId)
        .single();

      if (fetchError) throw fetchError;
      if (!data) return;

      const caseWithName: CaseWithDetails = {
        ...(data as any),
        child_name:
          (data as any).metadata?.child_name ||
          (data as any).case_number ||
          `Case-${String((data as any).id)
            .slice(0, 8)
            .toUpperCase()}`,
      };

      setCaseData(caseWithName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch case');
    } finally {
      setLoading(false);
    }
  }

  return { caseData, loading, error, refetch: fetchCase };
}

export function useActiveCaseForCarer(carerId: string | null) {
  const [caseData, setCaseData] = useState<CaseWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!carerId) {
      setLoading(false);
      return;
    }
    fetchActiveCase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carerId]);

  async function fetchActiveCase() {
    if (!carerId) return;

    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('cases')
        .select(
          `
          *,
          foster_carer:profiles!cases_foster_carer_id_fkey(*),
          social_worker:profiles!cases_social_worker_id_fkey(*)
        `,
        )
        .eq('foster_carer_id', carerId)
        .eq('status', 'active')
        .single();

      if (fetchError) {
        // If no active case found, that's okay
        if (fetchError.code === 'PGRST116') {
          setCaseData(null);
          return;
        }
        throw fetchError;
      }
      if (!data) return;

      const caseWithName: CaseWithDetails = {
        ...(data as any),
        child_name:
          (data as any).metadata?.child_name ||
          (data as any).case_number ||
          `Case-${String((data as any).id)
            .slice(0, 8)
            .toUpperCase()}`,
      };

      setCaseData(caseWithName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch active case');
    } finally {
      setLoading(false);
    }
  }

  return { caseData, loading, error, refetch: fetchActiveCase };
}

// Alias for convenience
export const useActiveCase = () => {
  const { user } = useAuth();
  return useActiveCaseForCarer(user?.id || null);
};
