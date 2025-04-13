import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators, ValidatorFn, AbstractControl, ValidationErrors } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { UserService } from '../../services/user.service';
import { MatSnackBar } from '@angular/material/snack-bar';

// Egyedi validator a jelszó egyezésének ellenőrzésére
export const passwordMatchValidator: ValidatorFn = (control: AbstractControl): ValidationErrors | null => {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');

  // Ha nincs érték valamelyik mezőben, ne ellenőrizzük
  if (!password || !confirmPassword || !password.value || !confirmPassword.value) {
    return null;
  }
  
  // Ha nem egyeznek a jelszavak, beállítjuk a hibát közvetlenül a confirmPassword mezőn
  const passwordsMatch = password.value === confirmPassword.value;
  if (!passwordsMatch) {
    confirmPassword.setErrors({ passwordMismatch: true });
    return { passwordMismatch: true };
  } else {
    // Ha egyeznek a jelszavak, töröljük a hibát (de megtartjuk az egyéb hibákat, pl. required)
    const currentErrors = confirmPassword.errors;
    if (currentErrors) {
      delete currentErrors['passwordMismatch'];
      confirmPassword.setErrors(Object.keys(currentErrors).length > 0 ? currentErrors : null);
    }
    return null;
  }
};

@Component({
  standalone: true,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule]
})
export class RegisterComponent {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private userService: UserService = inject(UserService);
  private snackBar: MatSnackBar = inject(MatSnackBar);

  // Jelszó elrejtés/megjelenítés vezérlése
  hidePassword = true;
  hideConfirmPassword = true;
  
  isLoading = false;
  errorMessage: string | null = null;

  // Kibővített regisztrációs űrlap
  registerForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required, Validators.minLength(6)]),
    confirmPassword: new FormControl('', [Validators.required]),
    fullName: new FormControl('', [Validators.required]), 
    phoneNumber: new FormControl('', [Validators.pattern(/^06[0-9]{9}$/)])
  }, { validators: passwordMatchValidator });

  // Ellenőrzi, hogy van-e legalább egy érvénytelen és már megérintett mező
  hasInvalidTouchedField(): boolean {
    const hasInvalidControl = Object.keys(this.registerForm.controls).some(
      key => {
        const control = this.registerForm.get(key);
        return control?.invalid === true && control?.touched === true;
      }
    );
    
    // Form-szintű validációs hibák ellenőrzése (pl. jelszó egyezés)
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    const hasFormLevelErrors = this.registerForm.hasError('passwordMismatch') && 
                              confirmPasswordControl?.touched === true;
                              
    return hasInvalidControl || hasFormLevelErrors === true;
  }

  // Ez a függvény ellenőrzi, hogy az űrlappal már interakcióba lépett-e a felhasználó
  hasInteractedWithAnyField(): boolean {
    return Object.keys(this.registerForm.controls).some(
      key => {
        const control = this.registerForm.get(key);
        return control?.touched === true;
      }
    );
  }
  
  // Ellenőrzi, hogy meg kell-e jeleníténi a validációs összefoglalót
  showValidationSummary(): boolean {
    // Form-szintű validációs hibák ellenőrzése (pl. jelszó egyezés)
    const hasFormLevelErrors = this.registerForm.hasError('passwordMismatch') && 
                              this.registerForm.get('confirmPassword')?.touched === true;
                              
    return this.hasInvalidTouchedField() || hasFormLevelErrors;
  }



  // Email hibaüzenet megszerzése
  getEmailErrorMessage(): string {
    const emailControl = this.registerForm.get('email');
    if (emailControl?.hasError('required')) {
      return 'Az email cím megadása kötelező';
    }
    if (emailControl?.hasError('email')) {
      return 'Érvénytelen email formátum';
    }
    return '';
  }

  // Jelszó hibaüzenet megszerzése
  getPasswordErrorMessage(): string {
    const passwordControl = this.registerForm.get('password');
    if (passwordControl?.hasError('required')) {
      return 'A jelszó megadása kötelező';
    }
    if (passwordControl?.hasError('minlength')) {
      return 'A jelszónak legalább 6 karakter hosszúnak kell lennie';
    }
    return '';
  }

  // Jelszó megerősítés hibaüzenet megszerzése
  getConfirmPasswordErrorMessage(): string {
    const confirmPasswordControl = this.registerForm.get('confirmPassword');
    if (confirmPasswordControl?.hasError('required')) {
      return 'A jelszó megerősítése kötelező';
    }
    // Most közvetlenül a mezőn ellenőrizzük a passwordMismatch hibát
    if (confirmPasswordControl?.hasError('passwordMismatch')) {
      return 'A jelszavak nem egyeznek';
    }
    return '';
  }

  onSubmit() {
    if (this.registerForm.valid) {
      this.isLoading = true;
      this.errorMessage = null;

      const { email, password, fullName, phoneNumber } = this.registerForm.value;
      createUserWithEmailAndPassword(this.auth, email, password)
        .then(async (userCredential) => {
          console.log('Sikeres regisztráció:', userCredential.user);

          // Admin email ellenőrzése, például: 
          const isAdmin = email === 'admin@example.com'; // Kezdeti admin email
          const role = isAdmin ? 'admin' : 'user';

          // Felhasználói adatok mentése Firestore-ba
          try {
            await this.userService.createUserWithRole(
              userCredential.user.uid,
              email,
              role,
              phoneNumber || '',
              fullName
            );

            // Sikeres regisztráció üzenet
            this.snackBar.open('Sikeres regisztráció!', 'Bezárás', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });

            // Navigálj át a bejelentkezési oldalra
            this.router.navigate(['/login']);
          } catch (error) {
            console.error('Hiba a felhasználói adatok mentésekor:', error);
            this.errorMessage = 'Hiba a felhasználói adatok mentésekor, kérjük próbálja újra!';
          }
        })
        .catch((error) => {
          console.error('Regisztrációs hiba:', error);
          // Hibakezelés
          switch (error.code) {
            case 'auth/email-already-in-use':
              this.errorMessage = 'Ez az email cím már használatban van!';
              break;
            case 'auth/weak-password':
              this.errorMessage = 'A jelszó túl gyenge!';
              break;
            default:
              this.errorMessage = 'Hiba történt a regisztráció során, kérjük próbálja újra!';
          }
        })
        .finally(() => {
          this.isLoading = false;
        });
    } else {
      // Minden mezőt megjelöl, hogy látsszanak a hibák
      Object.keys(this.registerForm.controls).forEach(key => {
        const control = this.registerForm.get(key);
        control?.markAsTouched();
      });
    }
  }
}