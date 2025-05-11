import { Routes } from '@angular/router';
import { OrderSummaryComponent } from './order-summary.component';

export const ORDER_SUMMARY_ROUTES: Routes = [
  { path: ':id', component: OrderSummaryComponent }
];
