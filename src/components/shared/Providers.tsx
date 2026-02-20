'use client';

import DisguiseProvider from './DisguiseProvider';
import PanicProvider from './PanicProvider';
import { ErrorBoundary } from './ErrorBoundary';

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary>
      <PanicProvider>
        <DisguiseProvider>
          {children}
        </DisguiseProvider>
      </PanicProvider>
    </ErrorBoundary>
  );
}
