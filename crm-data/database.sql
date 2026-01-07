-- Drivebuddy CRM SQL Dump
-- Generated: 2026-01-07T06:23:16.989Z

CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, username TEXT, role TEXT, password TEXT, phone TEXT);
CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, licenseNumber TEXT, licenseExpiry TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS customers (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT);
CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, customerId TEXT, driverId TEXT, status TEXT, pickup TEXT, "drop" TEXT, dateTime TEXT, basePrice REAL, finalPrice REAL);

-- Users Data
INSERT OR REPLACE INTO users VALUES ('USR1767765448816', 'shravan', 'DRIVER', '2211', '');
INSERT OR REPLACE INTO users VALUES ('USR1767765820855', 'gopal', 'CUSTOMER', '1122', '6300665549');
INSERT OR REPLACE INTO users VALUES ('USR1767765865472', 'shravann', 'DRIVER', '1122', '9876543210');

-- Drivers Data
INSERT OR REPLACE INTO drivers VALUES ('USR1767765865472', 'shravann', '9876543210', 'PENDING_REGISTRATION', '2027-01-07', 'OFFLINE');

-- Customers Data

-- Trips Data
