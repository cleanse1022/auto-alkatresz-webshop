import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MaterialModule } from '../../material.module';
import { OrderService } from '../../services/order.service';
import { Order, OrderStatus } from '../../models/order.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { switchMap, of, catchError, Observable } from 'rxjs';
import { UserService } from '../../services/user.service';
import { Auth, authState } from '@angular/fire/auth';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, MaterialModule],
  templateUrl: './order-detail.component.html',
  styleUrls: ['./order-detail.component.scss']
})
export class OrderDetailComponent implements OnInit {
  order: Order | null = null;
  loading = true;
  error: string | null = null;
  orderStatuses = OrderStatus;
  isAdmin$: Observable<boolean>;
  userId: string | undefined;
  
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private snackBar = inject(MatSnackBar);
  private userService = inject(UserService);
  private auth = inject(Auth);

  constructor() {
    this.isAdmin$ = this.userService.isAdmin();
    this.userId = this.auth.currentUser?.uid;
  }

  ngOnInit(): void {
    this.loadOrderDetails();
  }

  private loadOrderDetails(): void {
    this.route.paramMap.pipe(
      switchMap(params => {
        const orderId = params.get('id');
        if (!orderId) {
          this.error = 'Hiányzó rendelésazonosító';
          this.loading = false;
          return of(null);
        }
        return this.orderService.getOrderById(orderId).pipe(
          switchMap(order => {
            if (!order) {
              this.error = 'A rendelés nem található';
              this.loading = false;
              return of(null);
            }
            
            // Ellenőrizzük, hogy a felhasználó jogosult-e megtekinteni a rendelést
            return this.userService.isAdmin().pipe(
              switchMap(isAdmin => {
                // Ha admin, vagy a saját rendelése, akkor megjelenítjük
                if (isAdmin || order.userId === this.userId) {
                  return of(order);
                } else {
                  this.error = 'Nincs jogosultsága megtekinteni ezt a rendelést';
                  this.loading = false;
                  return of(null);
                }
              })
            );
          }),
          catchError(error => {
            console.error('Hiba a rendelés betöltése során:', error);
            this.error = 'Hiba történt a rendelés betöltése során';
            this.loading = false;
            return of(null);
          })
        );
      })
    ).subscribe(order => {
      this.order = order;
      this.loading = false;
    });
  }

  // Rendelés státuszának frissítése (admin funkció)
  updateOrderStatus(newStatus: OrderStatus): void {
    if (!this.order || !this.order.id) return;
    
    const orderId = this.order.id as string; // Type assertion, hogy string típusú legyen
    
    // Ellenőrizzük, hogy a felhasználó admin-e
    this.userService.isAdmin().pipe(
      switchMap(isAdmin => {
        if (!isAdmin) {
          this.snackBar.open('Nincs jogosultsága a rendelés módosításához', 'OK', {
            duration: 3000
          });
          return of(undefined);
        }
        
        this.loading = true;
        return this.orderService.updateOrderStatus(orderId, newStatus);
      }),
      catchError(error => {
        console.error('Hiba a státusz frissítése során:', error);
        this.snackBar.open('Hiba történt a státusz frissítése során', 'OK', {
          duration: 3000
        });
        this.loading = false;
        return of(undefined);
      })
    ).subscribe(() => {
      if (this.order) {
        this.order.status = newStatus;
        this.order.updatedAt = new Date();
      }
      this.loading = false;
      this.snackBar.open('A rendelés státusza sikeresen frissítve', 'OK', {
        duration: 3000
      });
    });
  }

  // Navigálás vissza a rendelések listájához
  goBack(): void {
    this.router.navigate(['/orders']);
  }

  // Segédfunkciók a template számára
  getStatusText(status: OrderStatus): string {
    const statusMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'Függőben',
      [OrderStatus.PROCESSING]: 'Feldolgozás alatt',
      [OrderStatus.SHIPPED]: 'Kiszállítva',
      [OrderStatus.DELIVERED]: 'Kézbesítve',
      [OrderStatus.CANCELLED]: 'Törölve'
    };
    return statusMap[status];
  }

  getStatusClass(status: OrderStatus): string {
    const statusClassMap: Record<OrderStatus, string> = {
      [OrderStatus.PENDING]: 'status-pending',
      [OrderStatus.PROCESSING]: 'status-processing',
      [OrderStatus.SHIPPED]: 'status-shipped',
      [OrderStatus.DELIVERED]: 'status-delivered',
      [OrderStatus.CANCELLED]: 'status-cancelled'
    };
    return statusClassMap[status];
  }
}