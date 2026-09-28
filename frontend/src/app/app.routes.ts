import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { OauthCallback } from './features/oauth-callback/oauth-callback';
import { TwoFactorSetup } from './features/two-factor-setup/two-factor-setup';
import { TwoFactorVerify } from './features/two-factor-verify/two-factor-verify';
import { authGuard } from '@core/guards/auth-guard';
import { roleGuard } from '@core/guards/role-guard';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
    title: 'TITLES.LOGIN',
  },
  {
    path: 'register',
    component: Register,
    title: 'TITLES.REGISTER',
  },

  {
    path: 'auth/callback/:provider',
    component: OauthCallback,
    title: 'TITLES.OAUTH_CALLBACK',
  },
  {
    path: 'auth/2fa/setup',
    component: TwoFactorSetup,
    title: 'TITLES.TWOFA_SETUP',
    canActivate: [authGuard],
  },
  {
    path: 'auth/2fa/verify',
    component: TwoFactorVerify,
    title: 'TITLES.TWOFA_VERIFY',
  },
  {
    path: 'profile',
    loadComponent: () => import('@features/profile/profile/profile').then((m) => m.Profile),
    title: 'TITLES.PROFILE',
    canActivate: [authGuard],
  },
  {
    path: 'forbidden',
    loadComponent: () => import('@features/forbidden/forbidden').then((m) => m.Forbidden),
    title: 'TITLES.FORBIDDEN',
  },
  {
    path: 'notifications',
    loadComponent: () =>
      import('@features/notifications/notification-list/notification-list').then(
        (m) => m.NotificationList,
      ),
    title: 'TITLES.NOTIFICATIONS',
    canActivate: [authGuard],
  },
  {
    path: '',
    loadComponent: () => import('@features/home/home').then((m) => m.Home),
  },
  // {
  //   path: 'admin',
  //   loadChildren: () => import('@features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
  //   canActivate: [authGuard, roleGuard],
  //   data: { roles: ['ADMIN'] },
  // },
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
