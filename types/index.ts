export type UserRole = 'admin' | 'store_manager' | 'chef' | 'crew';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  storeId?: string; // For store managers, chefs, and crew
  storeName?: string;
  avatar?: string;
}

export interface Store {
  id: string;
  name: string;
  location: string;
  managerId: string;
}

export interface InventoryItem {
  id: string;
  storeId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
  lastUpdated: string;
  updatedBy: string;
}

export interface Invoice {
  id: string;
  storeId: string;
  fileName: string;
  uploadedBy: string;
  uploadedAt: string;
  fileSize: number;
  fileUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
}
