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
];
