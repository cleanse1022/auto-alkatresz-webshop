import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, doc, updateDoc, getDoc, getDocs, query, where, orderBy } from '@angular/fire/firestore';
import { Observable, from, map, switchMap, of, take, finalize } from 'rxjs';
import { Auth } from '@angular/fire/auth';
import { Order, OrderStatus } from '../models/order.model';
import { CartService } from './cart.service';
import { UserService } from './user.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private firestore: Firestore = inject(Firestore);
  private auth: Auth = inject(Auth);
  private cartService = inject(CartService);
  private userService = inject(UserService);

  // Új rendelés létrehozása a kosár alapján
  createOrder(shippingAddress: any): Observable<string> {
    const userId = this.auth.currentUser?.uid;
    
    if (!userId) {
      return of('');
    }
    
    // Először csak lekérjük a kosár tartalmát, és menti azt egy lokális változóba
    // A take(1) biztosítja, hogy csak egyszer kapjunk értéket, és ne maradjunk feliratkozva
    return this.cartService.cartItems$.pipe(
      take(1),
      switchMap(items => {
        // Ellenőrizzük, hogy a kosár nem üres
        if (items.length === 0) {
          throw new Error('A kosár üres!');
        }
        
        // Másolatot készítünk a kosár tartalmáról
        const cartItems = [...items];
        
        // Számítsuk ki a teljes összeget
        const totalAmount = cartItems.reduce(
          (sum, item) => sum + (item.part.price * item.quantity), 
          0
        );
        
        // Most lekérjük a felhasználó adatait
        return this.userService.getUserData(userId).pipe(
          switchMap(userData => {
            const newOrder: Order = {
              userId: userId,
              userName: userData?.fullName || this.auth.currentUser?.email || '',
              items: cartItems,
              totalAmount: totalAmount,
              status: OrderStatus.PENDING,
              createdAt: new Date(),
              updatedAt: new Date(),
              shippingAddress: shippingAddress
            };
            
            // Rendelés mentése Firestore-ba
            return from(addDoc(collection(this.firestore, 'orders'), newOrder)).pipe(
              map(docRef => docRef.id),
              finalize(() => {
                // Az adatbázis művelet lezárása után törli a kosarat, nem az adatfolyamon belül
                // Ez az esemény a finalize hook-ban fut le, függetlenül attól, hogy sikeres volt-e a művelet
                setTimeout(() => {
                  this.cartService.clearCart();
                }, 100);
              })
            );
          })
        );
      })
    );
  }

  // Felhasználó rendeléseinek lekérése
  getUserOrders(): Observable<Order[]> {
    const userId = this.auth.currentUser?.uid;
    
    if (!userId) {
      return of([]);
    }

    const ordersRef = collection(this.firestore, 'orders');
    const userOrdersQuery = query(
      ordersRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    return from(getDocs(userOrdersQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Order;
          // Firestore időbélyegek konvertálása Date objektumokká
          if (data.createdAt && typeof data.createdAt !== 'string') {
            data.createdAt = (data.createdAt as any).toDate();
          }
          if (data.updatedAt && typeof data.updatedAt !== 'string') {
            data.updatedAt = (data.updatedAt as any).toDate();
          }
          return { ...data, id: doc.id };
        });
      })
    );
  }

  // Admin funkció: összes rendelés lekérdezése
  getAllOrders(): Observable<Order[]> {
    const ordersRef = collection(this.firestore, 'orders');
    const allOrdersQuery = query(
      ordersRef,
      orderBy('createdAt', 'desc')
    );
    
    return from(getDocs(allOrdersQuery)).pipe(
      map(snapshot => {
        return snapshot.docs.map(doc => {
          const data = doc.data() as Order;
          // Firestore időbélyegek konvertálása Date objektumokká
          if (data.createdAt && typeof data.createdAt !== 'string') {
            data.createdAt = (data.createdAt as any).toDate();
          }
          if (data.updatedAt && typeof data.updatedAt !== 'string') {
            data.updatedAt = (data.updatedAt as any).toDate();
          }
          return { ...data, id: doc.id };
        });
      })
    );
  }

  // Rendelés részleteinek lekérése azonosító alapján
  getOrderById(orderId: string): Observable<Order | null> {
    const orderRef = doc(this.firestore, 'orders', orderId);
    
    return from(getDoc(orderRef)).pipe(
      map(docSnap => {
        if (!docSnap.exists()) {
          return null;
        }
        
        const data = docSnap.data() as Order;
        // Firestore időbélyegek konvertálása Date objektumokká
        if (data.createdAt && typeof data.createdAt !== 'string') {
          data.createdAt = (data.createdAt as any).toDate();
        }
        if (data.updatedAt && typeof data.updatedAt !== 'string') {
          data.updatedAt = (data.updatedAt as any).toDate();
        }
        return { ...data, id: docSnap.id };
      })
    );
  }

  // Rendelés státuszának frissítése (admin funkció)
  updateOrderStatus(orderId: string, status: OrderStatus): Observable<void> {
    const orderRef = doc(this.firestore, 'orders', orderId);
    
    return from(updateDoc(orderRef, { 
      status: status,
      updatedAt: new Date()
    }));
  }
}