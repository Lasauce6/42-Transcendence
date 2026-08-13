import { Routes } from '@angular/router';

export const routes: Routes = [
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