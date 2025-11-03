'use client';

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { createClient } from "@/utils/supabase/client";
import { Edit, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast, Toaster } from 'sonner';

export default function StoreManagement(
    { 
        stores, 
    }: { 
        stores: { id: string, name: string, address: string }[] | null ,
    }
) {
    const [storesDisplay, setStoresDisplay] = useState(stores || []);
    const [isAddStoreOpen, setIsAddStoreOpen] = useState(false);
    const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
    const [selectedStore, setSelectedStore] = useState<any>(null);

    const [storeName, setStoreName] = useState('');
    const [storeAddress, setStoreAddress] = useState('');
    const [editStoreName, setEditStoreName] = useState('');
    const [editStoreAddress, setEditStoreAddress] = useState('');
    const [isAddingStore, setIsAddingStore] = useState(false);
    const [isUpdatingStore, setIsUpdatingStore] = useState(false);
    const [deletingStoreId, setDeletingStoreId] = useState<string | null>(null);
    const [lowStockCounts, setLowStockCounts] = useState<Record<string, number>>({});
    const [isLowStockLoading, setIsLowStockLoading] = useState(true);

    const refreshLowStockCounts = useCallback(async () => {
        setIsLowStockLoading(true);
        const supabase = createClient();
        const { data, error } = await supabase
            .from('inventory')
            .select('store_id, on_hand, par');

        if (error) {
            console.error('Error fetching low stock counts:', error);
            setLowStockCounts({});
            setIsLowStockLoading(false);
            return;
        }

        const counts = (data || []).reduce<Record<string, number>>((acc, item) => {
            if (item.store_id && typeof item.on_hand === 'number' && typeof item.par === 'number') {
                if (item.on_hand < item.par) {
                    const key = String(item.store_id);
                    acc[key] = (acc[key] || 0) + 1;
                }
            }
            return acc;
        }, {});

        setLowStockCounts(counts);
        setIsLowStockLoading(false);
    }, []);

    useEffect(() => {
        refreshLowStockCounts();
    }, [refreshLowStockCounts]);

    const handleAddStore = async () => {
        if (!storeName.trim() || !storeAddress.trim()) {
            toast.error('Please provide store name and address.');
            return;
        }

        setIsAddingStore(true);
        const supabase = createClient();
        try {
            const { data, error } = await supabase
                .from('stores')
                .insert({ name: storeName.trim(), address: storeAddress.trim() })
                .select()
                .single();

            if (error || !data) {
                throw error ?? new Error('Failed to add store.');
            }

            toast.success('Store added successfully');
            setIsAddStoreOpen(false);
            setStoresDisplay([...storesDisplay, data]);
            setStoreName('');
            setStoreAddress('');
            await refreshLowStockCounts();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to add store.');
        } finally {
            setIsAddingStore(false);
        }
    };
    const handleEditStore = async () => {
        if (!selectedStore?.id) {
            return;
        }
        if (!editStoreName.trim() || !editStoreAddress.trim()) {
            toast.error('Please provide store name and address.');
            return;
        }

        setIsUpdatingStore(true);
        const supabase = createClient();
        try {
            const { error } = await supabase
                .from('stores')
                .update({ name: editStoreName.trim(), address: editStoreAddress.trim() })
                .eq('id', selectedStore.id);

            if (error) {
                throw error;
            }

            toast.success('Store updated successfully');
            setStoresDisplay(storesDisplay.map(store => {
                if (store.id === selectedStore.id) {
                    return {
                        ...store,
                        name: editStoreName.trim(),
                        address: editStoreAddress.trim(),
                    };
                }
                return store;
            }));
            setIsEditStoreOpen(false);
            setSelectedStore(null);
            await refreshLowStockCounts();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to update store.');
        } finally {
            setIsUpdatingStore(false);
        }
    }; 
    const handleDeleteStore = async (storeId: string) => {
        setDeletingStoreId(storeId);
        const supabase = createClient();
        try {
            const { error } = await supabase.from('stores').delete().eq('id', storeId);
            if (error) {
                throw error;
            }
            toast.success('Store deleted successfully');
            setStoresDisplay(storesDisplay.filter(store => store.id !== storeId));
            await refreshLowStockCounts();
        } catch (error: any) {
            toast.error(error?.message || 'Unable to delete store.');
        } finally {
            setDeletingStoreId(null);
        }
    };

    useEffect(() => {
        if (isEditStoreOpen && selectedStore) {
            setEditStoreName(selectedStore.name ?? '');
            setEditStoreAddress(selectedStore.address ?? '');
        }
    }, [isEditStoreOpen, selectedStore]);

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Store Management</CardTitle>
                        <CardDescription>View, add, and modify stores</CardDescription>
                    </div>
                    <Dialog open={isAddStoreOpen} onOpenChange={(open) => {
                        setIsAddStoreOpen(open);
                        if (!open) {
                            setStoreName('');
                            setStoreAddress('');
                            setIsAddingStore(false);
                        }
                    }}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Store
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Store</DialogTitle>
                                <DialogDescription>
                                    Create a new store location
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Store Name</Label>
                                    <Input placeholder="e.g., Downtown Store" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Location</Label>
                                    <Input placeholder="e.g., 123 Main St, Downtown" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddStoreOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleAddStore} disabled={isAddingStore}>
                                    {isAddingStore ? 'Adding...' : 'Add Store'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Store Name</TableHead>
                            <TableHead>Location</TableHead>
                            <TableHead>Low Stock</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {
                            storesDisplay?.map(store => {
                                return (
                    <TableRow key={store.id}>
                        <TableCell>{store.name}</TableCell>
                        <TableCell>{store.address}</TableCell>
                        <TableCell>{isLowStockLoading ? '—' : (lowStockCounts[String(store.id)] ?? 0)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setSelectedStore(store);
                                                        setIsEditStoreOpen(true);
                                                    }}
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteStore(store.id)}
                                                    disabled={deletingStoreId === store.id}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )
                            }
                            )
                        }
                    </TableBody>
                </Table>
            </CardContent>
            <Dialog open={isEditStoreOpen} onOpenChange={(open) => {
                setIsEditStoreOpen(open);
                if (!open) {
                    setSelectedStore(null);
                    setEditStoreName('');
                    setEditStoreAddress('');
                    setIsUpdatingStore(false);
                }
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Store</DialogTitle>
                  <DialogDescription>
                    Modify store details
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Store Name</Label>
                    <Input value={editStoreName} onChange={(e) => setEditStoreName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input value={editStoreAddress} onChange={(e) => setEditStoreAddress(e.target.value)} />
                  </div>
                  
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsEditStoreOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleEditStore} disabled={isUpdatingStore}>
                    {isUpdatingStore ? 'Saving...' : 'Save Changes'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Toaster />
        </Card>
    )
}
