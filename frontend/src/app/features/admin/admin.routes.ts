import { Routes } from '@angular/router';
import { AdminLayout } from './admin-layout/admin-layout';
import { UserList } from './users/user-list/user-list';

export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      { path: 'users', component: UserList },
    ],
  },
];
