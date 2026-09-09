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

const SEED_BANKS: BankPage[] = [{"id": "electronics-bank", "title": "Electronics Bank", "icon": "Zap", "grid": {"columns": ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W"], "cells": {"A1": {"label": "1A", "rowSpan": 4, "description": "Storage · 3D printing storage"}, "A5": {"label": "1B", "rowSpan": 7, "description": "Storage · 3D printing storage"}, "B1": {"label": "2A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "B10": {"label": "2D", "colSpan": 2, "rowSpan": 2, "description": "Terminals, sockets, crimps, breadboards, perfboards · Heatshrink tube spools · Connectors Storage"}, "B2": {"label": "2B", "colSpan": 2, "rowSpan": 3, "description": "Connectors"}, "B5": {"label": "2C", "colSpan": 2, "rowSpan": 5}, "D1": {"label": "3A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "D2": {"label": "3B", "colSpan": 2, "rowSpan": 3, "description": "Tools"}, "D5": {"label": "3C", "colSpan": 2, "rowSpan": 1}, "D6": {"label": "3D", "colSpan": 2, "rowSpan": 1}, "D7": {"label": "3E", "colSpan": 2, "rowSpan": 1}, "D8": {"label": "3F", "colSpan": 2, "rowSpan": 1}, "D9": {"label": "3G", "colSpan": 2, "rowSpan": 2}, "F1": {"label": "4A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "F10": {"label": "4D", "colSpan": 2, "rowSpan": 2, "description": "Jumper wires, connector wires · Wire spools · Wire Storage"}, "F2": {"label": "4B", "colSpan": 2, "rowSpan": 3, "description": "Battery holders"}, "F5": {"label": "4C", "colSpan": 2, "rowSpan": 5}, "H1": {"label": "5A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "H10": {"label": "5H", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "H11": {"label": "5I", "colSpan": 2, "rowSpan": 1, "description": "Modules · M Storage · Displays · Power supplies · K Storage · Ribbon Cables · Speakers"}, "H5": {"label": "5C", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "H6": {"label": "5D", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "H7": {"label": "5E", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "H8": {"label": "5F", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "H9": {"label": "5G", "colSpan": 2, "rowSpan": 1, "description": "Modules"}, "J1": {"label": "6A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "J5": {"label": "6C", "colSpan": 2, "rowSpan": 1, "description": "Micro controllers"}, "J6": {"label": "6D", "colSpan": 2, "rowSpan": 1, "description": "Micro controllers"}, "J7": {"label": "6E", "colSpan": 2, "rowSpan": 1, "description": "Micro controllers"}, "J8": {"label": "6F", "colSpan": 2, "rowSpan": 4, "description": "Storage · Microcontrollers, SBCs · Motors & controllers · Other Expensive Items · Micro controllers"}, "L1": {"label": "7A", "rowSpan": 4, "description": "Storage"}, "L5": {"label": "7B", "rowSpan": 7, "description": "Storage"}, "M1": {"label": "8A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "M10": {"label": "8H", "colSpan": 2, "rowSpan": 1}, "M11": {"label": "8I", "colSpan": 2, "rowSpan": 1, "description": "S1 · S Storage · Q Storage · D Storage · U Storage · Y Storage · F Storage"}, "M2": {"label": "8B", "colSpan": 2, "rowSpan": 3, "description": "U7"}, "M5": {"label": "8C", "colSpan": 2, "rowSpan": 1, "description": "U5"}, "M6": {"label": "8D", "colSpan": 2, "rowSpan": 1}, "M7": {"label": "8E", "colSpan": 2, "rowSpan": 1, "description": "U3"}, "M8": {"label": "8F", "colSpan": 2, "rowSpan": 1}, "M9": {"label": "8G", "colSpan": 2, "rowSpan": 1, "description": "U1"}, "O1": {"label": "9A", "colSpan": 2, "rowSpan": 1}, "O2": {"label": "9B", "colSpan": 2, "rowSpan": 3, "description": "U8"}, "O7": {"label": "9C", "rowSpan": 5, "description": "U4 · U2"}, "P10": {"label": "9D", "rowSpan": 2}, "Q1": {"label": "10A", "colSpan": 2, "rowSpan": 1}, "Q2": {"label": "10B", "colSpan": 2, "rowSpan": 3, "description": "U17 · U16 · U15"}, "Q5": {"label": "10C", "colSpan": 2, "rowSpan": 7, "description": "U14 · U13 · U12 · U11 · U10 · U9 · D2 (LED) · Shop towel …"}, "S1": {"label": "11A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "S2": {"label": "11B", "colSpan": 2, "rowSpan": 3, "description": "Q10 · Q9 · Q8"}, "S5": {"label": "11C", "colSpan": 2, "rowSpan": 1, "description": "Q7"}, "S6": {"label": "11D", "colSpan": 2, "rowSpan": 1, "description": "Q6"}, "S7": {"label": "11E", "colSpan": 2, "rowSpan": 1, "description": "Q5"}, "S8": {"label": "11F", "colSpan": 2, "rowSpan": 4, "description": "Q4 · Q3 · Q2 · R1 · Measuring & Testing Equipment Storage"}, "U1": {"label": "12A", "colSpan": 2, "rowSpan": 1}, "U2": {"label": "12B", "colSpan": 2, "rowSpan": 3, "description": "D20 · D19 · D18"}, "U5": {"label": "12C", "colSpan": 2, "rowSpan": 7, "description": "D17 · D16 · D15 · D14 · D13 · D12 · R2"}, "W1": {"label": "13A", "rowSpan": 4, "description": "D11 · D10 · D9 · Storage · R44 · R43 · R42 · R33 …"}, "W5": {"label": "13B", "rowSpan": 7, "description": "D8 · D7 · D6 · D5 (1206) · D4 (0805) · D3 (0603) · R39 (0402) · R38 (0402) …"}}, "rowRange": [1, 11], "thickRows": [5]}}, {"id": "assembly-mechanics", "title": "Assembly & Mechanics", "icon": "Wrench", "grid": {"columns": ["A", "B", "C", "D", "E", "F", "G", "H", "I"], "cells": {"A1": {"label": "14A", "rowSpan": 4, "description": "Storage"}, "A5": {"label": "14B", "rowSpan": 7, "description": "Storage"}, "B1": {"label": "15A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "B2": {"label": "15B", "colSpan": 2, "rowSpan": 3, "description": "Saws · Files · Pliers · Hammers & Mallets · Screw Drivers"}, "B5": {"label": "15C", "colSpan": 2, "rowSpan": 1, "description": "Drill Bits, Taps & Dies"}, "B6": {"label": "15D", "colSpan": 2, "rowSpan": 1, "description": "Forstner Bits & Hole Saws"}, "B7": {"label": "15E", "colSpan": 2, "rowSpan": 1, "description": "Routing & Milling Bits"}, "B8": {"label": "15F", "colSpan": 2, "rowSpan": 4, "description": "Storage"}, "D1": {"label": "16A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "D2": {"label": "16B", "colSpan": 2, "rowSpan": 3, "description": "Measuring Tools · PPE · Bosch Batteries · Hand Drills"}, "D5": {"label": "16C", "colSpan": 2, "rowSpan": 1, "description": "Marking & Measuring Tools"}, "D6": {"label": "16D", "colSpan": 2, "rowSpan": 1, "description": "Drivers & Keys"}, "D7": {"label": "16E", "colSpan": 2, "rowSpan": 1, "description": "Wrenches, Sockets & Ratches"}, "D8": {"label": "16F", "colSpan": 2, "rowSpan": 1, "description": "Adhesives"}, "D9": {"label": "16G", "colSpan": 2, "rowSpan": 2, "description": "Sand Paper"}, "F1": {"label": "17A", "colSpan": 2, "rowSpan": 1, "description": "Storage"}, "F2": {"label": "17B", "colSpan": 2, "rowSpan": 3, "description": "Clamps · Battery Charging"}, "F7": {"label": "17C", "rowSpan": 5, "description": "Bin · Cleaning equipment · Sand Paper"}, "G10": {"label": "17D", "rowSpan": 2, "description": "Bin · Cleaning equipment"}, "H1": {"label": "18A", "rowSpan": 4, "description": "Other Chemicals, Resin, Adhesives · Machine Oil, Grease, Release Agent"}, "H5": {"label": "18B", "rowSpan": 7, "description": "Storage"}}, "rowRange": [1, 11], "thickRows": [5]}}, {"id": "screw-bank", "title": "Screw Bank", "icon": "🔩", "grid": {"columns": ["A", "B", "C", "D", "E", "F", "G", "H"], "cells": {"A1": {"label": "M2 Screws", "rowSpan": 2}, "A3": {"label": "Compressed Air & Vacuum Cleaner", "colSpan": 2, "rowSpan": 5}, "A8": {"label": "Storage", "colSpan": 2, "rowSpan": 2}, "B1": {"label": "M2 Screws", "rowSpan": 2}, "C1": {"label": "M3 Screws", "rowSpan": 2}, "C3": {"label": "M2 Screws", "colSpan": 2, "rowSpan": 1}, "C4": {"label": "M3 Screws", "colSpan": 2, "rowSpan": 1}, "C5": {"label": "M4 Screws", "colSpan": 2, "rowSpan": 1}, "C6": {"label": "M5 Screws", "colSpan": 2, "rowSpan": 1}, "C7": {"label": "M6 Screws", "colSpan": 2, "rowSpan": 1}, "C8": {"label": "Hex Head Screws", "colSpan": 2, "rowSpan": 1}, "C9": {"label": "Thumb Screws / Set screws", "colSpan": 2, "rowSpan": 1}, "D1": {"label": "M3 Screws", "rowSpan": 2}, "E1": {"label": "M4 Screws", "rowSpan": 2}, "E3": {"label": "Washers", "colSpan": 2, "rowSpan": 1}, "E4": {"label": "Nuts", "colSpan": 2, "rowSpan": 1}, "E5": {"label": "Standoffs / Threaded Inserts", "colSpan": 2, "rowSpan": 1}, "E6": {"label": "Circlips / Couplings", "colSpan": 2, "rowSpan": 1}, "E7": {"label": "Joints", "colSpan": 2, "rowSpan": 1}, "E8": {"label": "Springs", "colSpan": 2, "rowSpan": 1}, "E9": {"label": "Dowels / Rivets", "colSpan": 2, "rowSpan": 1}, "F1": {"label": "M4 Screws", "rowSpan": 2}, "G3": {"label": "Bearings", "colSpan": 2, "rowSpan": 1}, "G4": {"label": "Gears / Racks", "colSpan": 2, "rowSpan": 1}, "G5": {"label": "Pulleys / Belts", "colSpan": 2, "rowSpan": 1}, "G6": {"label": "Storage", "rowSpan": 4}, "H6": {"label": "Storage", "rowSpan": 4}}, "rowRange": [1, 10], "thickRows": [3]}}]
;
