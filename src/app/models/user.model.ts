export interface User {
  uid: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  role: 'admin' | 'user';
}