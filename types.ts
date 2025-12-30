export type BeamType = 'simple' | 'cantilever-left' | 'cantilever-right';

export type LoadType = 'point' | 'distributed' | 'moment';

export interface Load {
  id: string;
  type: LoadType;
  value: number; // Force (kN) or Moment (kN*m) or Distributed (kN/m)
  position: number; // Start position (m)
  length?: number; // For distributed loads (m)
}

export interface Material {
  name: string;
  E: number; // Young's Modulus (GPa)
  yield: number; // Yield Strength (MPa)
}

export interface Profile {
  name: string;
  I: number; // Moment of Inertia (cm^4)
  W: number; // Section Modulus (cm^3)
}

export interface BeamState {
  length: number;
  type: BeamType;
  supportA: number; // Position of support A
  supportB: number; // Position of support B (if applicable)
  loads: Load[];
  material: Material;
  profile: Profile;
  customI?: number;
  customW?: number;
}

export interface CalculationResult {
  x: number;
  shear: number;
  moment: number;
  slope: number;
  deflection: number;
}

export interface Reactions {
  Ra: number;
  Rb: number; // 0 for cantilever
  Ma: number; // Moment reaction at A (for cantilever)
}