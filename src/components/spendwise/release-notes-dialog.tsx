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
            Release Notes - Version 2R25.6.12.1
          </DialogTitle>
          <DialogDescription>
            Latest updates and improvements to Spend by TADA
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>This release includes several enhancements and new features to improve your spend analysis capabilities.</p>
            <h4>Key Changes:</h4>
            <ul>
              <li><strong>New Tab: "Review Spend" (Tab 7):</strong> Added a dedicated tab for reviewing spend summaries with dynamic filtering capabilities for parts, suppliers, and categories. Charts for spend and demand by various dimensions are included.</li>
              <li><strong>New Tab: "Release Notes" (Tab 8):</strong> You are here! This tab will keep you informed about the latest updates.</li>
              <li><strong>Enhanced "Validate Spend Network" Tab (Tab 5):</strong>
                <ul>
                  <li>Validation sections are now numbered (A, B, C...).</li>
                  <li>Added a check for "Single-Source Parts".</li>
                  <li>Added a check for "Duplicate Parts by Internal ID".</li>
                  <li>Search functionality added to all validation lists.</li>
                  <li>"Validate Spend" tab renamed to "Validate Spend Network".</li>
                  <li>Added a "Run Validation Checks" button directly within this tab.</li>
                </ul>
              </li>
              <li><strong>"What-if Analysis" Tab (Tab 6) Refactor:</strong>
                <ul>
                  <li>Reorganized into a three-column layout for better clarity: Controls, Scenario Management/Description, and Impact Summary.</li>
                  <li>"Applied What-if Parameters" card moved to the middle column.</li>
                </ul>
              </li>
              <li><strong>"Update Source Mix" Tab (Tab 3) Enhancements:</strong>
                <ul>
                  <li>Added search bars above "Available Parts" and "Available Suppliers" lists.</li>
                  <li>Removed the "Quick Start" button.</li>
                  <li>Renamed "Mapped Relationships" column to "Source Network".</li>
                </ul>
              </li>
              <li><strong>Application Information Dialog:</strong> Added an "Info" button in the header to launch a dialog explaining the app's purpose and basic usage.</li>
              <li><strong>UI & UX Improvements:</strong>
                <ul>
                  <li>Header layout adjusted to group Home Country and Tariff Multiplier.</li>
                  <li>"Top 10 Parts by Spend" pie chart removed from the "Update Parts" tab (Tab 1) for a cleaner interface.</li>
                  <li>Fixed runtime error related to empty value prop in Select.Item component.</li>
                  <li>Fixed "Label not defined" error by adding the correct import.</li>
                  <li>Tab titles now use `text-xs`, `whitespace-normal`, `justify-start` and a fixed height for improved readability and consistent two-line wrapping.</li>
                </ul>
              </li>
            </ul>
            <p>We hope you find these updates helpful!</p>
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