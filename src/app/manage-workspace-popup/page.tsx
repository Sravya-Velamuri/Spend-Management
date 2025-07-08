"use client";

import React from 'react';
import ManageWorkspaceTab from '@/components/spendwise/manage-workspace-tab';
import { Button } from "@/components/ui/button";
import { X, Building2 } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function ManageWorkspacePopupPage() {
  const handleClose = () => {
    window.close();
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Professional Header */}
        <div className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-3">
              <Building2 className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-xl font-semibold">Manage Workspace</h1>
                <p className="text-xs text-muted-foreground">Create, organize, and collaborate on procurement workspaces</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Main Content with Professional Styling */}
        <div className="bg-gradient-to-b from-muted/50 to-background">
          <div className="container mx-auto p-6 max-w-[1600px]">
            <ManageWorkspaceTab />
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}