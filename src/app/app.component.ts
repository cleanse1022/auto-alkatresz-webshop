import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MaterialModule } from './material.module';
import { Auth, authState } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { UserService } from './services/user.service';
import { CartService } from './services/cart.service';
import { ScrollToTopService } from './services/scroll-to-top.service';

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
  // Auth state Observable a bejelentkezett user lekéréséhez
  user$: Observable<any> = authState(this.auth);
  // Az admin státusz lekérdezése a UserService-ből
  isAdmin$: Observable<boolean> = inject(UserService).isAdmin();
  // Kosárban lévő termékek száma
  cartItemsCount$: Observable<number> = inject(CartService).getCartItemsCount();
  currentYear: number = new Date().getFullYear();

  constructor(private scrollToTopService: ScrollToTopService) {}

  ngOnInit(): void {
    // Inicializációs logika, ha szükséges
    this.scrollToTopService.setupScrollToTop();
  }

  signOut(): void {
    this.auth.signOut().then(() => {
      this.router.navigate(['/login']);
    }).catch(error => {
      console.error('Kijelentkezési hiba:', error);
    });
  }
}