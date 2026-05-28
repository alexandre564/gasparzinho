import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"

export const metadata: Metadata = {
  title: {
    default: 'Gasparzinho',
    template: '%s | Gasparzinho',
  },
  applicationName: 'Gasparzinho',
  description: 'Sistema de vendas, entregas, estoque e financeiro para revenda de gás.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      {
        url: '/Gas-logo.png',
        type: 'image/png',
      },
    ],
    shortcut: '/Gas-logo.png',
    apple: '/Gas-logo.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#020617',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className="overflow-x-hidden bg-gray-50 font-sans">
        <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
        >
            {children}
            <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
