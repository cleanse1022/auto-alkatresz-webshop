import { Injectable, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, of, map } from 'rxjs';
import { CartItem } from '../models/cart-item.model';
import { Part } from '../models/part.model';
import { Auth, authState, User } from '@angular/fire/auth';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';


@Injectable({
  providedIn: 'root'
})
export class CartService implements OnDestroy {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private authSub: Subscription;

  // Inicializáláskor betöltjük a kosáradatokat a jelenlegi bejelentkezett felhasználóhoz,
  // vagy 'guest' kulccsal, ha nincs bejelentkezve.
  private cartItemsSubject = new BehaviorSubject<CartItem[]>(this.loadCartFromStorage());
  cartItems$: Observable<CartItem[]> = this.cartItemsSubject.asObservable();

  constructor() {
    // Feliratkozás az auth state változására
    this.authSub = authState(this.auth).subscribe(user => {
      // Újratöltjük a kosár tartalmát a megváltozott felhasználó UID-je alapján
      const updatedCart = this.loadCartFromStorageForUser(user);
      this.cartItemsSubject.next(updatedCart);
    });
  }

  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }

  // Új funkció: meghatározza a storage kulcsot a konkrét felhasználó alapján
  private getStorageKeyForUser(user: any): string {
    const uid = user?.uid || 'guest';
    return `cart_${uid}`;
  }

  // Betölti a kosár adatait a megadott user állapota alapján
  private loadCartFromStorageForUser(user: any): CartItem[] {
    const key = this.getStorageKeyForUser(user);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as CartItem[] : [];
  }

  // Eredeti betöltő metódus – a currentUser alapján dolgozik
  private loadCartFromStorage(): CartItem[] {
    const key = this.getStorageKeyForUser(this.auth.currentUser);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as CartItem[] : [];
  }

  private saveCartToStorage(items: CartItem[]): void {
    // A currentUser alapján mentjük el az aktuális kosár tartalmát
    const key = this.getStorageKeyForUser(this.auth.currentUser);
    localStorage.setItem(key, JSON.stringify(items));
  }

  private get cartItems(): CartItem[] {
    return this.cartItemsSubject.value;
  }

  // Ellenőrzi, hogy a felhasználó be van-e jelentkezve
  private isUserLoggedIn(): boolean {
    return !!this.auth.currentUser;
  }

  async addToCart(part: Part, quantity: number = 1): Promise<boolean> {
    // Ellenőrizzük, hogy a felhasználó be van-e jelentkezve
    if (!this.isUserLoggedIn()) {
      // Ha nincs bejelentkezve, átirányítjuk a bejelentkezés oldalra
      this.snackBar.open(
        'A kosárba helyezéshez előbb be kell jelentkezned!', 
        'Bezárás',
        { duration: 5000 }
      );
      await this.router.navigate(['/login']);
      return false;
    }

    const currentItems = this.cartItems;
    const existingIndex = currentItems.findIndex(item => item.part.id === part.id);
    if (existingIndex !== -1) {
      // Ha már van ilyen termék, növeljük a mennyiséget
      const updatedItem = {
        ...currentItems[existingIndex],
        quantity: currentItems[existingIndex].quantity + quantity
      };
      const updatedItems = [
        ...currentItems.slice(0, existingIndex),
        updatedItem,
        ...currentItems.slice(existingIndex + 1)
      ];
      this.cartItemsSubject.next(updatedItems);
      this.saveCartToStorage(updatedItems);
    } else {
      const newItem: CartItem = { part, quantity };
      const updatedItems = [...currentItems, newItem];
      this.cartItemsSubject.next(updatedItems);
      this.saveCartToStorage(updatedItems);
    }
    
    return true;
  }

  updateQuantity(partId: string, newQuantity: number): void {
    const currentItems = this.cartItems;
    const index = currentItems.findIndex(item => item.part.id === partId);
    if (index !== -1) {
      if (newQuantity <= 0) {
        this.removeFromCart(partId);
      } else {
        const updatedItem = { ...currentItems[index], quantity: newQuantity };
        const updatedItems = [
          ...currentItems.slice(0, index),
          updatedItem,
          ...currentItems.slice(index + 1)
        ];
        this.cartItemsSubject.next(updatedItems);
        this.saveCartToStorage(updatedItems);
      }
    }
  }

  removeFromCart(partId: string): void {
    const updatedItems = this.cartItems.filter(item => item.part.id !== partId);
    this.cartItemsSubject.next(updatedItems);
    this.saveCartToStorage(updatedItems);
  }

  clearCart(): void {
    this.cartItemsSubject.next([]);
    localStorage.removeItem(this.getStorageKeyForUser(this.auth.currentUser));
  }

  // Visszaadja a kosárban lévő termékek összesített számát
  getCartItemsCount(): Observable<number> {
    return this.cartItems$.pipe(
      map(items => items.reduce((total, item) => total + item.quantity, 0))
    );
  }
}