
export enum UserRole {
  ADMIN = 'Admin',
  OPS_MANAGER = 'Ops-Manager',
  DRIVER_PARTNER_MANAGER = 'Driver Partner Manager',
  FINANCE = 'Finance',
  OPERATION_EXECUTIVE = 'Operation Executive',
  DRIVER_HIRING_TEAM = 'Driver Hiring Team (DHT)',
  DRIVER = 'Driver',
  CUSTOMER = 'Customer'
}

export type TripStatus = 'NEW' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'pending' | 'collected' | 'settled';
export type PaymentMode = 'cash' | 'online' | 'unpaid';

export interface CompanySettings {
  name: string;
  address: string;
  mobile: string;
  logo?: string;
  dbProvider: 'none' | 'github' | 'supabase';
}

export interface User {
  id: string; // Internal UUID
  displayId: string; // Business ID: DBDY-HYD-XXX
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  mobile?: string;
  address?: string;
  status: 'Active' | 'Disabled';
}

export interface Driver {
  id: string; // Internal UUID
  displayId: string; // Business ID: DBDY-HYD-DR-XXX
  name: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  address: string;
  permanentAddress: string;
  profilePhoto?: string;
  status: 'Available' | 'Busy' | 'Inactive';
  location: [number, number];
}

export interface Customer {
  id: string; // Internal UUID
  displayId: string; // Business ID: CUST-XXXX
  name: string;
  mobile: string;
  homeAddress: string;
  officeAddress: string;
  vehicleModel: string;
}

export interface Trip {
  id: string; // Internal UUID
  displayId: string; // Business ID: TRIP-XXXX
  customerId: string;
  driverId?: string;
  pickupLocation: string;
  dropLocation: string;
  tripType: 'one-way' | 'round-trip';
  tripRoute: 'Instation' | 'Outstation';
  startDateTime: string;
  endDateTime: string;
  status: TripStatus;
  cancelReason?: string;
  billAmount?: number;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: number;
  read: boolean;
}
