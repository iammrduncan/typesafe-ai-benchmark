import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'Decision Theater — live typed intelligence', description: 'Six live decision scenes: ticket dispatch, structured navigation, WebGPU driving, guardrails, command approvals, and golden-reference scoring.' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
