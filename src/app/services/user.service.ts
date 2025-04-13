import { Injectable, inject } from '@angular/core';
import { Auth, authState } from '@angular/fire/auth';
import { Firestore, doc, getDoc, setDoc, docData, collection, getDocs } from '@angular/fire/firestore';
import { Observable, from, map, of, switchMap, tap } from 'rxjs';
import { User } from '../models/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private auth: Auth = inject(Auth);
  private firestore: Firestore = inject(Firestore);

  // Az aktuális felhasználó observable-je, amely a Firestore-ból származó egyedi adatokat is tartalmazza
  get currentUser$(): Observable<User | null> {
    return authState(this.auth).pipe(
      switchMap(user => {
        if (!user) {
          return of(null);
        }
        return this.getUserData(user.uid);
      })
    );
  }

  // A felhasználó szerepkörének lekérése
  getUserRole(): Observable<string | null> {
    return this.currentUser$.pipe(
      map(user => user?.role || null)
    );
  }

  // Felhasználói adatok lekérése a Firestore-ból (telefonszámmal együtt)
  getUserData(uid: string): Observable<any> {
    return docData(doc(this.firestore, 'users', uid)).pipe(
      tap(userData => console.log('Lekért felhasználói adatok:', userData)),
      map(userData => {
        // Ha van userData, de nincs benne phoneNumber, akkor adjunk hozzá egy üres értéket
        if (userData && !userData.hasOwnProperty('phoneNumber')) {
          return { ...userData, phoneNumber: '' };
        }
        return userData;
      })
    );
  }

  // Felhasználói adatok mentése a Firestore-ba (minden mezővel)
  async saveUserData(user: User): Promise<void> {
    const userRef = doc(this.firestore, 'users', user.uid);
    return setDoc(userRef, {
      email: user.email,
      fullName: user.fullName || '',
      role: user.role,
      phoneNumber: user.phoneNumber || ''
    });
  }

  // Új felhasználó létrehozása szerepkörrel és opcionális mezőkkel
  async createUserWithRole(
    uid: string,
    email: string,
    role: 'admin' | 'user' = 'user',
    phoneNumber: string = '',
    fullName: string = ''
  ): Promise<void> {
    const userData: User = {
      uid,
      email,
      role,
      phoneNumber,
      fullName
    };
    return this.saveUserData(userData);
  }

  // Ellenőrzés, hogy a felhasználó admin-e
  isAdmin(): Observable<boolean> {
    return this.getUserRole().pipe(
      map(role => role === 'admin')
    );
  }
  
  // Összes felhasználó lekérése - Admin vezérlőpult funkció
  getAllUsers(): Observable<User[]> {
    const usersCollection = collection(this.firestore, 'users');
    
    return from(getDocs(usersCollection)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            uid: doc.id,
            email: data['email'] || '',
            fullName: data['fullName'] || '',
            role: data['role'] || 'user',
            phoneNumber: data['phoneNumber'] || ''
          } as User;
        });
      })
    );
  }
}