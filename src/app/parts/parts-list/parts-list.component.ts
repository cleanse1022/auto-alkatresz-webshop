import { Component, OnInit, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ViewportScroller } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
import { UserService } from '../../services/user.service';
import { PartService } from '../../services/part.service';
import { CartService } from '../../services/cart.service';
import { CompareService } from '../../services/compare.service';
import { Observable } from 'rxjs';
import { Part } from '../../models/part.model';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PartCompareComponent } from '../part-compare/part-compare.component';

@Component({
  standalone: true,
  selector: 'app-parts-list',
  templateUrl: './parts-list.component.html',
  styleUrls: ['./parts-list.component.scss'],
  imports: [CommonModule, MaterialModule, RouterModule, HungarianCurrencyPipe, FormsModule, ReactiveFormsModule, PartCompareComponent],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartsListComponent implements OnInit {
  private userService: UserService = inject(UserService);
  private partService: PartService = inject(PartService);
  private cartService: CartService = inject(CartService);
  private compareService: CompareService = inject(CompareService);
  private router: Router = inject(Router);
  private route: ActivatedRoute = inject(ActivatedRoute);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private viewportScroller: ViewportScroller = inject(ViewportScroller);
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef);
  
  isAdmin$: Observable<boolean> = this.userService.isAdmin();
  
  // Alap listák és szűrési állapotok tárolása
  allParts: Part[] = [];
  filteredParts: Part[] = [];
  loading = true;
  
  // Összehasonlítási állapot
  compareItems$ = this.compareService.compareItems$;
  
  // Kategóriák és márkák listája (a termékekből kigyűjtve)
  categories: string[] = [];
  brands: string[] = [];
  
  // Szűrési és rendezési beállítások
  searchControl = new FormControl('');
  selectedCategory = new FormControl('');
  selectedBrand = new FormControl('');
  sortDirection = new FormControl('default');
  
  // Rendezési opciók
  sortOptions = [
    { value: 'default', viewValue: 'Alapértelmezett' },
    { value: 'price_asc', viewValue: 'Ár szerint növekvő' },
    { value: 'price_desc', viewValue: 'Ár szerint csökkenő' },
    { value: 'name_asc', viewValue: 'Név szerint (A-Z)' },
    { value: 'name_desc', viewValue: 'Név szerint (Z-A)' }
  ];

  ngOnInit(): void {
    // Adminisztrátor jogosultságok lekérdezése
    this.isAdmin$ = this.userService.isAdmin();
    
    // Az oldal tetejére görgetés
    this.viewportScroller.scrollToPosition([0, 0]);
    
    // URL paraméterek lekérdezése
    this.route.queryParams.subscribe(params => {
      const categoryParam = params['category'];
      const brandParam = params['brand'];
      
      // Alkatrészek lekérdezése a Firestore-ból
      this.partService.getParts().subscribe({
        next: (parts) => {
          this.allParts = parts;
          
          // Egyedi kategóriák és márkák kigyűjtése
          this.categories = Array.from(new Set(parts.map(part => part.category))).sort();
          this.brands = Array.from(new Set(parts.map(part => part.brand).filter(brand => !!brand))).sort();
          
          // URL paraméterek alkalmazása a szűrőkre
          if (categoryParam && this.categories.includes(categoryParam)) {
            this.selectedCategory.setValue(categoryParam);
          }
          
          if (brandParam && this.brands.includes(brandParam)) {
            this.selectedBrand.setValue(brandParam);
          }
          
          // Kezdeti szűrés és rendezés alkalmazása
          this.applyFilters();
          this.loading = false;
        },
        error: (error) => {
          console.error('Hiba az alkatrészek betöltésekor:', error);
          this.loading = false;
        }
      });
    });
    
    // Feliratkozás a szűrő változásokra
    this.searchControl.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.selectedCategory.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.selectedBrand.valueChanges.subscribe(() => {
      this.applyFilters();
    });
    
    this.sortDirection.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  // Szűrési és rendezési logika alkalmazása
  applyFilters(): void {
    let result = [...this.allParts];
    
    // Keresés név és leírás alapján
    const searchTerm = this.searchControl.value?.toLowerCase() || '';
    if (searchTerm) {
      result = result.filter(part => 
        part.name.toLowerCase().includes(searchTerm) || 
        (part.description && part.description.toLowerCase().includes(searchTerm))
      );
    }
    
    // Kategória szűrés
    const category = this.selectedCategory.value;
    if (category) {
      result = result.filter(part => part.category === category);
    }
    
    // Márka szűrés
    const brand = this.selectedBrand.value;
    if (brand) {
      result = result.filter(part => part.brand === brand);
    }
    
    // Rendezés
    const sortDir = this.sortDirection.value || 'default';
    switch (sortDir) {
      case 'price_asc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'name_asc':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'name_desc':
        result.sort((a, b) => b.name.localeCompare(a.name));
        break;
      // Az alapértelmezett esetben nem rendezzük
    }
    
    this.filteredParts = result;
  }
  
  // Szűrés eltávolítása
  clearFilters() {
    this.searchControl.setValue('');
    this.selectedCategory.setValue('');
    this.selectedBrand.setValue('');
    this.sortDirection.setValue('default');
  }

  viewPart(id: string) {
    this.router.navigate(['/parts', id]);
  }

  /**
   * Kosárhoz adja a terméket
   */
  async addToCart(part: Part): Promise<void> {
    // Várjuk meg az aszinkron műveletet és csak akkor jelezzük a sikert, ha a Promise true-val tér vissza
    const success = await this.cartService.addToCart(part);
    
    if (success) {
      this.snackBar.open(`${part.name} a kosárba került`, 'Rendben', {
        duration: 3000
      });
    }
    // Ha nem sikeres, akkor nem jelenítünk meg üzenetet itt, mert a CartService már megjeleníti
    // a bejelentkezésre figyelmeztető üzenetet
  }
  
  /**
   * Ellenőrzi, hogy az adott termék már szerepel-e az összehasonlításban
   */
  isInCompare(partId: string): boolean {
    return this.compareService.isInCompare(partId);
  }
  
  /**
   * Hozzáadja a terméket az összehasonlító listához
   */
  addToCompare(part: Part): void {
    if (this.compareService.addToCompare(part)) {
      // OnPush változásérzékelés miatt szükséges
      this.cdr.markForCheck();
    }
  }
}