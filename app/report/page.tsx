import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';

import { ReportForm } from '@/components/report-form';

export const metadata: Metadata = {
  title: 'Report an Issue',
  description: 'Flag a broken or misbehaving machine for the ECE Makerspace exco.',
};

export default function ReportPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6">
      <Link
        href="/"
        className="text-sm text-fd-muted-foreground transition-colors hover:text-fd-primary"
      >
        ← Back home
      </Link>
      <h1 className="mt-3 text-3xl font-bold">Report an issue</h1>
      <p className="mt-2 text-fd-muted-foreground">
        Something broken, printing badly, or out of filament? Tell us here — the machine
        gets flagged immediately and exco is notified.
      </p>
      <div className="mt-6">
        <Suspense fallback={null}>
          <ReportForm />
        </Suspense>
      </div>
    </div>
  );
}
