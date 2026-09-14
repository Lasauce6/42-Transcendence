import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { OauthCallback } from './features/oauth-callback/oauth-callback';
import { TwoFactorSetup } from './features/two-factor-setup/two-factor-setup';

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
    path: 'auth/callback/:provider',
    component: OauthCallback,
    title: 'Connexion en cours',
  },
  {
    path: 'auth/2fa/setup',
    component: TwoFactorSetup,
    title: 'Configuration 2FA',
  },
  {
    path: '',
    redirectTo: '/login',
    pathMatch: 'full',
  },
];
