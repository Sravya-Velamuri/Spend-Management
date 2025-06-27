# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SpendWise Central is a Next.js application for spend analysis with AI capabilities, built on Firebase infrastructure. It features data import/export, supplier management, and AI-powered insights through Google Genkit.

## Development Commands

```bash
# Start development server
npm run dev

# Start AI/Genkit development server
npm run genkit:dev

# Start AI/Genkit with watch mode
npm run genkit:watch

# Build for production
npm run build

# Run linting
npm run lint

# Run TypeScript type checking
npm run typecheck
```

## Architecture

The application follows a feature-based architecture:

- **`/src/app/`** - Next.js App Router pages and API routes
- **`/src/components/`** - React components organized by feature:
  - `ui/` - Reusable shadcn/ui components
  - `spendwise/` - Core business components (parts, suppliers, analysis)
  - `chatbot/` - AI assistant components with industry configs
- **`/src/ai/`** - Google Genkit AI integration and flows
- **`/src/lib/`** - Utility functions (currency, geocoding, utils)
- **`/src/types/`** - TypeScript type definitions

## Key Technologies

- **Next.js 15.2.3** with App Router
- **TypeScript** with strict typing
- **Tailwind CSS** with CSS variables for theming
- **shadcn/ui** component library
- **Google Genkit** for AI workflows
- **Firebase** for hosting and backend services
- **React Query** for data fetching
- **React Hook Form** with Zod validation

## Important Configurations

### Firebase Setup
- Project ID: `spendanalysis-bc976`
- App Hosting Backend: `spend`
- Region: `us-central1`

### Build Configuration
- TypeScript errors are ignored during build (`ignoreBuildErrors: true`)
- ESLint errors are ignored during build (`ignoreDuringBuilds: true`)

### Theme System
The app supports multiple themes configured via CSS variables:
- Light theme (default)
- Dark theme
- Custom themes can be added in `config.json`

## Core Features

1. **Parts Management** - Update part details, prices, and demand
2. **Supplier Management** - Manage supplier information and addresses
3. **Part-Supplier Mapping** - Drag-and-drop interface for associations
4. **Data Import/Export** - CSV and Excel file support
5. **AI Assistant** - Industry-specific chatbot for spend analysis
6. **What-If Analysis** - Scenario planning and analysis tools

## Development Notes

- The app uses patch-package for node_modules modifications
- Microsoft Clarity is integrated for analytics
- Google Maps integration for supplier locations
- No test framework is currently configured
- Use absolute imports from `@/` for components and utilities