
"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { updateUserProfile } from '@/services/database';
import { changeUserPassword } from '@/services/auth';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Camera, User, Lock, Bell, Palette } from 'lucide-react';
import type { UserProfile } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from '@/components/ui/switch';
import BackButton from '@/components/back-button';
import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from 'next-themes';

function GeneralInfoTab({ user, onProfileUpdate }: { user: UserProfile, onProfileUpdate: (data: Partial<UserProfile>) => void }) {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);
    const [profileData, setProfileData] = useState<Partial<UserProfile>>({});
    const [isEditMode, setIsEditMode] = useState(false);

    useEffect(() => {
        setProfileData({
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            photoURL: user.photoURL || '',
        });
    }, [user]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setProfileData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await updateUserProfile(user.uid, profileData);
            onProfileUpdate(profileData);
            toast({ title: 'Profile Updated', description: 'Your information has been saved.' });
            setIsEditMode(false);
        } catch (error) {
            console.error('Failed to update profile:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: 'Could not save your profile.' });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleCancel = () => {
        // Reset changes
        setProfileData({
            firstName: user.firstName,
            lastName: user.lastName,
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            photoURL: user.photoURL || '',
        });
        setIsEditMode(false);
    }
    
     const getInitials = (firstName?: string, lastName?: string) => {
        return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
     }


    return (
        <CardContent className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                 <div className="relative">
                    <Avatar className="h-24 w-24 border-4 border-primary/50">
                        <AvatarImage src={profileData.photoURL || ''} data-ai-hint="user avatar" alt="User avatar" />
                       <AvatarFallback className="text-3xl bg-primary/20">{getInitials(profileData.firstName, profileData.lastName)}</AvatarFallback>
                    </Avatar>
                     {isEditMode && (
                         <Button 
                            size="icon" 
                            className="absolute bottom-0 right-0 rounded-full"
                            disabled
                         >
                            <Camera className="h-4 w-4"/>
                        </Button>
                    )}
                </div>
                <div className="min-w-0">
                    <h2 className="break-words text-2xl font-bold">{profileData.firstName} {profileData.lastName}</h2>
                    <p className="break-all text-muted-foreground">{user.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Profile photo managed by your Google account.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" name="firstName" value={profileData.firstName || ''} onChange={handleInputChange} disabled={!isEditMode} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" name="lastName" value={profileData.lastName || ''} onChange={handleInputChange} disabled={!isEditMode} />
                </div>
            </div>
            <div className="space-y-1">
                <Label htmlFor="bio">Bio</Label>
                <Textarea id="bio" name="bio" placeholder="Tell us a little about yourself" value={profileData.bio || ''} onChange={handleInputChange} disabled={!isEditMode} />
            </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <Label htmlFor="location">Location</Label>
                    <Input id="location" name="location" placeholder="e.g. Mumbai, India" value={profileData.location || ''} onChange={handleInputChange} disabled={!isEditMode} />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="website">Website</Label>
                    <Input id="website" name="website" placeholder="https://example.com" value={profileData.website || ''} onChange={handleInputChange} disabled={!isEditMode} />
                </div>
            </div>

            {isEditMode ? (
                 <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleCancel}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                    </Button>
                 </div>
            ) : (
                <div className="flex justify-end">
                    <Button onClick={() => setIsEditMode(true)}>Edit Profile</Button>
                </div>
            )}
        </CardContent>
    );
}

function SecurityTab() {
    const { toast } = useToast();
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: 'destructive', title: 'Error', description: 'Passwords do not match.' });
            return;
        }
        if (newPassword.length < 6) {
             toast({ variant: 'destructive', title: 'Error', description: 'Password must be at least 6 characters long.' });
            return;
        }

        setIsSaving(true);
        try {
            await changeUserPassword(newPassword);
            toast({ title: 'Password Updated', description: 'Your password has been changed successfully.' });
            setNewPassword('');
            setConfirmPassword('');
        } catch (error: any) {
            console.error('Password change error:', error);
            toast({ variant: 'destructive', title: 'Update Failed', description: error.message || 'Could not update your password.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handlePasswordChange} className="space-y-4 p-4 rounded-lg bg-accent/50 border">
                    <h3 className="font-semibold">Change Password</h3>
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input 
                            id="newPassword" 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="New password (min. 6 characters)"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Confirm New Password</Label>
                        <Input 
                            id="confirmPassword" 
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm new password"
                        />
                    </div>
                    <Button type="submit" disabled={isSaving || !newPassword || !confirmPassword}>
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Password
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}

function AppearanceTab() {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>Customize the look and feel of the app.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div>
                        <Label htmlFor="theme">Theme</Label>
                        <p className="text-sm text-muted-foreground">Select a theme for the dashboard.</p>
                    </div>
                    <ThemeToggle />
                </div>
            </CardContent>
        </Card>
    );
}


export default function ProfilePage() {
    const { user, updateUserContext } = useAuth();
    
    if (!user) {
        return (
            <div className="flex items-center justify-center p-8 h-full">
                <Loader2 className="h-16 w-16 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="max-w-full space-y-8 overflow-x-hidden">
            <div className="flex min-w-0 items-center gap-4">
                <BackButton className="hidden lg:inline-flex"/>
                <div className="min-w-0">
                    <h1 className="text-3xl font-bold">Profile</h1>
                    <p className="break-words text-muted-foreground">Manage your account settings and preferences.</p>
                </div>
            </div>
            
            <Tabs defaultValue="general">
                <TabsList className="w-full justify-start">
                    <TabsTrigger value="general"><User className="mr-2 h-4 w-4"/> General</TabsTrigger>
                    <TabsTrigger value="security"><Lock className="mr-2 h-4 w-4"/> Security</TabsTrigger>
                    <TabsTrigger value="appearance"><Palette className="mr-2 h-4 w-4"/> Appearance</TabsTrigger>
                    <TabsTrigger value="notifications"><Bell className="mr-2 h-4 w-4"/> Notifications</TabsTrigger>
                </TabsList>
                
                <TabsContent value="general">
                    <Card>
                        <CardHeader>
                            <CardTitle>General Information</CardTitle>
                            <CardDescription>Update your personal details here.</CardDescription>
                        </CardHeader>
                        <GeneralInfoTab user={user} onProfileUpdate={updateUserContext} />
                    </Card>
                </TabsContent>

                <TabsContent value="security">
                     <SecurityTab />
                </TabsContent>
                
                <TabsContent value="appearance">
                     <AppearanceTab />
                </TabsContent>

                 <TabsContent value="notifications">
                     <Card>
                        <CardHeader>
                            <CardTitle>Notifications</CardTitle>
                            <CardDescription>Manage how you receive notifications.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div>
                                    <Label htmlFor="email-notifications">Email Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Receive important updates via email.</p>
                                </div>
                                <Switch id="email-notifications" />
                            </div>
                            <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                <div>
                                    <Label htmlFor="push-notifications">Push Notifications</Label>
                                    <p className="text-sm text-muted-foreground">Get notified about live events and messages.</p>
                                </div>
                                <Switch id="push-notifications" defaultChecked />
                            </div>
                             <Button>Save Preferences</Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
