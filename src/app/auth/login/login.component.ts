import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { MaterialModule } from '../../material.module';
import { Auth, signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence } from '@angular/fire/auth';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  standalone: true,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
  imports: [CommonModule, ReactiveFormsModule, MaterialModule, RouterModule]
})
export class LoginComponent {
  // Firebase Auth példány injectálása
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  
  // Jelszó elrejtés/megjelenítés állapot
  hidePassword = true;

  // Az űrlap most tartalmaz egy "staySignedIn" mezőt is
  loginForm: FormGroup = new FormGroup({
    email: new FormControl('', [Validators.required, Validators.email]),
    password: new FormControl('', [Validators.required]),
    staySignedIn: new FormControl(false)
  });

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password, staySignedIn } = this.loginForm.value;
      // Az auth persistence beállítása a checkbox alapján:
      const persistence = staySignedIn ? browserLocalPersistence : browserSessionPersistence;
      setPersistence(this.auth, persistence)
        .then(() => {
          return signInWithEmailAndPassword(this.auth, email, password);
        })
        .then((userCredential) => {
          console.log('Bejelentkezve:', userCredential.user);
          this.snackBar.open('Sikeres bejelentkezés!', 'Bezárás', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
          // Navigáljunk át a kezdőlapra vagy profil oldalra
          this.router.navigate(['/']);
        })
        .catch((error) => {
          console.error('Bejelentkezési hiba:', error);
          let errorMessage = 'Sikertelen bejelentkezés. Kérjük ellenőrizze adatait.';
          
          // Specifikus hibaüzenetek
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Hibás email cím vagy jelszó.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Túl sok sikertelen próbálkozás. Kérjük próbálja később.';
          }
          
          this.snackBar.open(errorMessage, 'Bezárás', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        });
    }
  }
}