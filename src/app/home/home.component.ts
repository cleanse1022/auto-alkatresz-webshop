import { Component, OnInit, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MaterialModule } from '../material.module';
import { PartService } from '../services/part.service';
import { UserService } from '../services/user.service';
import { Part } from '../models/part.model';
import { ImageFallbackDirective } from '../directives/image-fallback.directive';
import { HungarianCurrencyPipe } from '../pipes/hungarian-currency.pipe';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  imports: [
    CommonModule, 
    RouterModule, 
    MaterialModule, 
    ImageFallbackDirective, 
    HungarianCurrencyPipe,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class HomeComponent implements OnInit, OnDestroy {
  // Szolgáltatások injektálása
  private partService = inject(PartService);
  private userService = inject(UserService);
  
  // Kiemelt termékek tárolása
  featuredParts: Part[] = [];
  
  // Felhasználó bejelentkezési állapota
  isLoggedIn: boolean = false;
  private authSubscription: Subscription | null = null;
  
  ngOnInit(): void {
    // Kiemelt termékek betöltése a kezdőlapra
    this.loadFeaturedParts();
    
    // Felhasználói bejelentkezés figyelése
    this.authSubscription = this.userService.currentUser$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }
  
  ngOnDestroy(): void {
    // Feliratkozás megszüntetése
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
  }
  
  // Kiemelt termékek lekérése (max 4 termék)
  loadFeaturedParts(): void {
    this.partService.getParts().subscribe(parts => {
      // Rendezzük ár szerint csökkenő sorrendbe
      const sortedParts = [...parts].sort((a, b) => b.price - a.price);
      // Válasszuk ki a legelső max 4 terméket
      this.featuredParts = sortedParts.slice(0, 4);
    });
  }
  
  // Hírlevél feliratkozás (példa, tényleges funkcióval ki kell egészíteni ha szükséges)
  subscribeToNewsletter(email: string): void {
    console.log('Feliratkozás a hírlevélre:', email);
    // Itt jönne a valódi implementáció
  }
}