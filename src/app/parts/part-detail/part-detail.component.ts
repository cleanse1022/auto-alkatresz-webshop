import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartService } from '../../services/part.service';
import { UserService } from '../../services/user.service';
import { Part } from '../../models/part.model';
import { Observable, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { CartService } from '../../services/cart.service';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { ImageFallbackDirective } from '../../directives/image-fallback.directive';

@Component({
  standalone: true,
  selector: 'app-part-detail',
  templateUrl: './part-detail.component.html',
  styleUrls: ['./part-detail.component.scss'],
  imports: [
    CommonModule, 
    MaterialModule, 
    RouterModule, 
    HungarianCurrencyPipe, 
    FormsModule,
    ImageFallbackDirective
  ]
})
export class PartDetailComponent implements OnInit {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private partService: PartService = inject(PartService);
  private userService: UserService = inject(UserService);
  private cartService: CartService = inject(CartService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private location: Location = inject(Location);

  part$!: Observable<Part | null>;
  isAdmin$ = this.userService.isAdmin();
  quantity: number = 1;

  ngOnInit(): void {
    // Az alkatrész ID kinyerése a route paraméterekből
    this.part$ = this.route.paramMap.pipe(
      switchMap(params => {
        const id = params.get('id');
        if (!id) return of(null);
        return this.partService.getPartById(id);
      })
    );
  }

  // Mennyiség növelése 
  increaseQuantity(): void {
    this.quantity++;
  }

  // Mennyiség csökkentése (de nem lehet 1-nél kevesebb)
  decreaseQuantity(): void {
    if (this.quantity > 1) {
      this.quantity--;
    }
  }

  editPart(part: Part): void {
    if (part.id) {
      this.router.navigate([`/parts/${part.id}/edit`]);
    }
  }

  deletePart(part: Part): void {
    if (!part.id) return;
    
    if (confirm('Biztosan törölni szeretnéd ezt az alkatrészt?')) {
      this.partService.deletePartWithImage(part.id)  // Use the updated method that also deletes images
        .then(() => {
          this.snackBar.open('Alkatrész sikeresen törölve', 'Bezárás', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          this.router.navigate(['/parts']);
        })
        .catch(error => {
          console.error('Hiba az alkatrész törlésekor:', error);
          this.snackBar.open('Hiba történt a törlés során', 'Bezárás', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        });
    }
  }

  async addToCart(part: Part): Promise<void> {
    // Érvénytelen mennyiség ellenőrzése
    if (this.quantity < 1) {
      this.snackBar.open(
        'A mennyiségnek legalább 1-nek kell lennie!', 
        'Bezárás',
        { duration: 3000 }
      );
      return;
    }
    
    // Meghívjuk a CartService addToCart metódusát a megadott mennyiséggel
    const success = await this.cartService.addToCart(part, this.quantity);
    
    // Ha sikeres volt a kosárba helyezés, akkor megjelenítjük az értesítést
    if (success) {
      this.snackBar.open(
        `${this.quantity} db ${part.name} kosárba helyezve!`, 
        'Kosár megtekintése',
        { duration: 3000 }
      ).onAction().subscribe(() => {
        this.router.navigate(['/cart']);
      });
    }
    // Ha nem sikeres (false), akkor az értesítést már kezelte a CartService
  }

  // Vissza navigálás az előző oldalra
  goBack(): void {
    this.location.back();
  }

  // Mennyiség beviteli mező validálása
  validateQuantityInput(event: KeyboardEvent): void {
    // Negatív szám tiltása
    if (event.key === '-' || event.key === 'e' || event.key === '+') {
      event.preventDefault();
    }
  }
}