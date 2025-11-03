'use client';

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { createClient } from "@/utils/supabase/client";
import { Edit, Plus, Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast, Toaster } from "sonner";

const DEFAULT_PASSWORD = "sjemployee123";

type StoreRecord = { id: string; name: string; address: string };
type ProfileRecord = { id?: string; role?: string; store_id?: string | number } | null;

export default function UserManagement({
    stores,
    currentUser,
}: {
    stores: StoreRecord[] | null,
    currentUser: ProfileRecord,
}) {
    const ITEMS_PER_PAGE = 10;

    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userStoreFilter, setUserStoreFilter] = useState('all');
    const [usersData, setUsersData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isAddUsersOpen, setIsAddUsersOpen] = useState(false);
    const [isEditUserOpen, setIsEditUserOpen] = useState(false);

    const [userFirstName, setUserFirstName] = useState('');
    const [userLastName, setUserLastName] = useState('');
    const [userEmail, setUserEmail] = useState('');
    const [userRole, setUserRole] = useState('');
    const [userStore, setUserStore] = useState('');
    const [isCreatingUser, setIsCreatingUser] = useState(false);

    const [selectedUser, setSelectedUser] = useState<any>(null);

    const currentUserRole = currentUser?.role ?? '';
    const isAdmin = currentUserRole === 'admin';
    const isManager = currentUserRole === 'manager';
    const managerStoreId = currentUser?.store_id != null ? String(currentUser.store_id) : '';

    const storeOptions = useMemo(() => {
        const base = stores?.filter(store => store?.id) ?? [];
        if (isAdmin) {
            return base;
        }
        if (isManager) {
            return base.filter(store => String(store.id) === managerStoreId);
        }
        return [];
    }, [stores, isAdmin, isManager, managerStoreId]);

    const allowedRoleOptions = useMemo(() => {
        if (isAdmin) {
            return [
                { value: 'admin', label: 'Admin' },
                { value: 'manager', label: 'Store Manager' },
                { value: 'chef', label: 'Chef' },
                { value: 'staff', label: 'Staff' },
            ];
        }
        if (isManager) {
            return [
                { value: 'chef', label: 'Chef' },
                { value: 'staff', label: 'Staff' },
            ];
        }
        return [];
    }, [isAdmin, isManager]);

    const fetchUsers = useCallback(async (page: number) => {
        setIsTableLoading(true);
        try {
            const supabase = await createClient();
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase.from('profiles').select(`
                id,
                email,
                first_name,
                last_name,
                role,
                store_id,
                store:stores(
                    id,
                    name
                )
            `, { count: 'exact' }).order('last_name', { ascending: true });

            if (isManager && managerStoreId) {
                query = query.eq('store_id', managerStoreId);
                query = query.neq('role', 'admin');
            }
            if (userStoreFilter !== 'all') {
                query = query.eq('store_id', userStoreFilter);
            }
            query = query.neq('id', currentUser?.id);

            const trimmedSearch = userSearchQuery.trim();
            if (trimmedSearch) {
                const escaped = trimmedSearch.replace(/[,]/g, '');
                query = query.or(`first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,email.ilike.%${escaped}%`);
            }

            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                console.log(error);
                setUsersData([]);
                setTotalCount(0);
                return;
            }

            const computedCount = count ?? 0;
            const computedTotalPages = computedCount === 0 ? 1 : Math.ceil(computedCount / ITEMS_PER_PAGE);

            setTotalCount(computedCount);

            if (computedCount === 0) {
                if (page !== 1) {
                    setCurrentPage(1);
                }
                setUsersData([]);
                return;
            }

            if (page > computedTotalPages) {
                setCurrentPage(computedTotalPages);
                return;
            }

            setUsersData(data ?? []);
        } catch (err) {
            console.log(err);
            setUsersData([]);
            setTotalCount(0);
        } finally {
            setIsTableLoading(false);
        }
    }, [userSearchQuery, userStoreFilter, isManager, managerStoreId]);

    useEffect(() => {
        setCurrentPage(1);
    }, [userSearchQuery, userStoreFilter, isManager, managerStoreId]);

    useEffect(() => {
        if (isManager) {
            setUserStoreFilter(managerStoreId || 'all');
        }
    }, [isManager, managerStoreId]);

    useEffect(() => {
        fetchUsers(currentPage);
    }, [fetchUsers, currentPage]);

    useEffect(() => {
        if (!isAddUsersOpen) {
            setUserFirstName('');
            setUserLastName('');
            setUserEmail('');
            setUserRole('');
            setUserStore(isAdmin ? '' : managerStoreId);
        } else if (isManager) {
            setUserStore(managerStoreId);
        }
    }, [isAddUsersOpen, isAdmin, isManager, managerStoreId]);

    useEffect(() => {
        if (!isAdmin && !isManager) {
            setIsAddUsersOpen(false);
        }
    }, [isAdmin, isManager]);

    const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / ITEMS_PER_PAGE);
    const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const pageEnd = totalCount === 0 ? 0 : Math.min(totalCount, pageStart + usersData.length - 1);

    const handleAddUser = async () => {
        if (!isAdmin && !isManager) {
            toast.error('You are not allowed to create users.');
            return;
        }

        if (!userFirstName.trim() || !userLastName.trim() || !userEmail.trim()) {
            toast.error('Please provide first name, last name, and email.');
            return;
        }

        if (!userRole) {
            toast.error('Please select a role.');
            return;
        }

        if (!allowedRoleOptions.some(option => option.value === userRole)) {
            toast.error('Selected role is not allowed.');
            return;
        }

        const targetStoreId = isAdmin ? userStore : managerStoreId;
        if (!targetStoreId) {
            toast.error('A store must be selected.');
            return;
        }

        setIsCreatingUser(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase.functions.invoke('create_user', {
                body: {
                    first_name: userFirstName.trim(),
                    last_name: userLastName.trim(),
                    email: userEmail.trim(),
                    role: userRole,
                    store_id: targetStoreId,
                    password: DEFAULT_PASSWORD,
                },
            });

            if (error) {
                throw new Error(error.message || 'Failed to create user.');
            }

            if (data?.error) {
                throw new Error(data.error);
            }

            toast.success(`User created. Default password: ${DEFAULT_PASSWORD}`);
            setIsAddUsersOpen(false);
            setCurrentPage(1);
            await fetchUsers(1);
        } catch (error: any) {
            toast.error(error?.message || 'Something went wrong.');
        } finally {
            setIsCreatingUser(false);
        }
    };

    const handleEditUser = async () => {
        // TODO: implement editing user details
    };

    const addFormValid = Boolean(
        userFirstName.trim() &&
        userLastName.trim() &&
        userEmail.trim() &&
        userRole &&
        allowedRoleOptions.some(option => option.value === userRole) &&
        (isAdmin ? userStore : managerStoreId)
    );

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>User Management</CardTitle>
                        <CardDescription>View, add, and modify users</CardDescription>
                    </div>
                    {(isAdmin || isManager) && (
                        <Dialog open={isAddUsersOpen} onOpenChange={setIsAddUsersOpen}>
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Add User
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Add New User</DialogTitle>
                                    <DialogDescription>
                                        Create a new user account. Default password: <code>{DEFAULT_PASSWORD}</code>
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-x-4 flex w-full">
                                        <div className="space-y-2 grow">
                                            <Label>First Name</Label>
                                            <Input placeholder="e.g., John" value={userFirstName} onChange={(e) => setUserFirstName(e.target.value)} />
                                        </div>
                                        <div className="space-y-2 grow">
                                            <Label>Last Name</Label>
                                            <Input placeholder="e.g., Doe" value={userLastName} onChange={(e) => setUserLastName(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Email</Label>
                                        <Input placeholder="e.g., john.doe@example.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Role</Label>
                                        <Select value={userRole} onValueChange={setUserRole}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select a role" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allowedRoleOptions.map(option => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {isAdmin ? (
                                        <div className="space-y-2">
                                            <Label>Store</Label>
                                            <Select value={userStore} onValueChange={setUserStore}>
                                                <SelectTrigger className="w-full">
                                                    <SelectValue placeholder="Select a store" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {storeOptions.map(store => (
                                                        <SelectItem key={store.id} value={String(store.id)}>
                                                            {store.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <Label>Store</Label>
                                            <Input value={storeOptions[0]?.name ?? 'N/A'} disabled />
                                        </div>
                                    )}
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setIsAddUsersOpen(false)} disabled={isCreatingUser}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleAddUser} disabled={!addFormValid || isCreatingUser}>
                                        {isCreatingUser ? 'Creating...' : 'Add User'}
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-4 w-1/2 pb-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or email..."
                            value={userSearchQuery}
                            onChange={(e) => setUserSearchQuery(e.target.value)}
                            className="pl-9"
                        />
                    </div>
                    <Select value={userStoreFilter} onValueChange={setUserStoreFilter} disabled={!isAdmin}>
                        <SelectTrigger className="w-full md:w-[200px]">
                            <SelectValue placeholder="Filter by store" />
                        </SelectTrigger>
                        <SelectContent>
                            {isAdmin && <SelectItem value="all">All Stores</SelectItem>}
                            {storeOptions.map(store => (
                                <SelectItem key={store.id} value={String(store.id)}>
                                    {store.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>First Name</TableHead>
                            <TableHead>Last Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Store</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isTableLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <p className="text-muted-foreground">Loading users...</p>
                                </TableCell>
                            </TableRow>
                        ) : usersData.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8">
                                    <p className="text-muted-foreground">No users found</p>
                                </TableCell>
                            </TableRow>
                        ) : (
                            usersData.map(userItem => (
                                <TableRow key={userItem.id}>
                                    <TableCell>{userItem.first_name}</TableCell>
                                    <TableCell>{userItem.last_name}</TableCell>
                                    <TableCell>{userItem.email}</TableCell>
                                    <TableCell>{userItem.role}</TableCell>
                                    <TableCell>{userItem.store?.name ?? 'N/A'}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedUser(userItem);
                                                    setIsEditUserOpen(true);
                                                }}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <div className="flex flex-col gap-4 mt-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm text-muted-foreground">
                        {totalCount > 0
                            ? `Showing ${pageStart}-${pageEnd} of ${totalCount} users`
                            : 'Showing 0 of 0 users'}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={totalCount === 0 || currentPage === totalPages}
                        >
                            Next
                        </Button>
                    </div>
                </div>
            </CardContent>
            <Dialog open={isEditUserOpen} onOpenChange={setIsEditUserOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Modify user details. Default password: <code>{DEFAULT_PASSWORD}</code>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-x-4 flex w-full">
                            <div className="space-y-2 grow">
                                <Label>First Name</Label>
                                <Input defaultValue={selectedUser?.first_name} disabled />
                            </div>
                            <div className="space-y-2 grow">
                                <Label>Last Name</Label>
                                <Input defaultValue={selectedUser?.last_name} disabled />
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditUserOpen(false)}>
                            Close
                        </Button>
                        <Button onClick={handleEditUser} disabled>
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            <Toaster />
        </Card>
    );
}
