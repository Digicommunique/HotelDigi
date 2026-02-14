
-- HOTEL SPHERE PRO: LIVE PRODUCTION SCHEMA
-- Run this in your Supabase SQL Editor to enable multi-device sync

-- 1. CORE OPERATIONS
CREATE TABLE IF NOT EXISTS rooms (id TEXT PRIMARY KEY, number TEXT, floor INT, block TEXT, type TEXT, price NUMERIC, status TEXT, "currentBookingId" TEXT);
CREATE TABLE IF NOT EXISTS guests (id TEXT PRIMARY KEY, name TEXT, phone TEXT, email TEXT, address TEXT, city TEXT, state TEXT, nationality TEXT, "idType" TEXT, "idNumber" TEXT, adults INT, children INT, kids INT, others INT, documents JSONB, gender TEXT, dob TEXT, "arrivalFrom" TEXT, "nextDestination" TEXT, "purposeOfVisit" TEXT, remarks TEXT);
CREATE TABLE IF NOT EXISTS bookings (id TEXT PRIMARY KEY, "bookingNo" TEXT, "roomId" TEXT, "guestId" TEXT, "groupId" TEXT, "checkInDate" TEXT, "checkInTime" TEXT, "checkOutDate" TEXT, "checkOutTime" TEXT, status TEXT, charges JSONB, payments JSONB, "basePrice" NUMERIC, discount NUMERIC, "mealPlan" TEXT, "mealRate" NUMERIC, "isVip" BOOLEAN, "isGstInclusive" BOOLEAN, agent TEXT, "secondaryGuest" JSONB, occupants JSONB);

-- 2. FINANCIALS & SETTINGS
CREATE TABLE IF NOT EXISTS transactions (id TEXT PRIMARY KEY, date TEXT, type TEXT, "accountGroup" TEXT, ledger TEXT, amount NUMERIC, "entityName" TEXT, description TEXT, "referenceId" TEXT);
CREATE TABLE IF NOT EXISTS groups (id TEXT PRIMARY KEY, "groupName" TEXT, phone TEXT, email TEXT, "headName" TEXT, status TEXT, "billingPreference" TEXT, "groupType" TEXT, "orgName" TEXT);
CREATE TABLE IF NOT EXISTS settings (
    id TEXT PRIMARY KEY, 
    name TEXT, 
    address TEXT, 
    agents JSONB, 
    "roomTypes" JSONB, 
    blocks JSONB, 
    "gstNumber" TEXT, 
    "taxRate" NUMERIC, 
    "cgstRate" NUMERIC, 
    "sgstRate" NUMERIC, 
    "igstRate" NUMERIC, 
    "hsnCode" TEXT, 
    "upiId" TEXT, 
    logo TEXT, 
    signature TEXT, 
    "mealPlanRates" JSONB, 
    "roomTypeRates" JSONB, 
    "wifiPassword" TEXT, 
    "receptionPhone" TEXT, 
    "roomServicePhone" TEXT, 
    "restaurantMenuLink" TEXT,
    packages JSONB -- Required for Facility module sync
);

-- 3. STAFF & LOGS
CREATE TABLE IF NOT EXISTS supervisors (id TEXT PRIMARY KEY, name TEXT, "loginId" TEXT UNIQUE, password TEXT, role TEXT, "assignedRoomIds" JSONB, status TEXT);
CREATE TABLE IF NOT EXISTS shiftlogs (id TEXT PRIMARY KEY, "bookingId" TEXT, "fromRoom" TEXT, "toRoom" TEXT, date TEXT, reason TEXT);
CREATE TABLE IF NOT EXISTS cleaninglogs (id TEXT PRIMARY KEY, "roomId" TEXT, date TEXT, "staffName" TEXT);
CREATE TABLE IF NOT EXISTS quotations (id TEXT PRIMARY KEY, date TEXT, "guestName" TEXT, amount NUMERIC, remarks TEXT);

-- 4. BANQUETS & CATERING
CREATE TABLE IF NOT EXISTS banquethalls (id TEXT PRIMARY KEY, name TEXT, capacity INT, "basePrice" NUMERIC, type TEXT);
CREATE TABLE IF NOT EXISTS eventbookings (id TEXT PRIMARY KEY, "hallId" TEXT, "guestName" TEXT, "guestPhone" TEXT, "eventName" TEXT, "eventType" TEXT, date TEXT, "startTime" TEXT, "endTime" TEXT, "totalAmount" NUMERIC, "advancePaid" NUMERIC, discount NUMERIC, "paymentMode" TEXT, status TEXT, catering JSONB, "guestCount" INT);
CREATE TABLE IF NOT EXISTS cateringmenu (id TEXT PRIMARY KEY, name TEXT, category TEXT, "pricePerPlate" NUMERIC, "prepInstructions" TEXT, ingredients JSONB);

-- 5. DINING & POS
CREATE TABLE IF NOT EXISTS restaurants (id TEXT PRIMARY KEY, name TEXT, type TEXT);
CREATE TABLE IF NOT EXISTS menuitems (id TEXT PRIMARY KEY, name TEXT, category TEXT, subcategory TEXT, price NUMERIC, "outletId" TEXT, "isAvailable" BOOLEAN, ingredients TEXT, "dietaryType" TEXT, "isVegan" BOOLEAN, "containsMilk" BOOLEAN);
CREATE TABLE IF NOT EXISTS diningtables (id TEXT PRIMARY KEY, number TEXT, "outletId" TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS kots (id TEXT PRIMARY KEY, "tableId" TEXT, "outletId" TEXT, "waiterId" TEXT, items JSONB, status TEXT, timestamp TEXT, "bookingId" TEXT, "paymentMethod" TEXT);
CREATE TABLE IF NOT EXISTS diningbills (id TEXT PRIMARY KEY, "billNo" TEXT UNIQUE, date TEXT, "outletId" TEXT, "tableNumber" TEXT, items JSONB, "subTotal" NUMERIC, "taxAmount" NUMERIC, "grandTotal" NUMERIC, "paymentMode" TEXT, "guestName" TEXT, "guestPhone" TEXT, "roomBookingId" TEXT);

-- 6. INVENTORY & VENDORS
CREATE TABLE IF NOT EXISTS inventory (id TEXT PRIMARY KEY, name TEXT, category TEXT, unit TEXT, "currentStock" NUMERIC, "minStockLevel" NUMERIC, "lastPurchasePrice" NUMERIC);
CREATE TABLE IF NOT EXISTS vendors (id TEXT PRIMARY KEY, name TEXT, contact TEXT, gstin TEXT, category TEXT);
CREATE TABLE IF NOT EXISTS stockreceipts (id TEXT PRIMARY KEY, date TEXT, "itemId" TEXT, "vendorId" TEXT, quantity NUMERIC, "unitPrice" NUMERIC, "totalAmount" NUMERIC, "paymentMade" NUMERIC, "paymentMode" TEXT, "billNumber" TEXT);

-- 7. FACILITIES & TRAVEL
CREATE TABLE IF NOT EXISTS facilityusage (id TEXT PRIMARY KEY, "facilityId" TEXT, "guestId" TEXT, "startTime" TEXT, "endTime" TEXT, amount NUMERIC, "isBilledToRoom" BOOLEAN, "outsiderInfo" JSONB, items JSONB);
CREATE TABLE IF NOT EXISTS travelbookings (id TEXT PRIMARY KEY, "guestId" TEXT, "guestName" TEXT, vehicleType TEXT, vehicleNumber TEXT, driverName TEXT, pickupLocation TEXT, dropLocation TEXT, date TEXT, time TEXT, "kmUsed" NUMERIC, "daysOfTravelling" INT, amount NUMERIC, status TEXT, "roomBookingId" TEXT);

-- 8. GLOBAL ACCESS PERMISSIONS
DO $$ 
DECLARE 
    tbl RECORD;
BEGIN 
    FOR tbl IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') 
    LOOP 
        EXECUTE 'ALTER TABLE public.' || quote_ident(tbl.tablename) || ' DISABLE ROW LEVEL SECURITY';
        EXECUTE 'GRANT ALL ON TABLE public.' || quote_ident(tbl.tablename) || ' TO anon, authenticated, service_role';
    END LOOP;
END $$;

-- 9. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
