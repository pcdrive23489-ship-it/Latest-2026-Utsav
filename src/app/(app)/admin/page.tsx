
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState, useMemo } from "react";
import { getAllUsers, updateUserStatus, updateUserProfile } from "@/services/database";
import type { UserProfile } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Ban } from "lucide-react";
import BackButton from "@/components/back-button";
import { useAuth } from "@/contexts/auth-context";

function EditUserDialog({ 
    open, 
    onOpenChange, 
    user, 
    onSave, 
    isSaving,
    currentUserRole
}: { 
    open: boolean, 
    onOpenChange: (open: boolean) => void, 
    user: UserProfile | null, 
    onSave: (uid: string, data: Partial<UserProfile>) => void,
    isSaving: boolean,
    currentUserRole: UserProfile['role']
}) {
    const [formData, setFormData] = useState<Partial<UserProfile>>({});

    useEffect(() => {
        if (user) {
            setFormData({
                firstName: user.firstName,
                lastName: user.lastName,
                role: user.role,
            });
        }
    }, [user]);

    const handleSave = () => {
        if (user) {
            onSave(user.uid, formData);
        }
    };
    
    if (!user) return null;

    const roleOptions: Array<{ value: UserProfile['role']; label: string }> = [
        { value: 'member', label: 'Member' },
        { value: 'admin', label: 'Admin' },
        ...(currentUserRole === 'super-admin'
            ? [{ value: 'super-admin' as const, label: 'Super Admin' }]
            : []),
    ];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Edit User: {user.firstName} {user.lastName}</DialogTitle>
                    <DialogDescription>Update the user's details below.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                     <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input id="firstName" value={formData.firstName || ''} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input id="lastName" value={formData.lastName || ''} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} />
                    </div>
                     <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {roleOptions.map((option) => {
                                const isSelected = formData.role === option.value;

                                return (
                                    <Button
                                        key={option.value}
                                        type="button"
                                        variant={isSelected ? "default" : "outline"}
                                        className="min-h-12 justify-center"
                                        aria-pressed={isSelected}
                                        onClick={() => setFormData({ ...formData, role: option.value })}
                                    >
                                        {option.label}
                                    </Button>
                                );
                            })}
                        </div>
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
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

function getStatusBadgeClass(status: UserProfile['status']) {
    if (status === 'approved') return 'bg-green-600';
    if (status === 'rejected') return 'bg-destructive text-destructive-foreground';
    return '';
}

function AdminView({ users, onApprove, onEdit, onSuspend }: { users: UserProfile[], onApprove: (uid: string) => void, onEdit: (user: UserProfile) => void, onSuspend: (uid: string) => void }) {
    const adminVisibleUsers = useMemo(() => {
        return users.filter(user => user.role === 'member' || user.status === 'pending');
    }, [users]);
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Approvals</CardTitle>
                <CardDescription>
                    Review new registrations and manage member accounts.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {adminVisibleUsers.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.status === "approved" ? "default" : "secondary"} className={getStatusBadgeClass(user.status)}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {user.status !== "approved" && (
                                        <Button size="sm" onClick={() => onApprove(user.uid)}>
                                            {user.status === "rejected" ? "Restore" : "Approve"}
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => onEdit(user)} disabled={user.role !== 'member'}>
                                        Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" aria-label={`Suspend ${user.firstName} ${user.lastName}`} onClick={() => onSuspend(user.uid)} disabled={user.role !== 'member' || user.status === 'rejected'}>
                                        <Ban className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


function SuperAdminView({ users, onApprove, onEdit, onSuspend }: { users: UserProfile[], onApprove: (uid: string) => void, onEdit: (user: UserProfile) => void, onSuspend: (uid: string) => void }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>User Management (Super Admin)</CardTitle>
                <CardDescription>
                    Review, approve, edit, and suspend user accounts.
                </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.uid}>
                                <TableCell className="font-medium">{user.firstName} {user.lastName}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                    <Badge variant={user.status === "approved" ? "default" : "secondary"} className={getStatusBadgeClass(user.status)}>
                                        {user.status}
                                    </Badge>
                                </TableCell>
                                <TableCell>{user.role}</TableCell>
                                <TableCell className="text-right space-x-2">
                                    {user.status !== "approved" && (
                                        <Button size="sm" onClick={() => onApprove(user.uid)}>
                                            {user.status === "rejected" ? "Restore" : "Approve"}
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm" onClick={() => onEdit(user)}>
                                        Edit
                                    </Button>
                                    <Button variant="destructive" size="sm" aria-label={`Suspend ${user.firstName} ${user.lastName}`} onClick={() => onSuspend(user.uid)} disabled={user.status === 'rejected'}>
                                        <Ban className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}


export default function AdminPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const allUsers = await getAllUsers();
      // Filter out the current user from the list
      const otherUsers = allUsers.filter(u => u.uid !== currentUser?.uid);
      setUsers(otherUsers);
    } catch (error) {
      console.error("AdminPage: Error fetching users:", error);
      toast({
        variant: "destructive",
        title: "Failed to load users",
        description: "Could not retrieve user data from the database.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
        fetchUsers();
    }
  }, [currentUser]);

  const handleApprove = async (uid: string) => {
    try {
      await updateUserStatus(uid, "approved");
      toast({
        title: "User Approved",
        description: "The user has been successfully approved.",
      });
      fetchUsers();
    } catch (error) {
      console.error("Error approving user:", error);
      toast({
        variant: "destructive",
        title: "Approval Failed",
        description: "Could not update the user's status.",
      });
    }
  };

  const handleSuspend = async (uid: string) => {
    if (!window.confirm("Suspend this user? They will no longer be able to access the app until restored.")) {
        return;
    }
    try {
        await updateUserStatus(uid, "rejected");
        setUsers(current => current.map(u => u.uid === uid ? { ...u, status: "rejected" } : u));
        toast({
            title: "User Suspended",
            description: "The account has been blocked from accessing the app.",
        });
    } catch (error) {
        console.error("Error deleting user:", error);
        toast({
            variant: "destructive",
            title: "Suspension Failed",
            description: "Could not suspend the user.",
        });
    }
  }

  const handleEditClick = (user: UserProfile) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveUser = async (uid: string, data: Partial<UserProfile>) => {
    setIsSaving(true);
    try {
        await updateUserProfile(uid, data);
        toast({
            title: "User Updated",
            description: "The user's information has been successfully saved.",
        });
        setIsEditDialogOpen(false);
        fetchUsers();
    } catch(error) {
        console.error("Error updating user:", error);
        toast({
            variant: "destructive",
            title: "Update Failed",
            description: "Could not save the user's information.",
        });
    } finally {
        setIsSaving(false);
    }
  }

  if (loading || !currentUser) {
    return (
        <div className="flex items-center justify-center p-8 h-full">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
            <BackButton className="hidden lg:inline-flex"/>
            <div>
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
              <p className="text-muted-foreground">
                Manage users and festival settings.
              </p>
            </div>
        </div>
      </div>

        {currentUser.role === 'super-admin' && (
            <SuperAdminView users={users} onApprove={handleApprove} onEdit={handleEditClick} onSuspend={handleSuspend} />
        )}

        {currentUser.role === 'admin' && (
            <AdminView users={users} onApprove={handleApprove} onEdit={handleEditClick} onSuspend={handleSuspend} />
        )}
      
      <EditUserDialog 
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        user={editingUser}
        onSave={handleSaveUser}
        isSaving={isSaving}
        currentUserRole={currentUser.role}
      />
    </div>
  );
}
