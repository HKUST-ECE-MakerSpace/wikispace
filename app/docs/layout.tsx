import { getDocsSource } from '@/lib/source';
import { contextAccess } from '@/lib/visibility';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { baseOptions } from '@/lib/layout.shared';

export const dynamic = 'force-dynamic';

export default async function Layout({ children }: LayoutProps<'/docs'>) {
  // Restricted pages appear in the sidebar only for callers allowed to read
  // them; everyone else gets a tree without them (and without their folders).
  const source = await getDocsSource({
    visibility: await contextAccess(),
  });
  return (
    <DocsLayout tree={source.getPageTree()} {...baseOptions()}>
      {children}
    </DocsLayout>
  );
}
