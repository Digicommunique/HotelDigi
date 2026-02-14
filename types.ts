
export enum RoomStatus {
  VACANT = 'VACANT',
  OCCUPIED = 'OCCUPIED',
  RESERVED = 'RESERVED',
  DIRTY = 'DIRTY',
  REPAIR = 'REPAIR',
  MANAGEMENT = 'MANAGEMENT',
  STAFF_BLOCK = 'STAFF_BLOCK'
}

export enum RoomType {
  DELUXE = 'DELUXE ROOM',
  BUDGET = 'BUDGET ROOM',
  STANDARD = 'STANDARD ROOM',
  AC_FAMILY = 'AC FAMILY ROOM',
  SUITE = 'SUITE'
}

export type UserRole = 'SUPERADMIN' | 'ADMIN' | 'MANAGER' | 'RECEPTIONIST' | 'ACCOUNTANT' | 'SUPERVISOR' | 'WAITER' | 'CHEF' | 'STOREKEEPER';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  password?: string;
}

export interface Supervisor {
  id: string;
  name: string;
  loginId: string;
  password?: string;
  role: UserRole;
  assignedRoomIds: string[];
  status: 'ACTIVE' | 'INACTIVE';
  lastActive?: string;
}

export interface Occupant {
  id: string;
  name: string;
  gender: 'Male' | 'Female' | 'Other';
  idFront?: string;
  idBack?: string;
}

export interface Guest {
  id: string;
  name: string; 
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  nationality: string;
  idType: 'Aadhar' | 'Passport' | 'PAN' | 'VoterId' | 'License' | 'Other';
  idNumber: string;
  adults: number;
  children: number;
  kids: number;
  others: number;
  documents: any;
  gender?: 'Male' | 'Female' | 'Other';
  arrivalFrom?: string;
  nextDestination?: string;
  purposeOfVisit?: string;
  remarks?: string;
  dob?: string;
  // Added properties for GRC and Identity
  surName?: string;
  givenName?: string;
  country?: string;
  // Fixed: Added missing properties for GRCFormView.tsx and full schema alignment
  passportNo?: string;
  passportPlaceOfIssue?: string;
  passportDateOfIssue?: string;
  passportDateOfExpiry?: string;
  visaNo?: string;
  visaType?: string;
  visaPlaceOfIssue?: string;
  visaDateOfIssue?: string;
  visaDateOfExpiry?: string;
  embassyCountry?: string;
  arrivalInIndiaDate?: string;
  stayDurationIndia?: string;
  employedInIndia?: boolean;
  contactInIndia?: string;
  cellInIndia?: string;
  residingCountryContact?: string;
  addressInIndia?: string;
  applicationId?: string;
}

export interface Booking {
  id: string;
  bookingNo: string;
  roomId: string;
  guestId: string;
  groupId?: string; 
  checkInDate: string;
  checkInTime: string;
  checkOutDate: string;
  checkOutTime: string;
  status: 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'RESERVED';
  charges: Charge[];
  payments: Payment[];
  basePrice: number;
  discount: number;
  mealPlan?: string;
  mealRate?: number;
  isVip?: boolean;
  isGstInclusive?: boolean;
  secondaryGuest?: any;
  occupants?: Occupant[];
  arrivalFrom?: string;
  nextDestination?: string;
  purposeOfVisit?: string;
  agent?: string;
}

export interface Room {
  id: string;
  number: string;
  floor: number;
  block?: string;
  type: string;
  price: number;
  status: RoomStatus;
  currentBookingId?: string;
}

export interface Charge {
  id: string;
  description: string;
  amount: number;
  date: string;
}

export interface Payment {
  id: string;
  amount: number;
  date: string;
  method: string;
  remarks: string;
}

export type TransactionType = 'RECEIPT' | 'PAYMENT' | 'JOURNAL';

export type AccountGroupName = 
  | 'Capital' 
  | 'Fixed Asset' 
  | 'Current Asset' 
  | 'Direct Expense' 
  | 'Indirect Expense' 
  | 'Direct Income' 
  | 'Indirect Income' 
  | 'Current Liability' 
  | 'Operating';

export interface Transaction {
  id: string;
  date: string;
  type: TransactionType;
  accountGroup: AccountGroupName;
  ledger: string;
  amount: number;
  entityName?: string;
  description: string;
  referenceId?: string;
}

export interface AgentConfig {
  name: string;
  commission: number;
}

export interface RoomTypeRate {
  single: number;
  double: number;
}

export interface HostelSettings {
  name: string;
  address: string;
  agents: AgentConfig[];
  roomTypes: string[];
  roomTypeRates?: Record<string, RoomTypeRate>;
  mealPlanRates?: Record<string, number>;
  blocks?: string[];
  gstNumber?: string;
  taxRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  hsnCode?: string;
  upiId?: string;
  logo?: string;
  signature?: string;
  wifiPassword?: string;
  receptionPhone?: string;
  roomServicePhone?: string;
  restaurantMenuLink?: string;
  // Added password fields for SuperAdminPanel
  adminPassword?: string;
  receptionistPassword?: string;
  accountantPassword?: string;
  supervisorPassword?: string;
}

export interface GroupProfile {
  id: string;
  groupName: string;
  phone: string;
  email: string;
  headName: string;
  status: string;
  billingPreference: string;
  groupType?: string;
  orgName?: string;
}

export interface BanquetHall { id: string; name: string; capacity: number; basePrice: number; type: 'HALL' | 'LAWN'; }

export type EventType = 'Wedding' | 'Corporate' | 'Social' | 'Other';

export interface EventCateringItem {
  itemId: string;
  name: string;
  qty: number;
  price: number;
}

export interface EventCatering {
  items: EventCateringItem[];
  plateCount: number;
  totalCateringCharge: number;
}

export interface EventBooking { 
  id: string; 
  hallId: string; 
  guestName: string; 
  eventName: string; 
  date: string; 
  totalAmount: number; 
  status: string; 
  catering?: EventCatering; 
  guestCount: number; 
  guestPhone?: string;
  eventType?: EventType;
  startTime?: string;
  endTime?: string;
  advancePaid?: number;
  discount?: number;
  paymentMode?: string;
}

export interface CateringIngredient {
  name: string;
  qtyPerPlate: number;
  unit: string;
}

export interface CateringItem { 
  id: string; 
  name: string; 
  category: string; 
  pricePerPlate: number; 
  ingredients?: CateringIngredient[]; 
}

export interface DiningBill { 
  id: string; 
  billNo: string; 
  date: string; 
  guestName: string; 
  tableNumber: string; 
  grandTotal: number; 
  subTotal?: number; 
  taxAmount?: number; 
  items?: any[]; 
  roomBookingId?: string; 
  guestPhone?: string; 
  // Added properties for DiningModule
  outletId?: string;
  paymentMode?: string;
}

export type Facility = 'GYM' | 'POOL' | 'LAUNDRY';

export interface FacilityUsage { 
  id: string; 
  facilityId: string; 
  guestId: string; 
  startTime: string; 
  amount: number; 
  isBilledToRoom: boolean;
  // Added properties for FacilityModule
  items?: any[];
  outsiderInfo?: {
    name: string;
    phone: string;
    email?: string;
  };
}

export interface Quotation { id: string; }
export interface RoomShiftLog { id: string; }
export interface CleaningLog { id: string; }

// Added POS and Restaurant types
export type DietaryType = 'VEG' | 'NON-VEG' | 'EGG';

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  price: number;
  dietaryType: DietaryType;
  isAvailable: boolean;
  outletId: string;
}

export interface KOTItem {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

export interface KOT {
  id: string;
  tableId: string;
  outletId: string;
  waiterId: string;
  items: KOTItem[];
  status: 'PENDING' | 'PREPARING' | 'SERVED';
  timestamp: string;
  paymentMethod?: string;
  bookingId?: string;
}

export interface DiningTable {
  id: string;
  number: string;
  outletId: string;
  status: 'VACANT' | 'OCCUPIED' | 'RESERVED';
}

export interface RestaurantOutlet {
  id: string;
  name: string;
  type: 'FineDine' | 'Cafe' | 'Bar' | 'Buffet';
}

// Added inventory types
export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  lastPurchasePrice?: number;
}

export interface Vendor {
  id: string;
  name: string;
  contact: string;
  gstin?: string;
  category: string;
}

export interface StockReceipt {
  id: string;
  date: string;
  itemId: string;
  vendorId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentMade: number;
  paymentMode: string;
  billNumber: string;
}

// Added travel types
export interface TravelBooking {
  id: string;
  guestId: string;
  guestName: string;
  roomBookingId?: string;
  vehicleType: string;
  vehicleNumber: string;
  driverName: string;
  pickupLocation: string;
  dropLocation: string;
  date: string;
  time: string;
  kmUsed: number;
  daysOfTravelling: number;
  amount: number;
  status: 'BOOKED' | 'COMPLETED';
}
