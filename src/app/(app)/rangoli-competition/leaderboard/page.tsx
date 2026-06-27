
"use client";

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Trophy, Edit, PlusCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getRangoliEntries, getRangoliPrizes, saveRangoliPrizes } from '@/services/database';
import type { RangoliEntry, RangoliCompetitionData, RangoliPrize } from '@/lib/types';
import { useAuth } from '@/contexts/auth-context';
import BackButton from '@/components/back-button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { motion } from 'framer-motion';

function EditPrizesDialog({ open, onOpenChange, onSave, isSaving, currentData }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (data: RangoliCompetitionData) => void, isSaving: boolean, currentData: RangoliCompetitionData | null }) {
    const [formData, setFormData] = useState<RangoliCompetitionData>({ prizes: [], announcementDate: '', criteria: '' });

    useEffect(() => {
        if (currentData) {
            setFormData(currentData);
        }
    }, [currentData]);

    const handlePrizeChange = (index: number, field: keyof RangoliPrize, value: string) => {
        const newPrizes = [...formData.prizes];
        newPrizes[index] = { ...newPrizes[index], [field]: value };
        setFormData({ ...formData, prizes: newPrizes });
    };

    const addPrize = () => {
        setFormData({ ...formData, prizes: [...formData.prizes, { rank: '', prize: '' }] });
    };

    const removePrize = (index: number) => {
        const newPrizes = formData.prizes.filter((_, i) => i !== index);
        setFormData({ ...formData, prizes: newPrizes });
    };

    const handleSave = () => {
        onSave(formData);
    };

    if (!currentData) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl frosted-glass">
                <DialogHeader>
                    <DialogTitle>Edit Prizes & Rewards</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
                    <div className="space-y-2">
                        <Label htmlFor="criteria">Winning Criteria</Label>
                        <Input id="criteria" value={formData.criteria} onChange={(e) => setFormData({ ...formData, criteria: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="announcementDate">Winner Announcement Date</Label>
                        <Input id="announcementDate" value={formData.announcementDate} onChange={(e) => setFormData({ ...formData, announcementDate: e.target.value })} className="bg-white/5 border-white/10" />
                    </div>
                    <hr className="my-4 border-white/10"/>
                    <Label className="text-lg font-bold">Prize Tiers</Label>
                    {formData.prizes.map((prize, index) => (
                        <div key={index} className="flex items-end gap-2 p-3 border border-white/10 rounded-xl bg-white/5">
                            <div className="flex-1 grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs uppercase text-muted-foreground">Rank</Label>
                                    <Input value={prize.rank} onChange={(e) => handlePrizeChange(index, 'rank', e.target.value)} className="bg-transparent border-white/10" />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs uppercase text-muted-foreground">Prize</Label>
                                    <Input value={prize.prize} onChange={(e) => handlePrizeChange(index, 'prize', e.target.value)} className="bg-transparent border-white/10" />
                                </div>
                            </div>
                            <Button variant="destructive" size="icon" onClick={() => removePrize(index)} className="h-10 w-10">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    ))}
                    <Button variant="outline" onClick={addPrize} className="w-full border-dashed border-white/20 hover:bg-white/5 py-6"><PlusCircle className="mr-2 h-4 w-4" /> Add Another Prize Tier</Button>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline" className="border-white/10">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving} className="bg-primary hover:bg-primary/90">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save All Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function RangoliLeaderboardPage() {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    const [entries, setEntries] = useState<RangoliEntry[]>([]);
    const [prizeData, setPrizeData] = useState<RangoliCompetitionData | null>(null);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const fetchLeaderboardData = async () => {
        setLoading(true);
        try {
            const [entryData, prizes] = await Promise.all([getRangoliEntries(), getRangoliPrizes()]);
            setEntries(entryData.sort((a, b) => b.votes - a.votes));
            setPrizeData(prizes);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch leaderboard data.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaderboardData();
    }, []);

    const handleSavePrizes = async (data: RangoliCompetitionData) => {
        setIsSaving(true);
        try {
            await saveRangoliPrizes(data);
            setPrizeData(data);
            setIsFormOpen(false);
            toast({ title: 'Prizes Updated', description: 'The rewards information has been saved.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Save Failed', description: 'Could not save the prize details.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const leaderboardColors = ["text-yellow-400", "text-gray-300", "text-amber-600"];
    const rankGlows = [
        "shadow-[0_0_15px_rgba(250,204,21,0.3)] border-yellow-400/30",
        "shadow-[0_0_15px_rgba(156,163,175,0.3)] border-gray-400/30",
        "shadow-[0_0_15px_rgba(180,83,9,0.3)] border-amber-600/30"
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8 min-h-[60vh]">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <div className="space-y-12 max-w-7xl mx-auto">
             <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-6"
            >
                <BackButton />
                <div className="flex-1">
                    <h1 className="text-4xl md:text-5xl font-extrabold font-headline text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                        Leaderboard
                    </h1>
                    <p className="text-lg text-muted-foreground/80 mt-2">Celebrating the finest Rangoli talent in our community.</p>
                </div>
            </motion.div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-6">
                     <Card className="premium-card overflow-hidden">
                        <CardHeader className="border-b border-white/5 pb-6">
                            <CardTitle className="flex items-center gap-3 text-2xl"><Trophy className="text-yellow-400 h-7 w-7"/> Current Hall of Fame</CardTitle>
                            <CardDescription>Live standings based on community votes.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <ul className="space-y-4">
                                {entries.map((entry, index) => (
                                    <motion.li 
                                        key={entry.id} 
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className={`flex items-center gap-4 p-4 rounded-2xl transition-all duration-300 ${
                                            index < 3 
                                            ? `bg-white/5 border-2 ${rankGlows[index]}` 
                                            : "bg-white/[0.02] border border-white/5 hover:bg-white/5"
                                        }`}
                                    >
                                        <div className='flex items-center justify-center w-12'>
                                            {index < 3 ? (
                                                <Trophy className={`h-8 w-8 ${leaderboardColors[index]} filter drop-shadow-lg`} />
                                            ) : (
                                                <span className='font-black text-xl text-muted-foreground/40 italic'>#{index + 1}</span>
                                            )}
                                        </div>
                                        <Avatar className="h-14 w-14 border-2 border-white/10 shadow-lg">
                                            <AvatarImage src={entry.artistImageUrl} alt={entry.artistName} />
                                            <AvatarFallback className="bg-primary/20 text-primary font-bold">{entry.artistName.charAt(0)}</AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                            <p className="font-bold text-lg leading-tight">{entry.artistName}</p>
                                            <p className="text-sm text-muted-foreground/70 line-clamp-1">{entry.description || 'Artistic creation for the festival.'}</p>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-2xl font-black text-primary leading-none">{entry.votes}</div>
                                            <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-1">Total Votes</div>
                                        </div>
                                    </motion.li>
                                ))}
                                {entries.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground italic">No entries yet. Be the first to join!</div>
                                )}
                            </ul>
                        </CardContent>
                    </Card>
                </div>
                
                <div className="space-y-8">
                    <Card className="premium-card">
                        <CardHeader className="flex-row justify-between items-center border-b border-white/5">
                            <CardTitle className="text-xl">Grand Prizes</CardTitle>
                            {isAdmin && <Button variant="secondary" size="icon" className="h-8 w-8 frosted-glass" onClick={() => setIsFormOpen(true)}><Edit className="h-4 w-4" /></Button>}
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {prizeData?.prizes.map((p, i) => (
                                <motion.div 
                                    key={i} 
                                    initial={{ opacity: 0, x: 10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.1 }}
                                    className="flex items-center gap-4 group"
                                >
                                    <div className={`h-10 w-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform ${i < 3 ? leaderboardColors[i] : 'text-muted-foreground'}`}>
                                        <Trophy className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-black uppercase tracking-tighter text-muted-foreground">{p.rank}</div>
                                        <div className="font-bold text-lg group-hover:text-primary transition-colors">{p.prize}</div>
                                    </div>
                                </motion.div>
                            ))}
                             <div className="pt-6 mt-4 border-t border-white/5 space-y-4">
                                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                                    <p className="text-xs font-bold uppercase tracking-widest text-primary/70 mb-1">Announcement Date</p>
                                    <p className="font-semibold text-foreground/90">{prizeData?.announcementDate}</p>
                                </div>
                                <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                    <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Selection Criteria</p>
                                    <p className="text-sm text-foreground/80 leading-relaxed">{prizeData?.criteria}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-blue-600/20 border border-primary/30 shadow-2xl overflow-hidden relative group">
                        <div className="absolute -right-4 -top-4 text-primary/10 group-hover:scale-110 transition-transform duration-700">
                            <Trophy size={120} />
                        </div>
                        <h4 className="font-black text-xl mb-2 relative z-10">Good Luck!</h4>
                        <p className="text-sm text-foreground/70 leading-relaxed relative z-10">Every entry is a masterpiece. Thank you for making this festival colorful!</p>
                    </div>
                </div>
            </div>

            {isAdmin && (
                <EditPrizesDialog
                    open={isFormOpen}
                    onOpenChange={setIsFormOpen}
                    onSave={handleSavePrizes}
                    isSaving={isSaving}
                    currentData={prizeData}
                />
            )}
        </div>
    );
}
