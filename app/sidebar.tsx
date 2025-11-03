'use client';

import { useEffect, useState } from 'react';
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
} from '../components/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '../components/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '../components/dropdown-menu';
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
import "./globals.css";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from "@/utils/supabase/client";

type SidebarUser = {
    id?: string;
    name?: string;
    role?: string;
    avatar_url?: string | null;
    first_name?: string;
    last_name?: string;
    email?: string;
};

export default function SidebarLayout({ user }: { user: SidebarUser | null }) {
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user?.avatar_url) {
            setAvatarUrl(null);
            return;
        }
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        if (user.avatar_url.startsWith('http')) {
            setAvatarUrl(user.avatar_url);
        } else if (supabaseUrl) {
            setAvatarUrl(`${supabaseUrl}/storage/v1/object/public/avatars/${user.avatar_url}`);
        }
    }, [user?.avatar_url]);

    const menuItems = [
        { path: '/main/inventory', label: 'Inventory', icon: Package },
        { path: '/main/invoices', label: 'Invoices', icon: FileText },
        ...(user?.role === 'admin' || user?.role === 'manager'
            ? [{ path: '/main/admin', label: 'Admin Portal', icon: Settings }]
            : []),
        { path: '/main/profile', label: 'Profile', icon: User },
    ];
    const pathname = usePathname();
    const handleLogout = async () => {
        const supabase = createClient();
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.error('Error signing out:', error);
            return;
        }
        window.location.href = '/login';
    };

    return (
        <Sidebar>
            <SidebarHeader className="h-14 border-b border-sidebar-border p-4">
                <div className="flex items-center gap-2">
                    <Package2 className="h-6 w-6" />
                    <span>Inventory Manager</span>
                </div>
            </SidebarHeader>

            <SidebarContent>
                <SidebarMenu>
                    {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                            <SidebarMenuItem key={item.path}>
                                <Link href={item.path}>
                                    <SidebarMenuButton
                                        isActive={pathname === item.path}
                                    >
                                        <Icon className="h-4 w-4" />
                                        <span>{item.label}</span>
                                    </SidebarMenuButton>
                                </Link>
                            </SidebarMenuItem>
                        );
                    })}
                </SidebarMenu>
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
                <DropdownMenu>
                    <DropdownMenuTrigger className="w-full">
                        <div className="flex items-center gap-3 w-full hover:bg-sidebar-accent rounded-md p-2 transition-colors">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={avatarUrl || undefined} />
                                <AvatarFallback>
                                    {(user?.first_name?.[0] || user?.name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 text-left">
                                <p className="text-sm">{user?.first_name ? `${user.first_name} ${user?.last_name ?? ''}`.trim() : (user?.name ?? user?.email ?? 'Unknown User')}</p>
                                <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace('_', ' ')}</p>
                            </div>
                            <ChevronDown className="h-4 w-4" />
                        </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>My Account</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => window.location.href = '/main/profile'}>
                            <User className="mr-2 h-4 w-4" />
                            Profile
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarFooter>
        </Sidebar>
    )
}
