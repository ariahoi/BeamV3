import { BeamState, CalculationResult, Reactions } from '../types';

const POINTS = 200; // Resolution of the calculation

export const calculateReactions = (state: BeamState): Reactions => {
  const { loads, type, supportA, supportB, length } = state;
  
  // 1. Calculate Equivalent Forces and Moments from Loads
  // Convention:
  // Forces: Up is Positive (+), Down is Negative (-) in statics equations.
  // Note: Input 'value' for Point/Dist load is usually Magnitude. We assume input > 0 is Downward force.
  // Moments: Counter-Clockwise (CCW) is Positive (+).
  
  let totalLoadForce = 0; // Sum of downward forces
  let totalLoadMomentAtZero = 0; // Sum of moments caused by loads relative to x=0 (CCW positive)

  loads.forEach(load => {
    if (load.type === 'point') {
      const F = load.value; // Downward magnitude
      // Moment by downward force at pos x: -F * x
      totalLoadForce += F;
      totalLoadMomentAtZero -= F * load.position;
    } else if (load.type === 'distributed' && load.length) {
      const F = load.value * load.length; // Total downward force
      const center = load.position + load.length / 2;
      totalLoadForce += F;
      totalLoadMomentAtZero -= F * center;
    } else if (load.type === 'moment') {
      // Input value > 0 is CCW moment
      totalLoadMomentAtZero += load.value;
    }
  });

  // 2. Solve Equilibrium Equations based on Beam Type
  
  if (type === 'simple') {
    // Two supports: A and B.
    // Eq 1: Ra + Rb - TotalLoadForce = 0  => Ra + Rb = TotalLoadForce
    // Eq 2: Sum Moments about A = 0
    // M_Ra(0) + M_Rb(dist) + M_loads_about_A = 0
    
    // It's easier to sum moments about x=0 global:
    // Ra * supportA + Rb * supportB + totalLoadMomentAtZero = 0
    
    // From Eq 1: Ra = TotalLoadForce - Rb. Substitute into Moment Eq:
    // (TotalLoadForce - Rb) * supportA + Rb * supportB + totalLoadMomentAtZero = 0
    // TotalLoadForce*A - Rb*A + Rb*B + M_loads = 0
    // Rb * (B - A) = -M_loads - TotalLoadForce*A
    // Rb = -(M_loads + TotalLoadForce*A) / (B - A)
    
    const dist = supportB - supportA;
    if (Math.abs(dist) < 1e-4) return { Ra: 0, Rb: 0, Ma: 0 };

    const Rb = -(totalLoadMomentAtZero + (-totalLoadForce * supportA)) / dist; // Note: totalLoadForce is magnitude of downward, needs to be treated as Force vector = -totalLoadForce in formula? 
    // Let's re-verify signs.
    // Let Force vector F_load = -totalLoadForce (downward).
    // Moment M_load_0 = totalLoadMomentAtZero.
    // Ra*A + Rb*B + M_load_0 = 0
    // Ra + Rb + F_load = 0  => Ra + Rb = totalLoadForce (magnitude)
    
    // Actually, let's stick to the simplest Statics Method of Moments about Support A:
    // Sum M_A = 0 (CCW +)
    // Rb * (B - A) + Sum(Moment_Loads_About_A) = 0
    
    let sumMomentsAboutA = 0;
    loads.forEach(load => {
        if (load.type === 'point') {
            // Downward force F at dist d from A creates CW moment: -F*d
            const d = load.position - supportA;
            sumMomentsAboutA -= load.value * d;
        } else if (load.type === 'distributed' && load.length) {
            const F = load.value * load.length;
            const center = load.position + load.length/2;
            const d = center - supportA;
            sumMomentsAboutA -= F * d;
        } else if (load.type === 'moment') {
            sumMomentsAboutA += load.value;
        }
    });

    const reactionB = -sumMomentsAboutA / dist;
    const reactionA = totalLoadForce - reactionB;
    
    return { Ra: reactionA, Rb: reactionB, Ma: 0 };

  } else if (type === 'cantilever-left') {
    // Fixed at Support A.
    // Sigma F_y = 0 => Ra - TotalDownwardForce = 0 => Ra = TotalDownwardForce
    // Sigma M_A = 0 => Ma + Sum(Moment_Loads_About_A) = 0 => Ma = -Sum(Moment_Loads_About_A)
    
    const Ra = totalLoadForce;
    
    let sumMomentsAboutA = 0;
    loads.forEach(load => {
        if (load.type === 'point') {
            sumMomentsAboutA -= load.value * (load.position - supportA);
        } else if (load.type === 'distributed' && load.length) {
            const F = load.value * load.length;
            const center = load.position + load.length/2;
            sumMomentsAboutA -= F * (center - supportA);
        } else if (load.type === 'moment') {
            sumMomentsAboutA += load.value;
        }
    });

    return { Ra, Rb: 0, Ma: -sumMomentsAboutA };
  } else {
    // Cantilever Right (Fixed at Length)
    // Support is considered at 'length' (or supportA if we used that prop, but UI assumes L)
    // Let's assume the fixity is at x = length.
    
    const Ra = totalLoadForce; // Vertical reaction at wall (usually called Rb if at right, but we store in Ra for simplicity or map to proper var)
    // Actually, let's allow Rb to be the right support reaction.
    
    // Sigma M_Wall = 0 (Wall is at L)
    // M_wall + Sum(Moment_Loads_About_L) = 0
    
    let sumMomentsAboutWall = 0;
    const wallX = length;
    
    loads.forEach(load => {
        // Look at forces to the LEFT of wall.
        // Downward force F at dist (L-pos) from wall creates CCW moment (Positive).
        // Wait, standard convention: Force at x, pivot at L. Lever arm r = (x - L).
        // Torque = r x F. 
        // Force is down (-F). r is negative. Cross product usually results in Positive (CCW) moment for force to the left pushing down?
        // Let's visualize: Wall at right. Load at left pushing down. This rotates beam CCW around wall. Correct. Positive moment.
        
        if (load.type === 'point') {
            sumMomentsAboutWall += load.value * (wallX - load.position);
        } else if (load.type === 'distributed' && load.length) {
            const F = load.value * load.length;
            const center = load.position + load.length/2;
            sumMomentsAboutWall += F * (wallX - center);
        } else if (load.type === 'moment') {
            sumMomentsAboutWall += load.value;
        }
    });
    
    // M_wall = -SumMoments
    // We store this in Ma for the data structure, but physically it's at B. 
    // However, to keep our integrator simple (which usually sweeps left-to-right), 
    // it's easier to calculate internal forces by cutting.
    
    return { Ra: 0, Rb: Ra, Ma: -sumMomentsAboutWall }; // Storing Moment reaction in Ma slot is confusing. Let's strictly use the result object in integrator.
    // We will use Ma for left wall moment, and we need a way to pass right wall moment. 
    // For now, let's adhere to the types. Reactions interface has Ma. We can reuse it or rely on Rb and statics in the integrator.
    // Actually, for Cantilever Right, we don't strictly need the wall moment to calculate Shear/Moment diagrams if we scan from Left to Right (Free end to Fixed end).
    // If we scan Left->Right, V=0, M=0 at start. Accumulate loads.
    // The mismatch at the end is the reaction.
  }
};

export const calculateDiagrams = (state: BeamState): CalculationResult[] => {
    const { length, loads, type, supportA, supportB, material, profile, customI } = state;
    const reactions = calculateReactions(state);
    
    const I_m4 = (customI || profile.I) / 100000000; // cm4 to m4
    const E_kpa = material.E * 1000000; // GPa to kPa
    const EI = E_kpa * I_m4;

    const dx = length / POINTS;
    const results: CalculationResult[] = [];
    
    // We integrate differential equations or use Method of Sections from x=0 to L
    
    for (let i = 0; i <= POINTS; i++) {
        const x = i * dx;
        let shear = 0; // Upward internal shear is positive on Left face? 
        // Standard Beam Sign Convention:
        // Shear V: Positive when it pushes the left section Up.
        // Moment M: Positive when it compresses the top fiber (Sagging).
        
        // V(x) = Sum of Forces to the left (Upward reactions - Downward loads)
        // M(x) = Sum of Moments to the left (Reaction moments + Force moments)
        
        // 1. Reactions to the left
        if (type === 'simple') {
            if (x > supportA) {
                shear += reactions.Ra;
                momentFromForce(reactions.Ra, supportA, x);
            }
            if (x > supportB) {
                shear += reactions.Rb;
                momentFromForce(reactions.Rb, supportB, x);
            }
        } else if (type === 'cantilever-left') {
             // Fixed at A.
             if (x > supportA) {
                 shear += reactions.Ra;
                 // Moment Reaction at A (Ma). If Ma is positive (CCW), it adds directly to internal moment (Sagging).
                 // Wait, Internal Moment M = M_ext_reaction + ...
                 // If Wall applies CCW moment, it bends beam Up (Sagging). So +Ma.
                 // Reactions.Ma calculated above opposes loads.
                 // Example: Load Down (-). Ma will be Positive (CCW). This creates sagging.
                 
                 // We need to be careful with x near 0.
                 // Internal Moment at x=0+ is Ma.
                 
                 // Add Moment Reaction
                 // M(x) includes the concentrated moment at the support
                 // Note: Our reactions.Ma is the reaction BY the wall ON the beam.
                 shear += reactions.Ra; // Ra is vertical force by wall
                 momentFromForce(reactions.Ra, supportA, x);
                 addMoment(reactions.Ma); 
             }
        }
        
        // 2. Loads to the left
        loads.forEach(load => {
            if (load.type === 'point') {
                if (x > load.position) {
                    shear -= load.value; // Downward load reduces shear
                    momentFromForce(-load.value, load.position, x);
                }
            } else if (load.type === 'distributed' && load.length) {
                if (x > load.position) {
                    // Dist load w starts at P.
                    // Active portion is from P to min(x, P+L).
                    const start = load.position;
                    const end = Math.min(x, start + load.length);
                    const distLen = end - start;
                    
                    if (distLen > 0) {
                        const forceChunk = load.value * distLen;
                        shear -= forceChunk;
                        // Centroid of this chunk
                        const centroid = start + distLen / 2;
                        momentFromForce(-forceChunk, centroid, x);
                    }
                }
            } else if (load.type === 'moment') {
                if (x > load.position) {
                     // Concentrated moment input.
                     // If input is CCW (+), it adds to internal moment directly?
                     // Standard convention: Clockwise External Moment on left section is Positive internal M? No.
                     // Let's stick to: Internal M = Sum Moments of Left forces/moments about section cut.
                     // CCW Moment at x < Cut adds Positive M.
                     addMoment(load.value);
                }
            }
        });

        function momentFromForce(F: number, pos: number, cutX: number) {
             // Force F at pos. Cut at cutX. Lever arm = cutX - pos.
             // Moment = F * arm.
             // If F is Up (+), Moment is Positive (Sagging).
             // If F is Down (-), Moment is Negative (Hogging).
             addMoment(F * (cutX - pos));
        }

        function addMoment(m: number) {
            // Helper to sum moments to a local var before pushing
            // We can't access 'moment' var directly inside forEach easily without scope.
            // Implemented via closure or separate variable logic.
            // Let's rewrite the loop structure slightly to allow direct var access.
        }
        
        // Re-implementing summation inline for clarity
        let M_internal = 0;
        
        // Apply Reactions
         if (type === 'simple') {
            if (x >= supportA) {
                M_internal += reactions.Ra * (x - supportA);
            }
            if (x >= supportB) {
                M_internal += reactions.Rb * (x - supportB);
            }
        } else if (type === 'cantilever-left') {
             if (x >= supportA) {
                 M_internal += reactions.Ra * (x - supportA);
                 M_internal += reactions.Ma;
             }
        }
        
        // Apply Loads
        loads.forEach(load => {
             if (load.type === 'point') {
                if (x > load.position) {
                    M_internal -= load.value * (x - load.position);
                }
            } else if (load.type === 'distributed' && load.length) {
                if (x > load.position) {
                    const start = load.position;
                    const end = Math.min(x, start + load.length);
                    const distLen = end - start;
                    if (distLen > 0) {
                        const forceChunk = load.value * distLen;
                        const centroid = start + distLen / 2;
                        M_internal -= forceChunk * (x - centroid);
                    }
                }
            } else if (load.type === 'moment') {
                if (x > load.position) {
                     M_internal += load.value;
                }
            }
        });

        results.push({
            x,
            shear,
            moment: M_internal,
            slope: 0,
            deflection: 0
        });
    }

    // 2. Integration for Slope and Deflection using Moment-Area method or trapezoidal integration
    let theta = 0;
    let y = 0;
    const integrationData = [];

    // Integrate M/EI to get Theta (Slope)
    // Integrate Theta to get Y (Deflection)
    for (let i = 0; i <= POINTS; i++) {
         if (i === 0) {
             integrationData.push({ theta: 0, y: 0 });
         } else {
             const mPrev = results[i-1].moment;
             const mCurr = results[i].moment;
             const avgM = (mPrev + mCurr) / 2;
             
             theta += avgM * dx;
             
             const tPrev = integrationData[i-1].theta;
             const tCurr = theta;
             const avgT = (tPrev + tCurr) / 2;
             
             y += avgT * dx;
             
             integrationData.push({ theta, y });
         }
    }

    // 3. Boundary Conditions (C1 and C2)
    // Y_final(x) = (1/EI) * ( y_int(x) + C1*x + C2 )
    
    let C1 = 0;
    let C2 = 0;

    if (type === 'cantilever-left') {
        // y(0) = 0, theta(0) = 0 (assuming supportA is at 0, or shift logic)
        // If integration started at 0 and support is at 0:
        // C1 = -theta(0) = 0
        // C2 = -y(0) = 0
        // But supportA might be offset? Let's strictly use supportA index.
        const idx = Math.min(Math.max(Math.round(supportA/dx), 0), POINTS);
        const val = integrationData[idx];
        
        // Theta_actual(A) = (val.theta + C1)/EI = 0 => C1 = -val.theta
        C1 = -val.theta;
        // Y_actual(A) = (val.y + C1*A + C2)/EI = 0 => C2 = -val.y - C1*A
        C2 = -val.y - C1 * supportA;
        
    } else if (type === 'cantilever-right') {
        // Fixed at L. y(L)=0, theta(L)=0.
        const val = integrationData[POINTS]; // last point
        C1 = -val.theta;
        C2 = -val.y - C1 * length;
        
    } else if (type === 'simple') {
        // y(A) = 0, y(B) = 0
        const idxA = Math.min(Math.max(Math.round(supportA/dx), 0), POINTS);
        const idxB = Math.min(Math.max(Math.round(supportB/dx), 0), POINTS);
        
        const yA = integrationData[idxA].y;
        const yB = integrationData[idxB].y;
        
        // System:
        // yA + C1*A + C2 = 0
        // yB + C1*B + C2 = 0
        // (yB - yA) + C1*(B-A) = 0 => C1 = (yA - yB) / (B - A)
        
        if (Math.abs(supportB - supportA) > 1e-4) {
             C1 = (yA - yB) / (supportB - supportA);
             C2 = -yA - C1 * supportA;
        }
    }

    // Finalize
    for (let i = 0; i <= POINTS; i++) {
        const item = integrationData[i];
        results[i].slope = (item.theta + C1) / EI;
        // Deflection in mm
        results[i].deflection = ((item.y + C1 * results[i].x + C2) / EI) * 1000;
        
        // Fix practically zero values to strictly 0 for clean charts
        if (Math.abs(results[i].shear) < 1e-5) results[i].shear = 0;
        if (Math.abs(results[i].moment) < 1e-5) results[i].moment = 0;
        if (Math.abs(results[i].deflection) < 1e-5) results[i].deflection = 0;
    }

    return results;
};