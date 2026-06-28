
"use client";

import { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ThumbsUp, PlusCircle, Trash2, Edit, Trophy, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRangoliEntries, voteForRangoli, revoteForRangoli, saveRangoliEntry, deleteRangoliEntry, getUserRangoliVote } from '@/services/database';
import { uploadFile } from '@/services/storage';
import type { RangoliEntry } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Link from 'next/link';
import { compressImage } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { motion, AnimatePresence } from 'framer-motion';
import BackButton from '@/components/back-button';


function EntryFormDialog({ open, onOpenChange, onSuccess, entry }: { open: boolean, onOpenChange: (open: boolean) => void, onSuccess: () => void, entry: RangoliEntry | null }) {
    const { toast } = useToast();
    const [formData, setFormData] = useState({ artistName: '', description: '' });
    const [rangoliImageFile, setRangoliImageFile] = useState<File | null>(null);
    const [rangoliPreview, setRangoliPreview] = useState<string | null>(null);
    const [artistImageFile, setArtistImageFile] = useState<File | null>(null);
    const [artistPreview, setArtistPreview] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const isEditMode = !!entry;

    useEffect(() => {
        if (entry) {
            setFormData({ artistName: entry.artistName, description: entry.description || '' });
            setRangoliPreview(entry.imageUrl);
            setArtistPreview(entry.artistImageUrl || null);
        } else {
            setFormData({ artistName: '', description: '' });
            setRangoliPreview(null);
            setArtistPreview(null);
        }
        setRangoliImageFile(null);
        setArtistImageFile(null);
        setUploadProgress(0);
    }, [entry, open]);

    const handleRangoliFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setRangoliImageFile(file);
                setRangoliPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleArtistFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setArtistImageFile(file);
                setArtistPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        if (!isEditMode && !rangoliImageFile) {
             toast({ variant: 'destructive', title: 'Missing Image', description: 'Please upload a rangoli image.' });
             return;
        }
        if (!formData.artistName) {
            toast({ variant: 'destructive', title: 'Missing Artist Name', description: 'Please enter a name for the artist or group.' });
            return;
        }

        setIsSaving(true);
        setUploadProgress(0);

        try {
            let rangoliUrl = entry?.imageUrl || '';
            let artistUrl = entry?.artistImageUrl || '';

            if (rangoliImageFile) {
                toast({ description: 'Compressing Rangoli image...' });
                const compressedFile = await compressImage(rangoliImageFile);
                toast({ description: 'Uploading Rangoli image...' });
                rangoliUrl = await uploadFile(compressedFile, `rangoli_entries/rangoli_${Date.now()}_${compressedFile.name}`, (progress) => setUploadProgress(progress));
            }
            
            if (artistImageFile) {
                toast({ description: 'Compressing artist photo...' });
                const compressedFile = await compressImage(artistImageFile, 0.7, 400); // Smaller size for avatar
                toast({ description: 'Uploading artist photo...' });
                artistUrl = await uploadFile(compressedFile, `rangoli_entries/artist_${Date.now()}_${compressedFile.name}`);
            }
            
            setUploadProgress(100);
            toast({ description: 'Saving entry details...'});

            const entryData: Partial<Omit<RangoliEntry, 'id' | 'votes'>> = { 
                ...formData,
                imageUrl: rangoliUrl,
                artistImageUrl: artistUrl,
            };
            
            await saveRangoliEntry(entryData, entry?.id);
            
            toast({ title: `Entry ${isEditMode ? 'Updated' : 'Added'}`, description: 'The gallery has been updated.' });
            onSuccess();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: (error as Error).message });
        } finally {
            setIsSaving(false);
            setUploadProgress(0);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[90vh] overflow-y-auto frosted-glass">
                <DialogHeader>
                    <DialogTitle>{isEditMode ? 'Edit Rangoli Entry' : 'Add New Rangoli Entry'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="artist-name">Artist / Group Name</Label>
                        <Input id="artist-name" value={formData.artistName} onChange={(e) => setFormData({ ...formData, artistName: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                     <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Tell us about this rangoli..." className="bg-white/5 border-white/10" />
                    </div>
                     <div className="space-y-2">
                        <Label>Rangoli Image</Label>
                        {rangoliPreview && <div className="relative aspect-square w-32 rounded-md overflow-hidden border border-white/10 mb-2"><Image src={rangoliPreview} alt="Rangoli Preview" fill className="object-cover" /></div>}
                        <Input type="file" onChange={handleRangoliFileChange} accept="image/*" className="bg-white/5 border-white/10 file:text-white" />
                    </div>
                    <div className="space-y-2">
                        <Label>Artist/Group Photo (Optional)</Label>
                        {artistPreview && <div className="relative aspect-square w-24 rounded-full overflow-hidden border-2 border-primary/50 mb-2 mt-2"><Image src={artistPreview} alt="Artist Preview" fill className="object-cover" /></div>}
                        <Input type="file" onChange={handleArtistFileChange} accept="image/*" className="bg-white/5 border-white/10 file:text-white" />
                    </div>
                     {isSaving && (
                        <div className="space-y-2 pt-2">
                            <Label className="text-sm font-medium">Upload Progress: {Math.round(uploadProgress)}%</Label>
                            <Progress value={uploadProgress} className="h-2" />
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" className="border-white/10 hover:bg-white/5">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isEditMode ? 'Save Changes' : 'Add Entry'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RangoliCompetitionPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    const [entries, setEntries] = useState<RangoliEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [votedForId, setVotedForId] = useState<string | null>(null);
    const [votingInProgress, setVotingInProgress] = useState<string | null>(null);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingEntry, setEditingEntry] = useState<RangoliEntry | null>(null);

    const fetchEntries = async () => {
        try {
            const data = await getRangoliEntries();
            setEntries(data.sort((a, b) => b.votes - a.votes));
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch Rangoli entries.' });
        }
    };

    const fetchUserVote = async () => {
        if (!user) return;
        try {
            const votedId = await getUserRangoliVote(user.uid);
            setVotedForId(votedId);
        } catch (error) {
            console.error("Could not fetch user vote", error);
        }
    };

    useEffect(() => {
        const initData = async () => {
            setLoading(true);
            await Promise.all([fetchEntries(), fetchUserVote()]);
            setLoading(false);
        };
        initData();
    }, [user]);

    const handleVote = async (id: string) => {
        if (!user) {
            toast({ variant: 'destructive', title: 'Login Required', description: 'Please log in to vote for your favorite Rangoli.' });
            return;
        }

        setVotingInProgress(id);
        try {
            if (votedForId && votedForId !== id) {
                await revoteForRangoli(id, votedForId, user.uid);
                toast({ title: 'Vote Changed!', description: 'Your vote has been updated in our records.' });
            } else if (!votedForId) {
                await voteForRangoli(id, user.uid);
                toast({ title: 'Vote Recorded!', description: 'Thank you for supporting the artists.' });
            } else {
                 toast({ title: 'Already Voted', description: 'You have already voted for this entry.' });
                 setVotingInProgress(null);
                 return;
            }
            
            setVotedForId(id);
            fetchEntries();

        } catch (error) {
            toast({ variant: 'destructive', title: 'Vote Failed', description: (error as Error).message });
        } finally {
            setVotingInProgress(null);
        }
    };

    const handleSaveSuccess = () => {
        fetchEntries();
        setIsFormOpen(false);
        setEditingEntry(null);
    };

    const handleDeleteEntry = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this entry? This cannot be undone.")) return;
        try {
            await deleteRangoliEntry(id);
            toast({ title: 'Entry Deleted' });
            fetchEntries();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Delete Failed', description: 'Could not delete the entry.' });
        }
    };

    const handleEditClick = (entry: RangoliEntry) => {
        setEditingEntry(entry);
        setIsFormOpen(true);
    };

    const handleAddClick = () => {
        setEditingEntry(null);
        setIsFormOpen(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 min-h-[60vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-10 max-w-7xl mx-auto animate-fade-in">
            <div className="flex items-center gap-3 sm:hidden">
                <BackButton />
                <span className="text-lg font-bold text-primary">Rangoli Competition</span>
            </div>
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-12"
            >
                <div className="mb-6 hidden sm:flex sm:justify-start">
                    <BackButton />
                </div>
                <div className="inline-block px-4 py-1.5 mb-4 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium tracking-wide uppercase">
                    Annual Celebration
                </div>
                <h1 className="text-5xl md:text-6xl font-extrabold font-headline text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400 mb-4">
                    Rangoli Competition
                </h1>
                <p className="text-xl text-muted-foreground/80 max-w-2xl mx-auto">
                    Marvel at the intricate designs and cast your vote for the most breathtaking Rangoli art.
                </p>
            </motion.div>
            
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8">
                <Button asChild variant="outline" className="frosted-glass border-white/10 hover:bg-white/5 h-12 px-6 rounded-full group">
                    <Link href="/rangoli-competition/leaderboard">
                        <Trophy className="mr-2 h-5 w-5 text-yellow-400 group-hover:scale-110 transition-transform" /> 
                        View Leaderboard & Prizes
                    </Link>
                </Button>
                {isAdmin && (
                    <Button onClick={handleAddClick} className="h-12 px-6 rounded-full bg-primary shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_30px_rgba(59,130,246,0.6)] transition-all">
                        <PlusCircle className="mr-2 h-5 w-5" /> Add New Entry
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-8">
                <AnimatePresence>
                    {entries.map((entry, index) => {
                        const isVotingThisEntry = votingInProgress === entry.id;
                        const hasVotedForThis = votedForId === entry.id;

                        return (
                            <motion.div
                                key={entry.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: index * 0.1 }}
                                layout
                            >
                                <Card className="premium-card flex flex-col h-full group hover:translate-y-[-8px] transition-all duration-300">
                                    <div className="aspect-[4/3] relative w-full overflow-hidden rounded-t-2xl">
                                        <Image
                                            src={entry.imageUrl}
                                            alt={`Rangoli by ${entry.artistName}`}
                                            fill
                                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                            className="object-cover transition-transform duration-500 group-hover:scale-110"
                                            priority={index < 3}
                                            data-ai-hint="rangoli art"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                                        
                                         {isAdmin && (
                                            <div className='absolute top-3 right-3 flex gap-2 translate-y-[-10px] opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300'>
                                                <Button variant="secondary" size="icon" className='h-9 w-9 frosted-glass' onClick={() => handleEditClick(entry)}><Edit className="h-4 w-4" /></Button>
                                                <Button variant="destructive" size="icon" className='h-9 w-9 shadow-lg' onClick={() => handleDeleteEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                                            </div>
                                        )}
                                        
                                        <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 flex items-center gap-2">
                                            <ThumbsUp className="h-3.5 w-3.5 text-primary" />
                                            <span className="text-xs font-bold text-white">{entry.votes} {entry.votes === 1 ? 'Vote' : 'Votes'}</span>
                                        </div>
                                    </div>
                                    
                                    <CardContent className="flex-grow p-6">
                                        <div className='flex items-center gap-4 mb-4'>
                                            <div className="relative">
                                                <Avatar className="h-14 w-14 border-2 border-primary/20 shadow-xl group-hover:border-primary/50 transition-colors">
                                                    <AvatarImage src={entry.artistImageUrl} alt={entry.artistName} />
                                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">{entry.artistName.charAt(0)}</AvatarFallback>
                                                </Avatar>
                                                {index < 3 && (
                                                    <div className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[10px] font-bold h-5 w-5 flex items-center justify-center rounded-full border-2 border-background">
                                                        {index + 1}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-xl font-bold line-clamp-1">{entry.artistName}</h3>
                                                <p className="text-primary/70 text-xs font-medium uppercase tracking-wider">Artist / Group</p>
                                            </div>
                                        </div>
                                        {entry.description && (
                                            <p className="text-sm text-muted-foreground/90 line-clamp-3 italic leading-relaxed">
                                                "{entry.description}"
                                            </p>
                                        )}
                                    </CardContent>
                                    
                                    <CardFooter className="p-6 pt-0 mt-auto">
                                        <Button
                                            className={`w-full h-12 rounded-xl font-bold transition-all duration-300 ${
                                                hasVotedForThis 
                                                ? "bg-secondary/20 text-secondary border border-secondary/30 hover:bg-secondary/30" 
                                                : "bg-primary hover:bg-primary/90 shadow-[0_5px_15px_rgba(59,130,246,0.3)] hover:shadow-[0_8px_25px_rgba(59,130,246,0.4)]"
                                            }`}
                                            onClick={() => handleVote(entry.id)}
                                            disabled={!!votingInProgress}
                                        >
                                            {isVotingThisEntry ? (
                                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                            ) : hasVotedForThis ? (
                                                <RefreshCw className="mr-2 h-5 w-5" />
                                            ) : (
                                                <ThumbsUp className="mr-2 h-5 w-5" />
                                            )}
                                            {hasVotedForThis ? 'Change Vote' : 'Cast Your Vote'}
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            <EntryFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                onSuccess={handleSaveSuccess}
                entry={editingEntry}
            />
        </div>
    );
}
