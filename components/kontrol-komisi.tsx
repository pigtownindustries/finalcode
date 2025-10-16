"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { 
    Settings, Trash2, AlertCircle, Loader2, Package, Search,
    Users, DollarSign, Calendar, FileText, RefreshCw, Edit,
    CheckCircle, XCircle, Filter, Download, Eye, CheckSquare,
    Square, Sliders, ChevronDown, ChevronUp, BarChart3, Sparkles
} from "lucide-react";
import { supabase, subscribeToEvents } from "@/lib/supabase";
import { Checkbox } from "@/components/ui/checkbox";

// Helper functions
const formatNominal = (value: string | number): string => {
    if (!value && value !== 0) return "";
    const stringValue = String(value).replace(/[^0-9]/g, '');
    if (stringValue === "") return "";
    return new Intl.NumberFormat('id-ID').format(parseInt(stringValue, 10));
};

const parseNominal = (value: string): number => {
    if (!value) return 0;
    return parseInt(String(value).replace(/[^0-9]/g, ''), 10) || 0;
};

// Data Types
interface TransactionItem {
    id: string;
    transaction_id: string;
    quantity: number;
    unit_price: number;
    created_at: string;
    barber_id: string;
    service_id: string;
    commission_type?: 'percentage' | 'fixed' | null;
    commission_value?: number | null;
    commission_amount?: number | null;
    commission_status?: string | null;
    users: {
        id: string;
        name: string;
        email: string;
    } | null;
    services: {
        id: string;
        name: string;
        price: number;
        type: 'service' | 'product';
    } | null;
    transactions: {
        id: string;
        transaction_number: string;
        created_at: string;
        customer_name: string;
        total_amount: number;
        payment_status: string;
        payment_method: string;
    } | null;
}

interface CommissionStats {
    totalItems: number;
    pendingItems: number;
    completedItems: number;
    noCommissionItems: number;
    totalAmount: number;
    totalCommission: number;
    barberCount: number;
}

interface FilterState {
    status: 'all' | 'pending' | 'completed' | 'no_commission';
    barber: string;
    dateRange: 'today' | 'week' | 'month' | 'all';
    serviceCategory: string;
}

interface EmployeeSummary {
    id: string;
    name: string;
    totalCommission: number;
    pendingItems: number;
    completedItems: number;
    noCommissionItems: number;
    totalTransactions: number;
}

export function KontrolKomisi() {
    const { toast } = useToast();
    const [allItems, setAllItems] = useState<TransactionItem[]>([]);
    const [filteredItems, setFilteredItems] = useState<TransactionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [stats, setStats] = useState<CommissionStats>({
        totalItems: 0,
        pendingItems: 0,
        completedItems: 0,
        noCommissionItems: 0,
        totalAmount: 0,
        totalCommission: 0,
        barberCount: 0
    });

    const [filters, setFilters] = useState<FilterState>({
        status: 'all',
        barber: 'all',
        dateRange: 'month',
        serviceCategory: 'all'
    });

    const [selectedItem, setSelectedItem] = useState<TransactionItem | null>(null);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
    const [commissionType, setCommissionType] = useState<'percentage' | 'fixed'>('percentage');
    const [commissionValue, setCommissionValue] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeBarbers, setActiveBarbers] = useState<{id: string, name: string}[]>([]);
    const [serviceCategories, setServiceCategories] = useState<any[]>([]);
    const [employeeSummaries, setEmployeeSummaries] = useState<EmployeeSummary[]>([]);
    const [activeTab, setActiveTab] = useState('transactions');
    const [expandedEmployees, setExpandedEmployees] = useState<Set<string>>(new Set());
    const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });

    // FUNGSI: Ambil data karyawan aktif dari database
    const fetchActiveBarbers = useCallback(async () => {
        try {
            console.log('🔄 Fetching active barbers...');
            
            const { data, error } = await supabase
                .from('users')
                .select('id, name, email')
                .eq('role', 'barber')
                .eq('status', 'active')
                .order('name');

            if (error) {
                console.error('❌ Error fetching barbers:', error);
                throw error;
            }

            console.log('✅ Active barbers:', data);
            setActiveBarbers(data || []);
            
        } catch (error) {
            console.error('❌ Failed to fetch barbers:', error);
            toast({
                title: "Gagal Memuat Data Karyawan",
                description: (error as Error).message,
                variant: "destructive",
            });
        }
    }, [toast]);

    // FUNGSI: Ambil kategori service
    const fetchServiceCategories = useCallback(async () => {
        try {
            const { data, error } = await supabase
                .from('service_categories')
                .select('id, name')
                .order('name');

            if (error) {
                console.error('❌ Error fetching categories:', error);
                return;
            }

            setServiceCategories(data || []);
        } catch (error) {
            console.error('❌ Failed to fetch categories:', error);
        }
    }, []);

    // FUNGSI: Ambil semua transaction items
    const fetchAllItems = useCallback(async () => {
        setLoading(true);
        try {
            console.log('🔄 Fetching all transaction items...');
            
            const { data, error } = await supabase
                .from('transaction_items')
                .select(`
                    id, 
                    transaction_id, 
                    quantity, 
                    unit_price, 
                    created_at, 
                    barber_id, 
                    service_id,
                    commission_type,
                    commission_value,
                    commission_amount,
                    commission_status,
                    users:barber_id (id, name, email),
                    services:service_id (id, name, price, type),
                    transactions:transaction_id (
                        id,
                        transaction_number, 
                        created_at, 
                        customer_name,
                        total_amount,
                        payment_status,
                        payment_method
                    )
                `)
                .not('barber_id', 'is', null)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            setAllItems(data || []);
            
            // Hitung stats
            if (data && data.length > 0) {
                const totalAmount = data.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
                const totalCommission = data.reduce((sum, item) => sum + (item.commission_amount || 0), 0);
                
                const pendingItems = data.filter(item => 
                    item.services?.type === 'service' && 
                    (!item.commission_status || item.commission_status === 'pending' || item.commission_status === 'pending_rule')
                ).length;

                const completedItems = data.filter(item => 
                    item.commission_status === 'credited'
                ).length;

                const noCommissionItems = data.filter(item => 
                    item.services?.type === 'product' || item.commission_status === 'no_commission'
                ).length;
                
                const uniqueBarberIds = new Set(data.map(item => item.barber_id));
                const barberCount = Array.from(uniqueBarberIds).length;
                
                setStats({
                    totalItems: data.length,
                    pendingItems,
                    completedItems,
                    noCommissionItems,
                    totalAmount,
                    totalCommission,
                    barberCount
                });

                // Hitung employee summaries
                const summaries = await calculateEmployeeSummaries(data);
                setEmployeeSummaries(summaries);
            } else {
                setStats({
                    totalItems: 0,
                    pendingItems: 0,
                    completedItems: 0,
                    noCommissionItems: 0,
                    totalAmount: 0,
                    totalCommission: 0,
                    barberCount: 0
                });
                setEmployeeSummaries([]);
            }
            
        } catch (error) {
            console.error('❌ Error fetching items:', error);
            toast({
                title: "Gagal Memuat Data Transaksi",
                description: (error as Error).message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    // FUNGSI: Hitung summary per karyawan
    const calculateEmployeeSummaries = async (items: TransactionItem[]): Promise<EmployeeSummary[]> => {
        const employeeMap = new Map<string, EmployeeSummary>();

        items.forEach(item => {
            if (!item.barber_id || !item.users) return;

            if (!employeeMap.has(item.barber_id)) {
                employeeMap.set(item.barber_id, {
                    id: item.barber_id,
                    name: item.users.name,
                    totalCommission: 0,
                    pendingItems: 0,
                    completedItems: 0,
                    noCommissionItems: 0,
                    totalTransactions: 0
                });
            }

            const employee = employeeMap.get(item.barber_id)!;
            
            if (item.commission_amount) {
                employee.totalCommission += item.commission_amount;
            }

            if (item.services?.type === 'service') {
                if (!item.commission_status || item.commission_status === 'pending' || item.commission_status === 'pending_rule') {
                    employee.pendingItems++;
                } else if (item.commission_status === 'credited') {
                    employee.completedItems++;
                }
            } else if (item.services?.type === 'product') {
                employee.noCommissionItems++;
            }

            employee.totalTransactions++;
        });

        return Array.from(employeeMap.values());
    };

    // FUNGSI: Handle buka modal
    const handleOpenModal = (item: TransactionItem) => {
        setSelectedItem(item);
        setCommissionType(item.commission_type || 'percentage');
        setCommissionValue(item.commission_value?.toString() || '');
        setIsModalOpen(true);
    };

    // FUNGSI: Handle buka batch modal
    const handleOpenBatchModal = () => {
        if (selectedItems.length === 0) {
            toast({
                title: "Pilih Item Terlebih Dahulu",
                description: "Silakan pilih minimal satu item untuk di-edit secara batch",
                variant: "destructive"
            });
            return;
        }
        setIsBatchModalOpen(true);
    };

    // FUNGSI: Handle select/deselect item
    const toggleItemSelection = (itemId: string) => {
        setSelectedItems(prev => 
            prev.includes(itemId)
                ? prev.filter(id => id !== itemId)
                : [...prev, itemId]
        );
    };

    // FUNGSI: Select all filtered items
    const selectAllItems = () => {
        setSelectedItems(filteredItems
            .filter(item => item.services?.type === 'service' && item.commission_status !== 'no_commission')
            .map(item => item.id)
        );
    };

    // FUNGSI: Deselect all items
    const deselectAllItems = () => {
        setSelectedItems([]);
    };

    // 🔥 FUNGSI: Save commission - VERSI FIXED
    const handleSaveCommission = async (itemId?: string, type?: 'percentage' | 'fixed', value?: string) => {
        const targetItem = itemId ? allItems.find(item => item.id === itemId) : selectedItem;
        const targetType = type || commissionType;
        const targetValue = value || commissionValue;

        if (!targetItem || !targetValue) {
            toast({ title: "Data tidak lengkap", variant: "destructive" });
            return;
        }
        
        setIsProcessing(true);
        try {
            const numericValue = targetType === 'percentage' ? parseFloat(targetValue) : parseNominal(targetValue);
            
            if (targetType === 'percentage' && (numericValue <= 0 || numericValue > 100)) {
                toast({ title: "Persentase harus antara 1-100%", variant: "destructive" });
                return;
            }
            
            if (targetType === 'fixed' && numericValue <= 0) {
                toast({ title: "Nominal komisi harus lebih dari 0", variant: "destructive" });
                return;
            }

            // Hitung komisi
            const commissionPerItem = targetType === 'percentage'
                ? targetItem.unit_price * (numericValue / 100)
                : numericValue;

            const totalCommission = commissionPerItem * targetItem.quantity;

            console.log('💾 Saving commission for item:', targetItem.id);
            
            // Update transaction item commission
            const { error: updateError } = await supabase
                .from('transaction_items')
                .update({
                    commission_type: targetType,
                    commission_value: numericValue,
                    commission_amount: totalCommission,
                    commission_status: 'credited',
                    updated_at: new Date().toISOString()
                })
                .eq('id', targetItem.id);

            if (updateError) throw updateError;

            // Simpan ke commission_rules untuk automasi masa depan
            if (targetItem.services?.type === 'service') {
                const { error: ruleError } = await supabase
                    .from('commission_rules')
                    .upsert({
                        user_id: targetItem.barber_id,
                        service_id: targetItem.service_id,
                        commission_type: targetType,
                        commission_value: numericValue,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,service_id'
                    });

                if (ruleError) {
                    console.warn('⚠️ Commission rules warning:', ruleError);
                }
            }

            toast({ 
                title: "✅ Komisi Berhasil Disimpan",
                description: `Komisi untuk ${targetItem.services?.name} berhasil ditetapkan.`
            });
            
            if (!itemId) {
                setIsModalOpen(false);
            }
            
            // Refresh data
            await fetchAllItems();
            
        } catch (error) {
            console.error('❌ Error saving commission:', error);
            
            let errorMessage = "Terjadi kesalahan sistem";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            toast({
                title: "Gagal Menyimpan Komisi",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // 🔥 FUNGSI: Save batch commissions
    const handleSaveBatchCommissions = async () => {
        if (selectedItems.length === 0 || !commissionValue) {
            toast({ title: "Data tidak lengkap", variant: "destructive" });
            return;
        }
        
        setIsProcessing(true);
        try {
            const numericValue = commissionType === 'percentage' ? parseFloat(commissionValue) : parseNominal(commissionValue);
            
            if (commissionType === 'percentage' && (numericValue <= 0 || numericValue > 100)) {
                toast({ title: "Persentase harus antara 1-100%", variant: "destructive" });
                return;
            }
            
            if (commissionType === 'fixed' && numericValue <= 0) {
                toast({ title: "Nominal komisi harus lebih dari 0", variant: "destructive" });
                return;
            }

            // Process each selected item
            for (const itemId of selectedItems) {
                const item = allItems.find(i => i.id === itemId);
                if (!item || item.services?.type !== 'service') continue;

                // Hitung komisi
                const commissionPerItem = commissionType === 'percentage'
                    ? item.unit_price * (numericValue / 100)
                    : numericValue;

                const totalCommission = commissionPerItem * item.quantity;

                // Update transaction item commission
                const { error: updateError } = await supabase
                    .from('transaction_items')
                    .update({
                        commission_type: commissionType,
                        commission_value: numericValue,
                        commission_amount: totalCommission,
                        commission_status: 'credited',
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', itemId);

                if (updateError) throw updateError;

                // Simpan ke commission_rules
                const { error: ruleError } = await supabase
                    .from('commission_rules')
                    .upsert({
                        user_id: item.barber_id,
                        service_id: item.service_id,
                        commission_type: commissionType,
                        commission_value: numericValue,
                        updated_at: new Date().toISOString()
                    }, {
                        onConflict: 'user_id,service_id'
                    });

                if (ruleError) {
                    console.warn('⚠️ Commission rules warning:', ruleError);
                }
            }

            toast({ 
                title: "✅ Komisi Batch Berhasil Disimpan",
                description: `Komisi untuk ${selectedItems.length} item berhasil ditetapkan.`
            });
            
            setIsBatchModalOpen(false);
            setSelectedItems([]);
            
            // Refresh data
            await fetchAllItems();
            
        } catch (error) {
            console.error('❌ Error saving batch commissions:', error);
            
            let errorMessage = "Terjadi kesalahan sistem";
            if (error instanceof Error) {
                errorMessage = error.message;
            }
            
            toast({
                title: "Gagal Menyimpan Komisi",
                description: errorMessage,
                variant: "destructive",
            });
        } finally {
            setIsProcessing(false);
        }
    };

    // EFFECT: Load data pertama kali
    useEffect(() => {
        const initializeData = async () => {
            await Promise.all([
                fetchActiveBarbers(),
                fetchServiceCategories(),
                fetchAllItems()
            ]);
        };
        
        initializeData();

        // Realtime listener
        const transactionItemsChannel = supabase
            .channel('transaction_items_changes')
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'transaction_items' 
                }, 
                (payload) => {
                    console.log('🔄 Realtime change detected');
                    fetchAllItems();
                }
            )
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'transactions' 
                }, 
                (payload) => {
                    console.log('🔄 Realtime transaction change');
                    fetchAllItems();
                }
            )
            .on('postgres_changes', 
                { 
                    event: '*', 
                    schema: 'public', 
                    table: 'commission_rules' 
                }, 
                (payload) => {
                    console.log('🔄 Realtime commission rule change');
                    fetchAllItems();
                }
            )
            .subscribe();

        // Subscribe to global events
        const eventsChannel = subscribeToEvents((event, payload) => {
            if (event === 'commission_updated' || event === 'transaction_created') {
                fetchAllItems();
            }
        });

        return () => {
            supabase.removeChannel(transactionItemsChannel);
            supabase.removeChannel(eventsChannel);
        };
    }, [fetchAllItems, fetchActiveBarbers, fetchServiceCategories]);

    // EFFECT: Filter data
    useEffect(() => {
        let filtered = allItems;

        // Filter pencarian
        if (searchTerm) {
            const lowercasedFilter = searchTerm.toLowerCase();
            filtered = filtered.filter(item => {
                const serviceName = item.services?.name || '';
                const userName = item.users?.name || '';
                const transactionNumber = item.transactions?.transaction_number || '';
                const customerName = item.transactions?.customer_name || '';
                
                return (
                    serviceName.toLowerCase().includes(lowercasedFilter) ||
                    userName.toLowerCase().includes(lowercasedFilter) ||
                    transactionNumber.toLowerCase().includes(lowercasedFilter) ||
                    customerName.toLowerCase().includes(lowercasedFilter)
                );
            });
        }

        // Filter status komisi
        if (filters.status !== 'all') {
            filtered = filtered.filter(item => {
                if (filters.status === 'pending') {
                    return item.services?.type === 'service' && 
                           (!item.commission_status || item.commission_status === 'pending' || item.commission_status === 'pending_rule');
                } else if (filters.status === 'completed') {
                    return item.commission_status === 'credited';
                } else if (filters.status === 'no_commission') {
                    return item.services?.type === 'product' || item.commission_status === 'no_commission';
                }
                return true;
            });
        }

        // Filter barber
        if (filters.barber !== 'all') {
            filtered = filtered.filter(item => item.barber_id === filters.barber);
        }

        // Filter service category
        if (filters.serviceCategory !== 'all') {
            // Implement category filtering if needed
        }

        // Filter tanggal
        const now = new Date();
        if (filters.dateRange !== 'all') {
            filtered = filtered.filter(item => {
                const itemDate = new Date(item.created_at);
                switch (filters.dateRange) {
                    case 'today':
                        return itemDate.toDateString() === now.toDateString();
                    case 'week':
                        const startOfWeek = new Date(now);
                        startOfWeek.setDate(now.getDate() - now.getDay());
                        return itemDate >= startOfWeek;
                    case 'month':
                        return itemDate.getMonth() === now.getMonth() && 
                               itemDate.getFullYear() === now.getFullYear();
                    default:
                        return true;
                }
            });
        }

        setFilteredItems(filtered);
    }, [searchTerm, filters, allItems]);

    // FUNGSI: Dapatkan nama barber dari ID
    const getBarberName = (barberId: string) => {
        const barber = activeBarbers.find(b => b.id === barberId);
        return barber?.name || 'Unknown Barber';
    };

    const getStatusBadge = (item: TransactionItem) => {
        if (item.services?.type === 'product') {
            return (
                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    <Package className="h-3 w-3 mr-1" />
                    Produk - No Komisi
                </Badge>
            );
        } else if (item.commission_status === 'no_commission') {
            return (
                <Badge variant="outline" className="bg-gray-100 text-gray-700">
                    <XCircle className="h-3 w-3 mr-1" />
                    No Komisi
                </Badge>
            );
        } else if (!item.commission_status || item.commission_status === 'pending' || item.commission_status === 'pending_rule') {
            return (
                <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-200">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Belum Diatur
                </Badge>
            );
        } else if (item.commission_status === 'credited') {
            return (
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Sudah Diatur
                </Badge>
            );
        }
        return null;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const exportToCSV = () => {
        const headers = ['No Transaksi', 'Tanggal', 'Layanan', 'Tipe', 'Karyawan', 'Customer', 'Quantity', 'Harga', 'Total', 'Status Komisi', 'Tipe Komisi', 'Nilai Komisi', 'Total Komisi'];
        
        const csvData = filteredItems.map(item => [
            item.transactions?.transaction_number || '',
            new Date(item.created_at).toLocaleDateString('id-ID'),
            item.services?.name || '',
            item.services?.type === 'product' ? 'Produk' : 'Layanan',
            item.users?.name || '',
            item.transactions?.customer_name || '',
            item.quantity,
            formatNominal(item.unit_price),
            formatNominal(item.unit_price * item.quantity),
            item.commission_status === 'credited' ? 'Sudah Diatur' : 
            item.commission_status === 'no_commission' || item.services?.type === 'product' ? 'No Komisi' : 'Belum Diatur',
            item.commission_type || '',
            item.commission_value ? (item.commission_type === 'percentage' ? `${item.commission_value}%` : formatNominal(item.commission_value)) : '',
            item.commission_amount ? formatNominal(item.commission_amount) : ''
        ]);

        const csvContent = [headers, ...csvData]
            .map(row => row.map(field => `"${field}"`).join(','))
            .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', `laporan-komisi-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const toggleEmployeeExpansion = (employeeId: string) => {
        setExpandedEmployees(prev => {
            const newSet = new Set(prev);
            if (newSet.has(employeeId)) {
                newSet.delete(employeeId);
            } else {
                newSet.add(employeeId);
            }
            return newSet;
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Kontrol Komisi</h1>
                    <p className="text-gray-600">Kelola dan pantau semua komisi transaksi</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={exportToCSV} className="gap-2">
                        <Download className="h-4 w-4" />
                        Export CSV
                    </Button>
                    <Button onClick={fetchAllItems} disabled={loading} className="gap-2">
                        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b pb-2">
                <Button
                    variant={activeTab === 'transactions' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('transactions')}
                    className="gap-2"
                >
                    <FileText className="h-4 w-4" />
                    Transaksi
                </Button>
                <Button
                    variant={activeTab === 'summary' ? 'default' : 'ghost'}
                    onClick={() => setActiveTab('summary')}
                    className="gap-2"
                >
                    <BarChart3 className="h-4 w-4" />
                    Summary Karyawan
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Total Items
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{stats.totalItems}</div>
                        <p className="text-xs text-gray-600">semua item transaksi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-yellow-600" />
                            Perlu Diatur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-yellow-600">{stats.pendingItems}</div>
                        <p className="text-xs text-gray-600">layanan butuh komisi</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4 text-green-600" />
                            Sudah Diatur
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-600">{stats.completedItems}</div>
                        <p className="text-xs text-gray-600">komisi terselesaikan</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                            <Package className="h-4 w-4 text-gray-600" />
                            No Komisi
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-gray-600">{stats.noCommissionItems}</div>
                        <p className="text-xs text-gray-600">produk & layanan tanpa komisi</p>
                    </CardContent>
                </Card>
            </div>

            {/* Transactions Tab */}
            {activeTab === 'transactions' && (
                <>
                    {/* Filters */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Filter className="h-5 w-5" />
                                Filter & Pencarian
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="relative md:col-span-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Cari transaksi, layanan, karyawan, customer..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="pl-10"
                                    />
                                </div>

                                <Select 
                                    value={filters.status} 
                                    onValueChange={(value: 'all' | 'pending' | 'completed' | 'no_commission') => 
                                        setFilters(prev => ({ ...prev, status: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Filter Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">Semua Status</SelectItem>
                                        <SelectItem value="pending">Belum Diatur</SelectItem>
                                        <SelectItem value="completed">Sudah Diatur</SelectItem>
                                        <SelectItem value="no_commission">No Komisi</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select 
                                    value={filters.dateRange} 
                                    onValueChange={(value: 'today' | 'week' | 'month' | 'all') => 
                                        setFilters(prev => ({ ...prev, dateRange: value }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Periode Waktu" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="today">Hari Ini</SelectItem>
                                        <SelectItem value="week">Minggu Ini</SelectItem>
                                        <SelectItem value="month">Bulan Ini</SelectItem>
                                        <SelectItem value="all">Semua Waktu</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Filter Karyawan */}
                            {activeBarbers.length > 0 && (
                                <div className="mt-4">
                                    <Label className="text-sm font-medium">Filter berdasarkan Karyawan</Label>
                                    <div className="flex flex-wrap gap-2 mt-2">
                                        <Button
                                            variant={filters.barber === 'all' ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setFilters(prev => ({ ...prev, barber: 'all' }))}
                                        >
                                            Semua Karyawan
                                        </Button>
                                        {activeBarbers.map(barber => (
                                            <Button
                                                key={barber.id}
                                                variant={filters.barber === barber.id ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setFilters(prev => ({ ...prev, barber: barber.id }))}
                                            >
                                                {barber.name}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Batch Actions */}
                            {selectedItems.length > 0 && (
                                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-blue-900">
                                                {selectedItems.length} item terpilih
                                            </p>
                                            <p className="text-sm text-blue-700">
                                                Pilih aksi untuk item yang dipilih
                                            </p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                onClick={handleOpenBatchModal}
                                                className="gap-2"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Edit Batch
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={deselectAllItems}
                                            >
                                                Batal Pilih
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Main Content */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Settings className="h-5 w-5" />
                                Daftar Semua Transaksi
                                <Badge variant="outline" className="ml-2">
                                    {filteredItems.length} items
                                </Badge>
                            </CardTitle>
                            <CardDescription>
                                Kelola komisi untuk semua transaksi - edit komisi yang belum diatur
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {/* Results */}
                                {loading ? (
                                    <div className="text-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary mb-4" />
                                        <p className="text-gray-600">Memuat data transaksi...</p>
                                    </div>
                                ) : filteredItems.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border-2 border-dashed">
                                        <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                        <p className="font-medium text-lg mb-2">
                                            {allItems.length === 0 
                                                ? "Belum Ada Transaksi" 
                                                : "Tidak Ditemukan Hasil"}
                                        </p>
                                        <p className="text-sm text-gray-400">
                                            {allItems.length === 0 
                                                ? "Belum ada transaksi yang tercatat dalam sistem." 
                                                : "Tidak ada transaksi yang sesuai dengan filter yang dipilih."}
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredItems.map(item => (
                                            <div key={item.id} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-all bg-white">
                                                <div className="flex items-start gap-2 md:gap-3">
                                                    <Checkbox
                                                        checked={selectedItems.includes(item.id)}
                                                        onCheckedChange={() => toggleItemSelection(item.id)}
                                                        className="mt-1 flex-shrink-0"
                                                        disabled={item.services?.type === 'product' || item.commission_status === 'no_commission'}
                                                    />
                                                    <div className="flex-1 min-w-0">
                                                        {/* Mobile Layout: Stack Everything */}
                                                        <div className="space-y-3">
                                                            {/* Header Section */}
                                                            <div className="flex items-start gap-2 md:gap-3">
                                                                <Avatar className="h-8 w-8 md:h-10 md:w-10 border-2 border-blue-100 flex-shrink-0">
                                                                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs md:text-sm font-semibold">
                                                                        {item.users?.name?.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) || '??'}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <div className="flex-1 min-w-0 space-y-1">
                                                                    <div className="flex items-start justify-between gap-2">
                                                                        <div className="min-w-0 flex-1">
                                                                            <p className="font-semibold text-sm md:text-base text-gray-900 truncate">
                                                                                {item.services?.name || 'Layanan Tidak Diketahui'}
                                                                            </p>
                                                                            <p className="text-xs md:text-sm text-gray-600 truncate">
                                                                                {item.users?.name || 'Karyawan Tidak Diketahui'}
                                                                            </p>
                                                                        </div>
                                                                        <div className="flex-shrink-0">
                                                                            {getStatusBadge(item)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Badges Section */}
                                                            <div className="flex flex-wrap gap-1.5 text-xs">
                                                                <Badge variant="outline" className="bg-gray-50 text-gray-700 text-[10px] md:text-xs">
                                                                    <Calendar className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                                                    {formatDate(item.created_at)}
                                                                </Badge>
                                                                {item.transactions?.customer_name && (
                                                                    <Badge variant="outline" className="bg-green-50 text-green-700 text-[10px] md:text-xs truncate max-w-[120px]">
                                                                        {item.transactions.customer_name}
                                                                    </Badge>
                                                                )}
                                                                {item.transactions?.payment_method && (
                                                                    <Badge variant="outline" className="bg-blue-50 text-blue-700 text-[10px] md:text-xs">
                                                                        {item.transactions.payment_method}
                                                                    </Badge>
                                                                )}
                                                                {item.services?.type === 'product' && (
                                                                    <Badge variant="outline" className="bg-gray-100 text-gray-700 text-[10px] md:text-xs">
                                                                        <Package className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                                                        Produk
                                                                    </Badge>
                                                                )}
                                                                {item.services?.type === 'service' && (
                                                                    <Badge variant="outline" className="bg-purple-100 text-purple-700 text-[10px] md:text-xs">
                                                                        <Sparkles className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />
                                                                        Layanan
                                                                    </Badge>
                                                                )}
                                                            </div>

                                                            {/* Transaction Number */}
                                                            <p className="text-[10px] md:text-xs text-gray-400 font-mono truncate">
                                                                #{item.transactions?.transaction_number || 'N/A'}
                                                            </p>

                                                            {/* Price Details Section */}
                                                            <div className="space-y-1 bg-gray-50 p-2 rounded">
                                                                <p className="text-xs md:text-sm text-gray-600">
                                                                    Harga: <span className="font-medium">Rp {formatNominal(item.unit_price)}</span>
                                                                </p>
                                                                <p className="text-xs md:text-sm text-gray-600">
                                                                    {item.quantity} × Rp {formatNominal(item.unit_price)} = 
                                                                    <span className="font-semibold text-gray-900">
                                                                        {' '}Rp {formatNominal(item.unit_price * item.quantity)}
                                                                    </span>
                                                                </p>
                                                                {item.commission_amount && (
                                                                    <p className="text-xs md:text-sm text-green-600 font-semibold">
                                                                        Komisi: Rp {formatNominal(item.commission_amount)}
                                                                    </p>
                                                                )}
                                                                {item.commission_type && item.commission_value && (
                                                                    <p className="text-[10px] md:text-xs text-gray-500">
                                                                        {item.commission_type === 'percentage' 
                                                                            ? `${item.commission_value}%` 
                                                                            : `Rp ${formatNominal(item.commission_value)}`
                                                                        } per item
                                                                    </p>
                                                                )}
                                                            </div>
                                                            
                                                            {/* Action Button */}
                                                            <Button 
                                                                size="sm"
                                                                onClick={() => handleOpenModal(item)}
                                                                className="w-full gap-2 h-9"
                                                                variant={!item.commission_status ? "default" : "outline"}
                                                                disabled={item.services?.type === 'product' || item.commission_status === 'no_commission'}
                                                            >
                                                                <Edit className="h-3 w-3 md:h-4 md:w-4" />
                                                                <span className="text-xs md:text-sm">
                                                                    {!item.commission_status ? "Atur Komisi" : "Edit Komisi"}
                                                                </span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Summary Tab */}
            {activeTab === 'summary' && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5" />
                            Summary Komisi per Karyawan
                        </CardTitle>
                        <CardDescription>
                            Ringkasan komisi dan performa setiap karyawan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {employeeSummaries.length === 0 ? (
                                <div className="text-center py-12 text-gray-500">
                                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                                    <p>Belum ada data komisi karyawan</p>
                                </div>
                            ) : (
                                employeeSummaries.map(employee => (
                                    <div key={employee.id} className="border rounded-lg p-4">
                                        <div className="flex items-center justify-between cursor-pointer" onClick={() => toggleEmployeeExpansion(employee.id)}>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-10 w-10">
                                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                                        {employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-semibold">{employee.name}</p>
                                                    <p className="text-sm text-gray-600">{employee.totalTransactions} transaksi</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-sm text-gray-600">Total Komisi</p>
                                                    <p className="font-bold text-green-600">Rp {formatNominal(employee.totalCommission)}</p>
                                                </div>
                                                {expandedEmployees.has(employee.id) ? (
                                                    <ChevronUp className="h-5 w-5 text-gray-400" />
                                                ) : (
                                                    <ChevronDown className="h-5 w-5 text-gray-400" />
                                                )}
                                            </div>
                                        </div>

                                        {expandedEmployees.has(employee.id) && (
                                            <div className="mt-4 pt-4 border-t space-y-3">
                                                <div className="grid grid-cols-2 gap-4 text-sm">
                                                    <div className="text-center">
                                                        <p className="font-semibold text-green-600">{employee.completedItems}</p>
                                                        <p className="text-gray-600">Sudah Diatur</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-semibold text-yellow-600">{employee.pendingItems}</p>
                                                        <p className="text-gray-600">Perlu Diatur</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-semibold text-gray-600">{employee.noCommissionItems}</p>
                                                        <p className="text-gray-600">No Komisi</p>
                                                    </div>
                                                    <div className="text-center">
                                                        <p className="font-semibold">{employee.totalTransactions}</p>
                                                        <p className="text-gray-600">Total Transaksi</p>
                                                    </div>
                                                </div>
                                                <Button 
                                                    size="sm" 
                                                    variant="outline" 
                                                    onClick={() => {
                                                        setFilters(prev => ({ ...prev, barber: employee.id, status: 'pending' }));
                                                        setActiveTab('transactions');
                                                    }}
                                                    className="w-full"
                                                >
                                                    Lihat Transaksi yang Perlu Diatur
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Commission Modal */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-600" />
                            {selectedItem?.commission_status ? "Edit Komisi" : "Atur Komisi"}
                        </DialogTitle>
                        <DialogDescription>
                            {selectedItem?.commission_status 
                                ? "Perbarui komisi untuk transaksi ini" 
                                : "Tetapkan komisi untuk transaksi ini"}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        {/* Transaction Info */}
                        <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Layanan:</span>
                                <span className="font-semibold">{selectedItem?.services?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Karyawan:</span>
                                <span className="font-semibold">{selectedItem?.users?.name}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Harga:</span>
                                <span className="font-semibold">Rp {formatNominal(selectedItem?.unit_price || 0)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Quantity:</span>
                                <span className="font-semibold">{selectedItem?.quantity}</span>
                            </div>
                            <div className="flex justify-between text-sm border-t pt-2">
                                <span className="text-gray-600 font-medium">Total:</span>
                                <span className="font-bold text-green-600">
                                    Rp {formatNominal((selectedItem?.unit_price || 0) * (selectedItem?.quantity || 0))}
                                </span>
                            </div>
                        </div>

                        {/* Commission Type */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Tipe Komisi</Label>
                            <Select 
                                value={commissionType} 
                                onValueChange={(v: 'percentage' | 'fixed') => {
                                    setCommissionType(v);
                                    setCommissionValue('');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe komisi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                                    <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Commission Value */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                {commissionType === 'percentage' ? 'Nilai Persentase (%)' : 'Nilai Nominal (Rp)'}
                            </Label>
                            <Input
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(
                                    commissionType === 'fixed'
                                        ? formatNominal(e.target.value)
                                        : e.target.value.replace(/[^0-9.]/g, '')
                                )}
                                placeholder={commissionType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                                className="text-lg"
                            />
                        </div>

                        {/* Preview Calculation */}
                        {commissionValue && selectedItem && (
                            <div className="p-3 bg-blue-50 rounded-lg space-y-1">
                                <p className="text-sm font-medium text-blue-900">Preview Komisi:</p>
                                <div className="flex justify-between text-sm">
                                    <span>Per Item:</span>
                                    <span className="font-semibold">
                                        {commissionType === 'percentage' 
                                            ? `${commissionValue}% × Rp ${formatNominal(selectedItem.unit_price)}`
                                            : `Rp ${formatNominal(commissionValue)}`
                                        }
                                    </span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span>Total Komisi:</span>
                                    <span className="font-bold text-green-600">
                                        Rp {formatNominal(
                                            commissionType === 'percentage'
                                                ? (selectedItem.unit_price * (parseFloat(commissionValue) / 100)) * selectedItem.quantity
                                                : parseNominal(commissionValue) * selectedItem.quantity
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsModalOpen(false)}
                            disabled={isProcessing}
                        >
                            Batal
                        </Button>
                        <Button 
                            onClick={() => handleSaveCommission()} 
                            disabled={isProcessing || !commissionValue}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4" />
                            )}
                            {isProcessing ? "Menyimpan..." : "Simpan Komisi"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Batch Commission Modal */}
            <Dialog open={isBatchModalOpen} onOpenChange={setIsBatchModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-blue-600" />
                            Edit Komisi Batch
                        </DialogTitle>
                        <DialogDescription>
                            Atur komisi untuk {selectedItems.length} item sekaligus
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm font-medium text-blue-900">
                                {selectedItems.length} item terpilih
                            </p>
                            <p className="text-xs text-blue-700">
                                Komisi akan diterapkan ke semua item yang dipilih
                            </p>
                        </div>

                        {/* Commission Type */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">Tipe Komisi</Label>
                            <Select 
                                value={commissionType} 
                                onValueChange={(v: 'percentage' | 'fixed') => {
                                    setCommissionType(v);
                                    setCommissionValue('');
                                }}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Pilih tipe komisi" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="percentage">Persentase (%)</SelectItem>
                                    <SelectItem value="fixed">Nominal Tetap (Rp)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Commission Value */}
                        <div className="space-y-2">
                            <Label className="text-sm font-medium">
                                {commissionType === 'percentage' ? 'Nilai Persentase (%)' : 'Nilai Nominal (Rp)'}
                            </Label>
                            <Input
                                value={commissionValue}
                                onChange={(e) => setCommissionValue(
                                    commissionType === 'fixed'
                                        ? formatNominal(e.target.value)
                                        : e.target.value.replace(/[^0-9.]/g, '')
                                )}
                                placeholder={commissionType === 'percentage' ? 'Contoh: 10' : 'Contoh: 5000'}
                                className="text-lg"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button 
                            variant="outline" 
                            onClick={() => setIsBatchModalOpen(false)}
                            disabled={isProcessing}
                        >
                            Batal
                        </Button>
                        <Button 
                            onClick={handleSaveBatchCommissions} 
                            disabled={isProcessing || !commissionValue}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            {isProcessing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Settings className="h-4 w-4" />
                            )}
                            {isProcessing ? "Menyimpan..." : `Simpan ke ${selectedItems.length} Item`}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}