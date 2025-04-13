import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { Auth, authState } from '@angular/fire/auth';
import { map, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NoAuthGuard implements CanActivate {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      map(user => {
        if (user) {
          // Felhasználó már be van jelentkezve, ezért átirányítjuk
          return this.router.createUrlTree(['/profile']);
        } else {
          // Nincs bejelentkezve, engedélyezzük a hozzáférést
          return true;
        }
      })
    );
  }
}