import { NgModule } from '@angular/core';

// Navigáció
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatMenuModule } from '@angular/material/menu';

// Elrendezés
import { MatGridListModule } from '@angular/material/grid-list';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatListModule } from '@angular/material/list';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTabsModule } from '@angular/material/tabs';

// Űrlap elemek
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRadioModule } from '@angular/material/radio';
import { MatSliderModule } from '@angular/material/slider';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

// Adattáblázat
import { MatTableModule } from '@angular/material/table';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';

// Felugró ablakok és Modális dialógusok
import { MatDialogModule } from '@angular/material/dialog';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

// Indikátorok
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressBarModule } from '@angular/material/progress-bar';

@NgModule({
    exports: [
        // Navigáció
        MatToolbarModule,
        MatSidenavModule,
        MatMenuModule,
        
        // Elrendezés
        MatGridListModule,
        MatCardModule,
        MatDividerModule,
        MatListModule,
        MatExpansionModule,
        MatTabsModule,
        
        // Űrlap elemek
        MatButtonModule,
        MatIconModule,
        MatInputModule,
        MatFormFieldModule,
        MatSelectModule,
        MatCheckboxModule,
        MatRadioModule,
        MatSliderModule,
        MatAutocompleteModule,
        
        // Adattáblázat
        MatTableModule,
        MatSortModule,
        MatPaginatorModule,
        
        // Felugró ablakok és Modális dialógusok
        MatDialogModule,
        MatSnackBarModule,
        MatTooltipModule,
        
        // Indikátorok
        MatBadgeModule,
        MatChipsModule,
        MatProgressSpinnerModule,
        MatProgressBarModule
    ]
})
export class MaterialModule {}