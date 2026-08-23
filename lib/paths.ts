import path from 'node:path';

/**
 * Filesystem roots for wiki content and ops state. Both live under the app
 * directory by default; deployments that keep the app itself read-only
 * (e.g. NixOS, where the app is a store path) override them with
 * `WIKI_CONTENT_DIR` / `WIKI_DATA_DIR` pointing at writable persistent
 * storage.
 */
export const CONTENT_DIR = process.env.WIKI_CONTENT_DIR
  ? path.resolve(process.env.WIKI_CONTENT_DIR)
  : path.join(process.cwd(), 'content', 'docs');

export const DATA_DIR = process.env.WIKI_DATA_DIR
  ? path.resolve(process.env.WIKI_DATA_DIR)
  : path.join(process.cwd(), 'data');
