import { getDocsSource, getPageImageUrl, getPageMarkdownUrl } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
  ViewOptionsPopover,
} from 'fumadocs-ui/layouts/docs/page';
import { notFound } from 'next/navigation';
import { WorkshopChecklist } from '@/components/workshop-checklist';
import type { ChecklistItem } from '@/lib/types';
import { getMDXComponents } from '@/components/mdx';
import type { Metadata } from 'next';
import { createRelativeLink } from 'fumadocs-ui/mdx';

export const dynamic = 'force-dynamic';

function isChecklistItem(value: unknown): value is ChecklistItem {
  return (
    typeof value === 'object' &&
    value !== null &&
    'id' in value &&
    'label' in value &&
    typeof value.id === 'string' &&
    typeof value.label === 'string' &&
    (!('section' in value) || typeof value.section === 'string')
  );
}

export default async function Page(props: PageProps<'/docs/[[...slug]]'>) {
  const params = await props.params;
  const source = await getDocsSource();
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const data = await page.data.load();
  const markdownUrl = getPageMarkdownUrl(page).url;
  const full = typeof page.data.full === 'boolean' ? page.data.full : undefined;
  const checklist = Array.isArray(page.data.checklist)
    ? page.data.checklist.filter(isChecklistItem)
    : [];

  return (
    <DocsPage toc={data.toc} full={full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row gap-2 items-center border-b pb-6">
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover markdownUrl={markdownUrl} />
      </div>
      {checklist.length > 0 ? (
        <WorkshopChecklist
          pageUrl={page.url}
          items={checklist}
          durationMin={
            typeof page.data.duration === 'number' ? page.data.duration : undefined
          }
          audience={typeof page.data.audience === 'string' ? page.data.audience : undefined}
        />
      ) : null}
      <DocsBody>
        <data.body
          components={getMDXComponents({
            // this allows you to link to other pages with relative file paths
            a: createRelativeLink(source, page),
          })}
        />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateMetadata(
  props: PageProps<'/docs/[[...slug]]'>,
): Promise<Metadata> {
  const params = await props.params;
  const source = await getDocsSource();
  const page = source.getPage(params.slug);
  if (!page) notFound();

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      images: getPageImageUrl(page).url,
    },
  };
}
