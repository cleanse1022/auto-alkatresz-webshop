import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MaterialModule } from '../../material.module';
import { RouterModule } from '@angular/router';
import { HungarianCurrencyPipe } from '../../pipes/hungarian-currency.pipe';

interface OrderItem {
  name: string;
  price: number;
}

interface Order {
  id: string;
  date: Date;
  total: number;
  status: string;
  items?: OrderItem[];
}

@Component({
  standalone: true,
  selector: 'app-orders-list',
  templateUrl: './orders-list.component.html',
  styleUrls: ['./orders-list.component.scss'],
  imports: [CommonModule, MaterialModule, RouterModule, HungarianCurrencyPipe]
})
export class OrdersListComponent {
  orders: Order[] = [
    { 
      id: '1', 
      date: new Date(), 
      total: 15990, 
      status: 'Feldolgozás alatt',
      items: [
        { name: 'Olajszűrő', price: 5990 },
        { name: 'Légszűrő', price: 10000 }
      ]
    },
    { 
      id: '2', 
      date: new Date(Date.now() - 86400000), // tegnapi dátum
      total: 24990, 
      status: 'Szállítás alatt',
      items: [
        { name: 'Fékbetét', price: 12990 },
        { name: 'Féktárcsa', price: 12000 }
      ]
    }
  ];
}