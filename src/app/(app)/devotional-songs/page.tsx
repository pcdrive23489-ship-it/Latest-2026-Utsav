
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from '@/components/ui/button';
import { Music, Download, PlusCircle, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/auth-context';
import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getDevotionalSongs, addDevotionalSong, deleteDevotionalSong } from '@/services/database';
import type { DevotionalSong } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function AddSongDialog({ open, onOpenChange, onSave, isSaving }: { open: boolean, onOpenChange: (open: boolean) => void, onSave: (title: string, link: string) => void, isSaving: boolean }) {
    const [title, setTitle] = useState('');
    const [link, setLink] = useState('');

    const handleSave = () => {
        if (title && link) {
            onSave(title, link);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Add New Devotional Song</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="song-title">Song Title</Label>
                        <Input id="song-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Ganesh Aarti" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="song-link">Song Link (MP3/MP4 URL)</Label>
                        <Input id="song-link" value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://example.com/song.mp3" />
                    </div>
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Song
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function DevotionalSongsPage() {
    const { user } = useAuth();
    const { toast } = useToast();
    const isAdmin = user?.role === 'admin' || user?.role === 'super-admin';
    
    const [songs, setSongs] = useState<DevotionalSong[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const fetchSongs = async () => {
        setLoading(true);
        try {
            const songList = await getDevotionalSongs();
            setSongs(songList);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not fetch devotional songs.' });
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchSongs();
    }, []);

    const handleAddSong = async (title: string, link: string) => {
        if (!user) return;
        setIsSaving(true);
        try {
            await addDevotionalSong({
                title,
                link,
                addedBy: `${user.firstName} ${user.lastName}`,
                userId: user.uid,
            });
            toast({ title: 'Song Added', description: 'The new song has been added to the library.' });
            setIsAddDialogOpen(false);
            fetchSongs();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not add the new song.' });
        } finally {
            setIsSaving(false);
        }
    };
    
    const handleDeleteSong = async (songId: string) => {
        if (!window.confirm("Are you sure you want to delete this song?")) return;
        try {
            await deleteDevotionalSong(songId);
            toast({ title: 'Song Deleted' });
            fetchSongs();
        } catch (error) {
            toast({ variant: 'destructive', title: 'Error', description: 'Could not delete the song.' });
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
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline text-primary flex items-center justify-center gap-3">
                    <Music className="h-10 w-10"/>
                    Devotional Songs
                </h1>
                <p className="text-lg text-muted-foreground mt-2">Immerse yourself in divine melodies. Click a link to play or download.</p>
            </div>

            <Card className="frosted-glass">
                <CardHeader className="flex-row items-center justify-between">
                    <div>
                        <CardTitle>Song Library</CardTitle>
                        <CardDescription>A collection of devotional songs and mantras added by the community admins.</CardDescription>
                    </div>
                     {isAdmin && (
                        <Button onClick={() => setIsAddDialogOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Song
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Song Name</TableHead>
                                <TableHead>Added By</TableHead>
                                <TableHead className="text-right">Link / Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {songs.length > 0 ? songs.map((song) => (
                                <TableRow key={song.id}>
                                    <TableCell className="font-medium">{song.title}</TableCell>
                                    <TableCell className="text-sm text-muted-foreground">{song.addedBy}</TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button asChild variant="outline">
                                            <Link href={song.link} target="_blank" rel="noopener noreferrer">
                                                <Download className="mr-2 h-4 w-4" />
                                                Play / Download
                                            </Link>
                                        </Button>
                                        {isAdmin && (
                                            <Button variant="destructive" size="icon" onClick={() => handleDeleteSong(song.id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            )) : (
                                <TableRow>
                                    <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                                        No songs have been added yet.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AddSongDialog 
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onSave={handleAddSong}
                isSaving={isSaving}
            />
        </div>
    )
}
