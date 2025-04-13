import { CartItem } from './cart-item.model';

export interface Order {
    id?: string;
    userId: string;
    userName: string;
    items: CartItem[];
    totalAmount: number;
    status: OrderStatus;
    createdAt: Date;
    updatedAt: Date;
    shippingAddress?: ShippingAddress;
}

export interface ShippingAddress {
    fullName: string;
    address: string;
    city: string;
    postalCode: string;
    phoneNumber?: string;
}

export enum OrderStatus {
    PENDING = 'pending',
    PROCESSING = 'processing',
    SHIPPED = 'shipped',
    DELIVERED = 'delivered',
    CANCELLED = 'cancelled'
}