
import { User, UserRole, Driver, Customer, Trip } from '../types.ts';

export const mockUsers: User[] = [
  { id: '1', username: 'admin', password: 'password', role: UserRole.ADMIN, name: 'Main Admin', mobile: '+91 99999 99999', address: 'Drivebuddy HQ, Bangalore' },
  { id: '2', username: 'ops1', password: 'password', role: UserRole.OPS_MANAGER, name: 'Suresh Kumar', mobile: '+91 88888 88888' },
  { id: '3', username: 'fin1', password: 'password', role: UserRole.FINANCE, name: 'Megha Singh', mobile: '+91 77777 77777' },
  { id: '4', username: 'Rajesh Driver', password: 'password', role: UserRole.DRIVER, name: 'Rajesh Khanna', mobile: '+91 66666 66666' },
];

export const mockDrivers: Driver[] = [
  {
    id: 'DRV-101',
    name: 'Rajesh Khanna',
    licenseNumber: 'DL-1420210012345',
    issueDate: '2021-01-15',
    expiryDate: '2025-04-10', // Near expiry
    address: 'H-23, Lajpat Nagar, New Delhi',
    permanentAddress: 'Village Mohana, Haryana',
    status: 'available',
    location: [12.9716, 77.5946]
  },
  {
    id: 'DRV-102',
    name: 'Vikram Singh',
    licenseNumber: 'KA-0120220098765',
    issueDate: '2022-03-20',
    expiryDate: '2032-03-20',
    address: 'Flat 402, Lotus Apts, Bangalore',
    permanentAddress: 'Jodhpur, Rajasthan',
    status: 'available',
    location: [12.9352, 77.6245]
  },
  {
    id: 'DRV-103',
    name: 'Amit Patel',
    licenseNumber: 'GJ-0520230044556',
    issueDate: '2023-05-10',
    expiryDate: '2033-05-10',
    address: 'Sector 4, HSR Layout, Bangalore',
    permanentAddress: 'Ahmedabad, Gujarat',
    status: 'busy',
    location: [12.9141, 77.6412]
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'CUST-001',
    name: 'Animesh Basak',
    mobile: '+91 98765 43210',
    homeAddress: 'Prestige Shantiniketan, Whitefield',
    officeAddress: 'Bagmane Tech Park, CV Raman Nagar',
    vehicleModel: 'Tata Harrier (Dark Edition)'
  },
  {
    id: 'CUST-002',
    name: 'Priya Sharma',
    mobile: '+91 88776 65544',
    homeAddress: 'Indiranagar 100ft Road',
    officeAddress: 'Embassy Golf Links, Domlur',
    vehicleModel: 'BMW 3 Series'
  }
];

export const mockTrips: Trip[] = [
  {
    id: 'TRIP-4501',
    customerId: 'CUST-001',
    driverId: 'DRV-101',
    pickupLocation: 'Whitefield',
    dropLocation: 'Bangalore Airport',
    tripType: 'one-way',
    startDateTime: '2023-11-20T10:00',
    endDateTime: '2023-11-20T11:30',
    status: 'completed',
    billAmount: 1200
  },
  {
    id: 'TRIP-4502',
    customerId: 'CUST-002',
    pickupLocation: 'Indiranagar',
    dropLocation: 'Mysore Road',
    tripType: 'one-way',
    startDateTime: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    endDateTime: '',
    status: 'unassigned'
  }
];
