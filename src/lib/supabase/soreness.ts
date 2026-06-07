import type { Severity, SorenessReport } from '@/types/soreness';
import { supabase } from './client';

const TABLE = 'soreness_reports';

export interface NewSoreness {
  regions: string[];
  severity: Severity | null;
  note?: string | null;
}

/** Log where a client is sore. trainer_id is denormalized so the trainer can
 * read it without a join (mirrors the client_attempts ownership pattern). */
export async function logSoreness(
  clientId: string,
  trainerId: string | null,
  report: NewSoreness,
): Promise<SorenessReport> {
  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      client_id: clientId,
      trainer_id: trainerId,
      regions: report.regions,
      severity: report.severity,
      note: report.note ?? null,
    })
    .select('*')
    .single();
  if (error) throw new Error(error.message);
  return data as SorenessReport;
}

/** A client's own soreness history (newest first). */
export async function listClientSoreness(clientId: string): Promise<SorenessReport[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('client_id', clientId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SorenessReport[];
}

/** Trainer view: every soreness report across their clients (RLS-scoped). */
export async function listTrainerSoreness(): Promise<SorenessReport[]> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as SorenessReport[];
}
