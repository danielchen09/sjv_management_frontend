'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import Image from "next/image";
import { createClient } from '@/utils/supabase/client'
import { FileText, Package, Store } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import StoreManagement from "./store_management";
import UserManagement from "./user_management";
import {useEffect, useState} from "react";

export default function AdminDashboard({
    profile
}: {
    profile: any | null
}) {
    const [numStores, setNumStores] = useState<number | null>(null);
    const [numInventoryItems, setNumInventoryItems] = useState<number | null>(null);
    const [numLowStockAlerts, setNumLowStockAlerts] = useState<number | null>(null);
    const [numPendingInvoices, setNumPendingInvoices] = useState<number | null>(null);

    useEffect(() => {
        (async () => {

            const supabase = await createClient()
            const {data, error} = await supabase.from('inventory').select('count');
            if (error) {
                console.error('Error fetching inventory:', error);
                return;
            }
            if (data) {
                setNumInventoryItems(data[0]?.count || 0);
            }

            const {data: storesData, error: storesError} = await supabase.from('stores').select('count');
            if (storesError) {
                console.error('Error fetching stores:', storesError);
                return;
            }
            if (storesData) {
                setNumStores(storesData[0]?.count || 0);
            }

            const {data: lowStockData, error: lowStockError} = await supabase.from('inventory').select('id', { count: 'exact' }).eq('low_stock', true);
            if (lowStockError) {
                console.error('Error fetching low stock alerts:', lowStockError);
                return;
            }
            if (lowStockData) {
                setNumLowStockAlerts(lowStockData.length);
            }

            const {data: invoicesData, error: invoicesError} = await supabase.from('invoices').select('id', { count: 'exact' }).eq('is_signed', false);
            if (invoicesError) {
                console.error('Error fetching pending invoices:', invoicesError);
                return;
            }
            if (invoicesData) {
                setNumPendingInvoices(invoicesData.length);
            }
        })();
    }, [])

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm">Total Stores</CardTitle>
						<Store className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl">{numStores}</div>
						<p className="text-xs text-muted-foreground mt-1">
							{profile?.role ? 'System-wide' : 'Your store'}
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm">Inventory Items</CardTitle>
						<Package className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl">{numInventoryItems}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Total items tracked
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm">Low Stock Alerts</CardTitle>
						<Package className="h-4 w-4 text-destructive" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl">{numLowStockAlerts}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Need attention
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm">Pending Invoices</CardTitle>
						<FileText className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="text-2xl">{numPendingInvoices}</div>
						<p className="text-xs text-muted-foreground mt-1">
							Awaiting approval
						</p>
					</CardContent>
				</Card>
			</div>
    )
}