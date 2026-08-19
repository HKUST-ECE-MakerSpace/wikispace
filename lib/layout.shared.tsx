import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { appName } from './shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: appName,
    },
    links: [
      { text: 'Report Issue', url: '/report' },
      { text: 'Machines', url: '/docs/machines' },
      { text: 'Workshops', url: '/docs/workshops' },
      { text: 'Admin', url: '/admin' },
    ],
  };
}
