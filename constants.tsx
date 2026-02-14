
import { RoomStatus, RoomType, Room } from './types';

export const STATUS_COLORS: Record<RoomStatus, string> = {
  [RoomStatus.VACANT]: 'bg-white border-green-400 text-green-900',
  [RoomStatus.OCCUPIED]: 'bg-blue-50 border-blue-600 text-blue-900 shadow-inner',
  [RoomStatus.RESERVED]: 'bg-orange-50 border-orange-500 text-orange-900',
  [RoomStatus.DIRTY]: 'bg-red-50 border-red-500 text-red-900',
  [RoomStatus.REPAIR]: 'bg-[#5c2d0a]/10 border-[#5c2d0a] text-[#5c2d0a]', 
  [RoomStatus.MANAGEMENT]: 'bg-purple-50 border-purple-400 text-purple-900',
  [RoomStatus.STAFF_BLOCK]: 'bg-gray-300 border-gray-500 text-gray-800',
};

export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", 
  "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", 
  "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", 
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
  "Uttar Pradesh", "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu", 
  "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

const generateRooms = () => {
  const rooms: Room[] = [];

  // Wedding Block -> AYODHYA
  // Prefix 'A'
  // Ground Floor (0) -> A 101 - 106
  for (let i = 101; i <= 106; i++) {
    rooms.push({ id: `A${i}`, number: `A${i}`, floor: 0, block: 'AYODHYA', type: RoomType.DELUXE, price: 3500, status: RoomStatus.VACANT });
  }
  // First Floor (1) -> A 201 - A 212, A 214 - A 216
  for (let i = 201; i <= 216; i++) {
    if (i === 213) continue; // Note from blueprint: 213 is skipped
    rooms.push({ id: `A${i}`, number: `A${i}`, floor: 1, block: 'AYODHYA', type: RoomType.DELUXE, price: 3500, status: RoomStatus.VACANT });
  }
  // Second Floor (2) -> A 301 - A 312, A 314 - A 332
  for (let i = 301; i <= 332; i++) {
    if (i === 313) continue; // Note from blueprint: 313 is skipped
    rooms.push({ id: `A${i}`, number: `A${i}`, floor: 2, block: 'AYODHYA', type: RoomType.DELUXE, price: 3500, status: RoomStatus.VACANT });
  }

  // Hotel Block -> MITHILA
  // Prefix 'M'
  // Ground Floor (0) -> M 101, M 102
  for (let i = 101; i <= 102; i++) {
    rooms.push({ id: `M${i}`, number: `M${i}`, floor: 0, block: 'MITHILA', type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT });
  }
  // First Floor (1) -> M 201 to M 205
  for (let i = 201; i <= 205; i++) {
    rooms.push({ id: `M${i}`, number: `M${i}`, floor: 1, block: 'MITHILA', type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT });
  }
  // Second Floor (2) -> M 301 to M 311
  for (let i = 301; i <= 311; i++) {
    rooms.push({ id: `M${i}`, number: `M${i}`, floor: 2, block: 'MITHILA', type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT });
  }
  // Third Floor (3) -> M 401 to M 411
  for (let i = 401; i <= 411; i++) {
    rooms.push({ id: `M${i}`, number: `M${i}`, floor: 3, block: 'MITHILA', type: RoomType.STANDARD, price: 2500, status: RoomStatus.VACANT });
  }

  return rooms;
};

export const INITIAL_ROOMS: Room[] = generateRooms();
