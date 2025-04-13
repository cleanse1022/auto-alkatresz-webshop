import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { PartsListComponent } from './parts/parts-list/parts-list.component';
import { PartFormComponent } from './parts/part-form/part-form.component';
import { PartDetailComponent } from './parts/part-detail/part-detail.component';
import { CartComponent } from './cart/cart.component';
import { AdminDashboardComponent } from './auth/profile/profile.component';
import { UserProfileComponent } from './auth/user-profile/user-profile.component';
import { LoginComponent } from './auth/login/login.component';
import { RegisterComponent } from './auth/register/register.component';
import { AuthGuard } from './auth/auth.guard';
import { NoAuthGuard } from './auth/no-auth.guard';
import { AdminGuard } from './auth/admin.guard';
import { NotAdminGuard } from './auth/not-admin.guard';
import { CheckoutComponent } from './checkout/checkout.component';
import { OrderSummaryComponent } from './order-summary/order-summary.component';

export const appRoutes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'parts', component: PartsListComponent },
  { path: 'parts/new', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'parts/:id/edit', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: 'parts/:id', component: PartDetailComponent },
  // Checkout útvonal a kosár és a rendelések között
  { path: 'checkout', component: CheckoutComponent, canActivate: [AuthGuard, NotAdminGuard] },
  { path: 'cart', component: CartComponent, canActivate: [AuthGuard, NotAdminGuard] },
  // Rendelés összegzés oldal
  { path: 'order-summary/:id', component: OrderSummaryComponent, canActivate: [AuthGuard, NotAdminGuard] },
  // Admin vezérlőpult külön útvonalon
  { path: 'admin', component: AdminDashboardComponent, canActivate: [AuthGuard, AdminGuard] },
  // Profil oldal normál felhasználóknak
  { path: 'profile', component: UserProfileComponent, canActivate: [AuthGuard, NotAdminGuard] },
  { path: 'login', component: LoginComponent, canActivate: [NoAuthGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [NoAuthGuard] }
];