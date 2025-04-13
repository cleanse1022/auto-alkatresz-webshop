import { Injectable, inject } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { UserService } from '../services/user.service';

@Injectable({
  providedIn: 'root'
})
export class AdminGuard implements CanActivate {
  private userService: UserService = inject(UserService);
  private router: Router = inject(Router);

  canActivate(): Observable<boolean | UrlTree> {
    return this.userService.isAdmin().pipe(
      take(1),
      map(isAdmin => {
        if (isAdmin) {
          return true;
        } else {
          // Ha nem admin, átirányítjuk a kezdőlapra
          return this.router.createUrlTree(['/']);
        }
      })
    );
  }
}