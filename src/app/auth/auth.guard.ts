import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';
import { inject } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    // Vegyük figyelembe az authState értékét, és engedélyezzük a route-ot, ha bejelentkezett
    return authState(this.auth).pipe(
      take(1),
      map(user => {
        if (user) {
          // Felhasználó be van jelentkezve, engedélyezzük a hozzáférést.
          return true;
        } else {
          // Nem bejelentkezett, navigáljunk át a bejelentkezési oldalra.
          return this.router.createUrlTree(['/login']);
        }
      })
    );
  }
}