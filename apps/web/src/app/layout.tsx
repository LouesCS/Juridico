import type { Metadata, Viewport } from 'next';
import { headers } from 'next/headers';
import { Inter, JetBrains_Mono, Source_Serif_4 } from 'next/font/google';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { MockBanner } from '@/components/feedback/mock-banner';
import { Toaster } from '@/components/feedback/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MockProvider } from '@/providers/mock-provider';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Quilombo Dev',
    template: '%s · Quilombo Dev',
  },
  description: 'Workspace jurídico inteligente para escritórios de advocacia.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Nonce gerado por `middleware.ts` a cada requisição (`x-nonce`) — repassado
  // ao script inline anti-flash do `next-themes`, o único script inline
  // desta árvore que a CSP de produção (`lib/security/csp.ts`) precisa
  // autorizar individualmente (nunca via `unsafe-inline`).
  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Ir para o conteúdo
        </a>
        <ThemeProvider nonce={nonce}>
          <NuqsAdapter>
            <QueryProvider>
              <MockProvider>
                <TooltipProvider delayDuration={300}>
                  {children}
                  <Toaster />
                  <MockBanner />
                </TooltipProvider>
              </MockProvider>
            </QueryProvider>
          </NuqsAdapter>
        </ThemeProvider>
      </body>
    </html>
  );
}
