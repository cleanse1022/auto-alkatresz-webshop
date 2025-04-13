import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Auth, authState } from '@angular/fire/auth';
import { UserService } from '../services/user.service';
import { Observable, of } from 'rxjs';
import { switchMap, take, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class NotAdminGuard implements CanActivate {
  private auth: Auth = inject(Auth);
  private router: Router = inject(Router);
  private userService: UserService = inject(UserService);

  canActivate(): Observable<boolean | UrlTree> {
    return authState(this.auth).pipe(
      take(1),
      switchMap(user => {
        if (!user) {
          // Ha nem vagyunk bejelentkezve, átirányítjuk a login oldalra:
          return of(this.router.createUrlTree(['/login']));
        }
        // Lekérjük a felhasználó szerepét
        return this.userService.getUserRole().pipe(
          take(1),
          map(role => {
            // Engedélyezzük, ha a role nem admin; ellenkező esetben irányítsuk át a profil oldalra
            return role !== 'admin' ? true : this.router.createUrlTree(['/']);
          })
        );
      })
    );
  }
}