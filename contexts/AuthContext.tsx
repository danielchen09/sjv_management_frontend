"use client"

import { createContext, useContext, useState, ReactNode } from 'react';
import { User } from '../types';

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo
const mockUsers: Record<string, User> = {
  'admin@inventory.com': {
    id: '1',
    name: 'Admin User',
    email: 'admin@inventory.com',
    role: 'admin',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Admin',
  },
  'manager1@inventory.com': {
    id: '2',
    name: 'Store Manager',
    email: 'manager1@inventory.com',
    role: 'store_manager',
    storeId: 'store-1',
    storeName: 'Downtown Store',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Manager1',
  },
  'chef1@inventory.com': {
    id: '3',
    name: 'Head Chef',
    email: 'chef1@inventory.com',
    role: 'chef',
    storeId: 'store-1',
    storeName: 'Downtown Store',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Chef1',
  },
  'crew1@inventory.com': {
    id: '4',
    name: 'Crew Member',
    email: 'crew1@inventory.com',
    role: 'crew',
    storeId: 'store-2',
    storeName: 'Uptown Store',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Crew1',
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - in production, this would call an API
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const foundUser = mockUsers[email];
    if (foundUser) {
      setUser(foundUser);
    } else {
      throw new Error('Invalid credentials');
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateProfile = (updates: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
