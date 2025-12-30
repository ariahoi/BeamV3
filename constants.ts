import { Material, Profile } from './types';

export const MATERIALS: Material[] = [
  { name: 'Steel (Structure)', E: 200, yield: 240 },
  { name: 'Steel (High Strength)', E: 210, yield: 345 },
  { name: 'Aluminum 6061', E: 69, yield: 276 },
  { name: 'Timber (Pine)', E: 11, yield: 40 },
  { name: 'Concrete (C25/30)', E: 30, yield: 25 },
];

export const PROFILES: Profile[] = [
  { name: 'Custom', I: 0, W: 0 },
  { name: 'IPE 100', I: 171, W: 34.2 },
  { name: 'IPE 160', I: 869, W: 109 },
  { name: 'IPE 200', I: 1943, W: 194 },
  { name: 'IPE 240', I: 3892, W: 324 },
  { name: 'IPE 300', I: 8356, W: 557 },
  { name: 'HEA 100', I: 349, W: 72.8 },
  { name: 'HEA 200', I: 3692, W: 389 },
];

export const DEFAULT_BEAM_LENGTH = 10;
