export type NotificationType = 'MESSAGE' | 'FRIEND';

export interface AppNotification {
  id: string;
  type: NotificationType;
  entity_type: string | null;
  entity_id: string | null;
  payload: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}
