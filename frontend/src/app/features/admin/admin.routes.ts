import { Routes } from '@angular/router';
import { UserList } from './users/user-list/user-list';

// Routes internes du panel admin (chargées en lazy depuis app.routes.ts)
export const ADMIN_ROUTES: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  { path: 'users', component: UserList, title: 'TITLES.ADMIN' },
];
