import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = { title: 'Decision Theater — live typed intelligence', description: 'Seven live decision scenes: ticket dispatch, structured navigation, WebGPU driving, guardrails, command approvals, golden-reference scoring, and home automation.' };
export default function Layout({ children }: { children: ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
