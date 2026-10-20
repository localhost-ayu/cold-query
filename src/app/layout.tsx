import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';

import { brand } from '@/config/brand';
import { themeScript } from '@/os/theme/theme-script';

import './globals.css';

const inter = localFont({
  src: '../assets/fonts/inter-latin.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '100 900',
});

const jetbrainsMono = localFont({
  src: '../assets/fonts/jetbrains-mono-latin.woff2',
  variable: '--font-mono',
  display: 'swap',
  weight: '100 800',
});

export const metadata: Metadata = {
  title: `${brand.gameName} — ${brand.osName}`,
  description: brand.tagline,
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#eef1f6' },
    { media: '(prefers-color-scheme: dark)', color: '#0f1522' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    // O tema é aplicado pelo script antes do React, por isso a divergência é esperada.
    <html
      lang="pt-BR"
      className={`${inter.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
