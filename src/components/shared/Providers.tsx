'use client';

import DisguiseProvider from './DisguiseProvider';
import PanicProvider from './PanicProvider';
import { ErrorBoundary } from './ErrorBoundary';
import { Toaster } from 'sonner';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PanicProvider>
        <DisguiseProvider>
          {children}
          <Toaster position="top-center" richColors />
        </DisguiseProvider>
      </PanicProvider>
    </ErrorBoundary>
  );
}
