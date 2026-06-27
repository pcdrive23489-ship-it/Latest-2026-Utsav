
'use client';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState, useRef } from 'react';
import { getDonationTransparency, addDonationRecord } from '@/services/database';
import type { DonationTransparency } from '@/lib/types';
import { Loader2, Upload, ClipboardCopy, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { uploadFile } from '@/services/storage';
import { validateDonationInput } from '@/lib/validation';

export default function DonatePage() {
  const [donationSettings, setDonationSettings] = useState<DonationTransparency | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const [donorName, setDonorName] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const data = await getDonationTransparency();
        setDonationSettings(data);
      } catch (error) {
        console.error("Failed to fetch donation data:", error);
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not fetch donation transparency data.'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [toast]);
  
  const handleCopyUpiId = () => {
      if (!donationSettings?.upiId) return;
      navigator.clipboard.writeText(donationSettings.upiId).then(() => {
          setCopied(true);
          toast({ title: 'UPI ID Copied!'});
          setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
          toast({ variant: 'destructive', title: 'Copy Failed', description: 'Please copy the UPI ID manually.' });
      });
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          setProofFile(e.target.files[0]);
      }
  }

  const handleSubmitDonation = async (e: React.FormEvent) => {
      e.preventDefault();
      const validationError = validateDonationInput(donorName, amount, proofFile);
      if (validationError) {
          toast({ variant: 'destructive', title: 'Check donation details', description: validationError });
          return;
      }
      setIsSubmitting(true);
      try {
        const validProofFile = proofFile as File;
        const filePath = `donation_proofs/${Date.now()}_${validProofFile.name}`;
        const proofImageUrl = await uploadFile(validProofFile, filePath);

        await addDonationRecord({
            donorName: donorName.trim(),
            amount: Number(amount),
            purpose: purpose.trim(),
            proofImageUrl
        });
        
        toast({ title: 'Submission Received', description: "Thank you for your generous donation! An admin will verify it shortly." });
        
        // Reset form
        setDonorName('');
        setAmount('');
        setPurpose('');
        setProofFile(null);
        if(fileInputRef.current) fileInputRef.current.value = '';

      } catch (error) {
          console.error("Failed to submit donation record:", error);
          toast({ variant: 'destructive', title: 'Submission Failed', description: 'There was an error submitting your donation proof. Please try again.' });
      } finally {
          setIsSubmitting(false);
      }
  }


  return (
    <div className="space-y-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold font-headline text-primary">Donation &amp; Support</h1>
        <p className="text-lg text-muted-foreground mt-2">Your generous contribution helps make this festival a grand success.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Donate Securely</CardTitle>
            <CardDescription>Scan the QR code or use the UPI ID below to donate, then upload a screenshot of your payment.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
                <div className='flex flex-col items-center justify-center space-y-4 min-h-[480px]'>
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                </div>
            ) : (
                <>
                    <div className="flex flex-col items-center">
                    <Image 
                        src={donationSettings?.qrCodeUrl || "https://placehold.co/250x250.png"}
                        alt="UPI QR Code" 
                        width={250} 
                        height={250}
                        data-ai-hint="QR code"
                        className="rounded-lg border p-2"
                    />
                    <p className="mt-2 text-sm text-muted-foreground">Scan with any UPI App</p>
                    {donationSettings?.upiId && (
                        <div className='flex items-center gap-2 mt-4 p-2 bg-accent rounded-md border'>
                           <p className='text-sm font-semibold text-primary'>{donationSettings.upiId}</p>
                           <Button size="icon" variant="ghost" className='h-8 w-8' onClick={handleCopyUpiId}>
                            {copied ? <Check className='h-4 w-4 text-green-500' /> : <ClipboardCopy className='h-4 w-4'/>}
                           </Button>
                        </div>
                    )}
                    </div>
                    
                    <form onSubmit={handleSubmitDonation} className="space-y-4 pt-4 border-t">
                         <h3 className='font-semibold text-lg'>Submit Your Donation Proof</h3>
                        <div>
                            <Label htmlFor="name">Full Name</Label>
                            <Input id="name" placeholder="Your Name" value={donorName} onChange={(e) => setDonorName(e.target.value)} required autoComplete="name" />
                        </div>
                        <div>
                            <Label htmlFor="amount">Amount (INR)</Label>
                            <Input id="amount" type="number" min="1" step="1" inputMode="numeric" placeholder="Enter Amount" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                        </div>
                        <div>
                            <Label htmlFor="purpose">Purpose (Optional)</Label>
                            <Input id="purpose" placeholder="e.g., In memory of..." value={purpose} onChange={(e) => setPurpose(e.target.value)} />
                        </div>
                        <div>
                            <Label htmlFor="proof">Upload Payment Screenshot</Label>
                            <Input id="proof" type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" required />
                            {proofFile && <p className='text-xs text-muted-foreground mt-1'>Selected: {proofFile.name}</p>}
                        </div>
                        <Button type="submit" className="w-full" disabled={isSubmitting}>
                           {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className='mr-2 h-4 w-4'/>}
                           Submit Proof
                        </Button>
                    </form>
                </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Fund Usage Transparency</CardTitle>
            <CardDescription>See how your donations are utilized.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading || !donationSettings ? (
              <div className="flex items-center justify-center space-y-6 p-4 min-h-[480px]">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                    <span>Idol &amp; Mandap Decoration</span>
                    <span className="font-semibold text-primary">{donationSettings.decoration}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${donationSettings.decoration}%`}}></div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Community Meals (Prasad)</span>
                    <span className="font-semibold text-primary">{donationSettings.prasad}%</span>
                </div>
                 <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${donationSettings.prasad}%`}}></div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Cultural Programs &amp; Artists</span>
                    <span className="font-semibold text-primary">{donationSettings.programs}%</span>
                </div>
                 <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${donationSettings.programs}%`}}></div>
                </div>

                <div className="flex justify-between items-center">
                    <span>Logistics &amp; Miscellaneous</span>
                    <span className="font-semibold text-primary">{donationSettings.logistics}%</span>
                </div>
                 <div className="w-full bg-muted rounded-full h-2.5">
                    <div className="bg-primary h-2.5 rounded-full" style={{width: `${donationSettings.logistics}%`}}></div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

    
