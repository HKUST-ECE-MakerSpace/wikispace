import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';

import { Accordion, Accordions } from 'fumadocs-ui/components/accordion';
import { Step, Steps } from 'fumadocs-ui/components/steps';
import { Tab, Tabs } from 'fumadocs-ui/components/tabs';
import { TypeTable } from 'fumadocs-ui/components/type-table';

import { ComponentBankWidget } from '@/components/ops/component-bank';
import { FilamentWidget } from '@/components/ops/filament-table';
import { MachineStatusWidget } from '@/components/ops/machine-status';
import { YouTubeEmbed } from '@/components/ops/youtube-embed';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    Accordion,
    Accordions,
    Step,
    Steps,
    Tab,
    Tabs,
    TypeTable,
    MachineStatus: MachineStatusWidget,
    ComponentBank: ComponentBankWidget,
    FilamentTable: FilamentWidget,
    YouTube: YouTubeEmbed,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
