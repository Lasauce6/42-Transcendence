export type ChannelType = 'PRIVATE' | 'GROUP' | 'PUBLIC';

export interface ChannelMember {
  id: string;
  username: string;
  avatarUrl?: string | null;
}

export interface LastMessage {
  content: string;
  sender_username: string;
  created_at: string;
}

export interface Channel {
  id: string;
  name: string | null;
  type: ChannelType;
  created_by: string;
  created_at: string;
  members?: ChannelMember[];
  last_message?: LastMessage | null;
  unread_count?: number;
}

export interface ChatMessage {
  id: string;
  channel: string;
  sender: string;
  sender_username: string;
  content: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
  attachments?: Attachment[];
}

// Un fichier joint à un message.
export interface Attachment {
  id: string;
  name: string;
  content_type: string;
  size: number;
  url: string;
}
