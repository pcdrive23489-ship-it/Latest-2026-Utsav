
"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useEffect, useState, useMemo, useRef } from "react";
import Papa from "papaparse";
import Image from "next/image";
import { 
    getEvents,
    saveEvent,
    deleteEvent,
    getDonationTransparency,
    saveDonationTransparency,
    getFinanceVisibility,
    saveFinanceVisibility,
    getCollections,
    getFinanceData,
    overwriteCollections,
    getCountdowns,
    saveCountdown,
    deleteCountdown,
    getAnnouncements,
    saveAnnouncement,
    deleteAnnouncement,
    getStorageCleanupLog,
} from "@/services/database";
import type { FestivalEvent, DonationTransparency, CollectionEntry, FinanceData, Countdown, Announcement, StorageCleanupLog } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Settings, PlusCircle, Trash2, Edit, Eye, EyeOff, FileDown, FileUp, Save, Upload, Timer, IndianRupee, Megaphone } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import BackButton from "@/components/back-button";


function AnnouncementFormDialog({ open, onOpenChange, onSave, announcement }: { open: boolean; onOpenChange: (open: boolean) => void; onSave: (announcement: Omit<Announcement, 'id'>, id?: string) => Promise<void>; announcement: Announcement | null; }) {
    const [formData, setFormData] = useState({ title: '', content: '' });
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = useMemo(() => !!announcement, [announcement]);

    useEffect(() => {
        if (announcement) {
            setFormData({ title: announcement.title, content: announcement.content });
        } else {
            setFormData({ title: '', content: '' });
        }
    }, [announcement]);

    const handleSave = async () => {
        setIsSaving(true);
        await onSave(formData, announcement?.id);
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Announcement' : 'Add New Announcement'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Title</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Evening Aarti" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="content">Content</Label>
                        <Textarea id="content" value={formData.content} onChange={(e) => setFormData({ ...formData, content: e.target.value })} placeholder="Describe the announcement..." />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Announcement
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function CountdownFormDialog({ open, onOpenChange, onSave, countdown }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (countdown: Omit<Countdown, 'id'>, id?: string) => Promise<void>, countdown: Countdown | null }) {
    const [formData, setFormData] = useState({ name: '', targetDate: '' });
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = useMemo(() => !!countdown, [countdown]);

    useEffect(() => {
        if (countdown) {
            const formattedDate = countdown.targetDate ? new Date(countdown.targetDate).toISOString().slice(0, 16) : '';
            setFormData({ name: countdown.name, targetDate: formattedDate });
        } else {
            setFormData({ name: '', targetDate: '' });
        }
    }, [countdown]);
    
    const handleSave = async () => {
        setIsSaving(true);
        const countdownToSave = {
            name: formData.name,
            targetDate: formData.targetDate ? new Date(formData.targetDate).toISOString() : ''
        };
        await onSave(countdownToSave, countdown?.id);
        setIsSaving(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Countdown' : 'Add New Countdown'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="name">Countdown Name</Label>
                        <Input id="name" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="e.g., Prana Pratishthapana"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="targetDate">Target Date & Time</Label>
                        <Input id="targetDate" type="datetime-local" value={formData.targetDate} onChange={(e) => setFormData({...formData, targetDate: e.target.value})} />
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Countdown
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function EventFormDialog({ open, onOpenChange, onSave, event }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (event: Omit<FestivalEvent, 'id'>, id?: string) => Promise<void>, event: FestivalEvent | null }) {
    const [formData, setFormData] = useState({ title: '', date: '', time: '', description: ''});
    const [isSaving, setIsSaving] = useState(false);
    const isEditMode = useMemo(() => !!event, [event]);

    useEffect(() => {
        if(event) {
            setFormData({ title: event.title, date: event.date, time: event.time, description: event.description });
        } else {
            setFormData({ title: '', date: '', time: '', description: '' });
        }
    }, [event])
    
    const handleSave = async () => {
        setIsSaving(true);
        await onSave(formData, event?.id);
        setIsSaving(false);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Event' : 'Add New Event'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="title">Event Title</Label>
                        <Input id="title" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="date">Date</Label>
                        <Input id="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} placeholder="e.g., Day 1 or Daily" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="time">Time</Label>
                        <Input id="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} placeholder="e.g., 9:00 AM"/>
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input id="description" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} />
                    </div>
                </div>
                 <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Event
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function SuperAdminPage() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const importFileRef = useRef<HTMLInputElement>(null);
    const qrCodeFileRef = useRef<HTMLInputElement>(null);
    
    const [countdowns, setCountdowns] = useState<Countdown[]>([]);
    const [isCountdownFormOpen, setIsCountdownFormOpen] = useState(false);
    const [currentCountdown, setCurrentCountdown] = useState<Countdown | null>(null);
    
    const [events, setEvents] = useState<FestivalEvent[]>([]);
    const [isEventFormOpen, setIsEventFormOpen] = useState(false);
    const [currentEvent, setCurrentEvent] = useState<FestivalEvent | null>(null);

    const [donationSettings, setDonationSettings] = useState<DonationTransparency>({ decoration: 40, prasad: 30, programs: 20, logistics: 10, qrCodeUrl: '', upiId: '' });
    
    const [financeVisible, setFinanceVisible] = useState(false);
    
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
    const [currentAnnouncement, setCurrentAnnouncement] = useState<Announcement | null>(null);

    const [cleanupLog, setCleanupLog] = useState<StorageCleanupLog[]>([]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const [fetchedCountdowns, fetchedEvents, percentages, financeVisibility, fetchedAnnouncements, fetchedCleanupLog] = await Promise.all([
                getCountdowns(),
                getEvents(),
                getDonationTransparency(),
                getFinanceVisibility(),
                getAnnouncements(),
                getStorageCleanupLog(),
            ]);
            setCountdowns(fetchedCountdowns);
            setEvents(fetchedEvents);
            setDonationSettings(percentages);
            setFinanceVisible(financeVisibility);
            setAnnouncements(fetchedAnnouncements);
            setCleanupLog(fetchedCleanupLog);
        } catch (error) {
            console.error("Failed to fetch super admin data:", error);
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load all administrative data.'
            });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
       fetchAllData();
    }, []);

    const handleSaveAnnouncement = async (announcement: Omit<Announcement, 'id'>, id?: string) => {
        try {
            await saveAnnouncement(announcement, id);
            toast({ title: "Announcement Saved" });
            fetchAllData();
        } catch (error) {
            toast({ variant: "destructive", title: "Save Failed", description: "Could not save the announcement." });
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this announcement?")) return;
        try {
            await deleteAnnouncement(id);
            toast({ title: "Announcement Deleted" });
            fetchAllData();
        } catch (error) {
            toast({ variant: "destructive", title: "Delete Failed" });
        }
    };

    const handleSaveCountdown = async (countdown: Omit<Countdown, 'id'>, id?: string) => {
        try {
            await saveCountdown(countdown, id);
            toast({ title: "Countdown Saved", description: "The countdown timer has been updated." });
            fetchAllData();
        } catch (error) {
            console.error("Error saving countdown:", error);
            toast({ variant: "destructive", title: "Update Failed", description: "Could not save the new countdown." });
        }
    };

    const handleDeleteCountdown = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this countdown?")) return;
        try {
            await deleteCountdown(id);
            toast({ title: "Countdown Deleted" });
            fetchAllData();
        } catch (error) {
             console.error("Error deleting countdown:", error);
             toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the countdown." });
        }
    };


    const handleSaveEvent = async (event: Omit<FestivalEvent, 'id'>, id?: string) => {
        try {
            await saveEvent(event, id);
            toast({ title: "Event Saved", description: "The event list has been updated." });
            fetchAllData();
        } catch (error) {
             console.error("Error saving event:", error);
             toast({ variant: "destructive", title: "Save Failed", description: "Could not save the event." });
        }
    }

    const handleDeleteEvent = async (id: string) => {
        if(!window.confirm("Are you sure you want to delete this event?")) return;
        try {
            await deleteEvent(id);
            toast({ title: "Event Deleted" });
            fetchAllData();
        } catch (error) {
             console.error("Error deleting event:", error);
             toast({ variant: "destructive", title: "Delete Failed", description: "Could not delete the event." });
        }
    }

    const handleSaveDonations = async () => {
        try {
            await saveDonationTransparency(donationSettings);
            toast({ title: "Donation Settings Saved" });
        } catch (error) {
            console.error("Error saving donation settings:", error);
            toast({ variant: "destructive", title: "Save Failed" });
        }
    }

    const handleToggleFinanceVisibility = async (visible: boolean) => {
        setFinanceVisible(visible);
        try {
            await saveFinanceVisibility(visible);
            toast({ title: `Finance Page for Members ${visible ? 'Enabled' : 'Disabled'}` });
        } catch (error) {
            console.error("Error saving finance visibility:", error);
            toast({ variant: "destructive", title: "Update Failed" });
            setFinanceVisible(!visible); // Revert on error
        }
    }
    
    const triggerImport = () => {
        importFileRef.current?.click();
    };

    const handleImportCollections = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!window.confirm("Are you sure you want to import this file? This will overwrite all existing collection data.")) {
            return;
        }

        setLoading(true);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    // We expect 'id' column to be ignored, and numbers to be parsed.
                    const importedData = results.data.map((row: any) => ({
                        section: row.section || 'Uncategorized',
                        name: row.name || 'Anonymous',
                        date: row.date || new Date().toISOString().split('T')[0],
                        expected: Number(row.expected || 0),
                        received: Number(row.received || 0),
                        status: row.status === 'Paid' ? 'Paid' : 'Pending',
                    }));

                    await overwriteCollections(importedData as Omit<CollectionEntry, 'id'>[]);
                    toast({ title: "Import Successful", description: `${importedData.length} records have been imported.` });
                } catch (err) {
                    console.error("Import failed:", err);
                    toast({ variant: "destructive", title: "Import Failed", description: (err as Error).message });
                } finally {
                    setLoading(false);
                    // Reset file input
                    if (importFileRef.current) {
                        importFileRef.current.value = "";
                    }
                }
            },
            error: (err) => {
                toast({ variant: "destructive", title: "CSV Parsing Error", description: err.message });
                setLoading(false);
            }
        });
    };

    const handleExportCollections = async () => {
        setLoading(true);
        try {
            const collections = await getCollections();
            const csv = Papa.unparse(collections);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "collections_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            toast({ variant: "destructive", title: "Export Failed", description: (err as Error).message });
        } finally {
            setLoading(false);
        }
    };
    
    const handleExportFinance = async () => {
        setLoading(true);
        try {
            const financeData = await getFinanceData();
            const collections = await getCollections();
            
            const totalCollections = collections.reduce((sum, item) => sum + item.received, 0);
            
            const summary = [
                { category: 'INCOME', item: 'Donations (Static)', amount: financeData.income.find(i => i.item === 'Donations')?.amount || 0 },
                { category: 'INCOME', item: 'Sponsorships', amount: financeData.income.find(i => i.item === 'Sponsorships')?.amount || 0 },
                { category: 'INCOME', item: 'Collections (Received)', amount: totalCollections },
                { category: '', item: '', amount: '' },
                { category: 'EXPENSES', item: 'Mandap Decoration', amount: financeData.expenses.find(e => e.item === 'Mandap Decoration')?.amount || 0 },
                { category: 'EXPENSES', item: 'Prasad & Bhog', amount: financeData.expenses.find(e => e.item === 'Prasad & Bhog')?.amount || 0 },
                { category: 'EXPENSES', item: 'Cultural Programs', amount: financeData.expenses.find(e => e.item === 'Cultural Programs')?.amount || 0 },
                { category: 'EXPENSES', item: 'Logistics', amount: financeData.expenses.find(e => e.item === 'Logistics')?.amount || 0 },
                 { category: '', item: '', amount: '' },
                { category: 'ASSETS', item: 'Cash in Hand', amount: financeData.assets.find(a => a.item === 'Cash in Hand')?.amount || 0 },
                { category: 'ASSETS', item: 'Bank Balance', amount: financeData.assets.find(a => a.item === 'Bank Balance')?.amount || 0 },
                 { category: '', item: '', amount: '' },
                { category: 'LIABILITIES', item: 'Advance from Sponsors', amount: financeData.liabilities.find(l => l.item === 'Advance from Sponsors')?.amount || 0 },
                { category: 'LIABILITIES', item: 'Unpaid Vendor Bills', amount: financeData.liabilities.find(l => l.item === 'Unpaid Vendor Bills')?.amount || 0 },
            ];

            const csv = Papa.unparse(summary);
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement("a");
            link.href = URL.createObjectURL(blob);
            link.setAttribute("download", "financial_summary.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (err) {
            toast({ variant: "destructive", title: "Export Failed", description: (err as Error).message });
        } finally {
            setLoading(false);
        }
    };
    
    const handleQrCodeFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64String = reader.result as string;
            setDonationSettings(prev => ({...prev, qrCodeUrl: base64String}));
             toast({ title: "QR Code Ready", description: "New QR code is ready to be saved." });
        };
        reader.readAsDataURL(file);
    };


    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }


    return (
        <div className="space-y-8">
            <div className="flex items-center gap-4">
              <BackButton className="hidden lg:inline-flex"/>
              <div>
                <h1 className="text-3xl font-bold">Super Admin Controls</h1>
                <p className="text-muted-foreground">Manage core festival settings and content.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>Donation Settings</CardTitle>
                            <CardDescription>Manage UPI ID and fund distribution for the public donation page.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label htmlFor="upiId">UPI ID</Label>
                                <Input id="upiId" value={donationSettings.upiId || ''} onChange={(e) => setDonationSettings({...donationSettings, upiId: e.target.value})} placeholder="your-upi-id@bank" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Decoration (%)</Label>
                                    <Input type="number" value={donationSettings.decoration} onChange={(e) => setDonationSettings({...donationSettings, decoration: +e.target.value})} />
                                </div>
                                <div className="space-y-2">
                                    <Label>Prasad (%)</Label>
                                    <Input type="number" value={donationSettings.prasad} onChange={(e) => setDonationSettings({...donationSettings, prasad: +e.target.value})} />
                                </div>
                                    <div className="space-y-2">
                                    <Label>Programs (%)</Label>
                                    <Input type="number" value={donationSettings.programs} onChange={(e) => setDonationSettings({...donationSettings, programs: +e.target.value})} />
                                </div>
                                    <div className="space-y-2">
                                    <Label>Logistics (%)</Label>
                                    <Input type="number" value={donationSettings.logistics} onChange={(e) => setDonationSettings({...donationSettings, logistics: +e.target.value})} />
                                </div>
                            </div>
                            <Button onClick={handleSaveDonations}><Save className="mr-2 h-4 w-4" /> Save Donation Settings</Button>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Countdown Timers</CardTitle>
                                <CardDescription>Add, edit, or delete countdowns for the dashboard.</CardDescription>
                            </div>
                             <Button size="sm" onClick={() => { setCurrentCountdown(null); setIsCountdownFormOpen(true);}}>
                                <Timer className="mr-2 h-4 w-4"/> Add Countdown
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Target Date</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {countdowns.map((countdown) => (
                                        <TableRow key={countdown.id}>
                                            <TableCell className="font-medium">{countdown.name}</TableCell>
                                            <TableCell>{new Date(countdown.targetDate).toLocaleString()}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" onClick={() => { setCurrentCountdown(countdown); setIsCountdownFormOpen(true);}}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteCountdown(countdown.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                     
                    <Card>
                        <CardHeader>
                            <CardTitle>Data Management</CardTitle>
                            <CardDescription>Export or import festival data. Importing will overwrite existing data.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-2">
                             <Button variant="outline" onClick={handleExportCollections}>
                                <FileDown className="mr-2 h-4 w-4" /> Export Collections
                            </Button>
                             <Button variant="outline" onClick={handleExportFinance}>
                                <FileDown className="mr-2 h-4 w-4" /> Export Financial Summary
                            </Button>
                             <Button variant="outline" onClick={triggerImport}>
                                <FileUp className="mr-2 h-4 w-4" /> Import Collections
                            </Button>                             
                             <input 
                                type="file" 
                                ref={importFileRef}
                                className="hidden"
                                accept=".csv"
                                onChange={handleImportCollections}
                            />
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Announcements</CardTitle>
                                <CardDescription>Manage announcements displayed on the dashboard.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => { setCurrentAnnouncement(null); setIsAnnouncementFormOpen(true); }}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Announcement
                            </Button>
                        </CardHeader>
                        <CardContent>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {announcements.map((ann) => (
                                        <TableRow key={ann.id}>
                                            <TableCell className="font-medium">{ann.title}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" onClick={() => { setCurrentAnnouncement(ann); setIsAnnouncementFormOpen(true);}}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteAnnouncement(ann.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-8">
                     <Card>
                        <CardHeader>
                            <CardTitle>QR Code Management</CardTitle>
                            <CardDescription>Update the QR code image for donations.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex flex-col items-center">
                                <Image
                                    src={donationSettings.qrCodeUrl || "https://placehold.co/250x250.png"}
                                    alt="Current UPI QR Code"
                                    width={150}
                                    height={150}
                                    className="rounded-lg border p-2"
                                    data-ai-hint="QR code"
                                />
                            </div>
                             <div className="space-y-4">
                                <input
                                    type="file"
                                    ref={qrCodeFileRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleQrCodeFileChange}
                                />
                                <Button variant="outline" onClick={() => qrCodeFileRef.current?.click()} className="w-full">
                                    <Upload className="mr-2 h-4 w-4" /> Change QR Code
                                </Button>
                                <Button onClick={handleSaveDonations} className="w-full"><Save className="mr-2 h-4 w-4" /> Save QR Code</Button>
                            </div>
                        </CardContent>
                    </Card>

                     <Card>
                        <CardHeader>
                            <CardTitle>Finance Page Visibility</CardTitle>
                            <CardDescription>Control whether members can view the finance page.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-2">
                                <Switch id="finance-visibility" checked={financeVisible} onCheckedChange={handleToggleFinanceVisibility} />
                                <Label htmlFor="finance-visibility">{financeVisible ? <span className="flex items-center"><Eye className="mr-2 h-4 w-4" />Visible to Members</span> : <span className="flex items-center"><EyeOff className="mr-2 h-4 w-4" />Hidden from Members</span>}</Label>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Event Schedule Management</CardTitle>
                                <CardDescription>Add, edit, or delete events from the schedule.</CardDescription>
                            </div>
                            <Button size="sm" onClick={() => { setCurrentEvent(null); setIsEventFormOpen(true);}}>
                                <PlusCircle className="mr-2 h-4 w-4"/> Add Event
                            </Button>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Title</TableHead>
                                        <TableHead>Date &amp; Time</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {events.map((event) => (
                                        <TableRow key={event.id}>
                                            <TableCell className="font-medium">{event.title}</TableCell>
                                            <TableCell>{event.date}, {event.time}</TableCell>
                                            <TableCell className="text-right space-x-2">
                                                <Button variant="outline" size="icon" onClick={() => { setCurrentEvent(event); setIsEventFormOpen(true);}}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="destructive" size="icon" onClick={() => handleDeleteEvent(event.id)}>
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Storage Cleanup Log</CardTitle>
                    <CardDescription>Audit trail of automatic deletions of orphaned chat-media files.</CardDescription>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    {cleanupLog.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4">No cleanup events recorded yet.</p>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>File Path</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">When</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {cleanupLog.map((entry) => (
                                    <TableRow key={entry.id}>
                                        <TableCell className="font-mono text-xs break-all max-w-xs">{entry.path}</TableCell>
                                        <TableCell>{entry.action}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={entry.status === 'error' ? 'destructive' : entry.status === 'deleted' ? 'default' : 'secondary'}
                                                className={entry.status === 'deleted' ? 'bg-green-600' : undefined}
                                                title={entry.error || undefined}
                                            >
                                                {entry.status === 'skipped_referenced' ? 'skipped' : entry.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right whitespace-nowrap text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>


            <CountdownFormDialog
                open={isCountdownFormOpen}
                onOpenChange={setIsCountdownFormOpen}
                onSave={handleSaveCountdown}
                countdown={currentCountdown}
            />
            <EventFormDialog
                open={isEventFormOpen}
                onOpenChange={setIsEventFormOpen}
                onSave={handleSaveEvent}
                event={currentEvent}
            />
            <AnnouncementFormDialog
                open={isAnnouncementFormOpen}
                onOpenChange={setIsAnnouncementFormOpen}
                onSave={handleSaveAnnouncement}
                announcement={currentAnnouncement}
            />
        </div>
    )
}
