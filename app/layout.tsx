import { RootProvider } from 'fumadocs-ui/provider/next';
import './global.css';
import localFont from 'next/font/local';

/* Vendored Inter (latin, variable) — keeps `next build` network-free, so the
 * app builds inside the Nix sandbox. */
const inter = localFont({
  src: './fonts/inter-latin-var.woff2',
  weight: '100 900',
  display: 'swap',
});

export default function Layout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={inter.className} suppressHydrationWarning>
      <body className="flex flex-col min-h-screen">
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
