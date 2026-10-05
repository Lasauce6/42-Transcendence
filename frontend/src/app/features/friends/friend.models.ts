import { UserProfile } from '@core/models/user.model';

export type FriendshipStatus = 'PENDING' | 'ACCEPTED' | 'BLOCKED';

export interface Friendship {
  id: string;
  requester: string;
  addressee: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendUser extends Pick<UserProfile, 'id' | 'username' | 'avatar'> {
  is_online: boolean;
}
