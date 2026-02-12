import { AuthForm } from "@/components/shared/AuthForm";
import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-teal-50/20 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-2">
          <div className="h-12 w-12 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
            <ShieldCheck className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Guardião.</h1>
        </div>

        <div className="glass p-8 rounded-3xl shadow-2xl shadow-emerald-500/5">
          <AuthForm type="login" />
        </div>

        <p className="text-center text-sm font-bold text-slate-400">
          Proteção de dados auditada via IA • 2026
        </p>
      </div>
    </div>
  );
}