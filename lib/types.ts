/**
 * Shared data contracts for the ops side of the wiki (live state, JSON files
 * under data/). Documentation content lives in content/docs as MDX and is
 * edited via /edit; these types cover everything that changes at runtime.
 */

export type MachineStatus = 'operational' | 'needs-attention' | 'down' | 'maintenance';

export const MACHINE_STATUSES: readonly MachineStatus[] = [
  'operational',
  'needs-attention',
  'down',
  'maintenance',
] as const;

export const MACHINE_STATUS_LABELS: Record<MachineStatus, string> = {
  operational: 'Operational',
  'needs-attention': 'Needs Attention',
  down: 'Down',
  maintenance: 'Under Maintenance',
};

/**
 * Live machine state. The documentation (quick start, settings,
 * troubleshooting, repair guides, rules, videos) lives in the machine's MDX
 * page at /docs/machines/<id>; only mutable status lives here.
 */
export interface MachineState {
  id: string;
  name: string;
  icon: string;
  status: MachineStatus;
  statusNote: string;
  /** e.g. "1 of 2 working", free-form */
  quantity: string;
}

export type ReportStatus = 'open' | 'in-progress' | 'resolved';

export interface Report {
  id: string;
  machineId: string;
  machineName: string;
  issueType: string;
  reportedBy: string;
  description: string;
  status: ReportStatus;
  adminNotes: string;
  createdAt: string;
}

export type RequestStatus = 'pending' | 'ordered' | 'fulfilled' | 'denied';

export interface ComponentRequest {
  id: string;
  componentName: string;
  componentType: string;
  quantity: string;
  requesterName: string;
  reason: string;
  status: RequestStatus;
  createdAt: string;
}

export interface FilamentItem {
  id: string;
  material: string;
  brand: string;
  size: string;
  colors: string[];
  quantity: number;
}

export interface BoxItem {
  name: string;
  contents: string;
}

export interface GridCell {
  label: string;
  description: string;
  items?: BoxItem[];
}

export interface Grid {
  columns: string[];
  rowRange: [number, number];
  thickRows: number[];
  cells: Record<string, GridCell>;
}

export interface BankPage {
  id: string;
  title: string;
  icon: string;
  grid: Grid;
}

export interface WhatsAppConfig {
  instanceId: string;
  token: string;
  groupId: string;
}

export interface Settings {
  adminPasswordHash: string;
  sessionSecret: string;
  whatsapp: WhatsAppConfig | null;
  welcomeTitle: string;
  welcomeMessage: string;
}

/** Everything a client needs to render the ops views; polled every few seconds. */
export interface OpsState {
  machines: MachineState[];
  reports: Report[];
  requests: ComponentRequest[];
  filament: FilamentItem[];
  banks: BankPage[];
  /** public bits of settings — secrets never leave the server */
  welcomeTitle: string;
  welcomeMessage: string;
  generatedAt: string;
}

/** Workshop checklist item, authored in page frontmatter. */
export interface ChecklistItem {
  id: string;
  label: string;
  section?: string;
}
