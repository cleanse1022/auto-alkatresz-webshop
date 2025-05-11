import { Component, OnInit, inject, ChangeDetectionStrategy, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { RouterModule } from '@angular/router';
import { CompareService } from '../../services/compare.service';
import { Part } from '../../models/part.model';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';
import { MatDialog, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-part-compare',
  standalone: true,
  imports: [CommonModule, MaterialModule, RouterModule, HungarianCurrencyPipe],
  templateUrl: './part-compare.component.html',
  styleUrls: ['./part-compare.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartCompareComponent implements OnInit {
  private compareService = inject(CompareService);
  private dialog = inject(MatDialog);

  // A hasonlított termékek adatfolyama
  compareItems$ = this.compareService.compareItems$;
  
  constructor() {}
  
  ngOnInit(): void {
    // Inicializálás esetleg betöltési logika
  }
  
  /**
   * Alkatrész eltávolítása az összehasonlító listáról
   */
  removeFromCompare(partId: string): void {
    this.compareService.removeFromCompare(partId);
  }
  
  /**
   * Összes alkatrész eltávolítása az összehasonlításból
   */
  clearCompare(): void {
    this.compareService.clearCompare();
  }
  
  /**
   * Összehasonlító modalablak megnyitása
   */
  openCompareDialog(): void {
    const dialogRef = this.dialog.open(PartCompareDialogComponent, {
      width: '90%',
      maxWidth: '1200px',
      data: { items: this.compareService.getCompareItems() }
    });
  }
}

// Összehasonlító dialógus komponens az összehasonlító nézethez
@Component({
  selector: 'app-part-compare-dialog',
  standalone: true,
  imports: [CommonModule, MaterialModule, HungarianCurrencyPipe],
  template: `
    <h2 mat-dialog-title>Alkatrészek összehasonlítása</h2>
    <div mat-dialog-content>
      <div class="comparison-container">
        <table class="comparison-table">
          <tr>
            <th>Tulajdonság</th>
            <th *ngFor="let item of data.items">{{ item.name }}</th>
          </tr>
          <tr>
            <td>Kategória</td>
            <td *ngFor="let item of data.items">{{ item.category }}</td>
          </tr>
          <tr>
            <td>Márka</td>
            <td *ngFor="let item of data.items">{{ item.brand }}</td>
          </tr>
          <tr>
            <td>Ár</td>
            <td *ngFor="let item of data.items">{{ item.price | hungarianCurrency }}</td>
          </tr>
          <tr>
            <td>Leírás</td>
            <td *ngFor="let item of data.items">{{ item.description || 'Nincs leírás' }}</td>
          </tr>
          <tr>
            <td>Kép</td>
            <td *ngFor="let item of data.items">
              <img *ngIf="item.imageUrl" [src]="item.imageUrl" [alt]="item.name" class="comparison-image">
              <span *ngIf="!item.imageUrl">Nincs kép</span>
            </td>
          </tr>
        </table>
      </div>
    </div>
    <div mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Bezárás</button>
    </div>
  `,
  styles: [`
    .comparison-container {
      overflow-x: auto;
      max-width: 100%;
    }
    
    .comparison-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .comparison-table th, .comparison-table td {
      padding: 12px;
      text-align: center;
      border: 1px solid var(--border-color);
    }
    
    .comparison-table th {
      background-color: var(--primary-color);
      color: var(--text-on-primary);
    }
    
    .comparison-table tr:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.03);
    }
    
    .comparison-image {
      max-width: 150px;
      max-height: 150px;
      object-fit: contain;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PartCompareDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: { items: Part[] }) {}
}
