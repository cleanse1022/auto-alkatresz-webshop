import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { OrderService } from '../services/order.service';
import { Order, OrderStatus } from '../models/order.model';
import { HungarianCurrencyPipe } from '../pipes/hungarian-currency.pipe';
import { ImageFallbackDirective } from '../directives/image-fallback.directive';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-order-summary',
  standalone: true,
  imports: [
    CommonModule,
    MaterialModule,
    RouterModule,
    HungarianCurrencyPipe,
    ImageFallbackDirective
  ],
  templateUrl: './order-summary.component.html',
  styleUrl: './order-summary.component.scss'
})
export class OrderSummaryComponent implements OnInit {
  order: Order | null = null;
  orderId: string = '';
  isLoading: boolean = true;
  error: string = '';
  
  // Getter metódusok a template számára
  get shippingAddress(): {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    phoneNumber?: string;
  } {
    return this.order?.shippingAddress || {
      fullName: '',
      address: '',
      city: '',
      postalCode: '',
      phoneNumber: ''
    };
  }
  
  get orderStatus() {
    return this.order?.status || '';
  }
  
  get orderTotalAmount() {
    return this.order?.totalAmount || 0;
  }

  private orderService = inject(OrderService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.orderId = id;
        this.loadOrder(id);
      } else {
        this.error = 'Hiányzó rendelés azonosító';
        this.isLoading = false;
      }
    });
  }

  private loadOrder(orderId: string): void {
    this.isLoading = true;
    this.orderService.getOrderById(orderId).subscribe({
      next: (order) => {
        this.order = order;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Hiba a rendelés betöltésekor:', err);
        this.error = 'Nem sikerült betölteni a rendelés adatait';
        this.isLoading = false;
      }
    });
  }

  backToHome(): void {
    this.router.navigate(['/']);
  }

  viewOrders(): void {
    this.router.navigate(['/profile'], { queryParams: { tab: 'orders' } });
  }
  
  // Rendelés állapotának lefordítása magyarra
  getStatusText(status: string | undefined): string {
    if (!status) return '';
    
    const statusMap: Record<string, string> = {
      [OrderStatus.PENDING]: 'Függőben',
      [OrderStatus.PROCESSING]: 'Feldolgozás alatt',
      [OrderStatus.SHIPPED]: 'Kiszállítva',
      [OrderStatus.DELIVERED]: 'Kézbesítve',
      [OrderStatus.CANCELLED]: 'Törölve'
    };
    
    return statusMap[status] || status;
  }
}
