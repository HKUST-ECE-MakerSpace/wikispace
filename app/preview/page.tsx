import { getDocsSource, getPreviewSource } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { DocsBody, DocsPage, DocsTitle } from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { getMDXComponents } from '@/components/mdx';
import { baseOptions } from '@/lib/layout.shared';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export const dynamic = 'force-dynamic';

/**
 * Renders the editor's hidden draft (_preview.mdx) for the live-preview
 * iframe. 404s politely when no draft exists (editor closed without one).
 */
export default async function PreviewPage() {
  const source = await getPreviewSource();
  const page = source.getPage(['preview']);
  if (!page) notFound();
  const [data, layoutSource] = await Promise.all([page.data.load(), getDocsSource()]);

  return (
    <DocsLayout tree={layoutSource.getPageTree()} {...baseOptions()}>
      <DocsPage toc={data.toc} full>
        <DocsTitle>{page.data.title}</DocsTitle>
        <DocsBody>
          <data.body
            components={getMDXComponents({
              a: createRelativeLink(source, page),
            })}
          />
        </DocsBody>
      </DocsPage>
    </DocsLayout>
  );
}
