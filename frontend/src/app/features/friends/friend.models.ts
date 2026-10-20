import { UserProfile } from '@core/models/user.model';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

// Infos de l'utilisateur renvoyées directement dans /api/friendships/
export interface FriendUser extends Pick<UserProfile, 'id' | 'username' | 'avatar'> {
  is_online: boolean;
  last_seen: string | null;
}

export interface Friendship {
  id: string;
  requester: string;
  addressee: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
  requester_user: FriendUser;
  addressee_user: FriendUser;
}
