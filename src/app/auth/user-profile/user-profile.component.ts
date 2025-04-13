import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { Auth, authState, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { UserService } from '../../services/user.service';
import { OrderService } from '../../services/order.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { User } from '../../models/user.model';
import { Order, OrderStatus } from '../../models/order.model';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';

@Component({
  standalone: true,
  selector: 'app-user-profile',
  templateUrl: './user-profile.component.html',
  styleUrls: ['./user-profile.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule, HungarianCurrencyPipe]
})
export class UserProfileComponent implements OnInit {
  private auth: Auth = inject(Auth);
  private userService: UserService = inject(UserService);
  private orderService: OrderService = inject(OrderService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private route: ActivatedRoute = inject(ActivatedRoute);

  user$: Observable<any> = authState(this.auth);
  userData: User | null = null;
  
  // Személyes adatok űrlap
  profileForm = new FormGroup({
    fullName: new FormControl('', [Validators.maxLength(50)]),
    phoneNumber: new FormControl('', [Validators.pattern(/^[0-9+\s-]{6,20}$/)])
  });
  
  // Jelszóváltoztatási űrlap
  passwordForm = new FormGroup({
    currentPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    newPassword: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required])
  }, { validators: this.passwordMatchValidator() });
  
  // Felhasználó rendelései
  userOrders: Order[] = [];
  isOrdersLoading = false;
  
  // Kiválasztott rendelés részletei
  selectedOrder: Order | null = null;
  
  // Aktív fül követése
  selectedTabIndex = 0;

  // Jelszóváltoztatási folyamat állapota
  passwordChangeSuccess = false;

  ngOnInit(): void {
    this.loadUserData();
    this.loadUserOrders();
    
    // Query paraméter figyelése a tab váltáshoz
    this.route.queryParams.subscribe(params => {
      if (params['tab'] === 'orders') {
        // Rendelési előzmények fül kiválasztása (index: 2)
        this.selectedTabIndex = 2;
      }
    });
  }

  // Jelszó egyezőség validátor - statikus függvény, amely ValidatorFn-t ad vissza
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

  loadUserData(): void {
    this.userService.currentUser$.subscribe({
      next: (user) => {
        if (user) {
          this.userData = user;
          this.profileForm.patchValue({
            fullName: user.fullName || '',
            phoneNumber: user.phoneNumber || ''
          });
        }
      },
      error: (error) => {
        console.error('Hiba a felhasználói adatok betöltésekor:', error);
        this.snackBar.open('Nem sikerült betölteni a profil adatokat', 'OK', {
          duration: 3000
        });
      }
    });
  }

  loadUserOrders(): void {
    this.isOrdersLoading = true;
    this.orderService.getUserOrders().subscribe({
      next: (orders) => {
        this.userOrders = orders;
        this.isOrdersLoading = false;
      },
      error: (error) => {
        console.error('Hiba a rendelések betöltésekor:', error);
        this.isOrdersLoading = false;
        this.snackBar.open('Nem sikerült betölteni a rendelési előzményeket', 'OK', {
          duration: 3000
        });
      }
    });
  }

  updateProfile(): void {
    if (this.profileForm.invalid) {
      return;
    }
    
    const fullName = this.profileForm.value.fullName?.trim();
    const phoneNumber = this.profileForm.value.phoneNumber?.trim();
    
    if (!this.userData) {
      this.snackBar.open('Nincs bejelentkezett felhasználó', 'OK', {
        duration: 3000
      });
      return;
    }
    
    // Csak a kitöltött mezőket frissítjük
    const updates: Partial<User> = {};
    if (fullName) {
      updates.fullName = fullName;
    }
    if (phoneNumber) {
      updates.phoneNumber = phoneNumber;
    }
    
    if (Object.keys(updates).length === 0) {
      this.snackBar.open('Nincs módosítandó adat', 'OK', {
        duration: 3000
      });
      return;
    }
    
    // Frissítjük a felhasználó adatait
    this.userService.saveUserData({
      ...this.userData,
      ...updates
    }).then(() => {
      this.snackBar.open('Profil sikeresen frissítve', 'OK', {
        duration: 3000
      });
      // Frissítjük a helyi adatokat
      if (fullName) {
        this.userData!.fullName = fullName;
      }
      if (phoneNumber) {
        this.userData!.phoneNumber = phoneNumber;
      }
    }).catch((error) => {
      console.error('Hiba a profil frissítésekor:', error);
      this.snackBar.open('Hiba történt a profil frissítésekor', 'OK', {
        duration: 3000
      });
    });
  }

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
        this.snackBar.open('Jelszó sikeresen megváltoztatva', 'OK', {
          duration: 3000
        });
        
        // Form visszaállítása és új form példány létrehozása, hogy a validációs állapot is frissüljön
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

  // Rendelés részleteinek megjelenítése
  showOrderDetails(order: Order): void {
    this.selectedOrder = order;
  }

  // Visszalépés a rendelés listára
  backToOrdersList(): void {
    this.selectedOrder = null;
  }

  // Rendelés státuszának olvasható szövegét adja vissza
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

  // Státusz színe
  getStatusColor(status: string): string {
    switch (status) {
      case OrderStatus.PENDING:
        return 'accent';
      case OrderStatus.PROCESSING:
        return 'primary';
      case OrderStatus.SHIPPED:
        return 'info';
      case OrderStatus.DELIVERED:
        return 'success';
      case OrderStatus.CANCELLED:
        return 'warn';
      default:
        return '';
    }
  }
}