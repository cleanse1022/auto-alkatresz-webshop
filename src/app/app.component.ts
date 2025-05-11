import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MaterialModule } from './material.module';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { UserService } from './services/user.service';
import { CartService } from './services/cart.service';
import { ScrollToTopService } from './services/scroll-to-top.service';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  standalone: true,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [CommonModule, RouterModule, MaterialModule]
})
export class AppComponent implements OnInit {
  title = 'auto-alkatresz-webshop';
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  // Auth state Observable a bejelentkezett user lekéréséhez
  user$: Observable<any> = authState(this.auth);
  // Az admin státusz lekérdezése a UserService-ből
  isAdmin$: Observable<boolean> = inject(UserService).isAdmin();
  // Kosárban lévő termékek száma
  cartItemsCount$: Observable<number> = inject(CartService).getCartItemsCount();
  currentYear: number = new Date().getFullYear();
  // Mobilmenü állapota
  mobileMenuOpen: boolean = false;

  constructor(private scrollToTopService: ScrollToTopService) {}

  ngOnInit(): void {
    // Inicializációs logika, ha szükséges
    this.scrollToTopService.setupScrollToTop();
    
    // Az ablak átméretezésének figyelése - ha a képernyő nagyobb lesz, automatikusan bezárja a mobilmenüt
    window.addEventListener('resize', () => {
      if (window.innerWidth > 768 && this.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    });
  }

  /**
   * Mobilmenü megnyitása/bezárása
   */
  toggleMobileMenu(): void {
    this.mobileMenuOpen = !this.mobileMenuOpen;
    // Ha a menü megnyílik, zárolnunk kell a görgetést
    if (this.mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  /**
   * Mobilmenü bezárása
   */
  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
    document.body.style.overflow = '';
  }

  /**
   * Kijelentkezés metódus
   * A főoldalra navigál és sikeres értesítést jelenít meg
   */
  signOut(): void {
    this.auth.signOut().then(() => {
      // Átirányítás a főoldalra
      this.router.navigate(['/']);
      
      // Sikeres kijelentkezés értesítés megjelenítése
      this.snackBar.open(
        'Sikeres kijelentkezés! ✓', 
        'Bezárás', 
        {
          duration: 3000,
          panelClass: 'success-snackbar',
          horizontalPosition: 'center',
          verticalPosition: 'top'
        }
      );
    }).catch(error => {
      console.error('Kijelentkezési hiba:', error);
      
      // Hiba értesítés megjelenítése
      this.snackBar.open(
        'Kijelentkezési hiba történt!', 
        'Bezárás', 
        {
          duration: 5000,
          panelClass: 'error-snackbar'
        }
      );
    });
  }
}