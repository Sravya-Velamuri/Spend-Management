"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, X } from "lucide-react";

interface ReleaseNotesDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ReleaseNotesDialog({ isOpen, onClose }: ReleaseNotesDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5 text-primary" />
            Release Notes - Version 2R25.6.20.1
          </DialogTitle>
          <DialogDescription>
            Latest updates and improvements to Spend by TADA
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>This release includes UI reorganization and improvements to enhance usability and workflow.</p>
            
            <h4>Header Toolbar Reorganization:</h4>
            <ul>
              <li><strong>Reorganized Button Layout:</strong>
                <ul>
                  <li>Info button (ℹ️) moved to the first position for easy access to application information</li>
                  <li>Fullscreen toggle relocated near the end of the toolbar, just before the Clear button</li>
                </ul>
              </li>
              <li><strong>TADA Dropdown Enhanced:</strong> Consolidated into a comprehensive dropdown menu with 5 options:
                <ul>
                  <li>Upload to TADA</li>
                  <li>Download from TADA</li>
                  <li>Files Upload (previously in separate Files dropdown)</li>
                  <li>Files Download (previously in separate Files dropdown)</li>
                  <li>Release Notes (moved from standalone button)</li>
                </ul>
              </li>
              <li><strong>Excel Operations Unified:</strong> Combined the separate "Load Sample Data" and "Upload Excel" buttons into a single dropdown for cleaner interface</li>
              <li><strong>Removed Redundant Elements:</strong>
                <ul>
                  <li>Standalone Release Notes button removed (now in TADA dropdown)</li>
                  <li>Files dropdown removed (functionality moved to TADA dropdown)</li>
                </ul>
              </li>
            </ul>

            <h4>Review Spend Tab Improvements:</h4>
            <ul>
              <li><strong>Simplified Filtering:</strong> Streamlined from 3 filters to 2 filters:
                <ul>
                  <li>Removed "Filter by Part" to reduce complexity</li>
                  <li>Retained "Filter by Supplier" and "Filter by Category" for focused analysis</li>
                  <li>Filter layout changed from 3-column to 2-column grid</li>
                </ul>
              </li>
            </ul>

            <h4>Theme Enhancements:</h4>
            <ul>
              <li><strong>Dynamic Logo Support:</strong> Application now displays theme-appropriate logos:
                <ul>
                  <li>Light theme: Colored TADA logo</li>
                  <li>Dark/TADA theme: White TADA logo for better visibility</li>
                </ul>
              </li>
            </ul>

            <h4>Previous Updates:</h4>
            <ul>
              <li>Added "Review Spend" tab (Tab 7) with dynamic filtering and visualization capabilities</li>
              <li>Enhanced "Validate Spend Network" tab with numbered sections and search functionality</li>
              <li>Reorganized "What-if Analysis" tab into three-column layout</li>
              <li>Improved "Update Source Mix" tab with search bars and renamed columns</li>
            </ul>

            <p className="mt-4">These changes improve the application's usability by reducing clutter and organizing related functions together. We hope you enjoy the streamlined interface!</p>
          </div>
        </ScrollArea>
        <DialogClose className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}