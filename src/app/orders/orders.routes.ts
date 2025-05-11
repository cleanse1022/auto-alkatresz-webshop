import { Routes } from '@angular/router';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { NotAdminGuard } from '../auth/not-admin.guard';

// Almodul létrehozása a rendelések kezeléséhez, a ténylegesen létező komponensekkel
export const ORDERS_ROUTES: Routes = [
  { 
    path: '', 
    children: [
      { path: '', redirectTo: 'list', pathMatch: 'full' },
      // A rendelések listája - feltételezzük, hogy szerepelhet benne szűrés felhasználói/admin nézet között
      { path: 'list', loadComponent: () => import('./orders-list/orders-list.component').then(c => c.OrdersListComponent), canActivate: [AuthGuard] },
      // Részletes rendelés nézet
      { path: ':id', loadComponent: () => import('./order-detail/order-detail.component').then(c => c.OrderDetailComponent), canActivate: [AuthGuard] }
    ]
  }
];
