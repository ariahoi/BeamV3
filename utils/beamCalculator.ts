import { BeamState, CalculationResult, Reactions } from '../types';

const POINTS = 400; // Increased resolution for smoother charts

export const calculateReactions = (state: BeamState): Reactions => {
  const { loads, type, supportA, supportB, length } = state;
  
  // Helper to get force and moment contribution of a load about a point
  const analyzeLoad = (pivot: number) => {
      let force = 0;
      let moment = 0;

      loads.forEach(load => {
          if (load.type === 'point') {
              // Force
              force += load.value;
              // Moment = Force * distance
              moment += load.value * (load.position - pivot);
          } else if (load.type === 'distributed' && load.length) {
              const F = load.value * load.length;
              const center = load.position + load.length / 2;
              force += F;
              moment += F * (center - pivot);
          } else if (load.type === 'moment') {
              // Pure moment adds directly (taking sign convention into account)
              // Convention: CCW +
              // If input value is kNm (usually defined as CCW is positive in structural mechanics, or Sagging)
              // Here we assume input value > 0 is CCW.
              moment -= load.value; // Note: In static equilibrium Sum M = 0. 
          }
      });
      return { force, moment };
  };

  if (type === 'simple') {
      // Sum Moments about A = 0 => Rb * (B-A) - SumLoadMomentsAboutA = 0
      const loadAnalysis = analyzeLoad(supportA);
      
      const dist = supportB - supportA;
      if (Math.abs(dist) < 1e-4) return { Ra: 0, Rb: 0, Ma: 0 };

      // Rb * dist = SumLoadMoments
      const Rb = loadAnalysis.moment / dist;
      const Ra = loadAnalysis.force - Rb;

      return { Ra, Rb, Ma: 0 };

  } else if (type === 'cantilever-left') {
      // Fixed at A.
      // Ra = Total Load
      // Ma = Moment at wall to counteract load moments
      const loadAnalysis = analyzeLoad(supportA);
      
      return { 
          Ra: loadAnalysis.force, 
          Rb: 0, 
          Ma: loadAnalysis.moment // Reaction moment
      };
  } else {
      // Cantilever Right (Fixed at Length)
      // We calculate reactions at the wall (Right side)
      // For the purpose of the diagram integrator scanning Left->Right, 
      // we don't strictly need Ra/Ma at the start (0), because the wall is at the end.
      // However, for completeness:
      const loadAnalysis = analyzeLoad(length);
      
      return {
          Ra: 0,
          Rb: loadAnalysis.force, // Vertical reaction at right wall
          Ma: loadAnalysis.moment // Moment reaction at right wall
      };
  }
};

export const calculateDiagrams = (state: BeamState): CalculationResult[] => {
    const { length, loads, type, supportA, supportB, material, profile, customI } = state;
    const reactions = calculateReactions(state);
    
    // Stiffness EI
    const I_m4 = (customI || profile.I) / 100000000; // cm^4 to m^4
    const E_kpa = material.E * 1000000; // GPa to kPa (kN/m^2)
    const EI = E_kpa * I_m4;

    const dx = length / POINTS;
    const results: CalculationResult[] = [];

    // Integration approach: Scan from x=0 to L
    // Calculate Shear (V) and Moment (M) at each section x by summing forces/moments to the LEFT.
    
    for (let i = 0; i <= POINTS; i++) {
        const x = i * dx;
        let shear = 0;
        let moment = 0;

        // 1. Add Reactions (if they are to the left of x)
        if (type === 'simple') {
            if (x > supportA) {
                shear += reactions.Ra;
                moment += reactions.Ra * (x - supportA);
            }
            if (x > supportB) {
                shear += reactions.Rb;
                moment += reactions.Rb * (x - supportB);
            }
        } else if (type === 'cantilever-left') {
            // Support is at A (usually 0)
            if (x > supportA) {
                shear += reactions.Ra;
                moment += reactions.Ra * (x - supportA);
                moment -= reactions.Ma; // Reaction moment at wall (CCW reaction usually creates Hogging/Negative moment on beam?)
            }
        }
        // For cantilever-right, reactions are at L. Since we scan 0->L, we never pass the support until the end.
        // So internal forces are just due to loads. This is correct.

        // 2. Add Loads (if they are to the left of x)
        loads.forEach(load => {
            if (load.type === 'point') {
                if (x > load.position) {
                    shear -= load.value; // Downward load decreases shear
                    moment -= load.value * (x - load.position); // Downward load creates Hogging (-)
                }
            } else if (load.type === 'distributed' && load.length) {
                if (x > load.position) {
                    const start = load.position;
                    const end = Math.min(x, start + load.length);
                    const distLen = end - start;
                    
                    if (distLen > 0) {
                        const forceChunk = load.value * distLen;
                        shear -= forceChunk;
                        const centroid = start + distLen / 2;
                        moment -= forceChunk * (x - centroid);
                    }
                }
            } else if (load.type === 'moment') {
                if (x > load.position) {
                    // Concentrated Moment
                    // Convention: Counter-Clockwise external moment adds to Internal Moment
                    moment += load.value; 
                }
            }
        });

        results.push({
            x,
            shear,
            moment,
            slope: 0,
            deflection: 0
        });
    }

    // Double integration method for Slope and Deflection
    // M = EI * d2y/dx2
    // Theta = Integral(M/EI) + C1
    // Y = Integral(Theta) + C2

    // 1. First Pass: Numerical Integration
    const integration = new Array(results.length).fill({ theta: 0, y: 0 });
    let cumTheta = 0;
    let cumY = 0;

    for (let i = 1; i < results.length; i++) {
        const mPrev = results[i-1].moment;
        const mCurr = results[i].moment;
        const avgM = (mPrev + mCurr) / 2;
        
        cumTheta += (avgM / EI) * dx;
        
        // Simpler: y += theta * dx
        cumY += cumTheta * dx;

        integration[i] = { theta: cumTheta, y: cumY };
    }

    // 2. Calculate Constants C1 and C2 based on Boundary Conditions
    let C1 = 0;
    let C2 = 0;

    const getIdx = (pos: number) => Math.min(Math.max(Math.round(pos / dx), 0), POINTS);

    if (type === 'cantilever-left') {
        // Fixed at A (usually 0). y=0, theta=0 at x=supportA
        const idx = getIdx(supportA);
        // Theta_final = intTheta + C1. At supportA, 0 = intTheta[idx] + C1 => C1 = -intTheta[idx]
        C1 = -integration[idx].theta;
        // Y_final = intY + C1*x + C2. At supportA, 0 = intY[idx] + C1*A + C2
        C2 = -integration[idx].y - C1 * supportA;

    } else if (type === 'cantilever-right') {
        // Fixed at L. y=0, theta=0 at x=L
        const idx = POINTS; // End
        C1 = -integration[idx].theta;
        C2 = -integration[idx].y - C1 * length;

    } else if (type === 'simple') {
        // y=0 at A, y=0 at B
        const idxA = getIdx(supportA);
        const idxB = getIdx(supportB);
        
        const y_int_A = integration[idxA].y;
        const y_int_B = integration[idxB].y;

        // Eq1: y_int_A + C1*A + C2 = 0
        // Eq2: y_int_B + C1*B + C2 = 0
        // Subtract: (y_int_B - y_int_A) + C1*(B - A) = 0
        if (Math.abs(supportB - supportA) > 1e-4) {
            C1 = -(y_int_B - y_int_A) / (supportB - supportA);
            C2 = -y_int_A - C1 * supportA;
        }
    }

    // 3. Finalize Results
    for (let i = 0; i < results.length; i++) {
        results[i].slope = integration[i].theta + C1;
        results[i].deflection = (integration[i].y + C1 * results[i].x + C2) * 1000; // Convert m to mm
        
        // Zero out mostly-zero values to prevent scientific notation in UI (e.g. 1e-15)
        if (Math.abs(results[i].shear) < 1e-3) results[i].shear = 0;
        if (Math.abs(results[i].moment) < 1e-3) results[i].moment = 0;
        if (Math.abs(results[i].deflection) < 1e-3) results[i].deflection = 0;
    }

    return results;
};