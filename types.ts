
export enum UserRole {
  ADMIN = 'ADMIN',
  OPERATIONS = 'OPERATIONS',
  FINANCE = 'FINANCE',
  MANAGER = 'MANAGER',
  DRIVER = 'DRIVER',
  CUSTOMER = 'CUSTOMER'
}

export interface StorageConfig {
  owner: string;
  repo: string;
  branch: string;
  folderPath: string;
  token: string;
  isConnected: boolean;
}

export interface SelfieData {
  imageBase64: string;
  date: string;
  time: string;
  location: string;
}

export interface Trip {
  id: string;
  customerId: string;
  driverId?: string;
  status: 'PENDING' | 'ASSIGNED' | 'STARTED' | 'COMPLETED' | 'CANCELLED';
  pickup: string;
  drop: string;
  dateTime: string;
  basePrice?: number;
  finalPrice?: number;
  cancelReason?: string;
  startSelfie?: SelfieData;
  endSelfie?: SelfieData;
  logs: TripLog[];
}

export interface TripLog {
  timestamp: string;
  user: string;
  action: string;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  status: 'AVAILABLE' | 'ON_TRIP' | 'OFFLINE';
  currentLocation?: { lat: number; lng: number };
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
  phone?: string;
}

export interface AppData {
  users: User[];
  drivers: Driver[];
  customers: Customer[];
  trips: Trip[];
  notifications: AppNotification[];
}

export interface AppNotification {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
}
