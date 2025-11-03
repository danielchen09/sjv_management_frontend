'use server';

import { ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '../../components/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/dropdown-menu';
import {
  LayoutDashboard,
  Package,
  FileText,
  User,
  Settings,
  LogOut,
  ChevronDown,
  Package2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { User as UserType } from '../../types';
import "../globals.css";
import Link from 'next/link';
import SidebarLayout from '../sidebar';
import { createClient } from '@/utils/supabase/server'

interface AppLayoutProps {
  children: ReactNode;
}

export default async function RootLayout({ params, children }: LayoutProps<'/main'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()


  return (
    <html>
      <body>
        <SidebarProvider>
          <div className="flex h-screen w-full overflow-hidden">

            <SidebarLayout user={profile} />
            <div className="flex-1 flex flex-col overflow-hidden">
              <header className="h-14 border-b flex items-center px-4 gap-2">
                <SidebarTrigger />
                <div className="flex-1">
                  {profile?.storeName && (
                    <div className="text-sm text-muted-foreground">
                      {profile.storeName}
                    </div>
                  )}
                </div>
              </header>

              <main className="flex-1 overflow-auto p-6">
                {children}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </body>
    </html>
  );
}
