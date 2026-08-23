import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { hashPassword } from './auth';
import { DATA_DIR } from './paths';
import type {
  BankPage,
  ComponentRequest,
  FilamentItem,
  MachineState,
  Report,
  Settings,
} from './types';

/**
 * Typed JSON file store under data/. One file per collection, atomic writes
 * (tmp file + rename), read-through cache. Missing files are bootstrapped
 * from the seeds below; existing files are never overwritten.
 */
/* DATA_DIR comes from lib/paths.ts (WIKI_DATA_DIR overridable). */

const cache = new Map<string, unknown>();

function loadJson<T>(file: string, seed: () => T): T {
  if (cache.has(file)) return cache.get(file) as T;
  mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, file);
  if (!existsSync(filePath)) {
    persist(file, seed());
  } else {
    cache.set(file, JSON.parse(readFileSync(filePath, 'utf8')) as T);
  }
  return cache.get(file) as T;
}

function persist<T>(file: string, value: T): void {
  mkdirSync(DATA_DIR, { recursive: true });
  const filePath = path.join(DATA_DIR, file);
  const tmp = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(tmp, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  renameSync(tmp, filePath);
  cache.set(file, value);
}

/* --------------------------------- accessors --------------------------------- */

export function getMachines(): MachineState[] {
  return loadJson('machines.json', () => SEED_MACHINES);
}

export function saveMachines(machines: MachineState[]): void {
  persist('machines.json', machines);
}

export function getReports(): Report[] {
  return loadJson('reports.json', () => SEED_REPORTS);
}

export function saveReports(reports: Report[]): void {
  persist('reports.json', reports);
}

export function getRequests(): ComponentRequest[] {
  return loadJson('requests.json', () => SEED_REQUESTS);
}

export function saveRequests(requests: ComponentRequest[]): void {
  persist('requests.json', requests);
}

export function getFilament(): FilamentItem[] {
  return loadJson('filament.json', () => SEED_FILAMENT);
}

export function saveFilament(items: FilamentItem[]): void {
  persist('filament.json', items);
}

export function getBanks(): BankPage[] {
  return loadJson('banks.json', () => SEED_BANKS);
}

export function saveBanks(banks: BankPage[]): void {
  persist('banks.json', banks);
}

export function getSettings(): Settings {
  return loadJson('settings.json', seedSettings);
}

export function saveSettings(settings: Settings): void {
  persist('settings.json', settings);
}

function seedSettings(): Settings {
  const instanceId = process.env.GREEN_API_INSTANCE_ID;
  const token = process.env.GREEN_API_TOKEN;
  const groupId = process.env.WHATSAPP_GROUP_ID;
  return {
    adminPasswordHash: hashPassword(process.env.ADMIN_PASSWORD ?? 'exco2026'),
    sessionSecret: randomBytes(32).toString('hex'),
    whatsapp: instanceId && token && groupId ? { instanceId, token, groupId } : null,
    welcomeTitle: 'ECE Makerspace',
    welcomeMessage:
      'Welcome to the ECE Makerspace wiki — check machine status, find parts, and report issues to keep the space running.',
  };
}

/* -------------------------- seeds (from legacy app) -------------------------- */

const SEED_MACHINES: MachineState[] = [{"id":"h2c-engineering","name":"Engineering H2C","icon":"🖨️","status":"operational","statusNote":"","quantity":""},{"id":"h2c-multicolor","name":"Multi Color H2C","icon":"🖨️","status":"operational","statusNote":"","quantity":""},{"id":"p1s-left","name":"Left P1S","icon":"🖨️","status":"down","statusNote":"","quantity":"need fixing"},{"id":"p1s-middle","name":"Middle P1S","icon":"🖨️","status":"operational","statusNote":"","quantity":""},{"id":"p1s-right","name":"Right P1S","icon":"🖨️","status":"operational","statusNote":"","quantity":""},{"id":"j1s","name":"J1S Printer","icon":"🖨️","status":"maintenance","statusNote":"Calibration drifting","quantity":"Calibration needed"},{"id":"snapmaker-artisan","name":"Snapmaker Artisan (40W Laser + CNC)","icon":"🔩","status":"operational","statusNote":"","quantity":""},{"id":"soldering-station","name":"Soldering Stations","icon":"🔧","status":"operational","statusNote":"","quantity":""}]
;

const SEED_REPORTS: Report[] = [];
;

const SEED_REQUESTS: ComponentRequest[] = []
;

const SEED_FILAMENT: FilamentItem[] = [{"id":"fil_001","material":"PLA","brand":"eSun","size":"1.75mm","colors":["Black","White","Orange"],"quantity":7},{"id":"fil_002","material":"PETG","brand":"Polymaker","size":"1.75mm","colors":["Black","Grey"],"quantity":7},{"id":"fil_003","material":"TPU","brand":"Sainsmart","size":"1.75mm","colors":["Black"],"quantity":8},{"id":"fil_004","material":"PC","brand":"Polymaker","size":"1.75mm","colors":["Natural"],"quantity":2},{"id":"fil_005","material":"CoPE","brand":"Bambu Lab","size":"1.75mm","colors":["White"],"quantity":1}]
;

const SEED_BANKS: BankPage[] = [{"id":"electronics-bank","title":"Electronics Bank","icon":"⚡","grid":{"columns":["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W"],"rowRange":[1,11],"thickRows":[4],"cells":{"A1":{"label":"1A","description":""},"A5":{"label":"1B","description":""},"B1":{"label":"2A","description":""},"B2":{"label":"2B","description":""},"B5":{"label":"2C","description":""},"D1":{"label":"3A","description":""},"D2":{"label":"3B","description":""},"D5":{"label":"3C","description":""},"D6":{"label":"3D","description":""},"D7":{"label":"3E","description":""},"D8":{"label":"3F","description":""},"D9":{"label":"3G","description":""},"F1":{"label":"4A","description":""},"F2":{"label":"4B","description":""},"F5":{"label":"4C","description":""},"H1":{"label":"5A","description":""},"H2":{"label":"5B","description":""},"H5":{"label":"5C","description":""},"H6":{"label":"5D","description":""},"H7":{"label":"5E","description":""},"H8":{"label":"5F","description":""},"H9":{"label":"5G","description":""},"H10":{"label":"5H","description":""},"H11":{"label":"5I","description":""},"J1":{"label":"6A","description":""},"J2":{"label":"6B","description":""},"J5":{"label":"6C","description":""},"J6":{"label":"6D","description":""},"J7":{"label":"6E","description":""},"J8":{"label":"6F","description":""},"L1":{"label":"7A","description":""},"L5":{"label":"7B","description":""},"M1":{"label":"8A","description":""},"M2":{"label":"8B","description":""},"M5":{"label":"8C","description":""},"M6":{"label":"8D","description":""},"M7":{"label":"8E","description":""},"M8":{"label":"8F","description":""},"M9":{"label":"8G","description":""},"M10":{"label":"8H","description":""},"M11":{"label":"8I","description":""},"O1":{"label":"9A","description":""},"O2":{"label":"9B","description":""},"O5":{"label":"Trash can","description":""},"Q1":{"label":"10A","description":""},"Q2":{"label":"10B","description":""},"Q5":{"label":"10C","description":""},"S1":{"label":"11A","description":""},"S2":{"label":"11B","description":""},"S5":{"label":"11C","description":""},"S6":{"label":"11D","description":"","items":[{"name":"R1","contents":"10k Ohm resistors (50 pcs)"},{"name":"R2","contents":"220 Ohm resistors (100 pcs)"},{"name":"R3","contents":"1M Ohm resistors (30 pcs)"},{"name":"R4","contents":"4.7k Ohm resistors (75 pcs)"}]},"S7":{"label":"11E","description":""},"S8":{"label":"11F","description":""},"U1":{"label":"12A","description":""},"U2":{"label":"12B","description":""},"U5":{"label":"12C","description":""},"W1":{"label":"13A","description":""},"W5":{"label":"13B","description":""},"B10":{"label":"2D","description":""},"F10":{"label":"4D","description":""},"O7":{"label":"9C","description":""},"P10":{"label":"9D","description":""},"P5":{"label":"","description":""}}}},{"id":"assembly-mechanics","title":"Assembly & Mechanics","icon":"🛠️","grid":{"columns":["A","B","C","D","E","F","G","H"],"rowRange":[1,11],"thickRows":[3],"cells":{"A1":{"label":"14A","description":""},"A4":{"label":"14B","description":""},"B1":{"label":"15A","description":""},"B2":{"label":"15B","description":""},"B4":{"label":"15C","description":""},"B5":{"label":"15D","description":""},"B6":{"label":"15E","description":""},"B7":{"label":"15F","description":""},"D1":{"label":"16A","description":""},"D2":{"label":"16B","description":""},"D4":{"label":"16C","description":""},"D5":{"label":"16D","description":""},"D6":{"label":"16E","description":""},"D7":{"label":"16F","description":""},"D8":{"label":"16G","description":""},"F1":{"label":"17A","description":""},"F2":{"label":"17B","description":""},"F4":{"label":"17C","description":""},"F9":{"label":"17D","description":""},"H1":{"label":"18A","description":""},"H4":{"label":"18B","description":""}}}},{"id":"screw-bank","title":"Screw Bank","icon":"🔩","grid":{"columns":["A","B","C","D","E","F","G","H","I","J","K","L"],"rowRange":[1,8],"thickRows":[2],"cells":{"A1":{"label":"M2 Screws","description":""},"C1":{"label":"M2 Screws","description":""},"E1":{"label":"M3 Screws","description":""},"G1":{"label":"M3 Screws","description":""},"I1":{"label":"M4 Screws","description":""},"K1":{"label":"M4 Screws","description":""},"A3":{"label":"Compressed Air & Vacuum Cleaner","description":""},"A8":{"label":"Storage","description":""},"C3":{"label":"M2 Screws","description":""},"C4":{"label":"M3 Screws","description":""},"C5":{"label":"M4 Screws","description":""},"C6":{"label":"M5 Screws","description":""},"C7":{"label":"M6 Screws","description":""},"C8":{"label":"Hex Head Screws","description":""},"C9":{"label":"Thumb Screws / Set screws","description":""},"E3":{"label":"Washers","description":""},"E4":{"label":"Nuts","description":""},"E5":{"label":"Standoffs / Threaded Inserts","description":""},"E6":{"label":"Circlips / Couplings","description":""},"E7":{"label":"Joints","description":""},"E8":{"label":"Springs","description":""},"E9":{"label":"Dowels / Rivets","description":""},"G3":{"label":"Bearings","description":""},"G4":{"label":"Gears / Racks","description":""},"G5":{"label":"Pulleys / Belts","description":""},"G6":{"label":"Storage","description":""},"H6":{"label":"Storage","description":""}}}}]
;
