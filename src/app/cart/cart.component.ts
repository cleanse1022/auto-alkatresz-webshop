import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../material.module';
import { CartService } from '../services/cart.service';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { HungarianCurrencyPipe } from '../pipes/hungarian-currency.pipe';
import { ImageFallbackDirective } from '../directives/image-fallback.directive';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  standalone: true,
  selector: 'app-cart',
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss'],
  imports: [
    CommonModule, 
    MaterialModule, 
    RouterModule, 
    HungarianCurrencyPipe,
    ImageFallbackDirective
  ]
})
export class CartComponent implements OnInit {
  // Felhasználó specifikus kosár adatok
  cartItems$: Observable<CartItem[]>;
  private cartService: CartService = inject(CartService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  
  // Kosár összesítő adatok
  subtotal: number = 0;
  tax: number = 0;
  shippingCost: number = 0;
  totalPrice: number = 0;
  totalItems: number = 0;
  
  // A szállítási díj összege (fix érték)
  private readonly SHIPPING_FEE: number = 1990;
  // ÁFA százalék (27%)
  private readonly TAX_RATE: number = 0.27;

  constructor() {
    this.cartItems$ = this.cartService.cartItems$;
  }

  ngOnInit(): void {
    // Feliratkozás a kosár változásaira
    this.cartItems$.subscribe(items => {
      this.calculateTotals(items);
    });
  }
  
  // Összesítő értékek kiszámítása
  private calculateTotals(items: CartItem[]): void {
    // Termékek nettó ára
    this.subtotal = items.reduce((sum, item) => sum + (item.part.price * item.quantity), 0);
    
    // Termékek darabszáma összesen
    this.totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    
    // ÁFA összege
    this.tax = this.subtotal * this.TAX_RATE;
    
    // Szállítási díj (ha van termék a kosárban és az összeg kisebb, mint 20000 Ft)
    this.shippingCost = items.length > 0 && this.subtotal < 20000 ? this.SHIPPING_FEE : 0;
    
    // Végösszeg (termékek + ÁFA + szállítási díj)
    this.totalPrice = this.subtotal + this.shippingCost;
  }

  // Mennyiség növelése
  increaseQuantity(item: CartItem): void {
    if (item.part.id) {
      this.cartService.updateQuantity(item.part.id, item.quantity + 1);
    }
  }

  // Mennyiség csökkentése
  decreaseQuantity(item: CartItem): void {
    if (item.part.id && item.quantity > 1) {
      this.cartService.updateQuantity(item.part.id, item.quantity - 1);
    }
  }

  // Elem törlése a kosárból
  removeItem(item: CartItem): void {
    if (item.part.id) {
      this.cartService.removeFromCart(item.part.id);
      this.snackBar.open(`${item.part.name} eltávolítva a kosárból`, 'Bezárás', {
        duration: 3000
      });
    }
  }

  // Kosár teljes ürítése
  clearCart(): void {
    this.cartService.clearCart();
    this.snackBar.open('A kosár sikeresen kiürítve', 'Bezárás', {
      duration: 3000
    });
  }
}