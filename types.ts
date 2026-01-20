
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

export type TripStatus = 'unassigned' | 'assigned' | 'started' | 'completed' | 'cancelled';
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
  displayId: string; // Business ID like DBDY-HYD-001
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  mobile?: string;
  address?: string;
}

export interface Driver {
  id: string; // Internal UUID
  displayId: string; // Business ID like DBDY-HYD-DR-001
  name: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  address: string;
  permanentAddress: string;
  profilePhoto?: string;
  status: 'available' | 'busy' | 'inactive';
  location: [number, number];
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  homeAddress: string;
  officeAddress: string;
  vehicleModel: string;
}

export interface Trip {
  id: string; // Internal UUID
  displayId: string; // Business ID like TRIP-4501
  customerId: string;
  driverId?: string;
  pickupLocation: string;
  dropLocation: string;
  tripType: 'one-way' | 'round-trip';
  startDateTime: string;
  endDateTime: string;
  status: TripStatus;
  cancelReason?: string;
  billAmount?: number;
  // Added missing properties to satisfy DriverDashboard usage
  startSelfie?: string;
  endSelfie?: string;
  paymentStatus?: PaymentStatus;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: number;
  read: boolean;
}