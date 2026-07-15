'use client';
import Link from 'next/link';
import { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/"><h1 className="text-2xl font-bold"><span className="text-brand-500">TikTok</span> AI Factory</h1></Link>
          <p className="text-sm text-gray-500 mt-1">AI Video Production Platform</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {children}
        </div>
        <p className="text-center text-xs text-gray-400 mt-6">
          &copy; 2026 TikTok AI Factory. All rights reserved.
        </p>
      </div>
    </div>
  );
}
