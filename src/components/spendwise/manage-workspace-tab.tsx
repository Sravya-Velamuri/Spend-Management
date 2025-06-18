"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import CreateWorkspaceDialog from './create-workspace-dialog';
import { 
  Building2, Users, Calendar, Settings, Trash2, Edit, Share2, Search, 
  Plus, Grid3X3, List, Activity, Shield, Clock, UserPlus, Mail, 
  MoreVertical, Eye, ChevronRight, Globe, MapPin, Sparkles, 
  FileText, CheckCircle, AlertCircle, Loader2, UserCheck, UserX,
  FolderOpen, Archive, Star, StarOff, Filter, Download, Upload,
  Lock, Unlock, TrendingUp, DollarSign, Package, AlertTriangle,
  History, Key, RefreshCw, Copy, ExternalLink, BarChart3, Info // Added Info here!
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WorkspaceUser {
  id: string;
  email: string;
  name: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  addedDate: string;
  lastActive?: string;
  department?: string;
  avatar?: string;
}

interface WorkspaceActivity {
  id: string;
  userId: string;
  userName: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface Workspace {
  id: string;
  name: string;
  description: string;
  type: 'procurement' | 'cost-reduction' | 'supplier-consolidation' | 'custom';
  createdDate: string;
  lastModified: string;
  lastAnalysis?: string;
  owner: string;
  ownerName?: string;
  status: 'active' | 'archived';
  users: WorkspaceUser[];
  settings: {
    isPublic: boolean;
    allowExternalSharing: boolean;
    dataRetentionDays: number;
    requireApproval: boolean;
    autoArchiveDays?: number;
  };
  statistics: {
    totalParts: number;
    totalSuppliers: number;
    totalSpend: number;
    totalCategories: number;
    lastDataImport?: string;
    dataSource?: string;
  };
  tags: string[];
  department?: string;
  businessUnit?: string;
  region?: string;
  companyDomain: string;
  activityLog?: WorkspaceActivity[];
}

interface ManageWorkspaceTabProps {
  userEmail?: string;
  userName?: string;
  companyDomain?: string;
}

const MOCK_CURRENT_USER_EMAIL = "john.doe@company.com";
const MOCK_COMPANY_DOMAIN = "company.com";

// Workspace type configurations
const WORKSPACE_TYPES = {
  procurement: {
    name: 'Annual Procurement Review',
    icon: Package,
    color: 'blue',
    description: 'Year-over-year analysis with supplier scorecards'
  },
  'cost-reduction': {
    name: 'Cost Reduction Initiative',
    icon: TrendingUp,
    color: 'green',
    description: 'Track savings and optimization opportunities'
  },
  'supplier-consolidation': {
    name: 'Supplier Consolidation',
    icon: Users,
    color: 'purple',
    description: 'Identify redundancies and consolidation potential'
  },
  custom: {
    name: 'Custom Workspace',
    icon: Settings,
    color: 'gray',
    description: 'Configure for your specific needs'
  }
};

export default function ManageWorkspaceTab({ 
  userEmail = MOCK_CURRENT_USER_EMAIL, 
  userName = "John Doe",
  companyDomain = MOCK_COMPANY_DOMAIN
}: ManageWorkspaceTabProps) {
  const { toast } = useToast();
  // Store workspaces in memory only - no localStorage
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [filterType, setFilterType] = useState<'all' | 'owned' | 'shared'>('all');
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
  
  // Form states
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [shareEmail, setShareEmail] = useState('');
  const [shareRole, setShareRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [shareDepartment, setShareDepartment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cloneName, setCloneName] = useState('');

  // Extract company domain from user email if not provided
  const userCompanyDomain = useMemo(() => {
    if (companyDomain) return companyDomain;
    const emailDomain = userEmail.split('@')[1];
    return emailDomain || MOCK_COMPANY_DOMAIN;
  }, [userEmail, companyDomain]);

  // Save workspaces to state only (in-memory)
  const saveWorkspaces = (updatedWorkspaces: Workspace[]) => {
    setWorkspaces(updatedWorkspaces);
  };

  // Send workspace data to Google Sheets
  const sendToGoogleSheets = (workspace: Workspace, action: string) => {
    try {
      const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxw88r13q3DvqPeYdmyPZOKwDmvJXEi1m_MNIHy12uvKlOJb_3qbR35ntRjkuh1z5No/exec';
      
      const payload = {
        action: 'workspace_' + action,
        timestamp: new Date().toISOString(),
        workspaceId: workspace.id,
        workspaceName: workspace.name,
        workspaceType: workspace.type,
        description: workspace.description,
        owner: workspace.owner,
        ownerName: workspace.ownerName,
        status: workspace.status,
        department: workspace.department || '',
        businessUnit: workspace.businessUnit || '',
        region: workspace.region || '',
        totalParts: workspace.statistics.totalParts,
        totalSuppliers: workspace.statistics.totalSuppliers,
        totalSpend: workspace.statistics.totalSpend,
        totalCategories: workspace.statistics.totalCategories,
        userCount: workspace.users.length,
        tags: workspace.tags.join(', '),
        companyDomain: workspace.companyDomain,
        userEmail: userEmail,
        userName: userName
      };

      fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      }).then(() => {
        console.log(`Workspace ${action} sent to Google Sheets:`, payload);
      }).catch(error => {
        console.error('Error sending to Google Sheets:', error);
      });
    } catch (error) {
      console.error('Error preparing Google Sheets data:', error);
    }
  };

  // Add activity log entry
  const addActivityLog = (workspace: Workspace, action: string, details?: string): WorkspaceActivity => {
    return {
      id: `activity_${Date.now()}`,
      userId: userEmail,
      userName: userName,
      action,
      timestamp: new Date().toISOString(),
      details
    };
  };

  // Filter workspaces
  const filteredWorkspaces = useMemo(() => {
    return workspaces.filter(ws => {
      // Search filter
      const matchesSearch = searchTerm === '' || 
        ws.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())) ||
        ws.department?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ws.businessUnit?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = filterStatus === 'all' || ws.status === filterStatus;
      
      // Type filter
      let matchesType = true;
      if (filterType === 'owned') {
        matchesType = ws.owner === userEmail;
      } else if (filterType === 'shared') {
        matchesType = ws.owner !== userEmail;
      }
      
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [workspaces, searchTerm, filterStatus, filterType, userEmail]);

  // Validate email domain against workspace domain
  const validateEmailDomain = (email: string, workspaceDomain: string): boolean => {
    const emailDomain = email.split('@')[1];
    return emailDomain === workspaceDomain;
  };

  // Handlers
  const handleCreateWorkspace = async (workspaceData: any) => {
    const newWorkspace: Workspace = {
      id: `ws_${Date.now()}`,
      name: workspaceData.workspaceName || 'New Workspace',
      description: workspaceData.workspaceDescription || `Created by ${workspaceData.firstName} ${workspaceData.lastName}`,
      type: workspaceData.workspaceType || 'custom',
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      owner: workspaceData.email,
      ownerName: `${workspaceData.firstName} ${workspaceData.lastName}`,
      status: 'active',
      users: [{
        id: 'user_' + Date.now(),
        email: workspaceData.email,
        name: `${workspaceData.firstName} ${workspaceData.lastName}`,
        role: 'owner',
        addedDate: new Date().toISOString(),
        department: workspaceData.department || 'Not specified',
      }],
      settings: {
        isPublic: false,
        allowExternalSharing: false,
        dataRetentionDays: 90,
        requireApproval: true,
        autoArchiveDays: 180,
      },
      statistics: {
        totalParts: 0,
        totalSuppliers: 0,
        totalSpend: 0,
        totalCategories: 0,
      },
      tags: workspaceData.tags || [],
      department: workspaceData.department,
      businessUnit: workspaceData.businessUnit,
      region: workspaceData.region,
      companyDomain: userCompanyDomain,
      activityLog: [addActivityLog({} as Workspace, 'Workspace created')],
    };
    
    // Save to in-memory state
    const updatedWorkspaces = [...workspaces, newWorkspace];
    setWorkspaces(updatedWorkspaces);
    
    // Send to Google Sheets in background (no await to avoid blocking)
    sendToGoogleSheets(newWorkspace, 'created');
    
    // Don't show toast here - let the dialog handle it
  };

  const handleEditWorkspace = () => {
    if (!selectedWorkspace) return;
    
    const activity = addActivityLog(selectedWorkspace, 'Workspace edited', `Name: ${editName}`);
    
    const updated = workspaces.map(ws => 
      ws.id === selectedWorkspace.id 
        ? { 
            ...ws, 
            name: editName, 
            description: editDescription, 
            lastModified: new Date().toISOString(),
            activityLog: [...(ws.activityLog || []), activity]
          }
        : ws
    );
    
    saveWorkspaces(updated);
    
    // Send to Google Sheets
    const updatedWorkspace = updated.find(ws => ws.id === selectedWorkspace.id);
    if (updatedWorkspace) {
      sendToGoogleSheets(updatedWorkspace, 'edited');
    }
    
    setIsEditDialogOpen(false);
    toast({
      title: "Workspace Updated",
      description: `"${editName}" has been updated successfully.`,
    });
  };

  const handleDeleteWorkspace = () => {
    if (!selectedWorkspace) return;
    
    // Send deletion to Google Sheets before removing
    sendToGoogleSheets(selectedWorkspace, 'deleted');
    
    const updated = workspaces.filter(ws => ws.id !== selectedWorkspace.id);
    saveWorkspaces(updated);
    setIsDeleteDialogOpen(false);
    setSelectedWorkspace(null);
    toast({
      title: "Workspace Deleted",
      description: `"${selectedWorkspace.name}" has been permanently deleted.`,
      variant: "destructive",
    });
  };

  const handleArchiveWorkspace = (workspace: Workspace) => {
    const newStatus = workspace.status === 'active' ? 'archived' : 'active';
    const activity = addActivityLog(workspace, `Workspace ${newStatus}`, `Changed from ${workspace.status} to ${newStatus}`);
    
    const updated = workspaces.map(ws => 
      ws.id === workspace.id 
        ? { 
            ...ws, 
            status: newStatus, 
            lastModified: new Date().toISOString(),
            activityLog: [...(ws.activityLog || []), activity]
          }
        : ws
    );
    saveWorkspaces(updated);
    
    // Send to Google Sheets
    const updatedWorkspace = updated.find(ws => ws.id === workspace.id);
    if (updatedWorkspace) {
      sendToGoogleSheets(updatedWorkspace, newStatus);
    }
    
    toast({
      title: newStatus === 'archived' ? "Workspace Archived" : "Workspace Activated",
      description: `"${workspace.name}" has been ${newStatus}.`,
    });
  };

  const handleShareWorkspace = async () => {
    if (!selectedWorkspace || !shareEmail) return;
    
    // Validate email domain
    if (!validateEmailDomain(shareEmail)) {
      toast({
        title: "Invalid Email Domain",
        description: `Only users with @${userCompanyDomain} email addresses can be added to workspaces.`,
        variant: "destructive",
      });
      return;
    }
    
    // Check if user already exists
    const userExists = selectedWorkspace.users.some(u => u.email === shareEmail);
    if (userExists) {
      toast({
        title: "User Already Added",
        description: `${shareEmail} is already a member of this workspace.`,
        variant: "destructive",
      });
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    const newUser: WorkspaceUser = {
      id: `user_${Date.now()}`,
      email: shareEmail,
      name: shareEmail.split('@')[0].replace(/[._-]/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
      role: shareRole,
      addedDate: new Date().toISOString(),
      department: shareDepartment || 'Not specified',
    };
    
    const activity = addActivityLog(selectedWorkspace, 'User added', `${shareEmail} as ${shareRole}`);
    
    const updated = workspaces.map(ws => 
      ws.id === selectedWorkspace.id 
        ? { 
            ...ws, 
            users: [...ws.users, newUser], 
            lastModified: new Date().toISOString(),
            activityLog: [...(ws.activityLog || []), activity]
          }
        : ws
    );
    
    saveWorkspaces(updated);
    
    // Send to Google Sheets
    const updatedWorkspace = updated.find(ws => ws.id === selectedWorkspace.id);
    if (updatedWorkspace) {
      sendToGoogleSheets(updatedWorkspace, 'user_added');
    }
    
    setIsProcessing(false);
    setIsShareDialogOpen(false);
    setShareEmail('');
    setShareRole('viewer');
    setShareDepartment('');
    
    toast({
      title: "User Added Successfully",
      description: `${shareEmail} has been added as ${shareRole}.`,
    });
  };

  const handleRemoveUser = (workspace: Workspace, userId: string) => {
    const user = workspace.users.find(u => u.id === userId);
    if (!user) return;
    
    const activity = addActivityLog(workspace, 'User removed', `${user.email} (${user.role})`);
    
    const updated = workspaces.map(ws => 
      ws.id === workspace.id 
        ? { 
            ...ws, 
            users: ws.users.filter(u => u.id !== userId), 
            lastModified: new Date().toISOString(),
            activityLog: [...(ws.activityLog || []), activity]
          }
        : ws
    );
    
    saveWorkspaces(updated);
    
    // Send to Google Sheets
    const updatedWorkspace = updated.find(ws => ws.id === workspace.id);
    if (updatedWorkspace) {
      sendToGoogleSheets(updatedWorkspace, 'user_removed');
    }
    
    toast({
      title: "User Removed",
      description: `${user.email} has been removed from the workspace.`,
    });
  };

  const handleCloneWorkspace = () => {
    if (!selectedWorkspace || !cloneName.trim()) return;
    
    const clonedWorkspace: Workspace = {
      ...selectedWorkspace,
      id: `ws_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: cloneName.trim(),
      createdDate: new Date().toISOString(),
      lastModified: new Date().toISOString(),
      owner: userEmail,
      ownerName: userName,
      users: [{
        id: 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9),
        email: userEmail,
        name: userName,
        role: 'owner',
        addedDate: new Date().toISOString(),
        department: selectedWorkspace.users.find(u => u.email === userEmail)?.department || 'Not specified',
      }],
      statistics: {
        ...selectedWorkspace.statistics,
        totalParts: 0,
        totalSuppliers: 0,
        totalSpend: 0,
        totalCategories: 0,
        lastDataImport: undefined,
      },
      activityLog: [addActivityLog({} as Workspace, 'Workspace cloned', `From "${selectedWorkspace.name}"`)],
    };
    
    saveWorkspaces([...workspaces, clonedWorkspace]);
    
    // Send to Google Sheets
    sendToGoogleSheets(clonedWorkspace, 'cloned');
    
    setIsCloneDialogOpen(false);
    setCloneName('');
    
    toast({
      title: "Workspace Cloned",
      description: `"${clonedWorkspace.name}" has been created as a copy of "${selectedWorkspace.name}".`,
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
      notation: value >= 1000000 ? 'compact' : 'standard',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      notation: value >= 1000 ? 'compact' : 'standard',
      maximumFractionDigits: 1,
    }).format(value);
  };

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const active = workspaces.filter(ws => ws.status === 'active');
    const totalSpend = active.reduce((sum, ws) => sum + ws.statistics.totalSpend, 0);
    const totalParts = active.reduce((sum, ws) => sum + ws.statistics.totalParts, 0);
    const totalSuppliers = active.reduce((sum, ws) => sum + ws.statistics.totalSuppliers, 0);
    
    return {
      totalWorkspaces: workspaces.length,
      activeWorkspaces: active.length,
      totalSpend,
      totalParts,
      totalSuppliers,
    };
  }, [workspaces]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="border-none shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-2xl font-bold flex items-center">
                <Building2 className="mr-3 h-7 w-7 text-primary" />
                Workspace Management
              </CardTitle>
              <CardDescription className="text-base">
                Create and manage procurement analysis workspaces for your organization
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsCreateDialogOpen(true)}
              size="lg"
              className="shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="border-0 shadow-none bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Workspaces</p>
                    <p className="text-2xl font-bold">{summaryStats.totalWorkspaces}</p>
                  </div>
                  <Building2 className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-green-600">{summaryStats.activeWorkspaces}</p>
                  </div>
                  <Activity className="h-8 w-8 text-green-600/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Spend</p>
                    <p className="text-2xl font-bold">{formatCurrency(summaryStats.totalSpend)}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Parts</p>
                    <p className="text-2xl font-bold">{formatNumber(summaryStats.totalParts)}</p>
                  </div>
                  <Package className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-none bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Suppliers</p>
                    <p className="text-2xl font-bold">{formatNumber(summaryStats.totalSuppliers)}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground/50" />
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-96">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search workspaces, tags, departments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg shadow-sm border bg-background">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Workspaces Display */}
      <Tabs value={filterType} onValueChange={(v) => setFilterType(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            All Workspaces
            <Badge variant="secondary" className="ml-1">{workspaces.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            My Workspaces
            <Badge variant="secondary" className="ml-1">
              {workspaces.filter(ws => ws.owner === userEmail).length}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="shared" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Shared with Me
            <Badge variant="secondary" className="ml-1">
              {workspaces.filter(ws => ws.owner !== userEmail).length}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filterType} className="mt-6">
          {filteredWorkspaces.length === 0 ? (
            <Card className="p-12 text-center border-dashed">
              <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No workspaces found</h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchTerm ? 'Try adjusting your search criteria' : 'Create your first workspace to get started with procurement analysis'}
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} size="lg">
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Workspace
              </Button>
            </Card>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkspaces.map(workspace => (
                <WorkspaceCard
                  key={workspace.id}
                  workspace={workspace}
                  currentUserEmail={userEmail}
                  onArchive={handleArchiveWorkspace}
                  onEdit={(ws) => {
                    setSelectedWorkspace(ws);
                    setEditName(ws.name);
                    setEditDescription(ws.description);
                    setIsEditDialogOpen(true);
                  }}
                  onShare={(ws) => {
                    setSelectedWorkspace(ws);
                    setIsShareDialogOpen(true);
                  }}
                  onDelete={(ws) => {
                    setSelectedWorkspace(ws);
                    setIsDeleteDialogOpen(true);
                  }}
                  onClone={(ws) => {
                    setSelectedWorkspace(ws);
                    setCloneName(`${ws.name} (Copy)`);
                    setIsCloneDialogOpen(true);
                  }}
                  onViewDetails={(ws) => {
                    setSelectedWorkspace(ws);
                    setIsDetailsDialogOpen(true);
                  }}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                />
              ))}
            </div>
          ) : (
            <WorkspaceListView
              workspaces={filteredWorkspaces}
              currentUserEmail={userEmail}
              onArchive={handleArchiveWorkspace}
              onEdit={(ws) => {
                setSelectedWorkspace(ws);
                setEditName(ws.name);
                setEditDescription(ws.description);
                setIsEditDialogOpen(true);
              }}
              onShare={(ws) => {
                setSelectedWorkspace(ws);
                setIsShareDialogOpen(true);
              }}
              onDelete={(ws) => {
                setSelectedWorkspace(ws);
                setIsDeleteDialogOpen(true);
              }}
              onClone={(ws) => {
                setSelectedWorkspace(ws);
                setCloneName(`${ws.name} (Copy)`);
                setIsCloneDialogOpen(true);
              }}
              onViewDetails={(ws) => {
                setSelectedWorkspace(ws);
                setIsDetailsDialogOpen(true);
              }}
              formatDate={formatDate}
              formatCurrency={formatCurrency}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        uniqueSupplierCountries={['USA', 'Canada', 'Mexico', 'UK', 'Germany', 'France', 'Japan', 'China']}
        onCreateWorkspace={handleCreateWorkspace}
      />

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Workspace
            </DialogTitle>
            <DialogDescription>
              Update the workspace details and configuration.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Workspace Name</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter workspace name"
                className="h-10"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe the purpose of this workspace"
                rows={4}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditWorkspace} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Share2 className="mr-2 h-5 w-5" />
              Share Workspace
            </DialogTitle>
            <DialogDescription>
              Add team members to collaborate on "{selectedWorkspace?.name}"
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <Alert className="border-blue-200 bg-blue-50 dark:bg-blue-950/30">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                Only users with <strong>@{selectedWorkspace?.companyDomain}</strong> email addresses can be added to this workspace.
                External sharing is restricted for security.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="share-email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="share-email"
                    type="email"
                    value={shareEmail}
                    onChange={(e) => setShareEmail(e.target.value)}
                    placeholder={`user@${selectedWorkspace?.companyDomain}`}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="share-department">Department (Optional)</Label>
                <Input
                  id="share-department"
                  value={shareDepartment}
                  onChange={(e) => setShareDepartment(e.target.value)}
                  placeholder="e.g., Procurement, Finance"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="share-role">Permission Level</Label>
              <Select value={shareRole} onValueChange={(v) => setShareRole(v as any)}>
                <SelectTrigger id="share-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-muted-foreground">Can edit workspace and manage users</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="editor">
                    <div className="flex items-center gap-2">
                      <Edit className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="font-medium">Editor</div>
                        <div className="text-xs text-muted-foreground">Can edit data but not manage users</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="viewer">
                    <div className="flex items-center gap-2">
                      <Eye className="h-4 w-4 text-gray-500" />
                      <div>
                        <div className="font-medium">Viewer</div>
                        <div className="text-xs text-muted-foreground">Can view data but not make changes</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Current Users */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Current Members ({selectedWorkspace?.users.length})</Label>
              <ScrollArea className="h-48 border rounded-lg">
                <div className="p-4 space-y-2">
                  {selectedWorkspace?.users.map(user => (
                    <div key={user.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="text-sm font-medium">
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.department && (
                            <p className="text-xs text-muted-foreground">{user.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}
                          className="capitalize"
                        >
                          {user.role === 'owner' && <Key className="mr-1 h-3 w-3" />}
                          {user.role}
                        </Badge>
                        {user.role !== 'owner' && selectedWorkspace.owner === userEmail && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 hover:bg-destructive/10"
                            onClick={() => handleRemoveUser(selectedWorkspace, user.id)}
                          >
                            <UserX className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleShareWorkspace} 
              disabled={!shareEmail || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Adding User...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clone Dialog */}
      <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Copy className="mr-2 h-5 w-5" />
              Clone Workspace
            </DialogTitle>
            <DialogDescription>
              Create a copy of "{selectedWorkspace?.name}" with a new name.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="clone-name">New Workspace Name</Label>
              <Input
                id="clone-name"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Enter name for cloned workspace"
              />
            </div>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription className="text-sm">
                The cloned workspace will copy all settings and configurations but start with empty data.
                You will be set as the owner.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCloneDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneWorkspace} disabled={!cloneName.trim()}>
              <Copy className="mr-2 h-4 w-4" />
              Clone Workspace
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-destructive">
              <AlertTriangle className="mr-2 h-5 w-5" />
              Delete Workspace
            </DialogTitle>
            <DialogDescription>
              This action cannot be undone. All data associated with this workspace will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                You are about to delete <strong>"{selectedWorkspace?.name}"</strong>.
                <br />
                This will remove:
                <ul className="list-disc list-inside mt-2 text-sm">
                  <li>{selectedWorkspace?.statistics.totalParts || 0} parts</li>
                  <li>{selectedWorkspace?.statistics.totalSuppliers || 0} suppliers</li>
                  <li>{selectedWorkspace?.users.length || 0} user access records</li>
                  <li>All associated analyses and reports</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteWorkspace}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <WorkspaceDetailsDialog
        workspace={selectedWorkspace}
        isOpen={isDetailsDialogOpen}
        onClose={() => setIsDetailsDialogOpen(false)}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        currentUserEmail={userEmail}
      />
    </div>
  );
}

// Workspace Card Component
function WorkspaceCard({ 
  workspace, 
  currentUserEmail,
  onArchive, 
  onEdit, 
  onShare, 
  onDelete, 
  onClone,
  onViewDetails,
  formatCurrency,
  formatDate 
}: {
  workspace: Workspace;
  currentUserEmail: string;
  onArchive: (ws: Workspace) => void;
  onEdit: (ws: Workspace) => void;
  onShare: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
  onClone: (ws: Workspace) => void;
  onViewDetails: (ws: Workspace) => void;
  formatCurrency: (value: number) => string;
  formatDate: (date: string) => string;
}) {
  const isOwner = workspace.owner === currentUserEmail;
  const userRole = workspace.users.find(u => u.email === currentUserEmail)?.role || 'viewer';
  const canEdit = isOwner || userRole === 'admin' || userRole === 'editor';
  const canManage = isOwner || userRole === 'admin';
  
  const TypeIcon = WORKSPACE_TYPES[workspace.type]?.icon || Settings;
  
  return (
    <Card className={`group hover:shadow-lg transition-all duration-200 ${workspace.status === 'archived' ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <TypeIcon className="h-5 w-5 text-primary" />
              <CardTitle className="text-lg font-semibold line-clamp-1">
                {workspace.name}
              </CardTitle>
            </div>
            <CardDescription className="line-clamp-2 text-sm">
              {workspace.description}
            </CardDescription>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onViewDetails(workspace)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={() => onEdit(workspace)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Workspace
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onClone(workspace)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Clone Workspace
                  </DropdownMenuItem>
                </>
              )}
              {canManage && (
                <>
                  <DropdownMenuItem onClick={() => onShare(workspace)}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Manage Users
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onArchive(workspace)}>
                    <Archive className="mr-2 h-4 w-4" />
                    {workspace.status === 'active' ? 'Archive' : 'Activate'}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => onDelete(workspace)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        <div className="flex items-center gap-2 mt-3">
          {workspace.status === 'archived' && (
            <Badge variant="secondary" className="text-xs">
              <Archive className="mr-1 h-3 w-3" />
              Archived
            </Badge>
          )}
          <Badge variant="outline" className="text-xs">
            <Globe className="mr-1 h-3 w-3" />
            @{workspace.companyDomain}
          </Badge>
          {workspace.tags.map(tag => (
            <Badge key={tag} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Spend</p>
            <p className="text-lg font-semibold">{formatCurrency(workspace.statistics.totalSpend)}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Parts</p>
            <p className="text-lg font-semibold">{workspace.statistics.totalParts.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Suppliers</p>
            <p className="text-lg font-semibold">{workspace.statistics.totalSuppliers}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Categories</p>
            <p className="text-lg font-semibold">{workspace.statistics.totalCategories}</p>
          </div>
        </div>

        <Separator />

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {workspace.users.slice(0, 3).map((user) => (
                <Tooltip key={user.id}>
                  <TooltipTrigger asChild>
                    <Avatar className="h-8 w-8 border-2 border-background">
                      <AvatarFallback className="text-xs bg-primary/10">
                        {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-muted-foreground">{user.role}</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
              {workspace.users.length > 3 && (
                <Avatar className="h-8 w-8 border-2 border-background">
                  <AvatarFallback className="text-xs bg-muted">
                    +{workspace.users.length - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          </div>
          
          <div className="text-xs text-muted-foreground">
            {workspace.lastAnalysis ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <BarChart3 className="h-3 w-3" />
                    {formatDate(workspace.lastAnalysis)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Last analysis run</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <span>No analysis yet</span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Workspace List View Component
function WorkspaceListView({ 
  workspaces,
  currentUserEmail,
  onArchive,
  onEdit,
  onShare,
  onDelete,
  onClone,
  onViewDetails,
  formatDate,
  formatCurrency
}: {
  workspaces: Workspace[];
  currentUserEmail: string;
  onArchive: (ws: Workspace) => void;
  onEdit: (ws: Workspace) => void;
  onShare: (ws: Workspace) => void;
  onDelete: (ws: Workspace) => void;
  onClone: (ws: Workspace) => void;
  onViewDetails: (ws: Workspace) => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
}) {
  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Workspace</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Owner</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Total Spend</TableHead>
            <TableHead className="text-center">Parts</TableHead>
            <TableHead className="text-center">Suppliers</TableHead>
            <TableHead>Last Modified</TableHead>
            <TableHead>Members</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {workspaces.map(workspace => {
            const isOwner = workspace.owner === currentUserEmail;
            const userRole = workspace.users.find(u => u.email === currentUserEmail)?.role || 'viewer';
            const TypeIcon = WORKSPACE_TYPES[workspace.type]?.icon || Settings;
            
            return (
              <TableRow key={workspace.id} className={workspace.status === 'archived' ? 'opacity-75' : ''}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <TypeIcon className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{workspace.name}</p>
                      <p className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                        {workspace.description}
                      </p>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      <TypeIcon className="h-3 w-3 mr-1" />
                      {workspace.type.replace('-', ' ')}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      @{workspace.companyDomain}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell>
                  {isOwner ? (
                    <Badge variant="default">You</Badge>
                  ) : (
                    <span className="text-sm">{workspace.ownerName || workspace.owner}</span>
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant={workspace.status === 'active' ? 'default' : 'secondary'}>
                    {workspace.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(workspace.statistics.totalSpend)}
                </TableCell>
                <TableCell className="text-center">
                  {workspace.statistics.totalParts.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  {workspace.statistics.totalSuppliers}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(workspace.lastModified)}
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-2">
                    {workspace.users.slice(0, 3).map(user => (
                      <Tooltip key={user.id}>
                        <TooltipTrigger asChild>
                          <Avatar className="h-6 w-6 border-2 border-background">
                            <AvatarFallback className="text-xs">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{user.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    ))}
                    {workspace.users.length > 3 && (
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs">
                          +{workspace.users.length - 3}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onViewDetails(workspace)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(workspace)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onShare(workspace)}>
                        <Share2 className="mr-2 h-4 w-4" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onClone(workspace)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Clone
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onArchive(workspace)}>
                        <Archive className="mr-2 h-4 w-4" />
                        {workspace.status === 'active' ? 'Archive' : 'Activate'}
                      </DropdownMenuItem>
                      {(isOwner || userRole === 'admin') && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => onDelete(workspace)}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}

// Workspace Details Dialog
function WorkspaceDetailsDialog({
  workspace,
  isOpen,
  onClose,
  formatDate,
  formatCurrency,
  currentUserEmail
}: {
  workspace: Workspace | null;
  isOpen: boolean;
  onClose: () => void;
  formatDate: (date: string) => string;
  formatCurrency: (value: number) => string;
  currentUserEmail: string;
}) {
  if (!workspace) return null;

  const TypeIcon = WORKSPACE_TYPES[workspace.type]?.icon || Settings;
  const userRole = workspace.users.find(u => u.email === currentUserEmail)?.role || 'viewer';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-xl flex items-center gap-2">
            <TypeIcon className="h-5 w-5 text-primary" />
            {workspace.name}
          </DialogTitle>
          <DialogDescription>{workspace.description}</DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
            <TabsTrigger value="members" className="text-xs">
              Members ({workspace.users.length})
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">Activity</TabsTrigger>
            <TabsTrigger value="settings" className="text-xs">Settings</TabsTrigger>
          </TabsList>
          
          <div className="flex-1 overflow-auto">
            <TabsContent value="overview" className="space-y-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Workspace Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Type</span>
                      <Badge variant="outline" className="capitalize">
                        {workspace.type.replace('-', ' ')}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <Badge variant={workspace.status === 'active' ? 'default' : 'secondary'}>
                        {workspace.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Your Role</span>
                      <Badge variant="outline" className="capitalize">
                        {userRole}
                      </Badge>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Created</span>
                      <span className="text-sm">{formatDate(workspace.createdDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last Modified</span>
                      <span className="text-sm">{formatDate(workspace.lastModified)}</span>
                    </div>
                    {workspace.lastAnalysis && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Last Analysis</span>
                        <span className="text-sm">{formatDate(workspace.lastAnalysis)}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Data Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Spend</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {formatCurrency(workspace.statistics.totalSpend)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Parts</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {workspace.statistics.totalParts.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Total Suppliers</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {workspace.statistics.totalSuppliers}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Categories</span>
                        </div>
                        <span className="text-sm font-semibold">
                          {workspace.statistics.totalCategories}
                        </span>
                      </div>
                    </div>
                    {workspace.statistics.lastDataImport && (
                      <>
                        <Separator />
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Last Import</span>
                            <span className="text-sm">{formatDate(workspace.statistics.lastDataImport)}</span>
                          </div>
                          {workspace.statistics.dataSource && (
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Data Source</span>
                              <span className="text-sm">{workspace.statistics.dataSource}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
              
              {workspace.tags.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {workspace.tags.map(tag => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              
              {(workspace.department || workspace.businessUnit || workspace.region) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Organization</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-3 gap-4">
                    {workspace.department && (
                      <div>
                        <p className="text-xs text-muted-foreground">Department</p>
                        <p className="text-sm font-medium">{workspace.department}</p>
                      </div>
                    )}
                    {workspace.businessUnit && (
                      <div>
                        <p className="text-xs text-muted-foreground">Business Unit</p>
                        <p className="text-sm font-medium">{workspace.businessUnit}</p>
                      </div>
                    )}
                    {workspace.region && (
                      <div>
                        <p className="text-xs text-muted-foreground">Region</p>
                        <p className="text-sm font-medium">{workspace.region}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="members" className="p-4">
              <div className="space-y-2">
                {workspace.users.map(user => (
                  <Card key={user.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback>
                            {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                          {user.department && (
                            <p className="text-xs text-muted-foreground">{user.department}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <Badge 
                            variant={user.role === 'owner' ? 'default' : user.role === 'admin' ? 'secondary' : 'outline'}
                            className="capitalize"
                          >
                            {user.role === 'owner' && <Key className="mr-1 h-3 w-3" />}
                            {user.role}
                          </Badge>
                          <p className="text-xs text-muted-foreground mt-1">
                            Added {formatDate(user.addedDate)}
                          </p>
                          {user.lastActive && (
                            <p className="text-xs text-muted-foreground">
                              Active {formatDate(user.lastActive)}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
            
            <TabsContent value="activity" className="p-4">
              {workspace.activityLog && workspace.activityLog.length > 0 ? (
                <ScrollArea className="h-96">
                  <div className="space-y-3">
                    {workspace.activityLog.sort((a, b) => 
                      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                    ).map(activity => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-muted/50">
                        <Avatar className="h-8 w-8 mt-0.5">
                          <AvatarFallback className="text-xs">
                            {activity.userName.split(' ').map(n => n[0]).join('').toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <p className="text-sm">
                            <span className="font-medium">{activity.userName}</span>
                            <span className="text-muted-foreground"> {activity.action}</span>
                          </p>
                          {activity.details && (
                            <p className="text-xs text-muted-foreground">{activity.details}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p className="text-sm">No activity recorded yet</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="settings" className="p-4 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Security Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Workspace Visibility</p>
                      <p className="text-xs text-muted-foreground">
                        Control who can discover this workspace
                      </p>
                    </div>
                    <Badge variant={workspace.settings.isPublic ? 'default' : 'secondary'}>
                      {workspace.settings.isPublic ? (
                        <>
                          <Unlock className="mr-1 h-3 w-3" />
                          Public
                        </>
                      ) : (
                        <>
                          <Lock className="mr-1 h-3 w-3" />
                          Private
                        </>
                      )}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">External Sharing</p>
                      <p className="text-xs text-muted-foreground">
                        Allow users outside @{workspace.companyDomain}
                      </p>
                    </div>
                    <Badge variant={workspace.settings.allowExternalSharing ? 'destructive' : 'default'}>
                      {workspace.settings.allowExternalSharing ? 'Allowed' : 'Restricted'}
                    </Badge>
                  </div>
                  
                  <Separator />
                  
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Approval Required</p>
                      <p className="text-xs text-muted-foreground">
                        New members need owner approval
                      </p>
                    </div>
                    <Badge variant={workspace.settings.requireApproval ? 'default' : 'secondary'}>
                      {workspace.settings.requireApproval ? 'Yes' : 'No'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Data Management</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium">Data Retention</p>
                      <p className="text-xs text-muted-foreground">
                        How long to keep historical data
                      </p>
                    </div>
                    <span className="text-sm font-medium">
                      {workspace.settings.dataRetentionDays} days
                    </span>
                  </div>
                  
                  {workspace.settings.autoArchiveDays && (
                    <>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <p className="text-sm font-medium">Auto-Archive</p>
                          <p className="text-xs text-muted-foreground">
                            Archive workspace after inactivity
                          </p>
                        </div>
                        <span className="text-sm font-medium">
                          {workspace.settings.autoArchiveDays} days
                        </span>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}