
import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  Car, 
  MapPin, 
  CreditCard, 
  Bell, 
  LogOut, 
  Plus, 
  History, 
  FileText,
  User as UserIcon,
  Eye,
  Edit,
  Trash,
  CheckCircle,
  XCircle,
  Camera
} from 'lucide-react';

export const COLORS = {
  primary: '#9333ea', // purple-600
  secondary: '#7e22ce', // purple-700
  dark: '#000000',
  card: '#111827', // gray-900
};

export const ICONS = {
  Dashboard: <LayoutDashboard size={20} />,
  Users: <Users size={20} />,
  Drivers: <Car size={20} />,
  Trips: <MapPin size={20} />,
  Finance: <CreditCard size={20} />,
  Notifications: <Bell size={20} />,
  Logout: <LogOut size={20} />,
  Plus: <Plus size={20} />,
  History: <History size={20} />,
  Reports: <FileText size={20} />,
  Profile: <UserIcon size={20} />,
  View: <Eye size={16} />,
  Edit: <Edit size={16} />,
  Delete: <Trash size={16} />,
  Check: <CheckCircle size={16} />,
  Cancel: <XCircle size={16} />,
  Camera: <Camera size={16} />
};
