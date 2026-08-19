import type { Metadata } from 'next';

import { EditorApp } from '@/components/editor/editor-app';

export const metadata: Metadata = {
  title: 'Content Editor',
};

export default function EditPage() {
  return <EditorApp />;
}
