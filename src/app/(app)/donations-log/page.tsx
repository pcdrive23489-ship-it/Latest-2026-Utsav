
"use client";

import { useEffect, useState } from "react";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, CheckCircle, Hourglass, ExternalLink } from "lucide-react";
import { getDonationRecords, updateDonationStatus } from "@/services/database";
import type { DonationRecord } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import BackButton from "@/components/back-button";
import Image from "next/image";
import { format } from "date-fns";

export default function DonationsLogPage() {
  const [donations, setDonations] = useState<DonationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchDonations = async () => {
    setLoading(true);
    try {
      const records = await getDonationRecords();
      setDonations(records);
    } catch (error) {
      console.error("Error fetching donation records:", error);
      toast({
        variant: "destructive",
        title: "Failed to load donations",
        description: "Could not retrieve donation records.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDonations();
  }, []);

  const handleVerifyDonation = async (id: string) => {
    try {
      await updateDonationStatus(id, "verified");
      toast({
        title: "Donation Verified",
        description: "The donation has been marked as verified.",
      });
      fetchDonations();
    } catch (error) {
      console.error("Error verifying donation:", error);
      toast({
        variant: "destructive",
        title: "Verification Failed",
        description: "Could not update the donation's status.",
      });
    }
  };
  
  const getStatusBadge = (status: 'pending' | 'verified') => {
    switch (status) {
        case 'verified': return 'bg-green-600';
        case 'pending': return 'bg-yellow-500';
        default: return 'secondary';
    }
  }


  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-full">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-4">
        <BackButton className="hidden lg:inline-flex" />
        <div>
          <h1 className="text-3xl font-bold">Donations Log</h1>
          <p className="text-muted-foreground">
            Review and verify submitted donations.
          </p>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>All Submitted Donations</CardTitle>
          <CardDescription>
            Click "View Proof" to see the uploaded payment screenshot.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Donor Name</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Proof</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {donations.map((donation) => (
                <TableRow key={donation.id}>
                  <TableCell>{donation.createdAt ? format(new Date(donation.createdAt), 'PPP') : 'N/A'}</TableCell>
                  <TableCell className="font-medium">{donation.donorName}</TableCell>
                  <TableCell>₹{donation.amount.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusBadge(donation.status)}>
                      {donation.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm">View Proof</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                            <DialogHeader>
                                <DialogTitle>Payment Proof for {donation.donorName}</DialogTitle>
                            </DialogHeader>
                            <div className="relative h-96 w-full mt-4">
                                <Image src={donation.proofImageUrl} alt="Payment Proof" layout="fill" objectFit="contain" />
                            </div>
                        </DialogContent>
                    </Dialog>
                  </TableCell>
                  <TableCell className="text-right">
                    {donation.status === "pending" && (
                      <Button size="sm" onClick={() => handleVerifyDonation(donation.id)}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Mark as Verified
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {donations.length === 0 && (
             <div className="text-center p-8 text-muted-foreground">
                No donations have been submitted yet.
             </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
