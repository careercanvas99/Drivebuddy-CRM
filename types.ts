
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

export interface GitHubConfig {
  repository: string; // owner/repo
  branch: string;
  filePath: string;
  token: string;
  lastSync?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  lastSync?: string;
}

export interface CompanySettings {
  name: string;
  address: string;
  mobile: string;
  logo?: string;
  githubConfig?: GitHubConfig;
  supabaseConfig?: SupabaseConfig;
  dbProvider: 'none' | 'github' | 'supabase';
}

export interface User {
  id: string;
  username: string;
  password?: string;
  role: UserRole;
  name: string;
  mobile?: string;
  address?: string;
}

export interface Driver {
  id: string;
  name: string;
  licenseNumber: string;
  issueDate: string;
  expiryDate: string;
  address: string;
  permanentAddress: string;
  profilePhoto?: string;
  qrCode?: string;
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
  id: string;
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
  startSelfie?: string;
  endSelfie?: string;
  paymentStatus?: PaymentStatus;
  paymentMode?: PaymentMode;
  baseFare?: number;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  time: number;
  read: boolean;
}
