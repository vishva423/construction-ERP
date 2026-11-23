import type { ReactNode } from 'react';
import './globals.css';
import { AdminShell } from '../components/admin-shell';

export const metadata = {
  title: 'Ramakrishnan Thirumalai (India) LLP | Building a Stronger Tomorrow',
  description: 'Engineering and construction across roads, buildings, pile foundations and bridges.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><AdminShell>{children}</AdminShell></body></html>;
}
