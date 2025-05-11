import { Injectable, signal, inject, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
import { Part } from '../models/part.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Auth, authState } from '@angular/fire/auth';

@Injectable({
  providedIn: 'root'
})
export class CompareService implements OnDestroy {
  // Maximum összehasonlítható termékek száma
  private readonly MAX_COMPARE_ITEMS = 3;
  
  private auth: Auth = inject(Auth);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private authSub: Subscription;
  
  // Jelenlegi összehasonlítandó alkatrészek (immutable SignalState megközelítés)
  private compareItems = signal<Part[]>(this.loadCompareFromStorage());
  
  // Observable a template-ben való egyszerű használathoz
  private compareItemsSubject = new BehaviorSubject<Part[]>(this.loadCompareFromStorage());
  public compareItems$ = this.compareItemsSubject.asObservable();
  
  constructor() {
    // Feliratkozás az auth state változására
    this.authSub = authState(this.auth).subscribe(user => {
      // Újratöltjük az összehasonlító lista tartalmát a megváltozott felhasználó UID-je alapján
      const updatedCompare = this.loadCompareFromStorageForUser(user);
      this.compareItems.set(updatedCompare);
      this.compareItemsSubject.next(updatedCompare);
    });
  }
  
  ngOnDestroy(): void {
    if (this.authSub) {
      this.authSub.unsubscribe();
    }
  }
  
  // Meghatározza a storage kulcsot a konkrét felhasználó alapján
  private getStorageKeyForUser(user: any): string {
    const uid = user?.uid || 'guest';
    return `compare_${uid}`;
  }
  
  // Betölti az összehasonlító lista adatait a megadott user állapota alapján
  private loadCompareFromStorageForUser(user: any): Part[] {
    const key = this.getStorageKeyForUser(user);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as Part[] : [];
  }
  
  // Eredeti betöltő metódus – a currentUser alapján dolgozik
  private loadCompareFromStorage(): Part[] {
    const key = this.getStorageKeyForUser(this.auth.currentUser);
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) as Part[] : [];
  }
  
  // Elmenti az összehasonlító lista aktuális állapotát
  private saveCompareToStorage(items: Part[]): void {
    const key = this.getStorageKeyForUser(this.auth.currentUser);
    localStorage.setItem(key, JSON.stringify(items));
  }
  
  /**
   * Alkatrész hozzáadása az összehasonlításhoz
   */
  addToCompare(part: Part): boolean {
    const currentItems = this.compareItems();
    
    // Ellenőrizzük, hogy már szerepel-e a listában
    if (currentItems.some(item => item.id === part.id)) {
      this.snackBar.open('Ez az alkatrész már szerepel az összehasonlításban', 'Bezárás', {
        duration: 3000,
        panelClass: 'info-snackbar'
      });
      return false;
    }
    
    // Ellenőrizzük, hogy nem léptük-e túl a maximális mennyiséget
    if (currentItems.length >= this.MAX_COMPARE_ITEMS) {
      this.snackBar.open(`Maximum ${this.MAX_COMPARE_ITEMS} alkatrészt hasonlíthatsz össze egyszerre`, 'Bezárás', {
        duration: 3000,
        panelClass: 'warning-snackbar'
      });
      return false;
    }
    
    // Hozzáadjuk az új alkatrészt
    const updatedItems = [...currentItems, part];
    this.compareItems.set(updatedItems);
    this.compareItemsSubject.next(updatedItems);
    
    // Mentjük a felhasználó specifikus localStorage-be
    this.saveCompareToStorage(updatedItems);
    
    this.snackBar.open('Alkatrész hozzáadva az összehasonlításhoz', 'Bezárás', {
      duration: 2000,
      panelClass: 'success-snackbar'
    });
    
    return true;
  }
  
  /**
   * Alkatrész eltávolítása az összehasonlításból
   */
  removeFromCompare(partId: string): void {
    const currentItems = this.compareItems();
    const updatedItems = currentItems.filter(item => item.id !== partId);
    
    this.compareItems.set(updatedItems);
    this.compareItemsSubject.next(updatedItems);
    
    // Mentjük a felhasználó specifikus localStorage-be
    this.saveCompareToStorage(updatedItems);
    
    this.snackBar.open('Alkatrész eltávolítva az összehasonlításból', 'Bezárás', {
      duration: 2000
    });
  }
  
  /**
   * Összehasonlítás törlése
   */
  clearCompare(): void {
    this.compareItems.set([]);
    this.compareItemsSubject.next([]);
    
    // Töröljük a felhasználó specifikus localStorage adatokat is
    this.saveCompareToStorage([]);
  }
  
  /**
   * Aktuális összehasonlító lista lekérdezése
   */
  getCompareItems(): Part[] {
    return this.compareItems();
  }
  
  /**
   * Ellenőrzi, hogy egy adott alkatrész szerepel-e már az összehasonlításban
   */
  isInCompare(partId: string): boolean {
    return this.compareItems().some(item => item.id === partId);
  }
  
  /**
   * Ellenőrzi, hogy van-e még hely új alkatrész hozzáadásához
   */
  hasRoomForMore(): boolean {
    return this.compareItems().length < this.MAX_COMPARE_ITEMS;
  }
  
  /**
   * Visszaadja az összehasonlítandó termékek aktuális számát
   */
  getCompareCount(): number {
    return this.compareItems().length;
  }
}
