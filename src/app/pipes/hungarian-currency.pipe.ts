import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'hungarianCurrency',
  standalone: true
})
export class HungarianCurrencyPipe implements PipeTransform {
  transform(value: number | string): string {
    if (value === null || value === undefined) {
      return '';
    }
    
    // Convert to number if string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    
    // Format with thousand separator and ensure it's fixed to 0 decimal places
    // Then append the Ft currency symbol
    return numValue.toLocaleString('hu-HU', { 
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }) + ' Ft';
  }
}
