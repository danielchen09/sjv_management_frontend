'use client';

import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Card, CardContent, CardHeader } from "@/components/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/dialog";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/table";
import { Check, Eye, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Dropzone, DropzoneContent, DropzoneEmptyState } from '@/components/dropzone'
import { useSupabaseUpload } from '@/hooks/use-supabase-upload'
import { createClient } from "@/utils/supabase/client";

export default function Invoices(
    {
        user,
        stores,
    }: {
        user: { role: string, store_id: number } | null
        stores: any[] | null,
    }) {
    const ITEMS_PER_PAGE = 10;

    const storeIdToNameMap = useMemo(() => {
        const map: Record<number, string> = {};
        stores?.forEach((store) => {
            if (store?.id != null) {
                map[store.id] = store.name;
            }
        });
        return map;
    }, [stores]);

    const [invoicesData, setInvoicesData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [isTableLoading, setIsTableLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);

    const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [storeFilter, setStoreFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [isSignedFilter, setIsSignedFilter] = useState('all');

    const defaultStoreValue = user?.store_id != null ? String(user.store_id) : '';
    const [uploadInvoiceName, setUploadInvoiceName] = useState('');
    const [uploadInvoiceType, setUploadInvoiceType] = useState('');
    const [uploadInvoiceTotal, setUploadInvoiceTotal] = useState('');
    const [uploadInvoiceStore, setUploadInvoiceStore] = useState(defaultStoreValue);

    const TYPE_TO_LABEL_MAP: Record<string, string> = {
        super_market: 'Super Market',
        manifest: 'Manifest',
        other: 'Other',
    };

    const dropzoneProps = useSupabaseUpload({
        bucketName: 'invoices',
        allowedMimeTypes: ['image/*', 'application/pdf'],
        maxFiles: 1,
        maxFileSize: 1000 * 1000 * 10, // 10MB,
    })

    const fetchInvoices = useCallback(async (page: number) => {
        setIsTableLoading(true);
        try {
            const supabase = createClient();
            const from = (page - 1) * ITEMS_PER_PAGE;
            const to = from + ITEMS_PER_PAGE - 1;

            let query = supabase.from('invoices').select(`
                id,
                name,
                type,
                total,
                created_at,
                is_signed,
                file_path,
                store
            `, { count: 'exact' }).order('created_at', { ascending: false });

            if (user?.role !== 'admin' && user?.store_id != null) {
                query = query.eq('store', user.store_id);
            } else if (storeFilter !== 'all') {
                const storeId = parseInt(storeFilter, 10);
                if (!Number.isNaN(storeId)) {
                    query = query.eq('store', storeId);
                }
            }

            if (typeFilter !== 'all') {
                query = query.eq('type', typeFilter);
            }

            if (isSignedFilter === 'signed') {
                query = query.eq('is_signed', true);
            } else if (isSignedFilter === 'pending') {
                query = query.eq('is_signed', false);
            }

            const trimmedSearch = searchQuery.trim();
            if (trimmedSearch) {
                query = query.ilike('name', `%${trimmedSearch}%`);
            }

            query = query.range(from, to);

            const { data, error, count } = await query;

            if (error) {
                console.log(error);
                setInvoicesData([]);
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
                setInvoicesData([]);
                return;
            }

            if (computedCount > 0 && page > computedTotalPages) {
                setCurrentPage(computedTotalPages);
                return;
            }

            setInvoicesData(data ?? []);
        } catch (err) {
            console.log(err);
            setInvoicesData([]);
            setTotalCount(0);
        } finally {
            setIsTableLoading(false);
        }
    }, [user?.role, user?.store_id, storeFilter, typeFilter, isSignedFilter, searchQuery]);

    const handleAddInvoice = async () => {
        const supabase = createClient();
        const uploadRes = await dropzoneProps.onUpload()
        const resolvedStoreId = user?.role === 'admin' ? parseInt(uploadInvoiceStore, 10) : user?.store_id;
        if (resolvedStoreId == null || Number.isNaN(resolvedStoreId)) {
            alert('Please select a store before uploading.');
            return;
        }
        const uploadData = {
            name: uploadInvoiceName,
            type: uploadInvoiceType,
            total: uploadInvoiceTotal,
            file_path: uploadRes?.[0]?.path || '',
            store: resolvedStoreId,
            is_signed: false,
        }
        if (uploadRes?.[0]?.message) {
            alert(`Error uploading file: ${uploadRes[0].message}`)
            return
        }
        const insertRes = await supabase.from('invoices').insert(uploadData).select().single()
        if (insertRes.error) {
            alert(`Error inserting invoice: ${insertRes.error.message}`)
            return
        }
        setIsUploadDialogOpen(false)
        setCurrentPage(1);
        await fetchInvoices(1);
    }

    const handleViewFile = (filePath: string) => {
        const supabase = createClient();
        const { data } = supabase.storage.from('invoices').getPublicUrl(filePath);
        window.open(data.publicUrl, '_blank');
    }

    const handleSign = async (invoiceId: number) => {
        const supabase = createClient();
        const res = await supabase.from('invoices').update({ is_signed: true }).eq('id', invoiceId);
        if (res.error) {
            alert(`Error signing invoice: ${res.error.message}`);
            return;
        }
        await fetchInvoices(currentPage);
    }

    useEffect(() => {
        if (!isUploadDialogOpen) {
            dropzoneProps.reset()
            setUploadInvoiceName('')
            setUploadInvoiceType('')
            setUploadInvoiceTotal('')
            setUploadInvoiceStore(defaultStoreValue)
        }
    }, [isUploadDialogOpen, defaultStoreValue])

    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, storeFilter, typeFilter, isSignedFilter])

    useEffect(() => {
        fetchInvoices(currentPage);
    }, [fetchInvoices, currentPage])

    const totalPages = totalCount === 0 ? 1 : Math.ceil(totalCount / ITEMS_PER_PAGE);
    const pageStart = totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
    const pageEnd = totalCount === 0 ? 0 : Math.min(totalCount, pageStart + invoicesData.length - 1);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1>Invoice Management</h1>
                    <p className="text-muted-foreground">
                        Upload and manage invoice documents
                    </p>
                </div>
                <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Invoice
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Upload Invoice</DialogTitle>
                            <DialogDescription>
                                Upload a new invoice document to the system
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Invoice Name</Label>
                                <Input value={uploadInvoiceName} onChange={(e) => setUploadInvoiceName(e.target.value)} />
                            </div>
                            {
                                user?.role === 'admin' && (
                                    <div className="space-y-2">
                                        <Label>Store</Label>
                                        <Select value={uploadInvoiceStore} onValueChange={setUploadInvoiceStore}>
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select Store" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {
                                                    stores?.map((store) => (
                                                        store?.id != null ? (
                                                            <SelectItem key={store.id} value={String(store.id)}>{store?.name}</SelectItem>
                                                        ) : null
                                                    ))
                                                }
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )
                            }

                            <div className="space-y-2">
                                <Label>Invoice Type</Label>
                                <Select value={uploadInvoiceType} onValueChange={setUploadInvoiceType}>
                                    <SelectTrigger className="w-full">
                                        <SelectValue placeholder="Select Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="super_market">Super Market</SelectItem>
                                        <SelectItem value="manifest">Manifest</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Invoice Total</Label>
                                <Input value={uploadInvoiceTotal} onChange={(e) => setUploadInvoiceTotal(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>File</Label>
                                <Dropzone {...dropzoneProps}>
                                    <DropzoneEmptyState />
                                    <DropzoneContent />
                                </Dropzone>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleAddInvoice}>
                                {
                                    dropzoneProps.loading ? 'Uploading...' : 'Upload Invoice'
                                }
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
                                placeholder="Search invoices..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="super_market">Super Market</SelectItem>
                                <SelectItem value="manifest">Manifest</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        {user?.role === 'admin' && (
                            <Select value={storeFilter} onValueChange={setStoreFilter}>
                                <SelectTrigger className="w-full md:w-[180px]">
                                    <SelectValue placeholder="Store" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stores</SelectItem>
                                    {
                                        stores?.map((store) => {
                                            if (store?.id == null) {
                                                return null;
                                            }
                                            return (
                                                <SelectItem key={store.id} value={String(store.id)}>{store?.name}</SelectItem>
                                            )
                                        })
                                    }
                                </SelectContent>
                            </Select>
                        )}
                        <Select value={isSignedFilter} onValueChange={setIsSignedFilter}>
                            <SelectTrigger className="w-full md:w-[180px]">
                                <SelectValue placeholder="Signed Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="signed">Signed</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Type</TableHead>
                                {user?.role === 'admin' && <TableHead>Store</TableHead>}
                                <TableHead>Total</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>View</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isTableLoading ? (
                                <TableRow>
                                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} className="text-center py-8">
                                        <p className="text-muted-foreground">Loading invoices...</p>
                                    </TableCell>
                                </TableRow>
                            ) : invoicesData.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={user?.role === 'admin' ? 8 : 7} className="text-center py-8">
                                        <p className="text-muted-foreground">No invoices found</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                invoicesData.map((invoice) => {
                                    const storeName = storeIdToNameMap[invoice.store] ?? 'Unknown store';
                                    const invoiceDate = invoice.created_at ? new Date(invoice.created_at).toLocaleDateString() : '—';
                                    return (
                                        <TableRow key={invoice.id}>
                                            <TableCell>{invoice.name}</TableCell>
                                            <TableCell>{invoiceDate}</TableCell>
                                            <TableCell>{TYPE_TO_LABEL_MAP[invoice.type]}</TableCell>
                                            {user?.role === 'admin' && <TableCell>{storeName}</TableCell>}
                                            <TableCell>{invoice.total}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={invoice.is_signed ? 'default' : 'secondary'}
                                                >
                                                    {invoice.is_signed ? 'Signed' : 'Pending'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleViewFile(invoice.file_path)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {invoice.is_signed ? (
                                                    "Signed"
                                                ) : (
                                                    <Button variant="ghost" onClick={() => handleSign(invoice.id)}>
                                                        <Check className="h-4 w-4 text-green-500" />
                                                    </Button>
                                                )}
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
                                ? `Showing ${pageStart}-${pageEnd} of ${totalCount} invoices`
                                : 'Showing 0 of 0 invoices'}
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
            </Card>
        </div>
    )
}
