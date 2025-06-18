"use client";

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Globe, Mail, MapPin, Home, Building, PlusCircle, Trash2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from '../ui/scroll-area';

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
  uniqueSupplierCountries: string[];
  onCreateWorkspace?: (data: any) => void;
}

interface WorkspaceNameEntry {
  id: string;
  name: string;
}

export default function CreateWorkspaceDialog({ 
  isOpen, 
  onClose, 
  uniqueSupplierCountries,
  onCreateWorkspace
}: CreateWorkspaceDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1); // 1: Form, 2: MFA
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Form fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [domainName, setDomainName] = useState('');
  const [email, setEmail] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('');
  const [workspaceNames, setWorkspaceNames] = useState<WorkspaceNameEntry[]>([{ id: `ws_${Date.now()}`, name: '' }]);
  const [mfaCode, setMfaCode] = useState('');

  const inputClassName = "h-9 text-sm border border-slate-300 dark:border-slate-600 bg-background text-foreground placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-ring focus:border-primary";

  // Real-time email validation
  const getEmailValidationMessage = () => {
    if (!email || !domainName) return null;
    
    // Check if email format is valid first
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return null; // Don't show domain error if email format is invalid
    
    const emailDomain = email.split('@')[1];
    if (!emailDomain) return null;
    
    const cleanEmailDomain = emailDomain.toLowerCase().replace('www.', '');
    const cleanEnteredDomain = domainName.toLowerCase().trim().replace('www.', '');
    
    if (cleanEmailDomain !== cleanEnteredDomain) {
      return `Email domain (@${emailDomain}) must match the domain name (${domainName})`;
    }
    
    return null;
  };

  const emailValidationError = getEmailValidationMessage();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isEmailValid = email && emailRegex.test(email) && domainName && !emailValidationError;

  const handleAddWorkspaceName = () => {
    setWorkspaceNames([...workspaceNames, { id: `ws_${Date.now()}_${workspaceNames.length}`, name: '' }]);
  };

  const handleRemoveWorkspaceName = (id: string) => {
    if (workspaceNames.length > 1) {
      setWorkspaceNames(workspaceNames.filter(ws => ws.id !== id));
    }
  };

  const handleWorkspaceNameChange = (id: string, value: string) => {
    setWorkspaceNames(workspaceNames.map(ws => (ws.id === id ? { ...ws, name: value } : ws)));
  };

  const handleSubmitForm = async () => {
    // Basic validation
    if (!firstName || !lastName || !domainName || !email || !country || workspaceNames.some(ws => !ws.name.trim())) {
      toast({
        variant: "destructive",
        title: "Missing Information",
        description: "Please fill out all required fields (First Name, Last Name, Domain Name, Email, Country, and at least one Workspace Name).",
      });
      return;
    }

    // Email domain validation
    if (emailValidationError) {
      toast({
        variant: "destructive",
        title: "Invalid Email Domain",
        description: emailValidationError,
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Prepare data for Google Sheets
      const formData = {
        firstName,
        lastName,
        domainName,
        email,
        address: {
          streetAddress,
          city,
          stateProvince,
          postalCode,
          country
        },
        workspaces: workspaceNames.map(ws => ws.name).filter(name => name.trim())
      };

      // Send data through our API route
      const response = await fetch('/api/submit-workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Registration Submitted!",
          description: "Your workspace registration has been received. Please check your email for the verification code.",
        });
        
        // Update the UI by calling the parent's function
        if (onCreateWorkspace) {
          workspaceNames.forEach((ws, index) => {
            if (ws.name.trim()) {
              const workspaceData = {
                workspaceName: ws.name.trim(),
                workspaceDescription: `Workspace created by ${firstName} ${lastName}`,
                workspaceType: 'custom',
                firstName,
                lastName,
                email,
                domain: domainName, // Include domain for sharing restrictions
                department: '',
                region: country,
                businessUnit: '',
                tags: ['new', 'pending-verification']
              };
              
              // Only call for the first workspace to avoid multiple toasts
              if (index === 0) {
                onCreateWorkspace(workspaceData);
              }
            }
          });
        }
        
        // Proceed to MFA step
        setStep(2);
      } else {
        throw new Error(result.message || 'Failed to submit registration');
      }
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Submission Failed",
        description: error instanceof Error ? error.message : "There was an error submitting your registration. Please try again.",
      });
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyMfa = async () => {
    // MFA verification
    if (mfaCode.length === 6 && /^\d+$/.test(mfaCode)) {
      setIsVerifying(true);
      
      try {
        // Simulate verification delay (in a real app, this would verify with your backend)
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        toast({
          title: "Workspace Created Successfully!",
          description: `Your workspace "${workspaceNames[0].name}" has been created and verified.`,
        });
        
        handleCloseDialog();
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Verification Failed",
          description: "There was an error verifying your code. Please try again.",
        });
      } finally {
        setIsVerifying(false);
      }
    } else {
      toast({
        variant: "destructive",
        title: "Invalid Code",
        description: "Please enter a valid 6-digit verification code.",
      });
    }
  };
  
  const handleCloseDialog = () => {
    // Reset form fields and step on close
    setFirstName('');
    setLastName('');
    setDomainName('');
    setEmail('');
    setStreetAddress('');
    setCity('');
    setStateProvince('');
    setPostalCode('');
    setCountry('');
    setWorkspaceNames([{ id: `ws_${Date.now()}`, name: '' }]);
    setMfaCode('');
    setStep(1);
    setIsSubmitting(false);
    setIsVerifying(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleCloseDialog(); }}>
      <DialogContent className="sm:max-w-xl border border-slate-300 dark:border-slate-600">
        <DialogHeader>
          <div className="flex items-center justify-center mb-4">
            <Image 
              src="/TADA_TM-2023_Color-White-Logo.svg" 
              alt="TADA Logo" 
              width={160} 
              height={50}
              className="h-12 w-auto dark:brightness-100 brightness-0"
            />
          </div>
          <DialogTitle className="text-center text-xl font-semibold">
            Create New Workspace
          </DialogTitle>
          <DialogDescription className="text-center">
            {step === 1 ? "Provide your details and desired workspace names." : "Enter the verification code sent to your email."}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <ScrollArea className="max-h-[60vh] p-1 pr-3">
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">
                    First Name <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="firstName" 
                    value={firstName} 
                    onChange={(e) => setFirstName(e.target.value)} 
                    className={inputClassName}
                    placeholder="John"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">
                    Last Name <span className="text-destructive">*</span>
                  </Label>
                  <Input 
                    id="lastName" 
                    value={lastName} 
                    onChange={(e) => setLastName(e.target.value)} 
                    className={inputClassName}
                    placeholder="Doe"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="domainName" className="flex items-center text-sm font-medium">
                  <Globe className="h-3.5 w-3.5 mr-1.5"/>Domain Name <span className="text-destructive">*</span>
                </Label>
                <Input 
                  id="domainName" 
                  placeholder="yourcompany.com" 
                  value={domainName} 
                  onChange={(e) => setDomainName(e.target.value)} 
                  className={inputClassName}
                  disabled={isSubmitting}
                />
                <p className="text-xs text-muted-foreground">
                  Must match your email domain (e.g., if email is user@company.com, enter company.com)
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center text-sm font-medium">
                  <Mail className="h-3.5 w-3.5 mr-1.5"/>Email <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="you@yourcompany.com" 
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className={`${inputClassName} ${emailValidationError ? 'border-destructive focus:ring-destructive' : isEmailValid ? 'border-green-500' : ''} ${isEmailValid ? 'pr-10' : ''}`}
                    disabled={isSubmitting}
                  />
                  {isEmailValid && (
                    <CheckCircle className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-500" />
                  )}
                </div>
                {emailValidationError ? (
                  <p className="text-xs text-destructive">{emailValidationError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Your email domain must match the domain name above
                  </p>
                )}
              </div>

              <fieldset className="border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                <legend className="text-sm font-medium px-2 flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1.5"/>Address
                </legend>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="streetAddress" className="text-sm">Street Address</Label>
                    <Input 
                      id="streetAddress" 
                      value={streetAddress} 
                      onChange={(e) => setStreetAddress(e.target.value)} 
                      className={inputClassName}
                      placeholder="123 Main Street"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm">City</Label>
                      <Input 
                        id="city" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        className={inputClassName}
                        placeholder="New York"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="stateProvince" className="text-sm">State/Province</Label>
                      <Input 
                        id="stateProvince" 
                        value={stateProvince} 
                        onChange={(e) => setStateProvince(e.target.value)} 
                        className={inputClassName}
                        placeholder="NY"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="postalCode" className="text-sm">Postal Code</Label>
                      <Input 
                        id="postalCode" 
                        value={postalCode} 
                        onChange={(e) => setPostalCode(e.target.value)} 
                        className={inputClassName}
                        placeholder="10001"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="country" className="text-sm">
                        Country <span className="text-destructive">*</span>
                      </Label>
                       <Select value={country} onValueChange={setCountry} disabled={isSubmitting}>
                        <SelectTrigger id="country" className="h-9 text-sm border border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-ring">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                        <SelectContent>
                          {uniqueSupplierCountries.map(c => (
                            <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                          ))}
                          <SelectItem value="Other" className="text-sm">Other (Not Listed)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </fieldset>
              
              <fieldset className="border-2 border-slate-300 dark:border-slate-600 rounded-lg p-4 space-y-3 bg-slate-50/50 dark:bg-slate-900/30">
                <legend className="text-sm font-medium px-2 flex items-center">
                  <Building className="h-3.5 w-3.5 mr-1.5"/>Workspace Names
                </legend>
                 <div className="space-y-3">
                  {workspaceNames.map((ws, index) => (
                    <div key={ws.id} className="flex items-center gap-2">
                      <Input 
                        placeholder={`Workspace Name ${index + 1} ${index === 0 ? '(required)' : ''}`}
                        value={ws.name}
                        onChange={(e) => handleWorkspaceNameChange(ws.id, e.target.value)}
                        className={`${inputClassName} flex-grow`}
                        disabled={isSubmitting}
                      />
                      {workspaceNames.length > 1 && (
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          onClick={() => handleRemoveWorkspaceName(ws.id)} 
                          className="h-9 w-9 border border-slate-300 dark:border-slate-600 hover:border-destructive hover:bg-destructive/10"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="h-4 w-4 text-destructive"/>
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm" 
                    onClick={handleAddWorkspaceName} 
                    className="text-sm h-9 border-2 border-dashed border-slate-300 dark:border-slate-600 hover:border-solid hover:border-slate-400 dark:hover:border-slate-500"
                    disabled={isSubmitting}
                  >
                    <PlusCircle className="mr-2 h-3.5 w-3.5" /> Add Another Workspace
                  </Button>
                </div>
              </fieldset>
            </div>
          </ScrollArea>
        )}

        {step === 2 && (
            <div className="space-y-6 py-6">
                <div className="text-center space-y-2">
                  <p className="text-sm">
                    A verification code has been sent to
                  </p>
                  <p className="font-semibold text-lg">{email}</p>
                  <p className="text-sm text-muted-foreground">
                    Please check your email and enter the 6-digit code below
                  </p>
                </div>
                <div className="space-y-2 max-w-xs mx-auto">
                    <Label htmlFor="mfaCode" className="text-center block text-sm font-medium">
                      Verification Code
                    </Label>
                    <Input 
                        id="mfaCode" 
                        value={mfaCode} 
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0,6))} 
                        maxLength={6}
                        className="h-12 text-xl tracking-[0.5em] text-center font-mono border-2 border-slate-300 dark:border-slate-600 focus:ring-2 focus:ring-ring"
                        placeholder="000000"
                        disabled={isVerifying}
                    />
                </div>
            </div>
        )}

        <DialogFooter className="gap-3 sm:gap-3">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleCloseDialog}
            className="min-w-[120px] h-10 text-sm font-medium border border-slate-300 dark:border-slate-600"
            disabled={isSubmitting || isVerifying}
          >
            Cancel
          </Button>
          {step === 1 && (
            <Button 
              type="button" 
              onClick={handleSubmitForm}
              className="min-w-[200px] h-10 text-sm font-medium"
              disabled={isSubmitting || !!emailValidationError || !domainName || !email}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit & Verify Email'
              )}
            </Button>
          )}
          {step === 2 && (
            <Button 
              type="button" 
              onClick={handleVerifyMfa} 
              disabled={mfaCode.length !== 6 || isVerifying}
              className="min-w-[160px] h-10 text-sm font-medium"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify & Create'
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}