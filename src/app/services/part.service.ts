import { Injectable, inject } from '@angular/core';
import { Firestore, collection, doc, addDoc, updateDoc, deleteDoc, docData, collectionData, getDoc } from '@angular/fire/firestore';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Part } from '../models/part.model';
import { Observable, from, switchMap, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class PartService {
  private firestore: Firestore = inject(Firestore);
  private storage: Storage = inject(Storage);
  private partsCollection = collection(this.firestore, 'parts');

  getParts(): Observable<Part[]> {
    // Lekérjük a teljes parts kollekciót
    return collectionData(this.partsCollection, { idField: 'id' }) as Observable<Part[]>;
  }

  getPartById(id: string): Observable<Part> {
    const partDocRef = doc(this.firestore, `parts/${id}`);
    return docData(partDocRef, { idField: 'id' }) as Observable<Part>;
  }

  // Új alkatrész létrehozása képpel együtt
  async createPartWithImage(part: Part, imageFile?: File): Promise<string> {
    // Ha van kép, először azt feltöltjük
    if (imageFile) {
      try {
        // Fejlesztési környezetben Base64 kódolást használunk a CORS problémák megkerülésére
        if (!environment.production) {
          const imageBase64 = await this.convertToBase64(imageFile);
          part.imageUrl = imageBase64;
        } else {
          // Éles környezetben a normál feltöltést használjuk
          const imageUrl = await this.uploadImage(imageFile);
          part.imageUrl = imageUrl;
        }
      } catch (error) {
        console.error('Hiba a kép konvertálásakor:', error);
        part.imageUrl = 'assets/images/placeholder.png';
      }
    } else {
      // Ha nincs kép, placeholder kép URL-t adunk hozzá
      part.imageUrl = 'assets/images/placeholder.png';
    }
    
    // Alkatrész hozzáadása a Firestore-hoz
    const docRef = await addDoc(this.partsCollection, part);
    return docRef.id;
  }

  // Meglévő alkatrész frissítése képpel vagy anélkül
  async updatePartWithImage(id: string, part: Partial<Part>, imageFile?: File, imageDeleted: boolean = false): Promise<void> {
    const partDocRef = doc(this.firestore, `parts/${id}`);
    
    // Lekérjük az aktuális adatokat
    const docSnap = await getDoc(partDocRef);
    const currentPart = docSnap.data();
    
    // Ha kép törlés lett megadva, beállítjuk a placeholder képet
    if (imageDeleted) {
      console.log('Kép törlése a felhasználói kérésre');
      part.imageUrl = 'assets/images/placeholder.png';
      
      // Ha van régi kép URL és nem a placeholder, és éles környezetben vagyunk, töröljük a régi képet
      if (environment.production && currentPart && currentPart['imageUrl'] && 
          !currentPart['imageUrl'].includes('placeholder.png') &&
          !currentPart['imageUrl'].startsWith('data:image/')) {
        const oldImagePath = this.getFilePathFromUrl(currentPart['imageUrl']);
        if (oldImagePath) {
          try {
            await this.deleteImage(oldImagePath);
            console.log('Régi kép sikeresen törölve:', oldImagePath);
          } catch (error) {
            console.error('Hiba a régi kép törlésekor:', error);
          }
        }
      }
    }
    // Ha van új kép
    else if (imageFile) {
      try {
        // Ha van régi kép URL és nem a placeholder, akkor nem csinálunk semmit CORS miatt
        // Csak éles környezetben töröljük a régi képet
        if (environment.production && currentPart && currentPart['imageUrl'] && 
            !currentPart['imageUrl'].includes('placeholder.png') &&
            !currentPart['imageUrl'].startsWith('data:image/')) {
          const oldImagePath = this.getFilePathFromUrl(currentPart['imageUrl']);
          if (oldImagePath) {
            await this.deleteImage(oldImagePath);
          }
        }
        
        // Fejlesztési környezetben Base64 kódolást használunk a CORS problémák megkerülésére
        if (!environment.production) {
          const imageBase64 = await this.convertToBase64(imageFile);
          part.imageUrl = imageBase64;
        } else {
          // Éles környezetben a normál feltöltést használjuk
          const imageUrl = await this.uploadImage(imageFile);
          part.imageUrl = imageUrl;
        }
      } catch (error) {
        console.error('Hiba a kép kezelésekor:', error);
        part.imageUrl = 'assets/images/placeholder.png';
      }
    }
    
    // Alkatrész frissítése a Firestore-ban
    return updateDoc(partDocRef, { ...part });
  }

  // Alkatrész törlése a képpel együtt
  async deletePartWithImage(id: string): Promise<void> {
    const partDocRef = doc(this.firestore, `parts/${id}`);
    
    try {
      // Aktuális alkatrész adatainak lekérése
      const docSnap = await getDoc(partDocRef);
      const currentPart = docSnap.data();
      
      // Ellenőrizzük, hogy van-e hozzá tartozó kép
      if (currentPart && currentPart['imageUrl']) {
        // Ha nem base64 kép és nem placeholder, csak akkor próbáljuk törölni
        if (!currentPart['imageUrl'].startsWith('data:image/') && 
            !currentPart['imageUrl'].includes('placeholder.png') &&
            environment.production) {
          // Tárolói hivatkozás lekérése az URL-ből
          const imagePath = this.getFilePathFromUrl(currentPart['imageUrl']);
          if (imagePath) {
            await this.deleteImage(imagePath);
          }
        }
      }
      
      // Alkatrész törlése a Firestore-ból
      return deleteDoc(partDocRef);
    } catch (error) {
      console.error('Hiba az alkatrész törlésekor:', error);
      throw error;
    }
  }

  // Kép feltöltése a Firebase Storage-ba
  private async uploadImage(file: File): Promise<string> {
    try {
      // Fájlnév tisztítása és egyedi azonosító hozzáadása
      const timestamp = new Date().getTime();
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `part-images/${timestamp}_${safeFileName}`;
      const storageRef = ref(this.storage, filePath);
      
      console.log('Kép feltöltés kezdése:', filePath);
      
      // Egyszerűsített feltöltés CORS problémák elkerülésére
      // Metaadatok eltávolítva, mert problémát okozhatnak
      const uploadTask = uploadBytesResumable(storageRef, file);
      
      // Promise-ként várjuk meg a feltöltés befejezését
      return new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            // Feltöltés állapotának követése
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            console.log('Feltöltés állapota: ' + progress.toFixed(2) + '% kész');
          },
          (error) => {
            // Hiba kezelése és visszaadása a placeholder image
            console.error('Hiba a kép feltöltésekor:', error);
            // Hibánál is adjunk vissza egy használható értéket, hogy ne akadjon meg a folyamat
            resolve('assets/images/placeholder.png');
          },
          () => {
            // Sikeres feltöltés után a letöltési URL lekérése
            getDownloadURL(uploadTask.snapshot.ref)
              .then(downloadURL => {
                console.log('Sikeres kép feltöltés, URL:', downloadURL);
                resolve(downloadURL);
              })
              .catch(urlError => {
                console.error('Hiba a letöltési URL lekérésekor:', urlError);
                // Ha a letöltési URL lekérése sikertelen, adjunk vissza placeholdert
                resolve('assets/images/placeholder.png');
              });
          }
        );
      });
    } catch (error) {
      console.error('Váratlan hiba a kép feltöltése során:', error);
      // Bármilyen hiba esetén adjunk vissza placeholder képet
      return 'assets/images/placeholder.png';
    }
  }

  // Kép törlése a Firebase Storage-ból
  private async deleteImage(filePath: string): Promise<void> {
    const storageRef = ref(this.storage, filePath);
    return deleteObject(storageRef);
  }

  // URL-ből a tárolási útvonal kinyerése
  private getFilePathFromUrl(url: string): string | null {
    try {
      // Útvonal kinyertése a letöltési URL-ből
      // Formátum: https://firebasestorage.googleapis.com/v0/b/[project-id].appspot.com/o/[path]?[token]
      const baseUrl = 'https://firebasestorage.googleapis.com/v0/b/';
      if (url.startsWith(baseUrl)) {
        const pathStart = url.indexOf('/o/') + 3;
        const pathEnd = url.indexOf('?', pathStart);
        if (pathStart > 0 && pathEnd > pathStart) {
          // URL-kódolt útvonal dekódolása
          return decodeURIComponent(url.substring(pathStart, pathEnd));
        }
      }
      return null;
    } catch (error) {
      console.error('Hiba az URL feldolgozásakor:', error);
      return null;
    }
  }

  // Base64 konvertáló segédfüggvény
  private convertToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        console.log('Sikeres Base64 konvertálás');
        resolve(result);
      };
      reader.onerror = (error) => {
        console.error('Hiba a Base64 konvertálás során:', error);
        reject('Hiba a kép feldolgozása során');
      };
    });
  }

  createPart(part: Part): Promise<any> {
    return addDoc(this.partsCollection, part);
  }

  updatePart(id: string, part: Partial<Part>): Promise<void> {
    const partDocRef = doc(this.firestore, `parts/${id}`);
    return updateDoc(partDocRef, { ...part });
  }

  deletePart(id: string): Promise<void> {
    const partDocRef = doc(this.firestore, `parts/${id}`);
    return deleteDoc(partDocRef);
  }
}