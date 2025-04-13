import { Component, inject, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { RouterModule } from '@angular/router';
import { Auth, authState, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { tap } from 'rxjs';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';
import { PartService } from '../../services/part.service';
import { Order, OrderStatus } from '../../models/order.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Part } from '../../models/part.model';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';
import { MatSort, Sort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

@Component({
  standalone: true,
  selector: 'app-admin-dashboard',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule, HungarianCurrencyPipe]
})
export class AdminDashboardComponent implements OnInit, AfterViewInit {
  // Firebase Auth szolgáltatás injekciója
  private auth: Auth = inject(Auth);
  // Auth state megfigyelése a bejelentkezett adminisztrátori adatok lekéréséhez
  user$: Observable<any> = authState(this.auth);
  // Services injekciója
  private userService: UserService = inject(UserService);
  private orderService: OrderService = inject(OrderService);
  private partService: PartService = inject(PartService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  
  // OrderStatus enum, hogy a template-ben is használhassuk
  orderStatuses = OrderStatus;
  
  // Admin jogosultság ellenőrzése
  isAdmin$ = this.userService.isAdmin();

  // Aktív panel nyilvántartása
  activePanel: 'orders' | 'parts' | 'users' | 'stats' | 'profile' = 'orders';
  // Tab index a mat-tab-group-hoz
  selectedTabIndex = 0;
  
  // Jelszóváltoztatási űrlap
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: this.passwordMatchValidator() });
  
  // Jelszóváltoztatási folyamat állapota
  passwordChangeSuccess = false;

  // A valódi rendeléseket tároló tömb és DataSource
  orders: Order[] = [];
  ordersDataSource = new MatTableDataSource<Order>([]);
  // A rendelések betöltési állapota
  isOrdersLoading = false;
  // Termékek listája és DataSource
  parts: Part[] = [];
  partsDataSource = new MatTableDataSource<Part>([]);
  // Termékek betöltési állapota
  isPartsLoading = false;
  // Regisztrált felhasználók és DataSource
  users: any[] = [];
  usersDataSource = new MatTableDataSource<any>([]);
  // Felhasználók betöltés állapota
  isUsersLoading = false;
  
  // MatSort referenciák a táblázatokhoz
  @ViewChild('orderSort', {static: false}) orderSort!: MatSort;
  @ViewChild('partSort', {static: false}) partSort!: MatSort;
  @ViewChild('userSort', {static: false}) userSort!: MatSort;
  
  // Statisztikai változók
  // Az összes rendelés száma
  totalOrdersCount = 0;
  // Az összes rendelés értéke
  totalOrdersValue = 0;
  // Az összes termék száma
  totalPartsCount = 0;
  // Az összes felhasználó száma
  totalUsersCount = 0;
  
  // Rendelés státusz számok
  pendingOrdersCount = 0;
  processingOrdersCount = 0;
  shippedOrdersCount = 0;
  deliveredOrdersCount = 0;
  cancelledOrdersCount = 0;
  
  // Rendelés státusz százalékok
  pendingOrdersPercent = 0;
  processingOrdersPercent = 0;
  shippedOrdersPercent = 0;
  deliveredOrdersPercent = 0;
  cancelledOrdersPercent = 0;
  
  // Termék statisztikák
  averagePrice = 0;
  
  // Felhasználó statisztikák
  adminUsersCount = 0;
  ordersPerUser = 0;

  ngOnInit(): void {
    this.loadAllOrders();
    this.loadAllParts();
    this.loadAllUsers();
  }
  
  ngAfterViewInit(): void {
    // Inicializáljuk a sorters-t a táblázatokhoz a view inicializálása után
    setTimeout(() => {
      this.initSorting();
    }, 100);
  }
  
  // Táblázatok sorter inicializálása
  private initSorting(): void {
    // Sorterek beállítása a táblázatokhoz
    if (this.orderSort) {
      this.ordersDataSource.sort = this.orderSort;
      console.log('Orders sort initialized');
    }
    
    if (this.partSort) {
      this.partsDataSource.sort = this.partSort;
      console.log('Parts sort initialized');
    }
    
    if (this.userSort) {
      this.usersDataSource.sort = this.userSort;
      console.log('Users sort initialized');
    }
  }
  
  // Táblázatok rendezése
  sortData(sort: Sort, dataType: 'orders' | 'parts' | 'users'): void {
    // Naplózás és manuális rendezés aktiválása
    console.log(`Rendezés: ${dataType}, oszlop: ${sort.active}, irány: ${sort.direction}`);
    
    // Ha nincs irány, akkor nincs rendezés
    if (!sort.direction) {
      return;
    }
    
    // Manuális rendezés aktiválása
    switch (dataType) {
      case 'orders':
        this.manualSort(this.ordersDataSource, sort);
        break;
      case 'parts':
        // A parts táblázat már helyesen működik, nem kell manuálisan rendezni
        break;
      case 'users':
        this.manualSort(this.usersDataSource, sort);
        break;
    }
  }
  
  // Manuális rendezés implementációja
  private manualSort<T>(dataSource: MatTableDataSource<T>, sort: Sort): void {
    const data = dataSource.data.slice();
    if (!sort.active || sort.direction === '') {
      dataSource.data = data;
      return;
    }

    dataSource.data = data.sort((a: any, b: any) => {
      const isAsc = sort.direction === 'asc';
      switch (sort.active) {
        case 'id': return this.compare(a.id || a.uid, b.id || b.uid, isAsc);
        case 'name': return this.compare(a.name, b.name, isAsc);
        case 'email': return this.compare(a.email, b.email, isAsc);
        case 'user': return this.compare(a.userName || a.userEmail, b.userName || b.userEmail, isAsc);
        case 'date': return this.compare(a.createdAt, b.createdAt, isAsc);
        case 'amount': return this.compare(a.totalAmount, b.totalAmount, isAsc);
        case 'status': return this.compare(a.status, b.status, isAsc);
        case 'category': return this.compare(a.category, b.category, isAsc);
        case 'brand': return this.compare(a.brand, b.brand, isAsc);
        case 'price': return this.compare(a.price, b.price, isAsc);
        case 'role': return this.compare(a.role, b.role, isAsc);
        default: return 0;
      }
    });
  }
  
  // Összehasonlító függvény a rendezéshez
  private compare(a: number | string | Date, b: number | string | Date, isAsc: boolean): number {
    if (a instanceof Date && b instanceof Date) {
      return (a.getTime() - b.getTime()) * (isAsc ? 1 : -1);
    }
    
    if (a === undefined && b !== undefined) return isAsc ? -1 : 1;
    if (a !== undefined && b === undefined) return isAsc ? 1 : -1;
    if (a === undefined && b === undefined) return 0;
    
    return (a < b ? -1 : 1) * (isAsc ? 1 : -1);
  }

  // Panel váltás
  setActivePanel(panel: 'orders' | 'parts' | 'users' | 'stats'): void {
    this.activePanel = panel;
    // Frissítjük a selectedTabIndex-et is, hogy összhangban legyen az activePanel-lel
    this.selectedTabIndex = panel === 'orders' ? 0 : panel === 'parts' ? 1 : panel === 'users' ? 2 : 3;
  }

  // Tab index változásának kezelése
  onSelectedIndexChange(index: number): void {
    // Az index alapján frissítjük az activePanel értékét
    this.activePanel = index === 0 ? 'orders' : index === 1 ? 'parts' : index === 2 ? 'users' : index === 3 ? 'stats' : 'profile';
    
    // Késleltetett sort inicializálás a tab váltás után
    setTimeout(() => {
      this.initSorting();
    }, 100);
  }
  
  // Jelszó egyezőség validátor
  passwordMatchValidator(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get('newPassword')?.value;
      const confirmPassword = control.get('confirmPassword')?.value;
      
      if (password !== confirmPassword) {
        control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
        return { passwordMismatch: true };
      }
      
      return null;
    };
  }
  
  // Jelszó változtatás
  changePassword(): void {
    if (this.passwordForm.invalid) {
      return;
    }
    
    const currentUser = this.auth.currentUser;
    if (!currentUser || !currentUser.email) {
      this.snackBar.open('Nincs bejelentkezett felhasználó', 'OK', {
        duration: 3000
      });
      return;
    }
    
    const currentPassword = this.passwordForm.value.currentPassword || '';
    const newPassword = this.passwordForm.value.newPassword || '';
    
    // Újrahitelesítés a jelenlegi jelszóval
    const credential = EmailAuthProvider.credential(
      currentUser.email,
      currentPassword
    );
    
    reauthenticateWithCredential(currentUser, credential)
      .then(() => {
        // Sikeres újrahitelesítés után jelszó változtatás
        return updatePassword(currentUser, newPassword);
      })
      .then(() => {
        // Csak a form-ban jelezzük a sikeres jelszóváltoztatást, felugró üzenet nélkül
        this.passwordChangeSuccess = true;
        
        // Teljesen új form létrehozása a régit lecserélve, így a validációs állapot is alaphelyzetbe áll
        this.passwordForm = new FormGroup({
          currentPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
          newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
          confirmPassword: new FormControl('', [Validators.required])
        }, { validators: this.passwordMatchValidator() });
      })
      .catch((error) => {
        console.error('Hiba a jelszó megváltoztatásakor:', error);
        let errorMessage = 'Hiba történt a jelszó megváltoztatásakor';
        
        if (error.code === 'auth/wrong-password') {
          errorMessage = 'A jelenlegi jelszó helytelen';
        } else if (error.code === 'auth/weak-password') {
          errorMessage = 'Az új jelszó túl gyenge';
        }
        
        this.snackBar.open(errorMessage, 'OK', {
          duration: 3000
        });
      });
  }

  // Összes rendelés betöltése
  loadAllOrders(): void {
    this.isOrdersLoading = true;
    this.orderService.getAllOrders().subscribe({
      next: (orders) => {
        this.orders = orders;
        this.ordersDataSource.data = orders;
        // Ha a sort már inicializálva van, akkor beállítjuk
        if (this.orderSort) {
          this.ordersDataSource.sort = this.orderSort;
        }
        this.isOrdersLoading = false;
        this.calculateStatistics();
      },
      error: (error: any) => {
        console.error('Hiba a rendelések betöltése során:', error);
        this.isOrdersLoading = false;
        this.snackBar.open('Hiba történt a rendelések betöltésekor', 'OK', {
          duration: 3000
        });
      }
    });
  }

  // Összes termék betöltése
  loadAllParts(): void {
    this.isPartsLoading = true;
    this.partService.getParts().subscribe({
      next: (parts) => {
        this.parts = parts;
        this.partsDataSource.data = parts;
        // Ha a sort már inicializálva van, akkor beállítjuk
        if (this.partSort) {
          this.partsDataSource.sort = this.partSort;
        }
        this.isPartsLoading = false;
        this.calculateStatistics();
      },
      error: (error: any) => {
        console.error('Hiba a termékek betöltése során:', error);
        this.isPartsLoading = false;
        this.snackBar.open('Hiba történt a termékek betöltésekor', 'OK', {
          duration: 3000
        });
      }
    });
  }

  // Összes felhasználó betöltése
  loadAllUsers(): void {
    this.isUsersLoading = true;
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.usersDataSource.data = users;
        // Ha a sort már inicializálva van, akkor beállítjuk
        if (this.userSort) {
          this.usersDataSource.sort = this.userSort;
        }
        this.isUsersLoading = false;
        this.calculateStatistics();
      },
      error: (error: any) => {
        console.error('Hiba a felhasználók betöltése során:', error);
        this.isUsersLoading = false;
        this.snackBar.open('Hiba történt a felhasználók betöltésekor', 'OK', {
          duration: 3000
        });
      }
    });
  }

  // Statisztikák számítása
  calculateStatistics(): void {
    // Rendelések számítása
    this.totalOrdersCount = this.orders.length;
    this.totalOrdersValue = this.orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Termékek számítása
    this.totalPartsCount = this.parts.length;
    
    // Felhasználók számítása
    this.totalUsersCount = this.users.length;
    
    // Rendelés státusz számok
    this.pendingOrdersCount = this.countOrdersByStatus(OrderStatus.PENDING);
    this.processingOrdersCount = this.countOrdersByStatus(OrderStatus.PROCESSING);
    this.shippedOrdersCount = this.countOrdersByStatus(OrderStatus.SHIPPED);
    this.deliveredOrdersCount = this.countOrdersByStatus(OrderStatus.DELIVERED);
    this.cancelledOrdersCount = this.countOrdersByStatus(OrderStatus.CANCELLED);
    
    // Rendelés státusz százalékok
    if (this.totalOrdersCount > 0) {
      this.pendingOrdersPercent = (this.pendingOrdersCount / this.totalOrdersCount) * 100;
      this.processingOrdersPercent = (this.processingOrdersCount / this.totalOrdersCount) * 100;
      this.shippedOrdersPercent = (this.shippedOrdersCount / this.totalOrdersCount) * 100;
      this.deliveredOrdersPercent = (this.deliveredOrdersCount / this.totalOrdersCount) * 100;
      this.cancelledOrdersPercent = (this.cancelledOrdersCount / this.totalOrdersCount) * 100;
    }
    
    // Termék statisztikák
    this.averagePrice = this.calculateAveragePrice();
    
    // Felhasználó statisztikák 
    this.adminUsersCount = this.countAdminUsers();
    this.ordersPerUser = this.users.length > 0 ? this.totalOrdersCount / this.users.length : 0;
  }

  // Rendelések számolása státusz szerint
  countOrdersByStatus(status: OrderStatus): number {
    return this.orders.filter(order => order.status === status).length;
  }
  
  // Átlagos ár
  calculateAveragePrice(): number {
    if (this.parts.length === 0) return 0;
    const total = this.parts.reduce((sum, part) => sum + part.price, 0);
    return total / this.parts.length;
  }
  
  // Admin felhasználók száma
  countAdminUsers(): number {
    return this.users.filter(user => user.role === 'admin').length;
  }

  // Rendelés státuszának frissítése
  updateOrderStatus(orderId: string, newStatus: OrderStatus): void {
    this.orderService.updateOrderStatus(orderId, newStatus).subscribe({
      next: () => {
        this.snackBar.open('Rendelés státusza frissítve', 'OK', {
          duration: 3000
        });
        // Rendelések újratöltése a frissített adatokkal
        this.loadAllOrders();
      },
      error: (error: any) => {
        console.error('Hiba a rendelés státuszának frissítésekor:', error);
        this.snackBar.open('Hiba történt a státusz frissítésekor', 'OK', {
          duration: 3000
        });
      }
    });
  }

  // Termék törlése
  deletePart(partId: string): void {
    if (confirm('Biztosan törölni szeretnéd ezt a terméket?')) {
      this.partService.deletePart(partId)
        .then(() => {
          this.snackBar.open('Termék sikeresen törölve', 'OK', {
            duration: 3000
          });
          // Termékek újratöltése
          this.loadAllParts();
        })
        .catch((error: any) => {
          console.error('Hiba a termék törlésekor:', error);
          this.snackBar.open('Hiba történt a termék törlésekor', 'OK', {
            duration: 3000
          });
        });
    }
  }

  // Rendelés státusz szövegének magyarosítása
  getStatusText(status: string): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'Függőben';
      case OrderStatus.PROCESSING:
        return 'Feldolgozás alatt';
      case OrderStatus.SHIPPED:
        return 'Kiszállítva';
      case OrderStatus.DELIVERED:
        return 'Kézbesítve';
      case OrderStatus.CANCELLED:
        return 'Visszavonva';
      default:
        return status;
    }
  }
}