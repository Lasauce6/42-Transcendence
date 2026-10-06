import { UserRole } from '@core/models/user.model';

// Un utilisateur tel que le back le renvoie dans GET /api/users/
export interface AdminUser {
  id: string; // UUID
  username: string;
  email: string;
  role: UserRole;
}
