import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MaterialModule } from '../material.module';
import { CartService } from '../services/cart.service';
import { OrderService } from '../services/order.service';
import { CartItem } from '../models/cart-item.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, of, Subscription, take } from 'rxjs';
import { HungarianCurrencyPipe } from '../pipes/hungarian-currency.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterModule, HungarianCurrencyPipe],
  templateUrl: './checkout.component.html',
  styleUrls: ['./checkout.component.scss']
})
export class CheckoutComponent implements OnInit, OnDestroy {
  cartItems: CartItem[] = [];
  totalAmount = 0;
  shippingForm!: FormGroup;
  isSubmitting = false;
  private cartSubscription?: Subscription;
  private firstLoad = true;
  
  private cartService = inject(CartService);
  private orderService = inject(OrderService);
  private fb = inject(FormBuilder);
  private snackBar = inject(MatSnackBar);
  private router = inject(Router);

  ngOnInit(): void {
    // Kosár tartalmának betöltése csak egyszer az elején
    this.cartSubscription = this.cartService.cartItems$.subscribe(items => {
      this.cartItems = items;
      this.calculateTotal();
      
      // Csak az első betöltéskor ellenőrizzük, hogy üres-e a kosár
      // Ez megakadályozza, hogy a rendelés után újra ellenőrizze
      if (this.firstLoad && items.length === 0) {
        this.snackBar.open('A kosár üres, nem tudsz rendelést leadni!', 'OK', {
          duration: 3000
        });
        this.router.navigate(['/cart']);
      }
      this.firstLoad = false;
    });

    // Szállítási űrlap inicializálása
    this.initShippingForm();
  }

  ngOnDestroy(): void {
    // Feliratkozás megszüntetése a komponens megsemmisülésekor
    if (this.cartSubscription) {
      this.cartSubscription.unsubscribe();
    }
  }

  private initShippingForm(): void {
    this.shippingForm = this.fb.group({
      fullName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      city: ['', [Validators.required]],
      postalCode: ['', [Validators.required, Validators.pattern('[0-9]{4}')]],
      phoneNumber: ['', [Validators.required, Validators.pattern('[0-9]{6,12}')]]
    });
  }

  private calculateTotal(): void {
    this.totalAmount = this.cartItems.reduce(
      (sum, item) => sum + (item.part.price * item.quantity), 
      0
    );
  }

  onSubmit(): void {
    if (this.shippingForm.invalid) {
      this.markFormGroupTouched(this.shippingForm);
      return;
    }

    // Ellenőrizzük, hogy a kosár nem üres a rendelés pillanatában
    this.cartService.cartItems$.pipe(
      take(1) // Csak egyszer ellenőrizzük a kosár tartalmát
    ).subscribe(items => {
      if (items.length === 0) {
        this.snackBar.open('A kosár üres, nem tudsz rendelést leadni!', 'OK', {
          duration: 3000
        });
        return;
      }

      this.isSubmitting = true;
      const shippingAddress = this.shippingForm.value;

      this.orderService.createOrder(shippingAddress)
        .pipe(
          catchError(error => {
            console.error('Hiba történt a rendelés során:', error);
            this.snackBar.open('Hiba történt a rendelés során: ' + error.message, 'OK', {
              duration: 5000
            });
            this.isSubmitting = false;
            return of('');
          })
        )
        .subscribe(orderId => {
          if (orderId) {
            // Sikeres rendelés után szüntessük meg a kosárra való feliratkozást
            if (this.cartSubscription) {
              this.cartSubscription.unsubscribe();
              this.cartSubscription = undefined;
            }
            
            // Navigálás a rendelés összegző oldalra
            this.router.navigate(['/order-summary', orderId]);
          }
          this.isSubmitting = false;
        });
    });
  }

  // Segédfunkció az űrlap összes mezőjének megjelöléséhez
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  // Űrlap érvényességi segédfunkciók a template számára
  hasError(controlName: string, errorName: string): boolean {
    const control = this.shippingForm.get(controlName);
    return !!control && control.touched && control.hasError(errorName);
  }

  // Navigáljon vissza a kosárhoz
  backToCart(): void {
    this.router.navigate(['/cart']);
  }
}