import { Component, OnInit, inject, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PartService } from '../../services/part.service';
import { Part } from '../../models/part.model';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Location } from '@angular/common';

@Component({
  standalone: true,
  selector: 'app-part-form',
  templateUrl: './part-form.component.html',
  styleUrls: ['./part-form.component.scss'],
  imports: [CommonModule, MaterialModule, ReactiveFormsModule, RouterModule]
})
export class PartFormComponent implements OnInit {
  private route: ActivatedRoute = inject(ActivatedRoute);
  private router: Router = inject(Router);
  private partService: PartService = inject(PartService);
  private snackBar: MatSnackBar = inject(MatSnackBar);
  private location: Location = inject(Location); // Location szolgáltatás injektálása

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  partForm = new FormGroup({
    name: new FormControl('', Validators.required),
    category: new FormControl('', Validators.required),
    brand: new FormControl('', Validators.required), // Új márka mező hozzáadva
    price: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
    description: new FormControl('')
  });

  // Népszerű márka lista a könnyebb választáshoz
  popularBrands: string[] = ['Bosch', 'Valeo', 'Continental', 'Febi Bilstein', 'ATE', 'Castrol', 
                            'Hella', 'Mann-Filter', 'NGK', 'Sachs', 'SKF', 'ZF'];

  isEditMode = false;
  partId: string | null = null;
  loading = false;
  
  // Kép kezeléshez szükséges mezők
  imageFile: File | null = null;
  imagePreview: string | null = null;
  originalImageUrl: string | null = null;
  imageDeleted: boolean = false; // Új flag a törlés jelölésére

  ngOnInit(): void {
    // Ellenőrizzük, hogy van-e ID paraméter, ha igen, akkor szerkesztés módban vagyunk
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.isEditMode = true;
        this.partId = id;
        this.loadPart(id);
      }
    });
  }

  loadPart(id: string): void {
    this.loading = true;
    this.partService.getPartById(id).subscribe({
      next: (part) => {
        if (part) {
          // Alkatrész betöltése a formba
          this.partForm.patchValue({
            name: part.name,
            category: part.category,
            brand: part.brand, // Márka mező betöltése
            price: part.price,
            description: part.description
          });
          
          // Kép URL mentése, ha van
          if (part.imageUrl) {
            this.imagePreview = part.imageUrl;
            this.originalImageUrl = part.imageUrl;
          }
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Hiba az alkatrész betöltésekor:', error);
        this.loading = false;
      }
    });
  }

  onSubmit() {
    if (this.partForm.invalid) return;

    const formValue = this.partForm.value;
    const part: Part = {
      name: formValue.name || '',
      category: formValue.category || '',
      brand: formValue.brand || '', // Márka mező értékének átadása
      price: formValue.price || 0,
      description: formValue.description || ''
    };

    // Ha a kép törlésre került, jelezzük ezt
    if (this.imageDeleted) {
      part.imageUrl = undefined;
    } else if (this.originalImageUrl && !this.imageFile) {
      // Megtartjuk az eredeti képet, ha nem került új kép feltöltésre és nem is törölték
      part.imageUrl = this.originalImageUrl;
    }

    this.loading = true;

    // Maximális várakozási idő beállítása (10 másodperc)
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Időtúllépés a kép feltöltése során'));
      }, 10000); // 10 másodperc időtúllépés
    });

    try {
      if (this.isEditMode && this.partId) {
        // Meglévő alkatrész frissítése
        Promise.race([
          this.partService.updatePartWithImage(this.partId, part, this.imageFile || undefined, this.imageDeleted),
          timeoutPromise
        ])
          .then(() => {
            this.snackBar.open('Alkatrész sikeresen frissítve', 'Bezárás', { duration: 3000 });
            this.router.navigate(['/parts', this.partId]);
          })
          .catch(error => {
            console.error('Hiba az alkatrész frissítésekor:', error);
            this.snackBar.open('Hiba történt a mentés során - a kép feltöltése sikertelen, de az adatok mentve lettek', 'Bezárás', { duration: 3000 });
            this.router.navigate(['/parts', this.partId]);
          })
          .finally(() => {
            this.loading = false;
          });
      } else {
        // Új alkatrész létrehozása
        Promise.race([
          this.partService.createPartWithImage(part, this.imageFile || undefined),
          timeoutPromise
        ])
          .then(id => {
            this.snackBar.open('Új alkatrész sikeresen létrehozva', 'Bezárás', { duration: 3000 });
            this.router.navigate(['/parts', id]);
          })
          .catch(error => {
            console.error('Hiba az alkatrész létrehozásakor:', error);
            this.snackBar.open('Hiba történt a létrehozás során - a kép feltöltése sikertelen, de próbáld meg újra később', 'Bezárás', { duration: 4000 });
            this.loading = false;
          });
      }
    } catch (error) {
      console.error('Váratlan hiba a művelet során:', error);
      this.snackBar.open('Váratlan hiba történt a mentés során', 'Bezárás', { duration: 3000 });
      this.loading = false;
    }
  }

  // Kép kiválasztáskor
  onImageSelected(event: Event): void {
    const fileInput = event.target as HTMLInputElement;
    
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];
      
      // Ellenőrizzük, hogy valóban kép fájl-e
      if (!file.type.startsWith('image/')) {
        this.snackBar.open('Csak képfájlt lehet feltölteni!', 'Bezárás', { duration: 3000 });
        return;
      }
      
      // Ellenőrizzük a fájl méretét (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.snackBar.open('A kép mérete nem lehet nagyobb, mint 5MB!', 'Bezárás', { duration: 3000 });
        return;
      }
      
      this.imageFile = file;
      this.imageDeleted = false; // Ha új képet választunk, töröljük a törlés jelzést
      
      // Kép előnézet létrehozása
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }
  
  // Kép eltávolítása
  removeImage(): void {
    this.imageFile = null;
    this.imagePreview = null;
    this.imageDeleted = true; // Jelöljük, hogy a képet törölni szeretnénk
    
    // Ha szerkesztés módban vagyunk és volt eredeti kép URL, akkor azt is töröljük
    if (this.isEditMode && this.originalImageUrl) {
      this.originalImageUrl = null;
    }

    // Reset the file input element
    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // Ellenőrzi, hogy a megjelenített kép a placeholder-e
  isPlaceholderImage(): boolean {
    // Ha nincs kép előnézet, vagy a kép URL-je tartalmazza a "placeholder" szót
    return !this.imagePreview || 
           (typeof this.imagePreview === 'string' && this.imagePreview.includes('placeholder.png'));
  }

  // Visszalépés az előző oldalra
  goBack(): void {
    this.location.back();
  }
}