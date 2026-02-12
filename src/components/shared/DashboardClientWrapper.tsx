'use client';

export default function DashboardClientWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#0e1621]">
      {children}
    </div>
  );
}
