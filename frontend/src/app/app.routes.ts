import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    title: 'Connexion',
  },
  {
    path: 'register',
    component: Register,
    title: 'Inscription',
  },

  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },

  {
    path: '',
    loadComponent: () => import('@features/home/home').then((m) => m.Home),
  },

  // {
  //   path: 'chat',
  //   loadComponent: () => import('@features/chat/chat').then(m => m.Chat),
  // },
  // {
  //   path: 'admin',
  //   loadChildren: () => import('@features/admin/admin.routes').then(m => m.ADMIN_ROUTES),
  //   // canActivate: [roleGuard(['admin'])],   <-- ticket #48
  // },

  { path: '**', redirectTo: '' },
];
