import { getDocsSource, getPageImageUrl, getPageMarkdownUrl } from '@/lib/source';
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
  MarkdownCopyButton,
} from 'fumadocs-ui/layouts/docs/page';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
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
  const searchParams = await props.searchParams;
  const source = await getDocsSource();
  const page = source.getPage(params.slug);
  if (!page) notFound();

  const data = await page.data.load();
  const markdownUrl = getPageMarkdownUrl(page).url;
  const full = typeof page.data.full === 'boolean' ? page.data.full : undefined;
  const checklist = Array.isArray(page.data.checklist)
    ? page.data.checklist.filter(isChecklistItem)
    : [];

  const body = (
    <DocsBody>
      <data.body
        components={getMDXComponents({
          // this allows you to link to other pages with relative file paths
          a: createRelativeLink(source, page),
        })}
      />
    </DocsBody>
  );

  return (
    <DocsPage toc={data.toc} full={full}>
      <DocsTitle>{page.data.title}</DocsTitle>
      <DocsDescription className="mb-0">{page.data.description}</DocsDescription>
      <div className="flex flex-row items-center gap-2 border-b pb-6">
        <a
          href={`/edit?file=${encodeURIComponent(page.path)}`}
          className="inline-flex items-center gap-1.5 rounded-md border border-fd-border px-2.5 py-1.5 text-sm font-medium hover:bg-fd-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
            aria-hidden
          >
            <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
            <path d="m15 5 4 4" />
          </svg>
          Edit this page
        </a>
        <MarkdownCopyButton markdownUrl={markdownUrl} />
      </div>
      {checklist.length > 0 ? (
        <Tabs
          items={['Overview', 'Checklist']}
          defaultIndex={searchParams.tab === 'checklist' ? 1 : 0}
        >
          <Tab value="Overview">{body}</Tab>
          <Tab value="Checklist">
            <WorkshopChecklist
              pageUrl={page.url}
              items={checklist}
              durationMin={
                typeof page.data.duration === 'number' ? page.data.duration : undefined
              }
              audience={
                typeof page.data.audience === 'string' ? page.data.audience : undefined
              }
            />
          </Tab>
        </Tabs>
      ) : (
        body
      )}
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
