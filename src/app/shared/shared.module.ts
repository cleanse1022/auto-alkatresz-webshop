import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HungarianCurrencyPipe } from '../pipes/hungarian-currency.pipe';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    HungarianCurrencyPipe
  ],
  exports: [
    HungarianCurrencyPipe
  ]
})
export class SharedModule { }
