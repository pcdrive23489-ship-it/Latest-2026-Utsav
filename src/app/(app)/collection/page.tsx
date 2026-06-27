
"use client"
import React, { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileDown, Edit, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { getCollections, saveCollection, deleteCollection, updateCollectionSectionName } from "@/services/database";
import type { CollectionEntry } from "@/lib/types";
import BackButton from "@/components/back-button";

function EditEntryDialog({ open, onOpenChange, entry, onSave, isSaving }: { open: boolean, onOpenChange: (open: boolean) => void, entry: CollectionEntry | null, onSave: (updatedEntry: CollectionEntry) => void, isSaving: boolean }) {
    const [formData, setFormData] = useState<Partial<CollectionEntry>>({});

    React.useEffect(() => {
        if (entry) {
            setFormData(entry);
        }
    }, [entry]);

    const handleSave = () => {
        if (entry) {
            onSave({ ...entry, ...formData, expected: Number(formData.expected || 0), received: Number(formData.received || 0) });
        }
    };

    if (!entry) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit Collection Entry</DialogTitle>
                    <DialogDescription>Update the details for this entry.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="section">Section</Label>
                        <Input id="section" value={formData.section || ''} onChange={(e) => setFormData({ ...formData, section: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name / Payer</Label>
                        <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expected">Expected Amount</Label>
                            <Input id="expected" type="number" value={formData.expected || ''} onChange={(e) => setFormData({ ...formData, expected: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="received">Received Amount</Label>
                            <Input id="received" type="number" value={formData.received || ''} onChange={(e) => setFormData({ ...formData, received: Number(e.target.value) })} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function AddEntryDialog({ open, onOpenChange, onSave, isSaving }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (newEntry: Omit<CollectionEntry, 'id'>) => void, isSaving: boolean }) {
    const [formData, setFormData] = useState<Partial<Omit<CollectionEntry, 'id'>>>({
        section: 'A Wing',
        name: '',
        expected: 0,
        received: 0,
    });
    
    const handleSave = () => {
        const newEntry = {
            section: formData.section || 'Uncategorized',
            name: formData.name || 'Anonymous',
            date: new Date().toISOString().split('T')[0],
            expected: Number(formData.expected || 0),
            received: Number(formData.received || 0),
            status: (Number(formData.received || 0) >= Number(formData.expected || 0) ? 'Paid' : 'Pending') as 'Paid' | 'Pending',
        };
        onSave(newEntry);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Collection Entry</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="section">Section</Label>
                        <Input id="section" value={formData.section || ''} onChange={(e) => setFormData({ ...formData, section: e.target.value })} placeholder="e.g. A Wing, Donations"/>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name / Payer</Label>
                        <Input id="name" value={formData.name || ''} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="expected">Expected Amount</Label>
                            <Input id="expected" type="number" value={formData.expected || ''} onChange={(e) => setFormData({ ...formData, expected: Number(e.target.value) })} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="received">Received Amount</Label>
                            <Input id="received" type="number" value={formData.received || ''} onChange={(e) => setFormData({ ...formData, received: Number(e.target.value) })} />
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                         {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Entry
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function RenameSectionDialog({ open, onOpenChange, sectionName, onSave }: { open: boolean; onOpenChange: (open: boolean) => void; sectionName: string | null; onSave: (oldName: string, newName: string) => void; }) {
    const [newName, setNewName] = useState('');

    React.useEffect(() => {
        if (sectionName) {
            setNewName(sectionName);
        }
    }, [sectionName]);

    const handleSave = () => {
        if (sectionName && newName) {
            onSave(sectionName, newName);
            onOpenChange(false);
        }
    };

    if (!sectionName) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Rename Section</DialogTitle>
                    <DialogDescription>Enter a new name for the &quot;{sectionName}&quot; section.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="section-name">Section Name</Label>
                        <Input id="section-name" value={newName} onChange={(e) => setNewName(e.target.value)} />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave}>Save Name</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


export default function CollectionPage() {
  const [collectionsData, setCollectionsData] = useState<CollectionEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<CollectionEntry | null>(null);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [isRenameDialogOpen, setIsRenameDialogOpen] = useState(false);
  const [renamingSection, setRenamingSection] = useState<string | null>(null);

  const fetchCollections = async () => {
    setLoading(true);
    try {
        const data = await getCollections();
        setCollectionsData(data);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Error fetching collections', description: (error as Error).message });
    } finally {
        setLoading(false);
    }
  }
  
  useEffect(() => {
    fetchCollections();
  }, [])

  const handleEdit = (entry: CollectionEntry) => {
    setEditingEntry(entry);
    setIsEditDialogOpen(true);
  };
  
  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
        try {
            await deleteCollection(id);
            toast({ title: 'Entry Deleted' });
            fetchCollections();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error deleting entry', description: (error as Error).message });
        }
    }
  }

  const handleSave = async (updatedEntry: CollectionEntry) => {
    setIsSaving(true);
    const entryToSave = { ...updatedEntry, status: (updatedEntry.received >= updatedEntry.expected ? 'Paid' : 'Pending') as 'Paid' | 'Pending' };
    try {
        await saveCollection(entryToSave, entryToSave.id);
        toast({ title: 'Entry Updated' });
        setIsEditDialogOpen(false);
        fetchCollections();
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error saving entry', description: (error as Error).message });
    } finally {
        setIsSaving(false);
    }
  };

  const handleAdd = async (newEntry: Omit<CollectionEntry, 'id'>) => {
    setIsSaving(true);
    try {
        await saveCollection(newEntry);
        toast({ title: 'Entry Added' });
        setIsAddDialogOpen(false);
        fetchCollections();
    } catch (error) {
         toast({ variant: 'destructive', title: 'Error adding entry', description: (error as Error).message });
    } finally {
        setIsSaving(false);
    }
  }

  const handleRenameSection = async (oldName: string, newName: string) => {
    try {
        await updateCollectionSectionName(oldName, newName);
        toast({ title: 'Section Renamed' });
        fetchCollections();
    } catch(error) {
        toast({ variant: 'destructive', title: 'Error renaming section', description: (error as Error).message });
    }
  };
  
  const openRenameDialog = (sectionName: string) => {
    setRenamingSection(sectionName);
    setIsRenameDialogOpen(true);
  }

  const groupedData = collectionsData.reduce((acc, item) => {
    (acc[item.section] = acc[item.section] || []).push(item);
    return acc;
  }, {} as Record<string, typeof collectionsData>);

  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'Paid': return 'bg-green-600';
        case 'Pending': return 'bg-yellow-500';
        default: return 'secondary';
    }
  }
  
  const handleExport = () => {
    const csv = Papa.unparse(collectionsData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "collections.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
  }
  
  if (loading) {
    return (
        <div className="flex items-center justify-center p-8 h-full">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="max-w-full space-y-8 overflow-x-hidden">
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div className="flex min-w-0 items-center gap-4">
            <BackButton className="hidden lg:inline-flex"/>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold">Collections</h1>
              <p className="break-words text-muted-foreground">
                Track and manage funds collected for the festival.
              </p>
            </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button variant="outline" className="min-h-11" onClick={handleExport}>
                <FileDown className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button className="min-h-11" onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Entry
            </Button>
        </div>
      </div>
      
      <div className="space-y-6">
        {Object.entries(groupedData).length === 0 ? (
             <Card>
                <CardContent className="p-8 text-center text-muted-foreground">
                    No collection entries yet. Click "Add Entry" to get started.
                </CardContent>
            </Card>
        ) : Object.entries(groupedData).map(([section, items]) => (
            <Card key={section}>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>{section}</CardTitle>
                        <Button variant="ghost" size="icon" onClick={() => openRenameDialog(section)}>
                            <Edit className="h-4 w-4" />
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name / Payer</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Expected</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="font-medium">{item.name}</TableCell>
                                    <TableCell>{item.date}</TableCell>
                                    <TableCell>
                                        <Badge className={getStatusBadge(item.status)}>{item.status}</Badge>
                                    </TableCell>
                                    <TableCell>₹{item.expected.toLocaleString()}</TableCell>
                                    <TableCell className="font-semibold">₹{item.received.toLocaleString()}</TableCell>
                                    <TableCell className="text-right space-x-1">
                                        <Button variant="outline" size="icon" onClick={() => handleEdit(item)}>
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                         <Button variant="destructive" size="icon" onClick={() => handleDelete(item.id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        ))}
      </div>

       <EditEntryDialog 
            open={isEditDialogOpen} 
            onOpenChange={setIsEditDialogOpen} 
            entry={editingEntry} 
            onSave={handleSave} 
            isSaving={isSaving}
        />

        <AddEntryDialog 
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSave={handleAdd}
            isSaving={isSaving}
        />
        
       <RenameSectionDialog
            open={isRenameDialogOpen}
            onOpenChange={setIsRenameDialogOpen}
            sectionName={renamingSection}
            onSave={handleRenameSection}
       />

    </div>
  );
}
