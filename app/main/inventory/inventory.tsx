'use client';


import { Card, CardContent, CardHeader } from "@/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/button";
import { AlertTriangle, Edit, Package, Plus, Search, Upload } from "lucide-react";
import { Input } from "@/components/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import * as XLSX from 'xlsx';
import { Badge } from "@/components/badge";
import { Label } from "@/components/label";
import { Separator } from "@/components/separator";
import { createClient } from "@/utils/supabase/client";

export default function Inventory(
    {
        user,
        stores,
    }: {
        user: any,
        stores: any[] | null,
    }
) {
    const ITEMS_PER_PAGE = 10;

    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isTableLoading, setIsTableLoading] = useState(false);

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [storeFilter, setStoreFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);

    const [addItemId, setAddItemId] = useState('');
    const [addItemSearching, setAddItemSearching] = useState(false);
    const [addItemNotFound, setAddItemNotFound] = useState(false);
    const [addItemName, setAddItemName] = useState('');
    const [addItemDescription, setAddItemDescription] = useState('');
    const [addItemUnit, setAddItemUnit] = useState('');
    const [addItemPricePerUnit, setAddItemPricePerUnit] = useState('');
    const [addInventoryOnHand, setAddInventoryOnHand] = useState('');
    const [addInventoryPar, setAddInventoryPar] = useState('');
    const [addInventoryStore, setAddInventoryStore] = useState('');
    const [existingInventoryId, setExistingInventoryId] = useState<string | null>(null);


    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editInventoryId, setEditInventoryId] = useState('');
    const [editInventoryOnHand, setEditInventoryOnHand] = useState('');
    const [editInventoryPar, setEditInventoryPar] = useState('');

    const isAdmin = user?.role === 'admin';
    const isStoreSelected = !isAdmin || Boolean(addInventoryStore);

    const clearDialogFields = () => {
        setAddItemId('');
        setAddItemName('');
        setAddItemDescription('');
        setAddItemUnit('');
        setAddItemPricePerUnit('');
        setAddInventoryOnHand('');
        setAddInventoryPar('');
        setAddInventoryStore('');
        setAddItemNotFound(false);
        setExistingInventoryId(null);
    }

    const _searchItemById = async (itemId: string) => {
        const supabase = await createClient();
        const { data, error } = await supabase.from('items').select('*').eq('ref_num', itemId)
        if (error || !data || data.length === 0) {
            console.log(error)
            return null;
        }
        if (data.length !== 1) {
            alert('Multiple items found with the same ID. Please contact admin.');
            return null;
        }
        return data[0];
    }

    const populateExistingInventory = useCallback(async (item: any, storeId: string | null) => {
        if (!storeId) {
            setExistingInventoryId(null);
            setAddInventoryOnHand('');
            setAddInventoryPar('');
            return;
        }
        const supabase = await createClient();
        const { data: existingInventory, error: existingError } = await supabase
            .from('inventory')
            .select('id, on_hand, par')
            .eq('item_id', item.id)
            .eq('store_id', storeId)
            .maybeSingle();

        if (!existingError && existingInventory) {
            setExistingInventoryId(existingInventory.id);
            setAddInventoryOnHand(existingInventory.on_hand?.toString() ?? '');
            setAddInventoryPar(existingInventory.par?.toString() ?? '');
            setAddItemNotFound(false);
        } else {
            setExistingInventoryId(null);
            setAddInventoryOnHand('');
            setAddInventoryPar('');
        }
    }, []);

    const searchItemById = async () => {
        const itemId = addItemId.trim();
        if (!itemId) {
            return;
        }
        if (isAdmin && !addInventoryStore) {
            alert('Please select a store before using autofill.');
            return;
        }
        setAddItemSearching(true);
        const itemData = await _searchItemById(itemId);
        if (!itemData) {
            setExistingInventoryId(null);
            setAddItemNotFound(true);
            setAddItemSearching(false);
            return;
        }
        setAddItemNotFound(false);
        setAddItemName(itemData.name);
        setAddItemDescription(itemData.description);
        setAddItemUnit(itemData.unit);
        setAddItemPricePerUnit(itemData.price_per_unit.toString());

        await populateExistingInventory(itemData, addInventoryStore || null);

        setAddItemSearching(false);
    };

    const fetchInventory = useCallback(async (page: number) => {
        setIsTableLoading(true);
        try {
            const supabase = await createClient();
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            const baseSelect = `
                id,
                item:items!inner(
                    id,
                    name,
                    unit,
                    price_per_unit
                ),
                store:stores(
                    id,
                    name
                ),
                on_hand,
                par,
                store_id
            `;

            let query = supabase.from('inventory').select(baseSelect, { count: 'exact' }).order('id', { ascending: true });

            if (storeFilter !== 'all') {
                query = query.eq('store_id', storeFilter);
            }

            const trimmedSearch = searchQuery.trim();
            if (trimmedSearch) {
                query = query.ilike('items.name', `%${trimmedSearch}%`);
            }

            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                console.log(error);
                setInventoryItems([]);
                setTotalCount(0);
                return;
            }

            const computedCount = count ?? 0;
            const computedTotalPages = computedCount === 0 ? 1 : Math.ceil(computedCount / ITEMS_PER_PAGE);

            setTotalCount(computedCount);

            if (computedCount > 0 && page > computedTotalPages) {
                setCurrentPage(computedTotalPages);
                return;
            }

            setInventoryItems(data || []);
        } catch (err) {
            console.log(err);
            setInventoryItems([]);
            setTotalCount(0);
        } finally {
            setIsTableLoading(false);
        }
    }, [storeFilter, searchQuery]);

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, storeFilter]);

    useEffect(() => {
        fetchInventory(currentPage);
    }, [fetchInventory, currentPage]);

    useEffect(() => {
        if (isAdmin) {
            setExistingInventoryId(null);
            setAddInventoryOnHand('');
            setAddInventoryPar('');
        }
    }, [isAdmin, addInventoryStore]);

    useEffect(() => {
        if (isAddDialogOpen && !isAdmin && !addInventoryStore) {
            const preferredStore = user?.store_id || user?.store?.id;
            const storeCandidate = stores?.find((store) => store.id === preferredStore) || stores?.[0];
            if (storeCandidate?.id) {
                setAddInventoryStore(storeCandidate.id);
            }
        }
    }, [isAddDialogOpen, isAdmin, addInventoryStore, stores]);

    useEffect(() => {
        const tryPopulateStoreInventory = async () => {
            if (!isStoreSelected || !addItemId.trim()) {
                if (isAdmin && !addInventoryStore) {
                    setExistingInventoryId(null);
                    setAddInventoryOnHand('');
                    setAddInventoryPar('');
                    setAddItemNotFound(false);
                } else if (!addItemId.trim()) {
                    setAddItemNotFound(false);
                }
                return;
            }

            const itemData = await _searchItemById(addItemId.trim());
            if (!itemData) {
                setExistingInventoryId(null);
                setAddInventoryOnHand('');
                setAddInventoryPar('');
                setAddItemNotFound(true);
                return;
            }
            await populateExistingInventory(itemData, addInventoryStore || null);
        };

        tryPopulateStoreInventory();
    }, [addInventoryStore, addItemId, isStoreSelected, populateExistingInventory, isAdmin]);

    const handleAddInventory = async () => {
        if (isAdmin && !addInventoryStore) {
            alert('Please select a store before adding inventory.');
            return;
        }

        const supabase = await createClient();
        let item = await _searchItemById(addItemId);
        if (!item) {
            const newItem = {
                ref_num: addItemId,
                name: addItemName,
                description: addItemDescription,
                unit: addItemUnit,
                price_per_unit: parseFloat(addItemPricePerUnit),
            };
            const { data: insertedItem, error: insertError } = await supabase.from('items').insert(newItem).select().single();
            if (insertError || !insertedItem) {
                alert('Error adding new item. Please try again.');
                console.log(insertError)
                return;
            }
            console.log('Inserted new item:', insertedItem);
            item = insertedItem;
        }

        const parsedOnHand = parseInt(addInventoryOnHand);
        const parsedPar = parseInt(addInventoryPar);
        const onHandValue = Number.isNaN(parsedOnHand) ? 0 : parsedOnHand;
        const parValue = Number.isNaN(parsedPar) ? 0 : parsedPar;

        let inventoryIdToUpdate = existingInventoryId;
        if (!inventoryIdToUpdate && addInventoryStore) {
            const { data: existingInventory } = await supabase
                .from('inventory')
                .select('id')
                .eq('item_id', item.id)
                .eq('store_id', addInventoryStore)
                .maybeSingle();
            if (existingInventory) {
                inventoryIdToUpdate = existingInventory.id;
            }
        }

        if (inventoryIdToUpdate) {
            const { error: updateError } = await supabase
                .from('inventory')
                .update({
                    on_hand: onHandValue,
                    par: parValue,
                })
                .eq('id', inventoryIdToUpdate);

            if (updateError) {
                alert('Error updating existing inventory. Please try again.');
                console.log(updateError);
                return;
            }
            console.log('Updated existing inventory:', inventoryIdToUpdate);
        } else {
            const newInventory = {
                item_id: item.id,
                store_id: addInventoryStore,
                on_hand: onHandValue,
                par: parValue,
            };
            const { error: inventoryError } = await supabase.from('inventory').insert(newInventory);
            if (inventoryError) {
                alert('Error adding inventory. Please try again.');
                console.log(inventoryError);
                return;
            }
            console.log('Added inventory:', newInventory);
        }

        setIsAddDialogOpen(false);
        setExistingInventoryId(null);
        await fetchInventory(currentPage);
    }

    const handleEditInventory = (inventoryItem: any) => {
        setIsEditDialogOpen(true);
        setEditInventoryId(inventoryItem.id);
        setEditInventoryOnHand(inventoryItem.on_hand.toString());
        setEditInventoryPar(inventoryItem.par.toString());
    }

    const handleUpdateInventory = async () => {
        const supabase = await createClient();
        const { error } = await supabase.from('inventory').update({
            on_hand: parseInt(editInventoryOnHand),
            par: parseInt(editInventoryPar),
        }).eq('id', editInventoryId);
        if (error) {
            alert('Error updating inventory. Please try again.');
            return;
        }
        console.log('Updated inventory:', editInventoryId);
        setIsEditDialogOpen(false);
        await fetchInventory(currentPage);
    }

    const downloadDataAsExcel = async () => {
        const supabase = await createClient();
        const exportSelect = `
            item:items!inner(
                name
            ),
            store:stores(
                name
            ),
            on_hand,
            par,
            id
        `;
        let query = supabase.from('inventory').select(exportSelect);

        if (storeFilter !== 'all') {
            query = query.eq('store_id', storeFilter);
        }

        if (searchQuery.trim()) {
            query = query.ilike('items.name', `%${searchQuery.trim()}%`);
        }

        const { data, error } = await query.order('id', { ascending: true });

        if (error) {
            console.log(error);
            alert('Error exporting inventory. Please try again.');
            return;
        }

        const exportData = (data ?? []).map(item => ({
            'Item Name': item.item?.name ?? '',
            'Store': item.store?.name ?? '',
            'On Hand': item.on_hand,
            'Par': item.par,
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory");
        XLSX.writeFile(workbook, "inventory.xlsx");
    }

    useEffect(() => {
        if (!isAddDialogOpen) {
            clearDialogFields();
        }
    }, [isAddDialogOpen]);

    const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / ITEMS_PER_PAGE);
    const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const pageEnd = totalCount === 0 ? 0 : Math.min(totalCount, pageStart + inventoryItems.length - 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1>Inventory Management</h1>
                    <p className="text-muted-foreground">
                        Track and manage your inventory items
                    </p>
                </div>
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            Add Item
                        </Button>
                    </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add Inventory Item</DialogTitle>
                                <DialogDescription>
                                    Add a new item to your inventory
                                </DialogDescription>
                            </DialogHeader>
                        <div className="space-y-4">
                            {isAdmin && (
                                <div className="space-y-2">
                                    <Label htmlFor="inventory-store">Store</Label>
                                    <p className="text-xs text-muted-foreground">Select a store before autofill or saving.</p>
                                    <Select value={addInventoryStore} onValueChange={(value) => setAddInventoryStore(value)}>
                                        <SelectTrigger id="inventory-store">
                                            <SelectValue placeholder="Select store" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stores?.map(store => (
                                                <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="space-y-2">
                                <Label htmlFor="item-id">Item ID</Label>
                                <div>
                                    <div className="flex space-x-4">
                                        <Input
                                            id="item-id"
                                            placeholder="Enter item ID"
                                            value={addItemId}
                                            onChange={(e) => setAddItemId(e.target.value)}
                                            disabled={!isStoreSelected}
                                        />
                                        <Button
                                            className="self-end mb-1"
                                            onClick={() => searchItemById()}
                                            disabled={!isStoreSelected || addItemSearching}
                                        >
                                            {addItemSearching ? 'Searching...' : 'Autofill'}
                                        </Button>
                                    </div>
                                    {addItemNotFound ? (
                                        <div className="text-red-500 text-xs">Item not found</div>
                                    ) : null}
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="item-name">Item Description</Label>
                                <Input
                                    id="item-name"
                                    placeholder="Enter item name"
                                    value={addItemName}
                                    onChange={(e) => setAddItemName(e.target.value)}
                                    disabled={!isStoreSelected}
                                />
                            </div>
                            <div className="flex space-x-4">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="item-price">Price per Unit</Label>
                                    <Input
                                        id="item-price"
                                        placeholder="Enter price per unit"
                                        value={addItemPricePerUnit}
                                        onChange={(e) => setAddItemPricePerUnit(e.target.value)}
                                        disabled={!isStoreSelected}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="item-unit">Unit</Label>
                                    <Input
                                        id="item-unit"
                                        placeholder="e.g., pcs, kg"
                                        value={addItemUnit}
                                        onChange={(e) => setAddItemUnit(e.target.value)}
                                        disabled={!isStoreSelected}
                                    />
                                </div>
                            </div>
                            <div className="py-2">
                                <Separator />
                            </div>
                            <div className="flex space-x-4">
                                <div className="space-y-2 grow">
                                    <Label htmlFor="inventory-on-hand">Inventory On Hand</Label>
                                    <Input
                                        id="inventory-on-hand"
                                        placeholder="Enter quantity on hand"
                                        value={addInventoryOnHand}
                                        onChange={(e) => setAddInventoryOnHand(e.target.value)}
                                        disabled={!isStoreSelected}
                                    />
                                </div>
                                <div className="space-y-2 grow">
                                    <Label htmlFor="inventory-par">Par Level</Label>
                                    <Input
                                        id="inventory-par"
                                        placeholder="Enter par level"
                                        value={addInventoryPar}
                                        onChange={(e) => setAddInventoryPar(e.target.value)}
                                        disabled={!isStoreSelected}
                                    />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddInventory} disabled={!isStoreSelected}>
                                Add Item
                            </Button>
                        </DialogFooter>
                    </DialogContent>


                </Dialog>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex flex-col md:flex-row md:items-center gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search inventory..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        {user?.role === 'admin' && (
                            <Select value={storeFilter} onValueChange={setStoreFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Store" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stores</SelectItem>
                                    {
                                        stores?.map(store => (
                                            <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                                        ))
                                    }
                                </SelectContent>
                            </Select>
                        )}

                        <Button onClick={downloadDataAsExcel} variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Export
                        </Button>

                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Item Name</TableHead>
                                {user?.role === 'admin' && <TableHead>Store</TableHead>}
                                <TableHead>On Hand</TableHead>
                                <TableHead>Par</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isTableLoading ? (
                                <TableRow>
                                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} className="text-center py-8">
                                        <p className="text-muted-foreground">Loading inventory...</p>
                                    </TableCell>
                                </TableRow>
                            ) : inventoryItems.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} className="text-center py-8">
                                        <Package className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                                        <p className="text-muted-foreground">No inventory items found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                inventoryItems.map((item) => {
                                    const itemName = item.item?.name ?? 'Unknown item';
                                    const storeName = item.store?.name ?? 'Unknown store';
                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-x-2">
                                                    {item.on_hand < item.par && (
                                                        <AlertTriangle className="h-4 w-4 text-destructive" />
                                                    )}
                                                    {itemName}
                                                </div>
                                            </TableCell>
                                            {user?.role === 'admin' && <TableCell>{storeName}</TableCell>}
                                            <TableCell>{item.on_hand} {item.item.unit}</TableCell>
                                            <TableCell>{item.par} {item.item.unit}</TableCell>
                                            <TableCell>
                                                {item.on_hand < item.par ?
                                                    <Badge variant="destructive">Low Stock</Badge> :
                                                    <Badge variant="default">In Stock</Badge>}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button variant="ghost" size="sm" onClick={() => handleEditInventory(item)}>
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                    <div className="flex flex-col gap-4 mt-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-muted-foreground">
                            {totalCount > 0
                                ? `Showing ${pageStart}-${pageEnd} of ${totalCount} items`
                                : 'Showing 0 of 0 items'}
                        </div>
                        <div className="flex items-center gap-3">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || totalCount === 0}
                            >
                                Previous
                            </Button>
                            <span className="text-sm text-muted-foreground">
                                Page {totalCount === 0 ? 0 : currentPage} of {totalCount === 0 ? 0 : totalPages}
                            </span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                                disabled={totalCount === 0 || currentPage === totalPages}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                </CardContent>
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Inventory Item</DialogTitle>
                            <DialogDescription>
                                Update inventory details
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="flex space-x-4">
                                <div className="space-y-2 grow">
                                    <Label htmlFor="edit-inventory-on-hand">Inventory On Hand</Label>
                                    <Input id="edit-inventory-on-hand" placeholder="Enter quantity on hand" value={editInventoryOnHand} onChange={(e) => setEditInventoryOnHand(e.target.value)} />
                                </div>
                                <div className="space-y-2 grow">
                                    <Label htmlFor="edit-inventory-par">Par Level</Label>
                                    <Input id="edit-inventory-par" placeholder="Enter par level" value={editInventoryPar} onChange={(e) => setEditInventoryPar(e.target.value)} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleUpdateInventory}>
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </Card>
        </div>
    );
}
