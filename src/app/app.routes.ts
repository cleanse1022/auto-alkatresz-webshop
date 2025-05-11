import { Routes } from '@angular/router';

// Guard-ok import
import { AuthGuard } from './auth/auth.guard';
import { NoAuthGuard } from './auth/no-auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { NotAdminGuard } from './auth/not-admin.guard';

// Komponens importok
import { HomeComponent } from './home/home.component';
import { PartsListComponent } from './parts/parts-list/parts-list.component';
import { PartFormComponent } from './parts/part-form/part-form.component';
import { PartDetailComponent } from './parts/part-detail/part-detail.component';
import { CartComponent } from './cart/cart.component';
import { AdminDashboardComponent } from './auth/profile/profile.component';
import { UserProfileComponent } from './auth/user-profile/user-profile.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { CheckoutComponent } from './checkout/checkout.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';

export const appRoutes: Routes = [
  // Főoldal
  { path: '', component: HomeComponent },
  
  // Alkatrészek modul
  { path: 'parts', component: PartsListComponent },
  { path: 'parts/new', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'parts/:id/edit', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'parts/:id', component: PartDetailComponent },
  
  // Kosár és fizetés
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard, NotAdminGuard] },
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard, NotAdminGuard] },
  { path: 'order-summary/:id', component: OrderSummaryComponent, canActivate: [AuthGuard, NotAdminGuard] },
  
  // Admin és felhasználói profilok
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard, NotAdminGuard] },
  { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [NoAuthGuard] },
  
  // Fallback útvonal, ha nincs illeszkedés
  { path: '**', redirectTo: '', pathMatch: 'full' }
];