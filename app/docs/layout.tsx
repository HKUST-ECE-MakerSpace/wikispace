import { getDocsSource } from '@/lib/source';
import { isAdminContext } from '@/lib/auth';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  // Admin-only pages appear in the sidebar only for signed-in admins;
  // everyone else gets a tree without them (and without their folders).
  const source = await getDocsSource({ includeAdmin: await isAdminContext() });
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
