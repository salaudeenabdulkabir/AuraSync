import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = { title: 'AuraSync — A color intelligent styling studio', description: 'An explainable fashion and beauty color harmony studio powered by YouCam API.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
