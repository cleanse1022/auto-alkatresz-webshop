import { Routes } from '@angular/router';
import { PartsListComponent } from './parts-list/parts-list.component';
import { PartDetailComponent } from './part-detail/part-detail.component';
import { PartFormComponent } from './part-form/part-form.component';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../auth/admin.guard';

export const PARTS_ROUTES: Routes = [
  { path: '', component: PartsListComponent },
  { path: 'new', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: ':id/edit', component: PartFormComponent, canActivate: [AuthGuard, AdminGuard] },
  { path: ':id', component: PartDetailComponent }
];
