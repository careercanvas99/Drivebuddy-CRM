
import { User, UserRole, Driver, Customer, Trip } from '../types.ts';

export const mockUsers: User[] = [
  { id: '1', displayId: 'DBDY-HYD-001', username: 'admin', password: 'password', role: UserRole.ADMIN, name: 'Main Admin', mobile: '+91 99999 99999', address: 'Drivebuddy HQ, Bangalore', status: 'Active' },
  { id: '2', displayId: 'DBDY-HYD-002', username: 'ops1', password: 'password', role: UserRole.OPS_MANAGER, name: 'Suresh Kumar', mobile: '+91 88888 88888', status: 'Active' },
  { id: '3', displayId: 'DBDY-HYD-003', username: 'fin1', password: 'password', role: UserRole.FINANCE, name: 'Megha Singh', mobile: '+91 77777 77777', status: 'Active' },
  { id: '4', displayId: 'DBDY-HYD-DR-004', username: 'Rajesh Driver', password: 'password', role: UserRole.DRIVER, name: 'Rajesh Khanna', mobile: '+91 66666 66666', status: 'Active' },
  // Gopal's Verified Login Credentials (V46)
  { 
    id: '6', 
    displayId: 'DBDY-HYD-CUST-006', 
    username: '9876543210', 
    password: 'Gopal@123', 
    role: UserRole.CUSTOMER, 
    name: 'Gopal', 
    mobile: '9876543210', 
    status: 'Active' 
  },
];

export const mockDrivers: Driver[] = [
  {
    id: 'DRV-101',
    displayId: 'DBDY-HYD-DR-101',
    name: 'Rajesh Khanna',
    licenseNumber: 'DL-1420210012345',
    issueDate: '2021-01-15',
    expiryDate: '2025-04-10',
    address: 'H-23, Lajpat Nagar, New Delhi',
    permanentAddress: 'Village Mohana, Haryana',
    status: 'Available',
    location: [12.9716, 77.5946]
  },
  {
    id: 'DRV-102',
    displayId: 'DBDY-HYD-DR-102',
    name: 'Vikram Singh',
    licenseNumber: 'KA-0120220098765',
    issueDate: '2022-03-20',
    expiryDate: '2032-03-20',
    address: 'Flat 402, Lotus Apts, Bangalore',
    permanentAddress: 'Jodhpur, Rajasthan',
    status: 'Available',
    location: [12.9352, 77.6245]
  }
];

export const mockCustomers: Customer[] = [
  {
    id: 'CUST-001',
    displayId: 'CUST-001',
    name: 'Animesh Basak',
    mobile: '+91 98765 43210',
    homeAddress: 'Prestige Shantiniketan, Whitefield',
    officeAddress: 'Bagmane Tech Park, CV Raman Nagar',
    vehicleModel: 'Tata Harrier (Dark Edition)'
  },
  {
    id: 'CUST-003',
    displayId: 'CUST-003',
    name: 'Gopal',
    mobile: '9876543210',
    homeAddress: 'Jubilee Hills, Hyderabad',
    officeAddress: 'Cyber Towers, HITEC City',
    vehicleModel: 'Toyota Fortuner'
  }
];

export const mockTrips: Trip[] = [
  {
    id: 'TRIP-4501',
    displayId: 'TRIP-4501',
    customerId: 'CUST-001',
    driverId: 'DRV-101',
    pickupLocation: 'Whitefield',
    dropLocation: 'Bangalore Airport',
    tripType: 'one-way',
    tripRoute: 'Instation',
    startDateTime: '2023-11-20T10:00',
    endDateTime: '2023-11-20T11:30',
    status: 'COMPLETED',
    billAmount: 1200
  }
];
