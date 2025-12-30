import React, { useState, useMemo } from 'react';
import { BeamState, LoadType } from './types';
import { MATERIALS, PROFILES, DEFAULT_BEAM_LENGTH } from './constants';
import { calculateDiagrams, calculateReactions } from './utils/beamCalculator';
import { BeamVisualizer } from './components/BeamVisualizer';
import { ResultsCharts } from './components/ResultsCharts';
import { Controls } from './components/Controls';
import { Calculator, ShieldCheck, AlertTriangle, ArrowRight, RotateCcw } from 'lucide-react';

const App: React.FC = () => {
  const [beamState, setBeamState] = useState<BeamState>({
    length: DEFAULT_BEAM_LENGTH,
    type: 'simple',
    supportA: 0,
    supportB: DEFAULT_BEAM_LENGTH,
    loads: [
      { id: '1', type: 'point', value: 10, position: DEFAULT_BEAM_LENGTH / 2 },
      { id: '2', type: 'distributed', value: 5, position: 1, length: 3 }
    ],
    material: MATERIALS[0],
    profile: PROFILES[2],
  });

  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);

  // Memoize heavy calculations
  const results = useMemo(() => calculateDiagrams(beamState), [beamState]);
  const reactions = useMemo(() => calculateReactions(beamState), [beamState]);

  // Safety Check
  const maxStress = useMemo(() => {
    let maxMoment = 0;
    results.forEach(r => { if (Math.abs(r.moment) > maxMoment) maxMoment = Math.abs(r.moment); });
    const W_m3 = (beamState.customW || beamState.profile.W) / 1000000; // cm3 to m3
    if (W_m3 === 0) return 0;
    const stressPa = (maxMoment * 1000) / W_m3; // kNm -> Nm / m3 -> Pa
    return stressPa / 1000000; // MPa
  }, [results, beamState]);

  const isSafe = maxStress <= beamState.material.yield;
  const safetyFactor = maxStress > 0 ? beamState.material.yield / maxStress : 999;

  const handleAddLoad = (type: LoadType) => {
    const newId = Date.now().toString();
    setBeamState(prev => ({
      ...prev,
      loads: [...prev.loads, { 
        id: newId, 
        type, 
        value: 10, 
        position: prev.length / 2,
        length: type === 'distributed' ? 2 : undefined
      }]
    }));
    setSelectedLoadId(newId);
  };

  const handleDeleteLoad = (id: string) => {
    setBeamState(prev => ({
      ...prev,
      loads: prev.loads.filter(l => l.id !== id)
    }));
    setSelectedLoadId(null);
  };
  
  const handleReset = () => {
      if (confirm('Clear all loads and reset geometry?')) {
        setBeamState({
            length: DEFAULT_BEAM_LENGTH,
            type: 'simple',
            supportA: 0,
            supportB: DEFAULT_BEAM_LENGTH,
            loads: [],
            material: MATERIALS[0],
            profile: PROFILES[2],
        });
        setSelectedLoadId(null);
      }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2 rounded-lg text-white shadow-lg shadow-blue-500/20">
              <Calculator size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-none tracking-tight">BeamStruct Pro</h1>
              <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-0.5">Structural Analysis Suite</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
                onClick={handleReset}
                className="text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
             >
                <RotateCcw size={14} /> Reset
             </button>
             <div className="h-4 w-px bg-slate-200 hidden md:block"></div>
             <a href="#" className="text-sm text-slate-500 hover:text-blue-600 transition-colors hidden md:block">Help</a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1400px] w-full mx-auto p-4 md:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        
        {/* Left Sidebar (Controls) */}
        <aside className="lg:col-span-3 lg:h-[calc(100vh-120px)] lg:sticky lg:top-24 flex flex-col">
          <Controls 
            state={beamState} 
            onUpdate={setBeamState} 
            selectedLoadId={selectedLoadId}
            onDeleteLoad={handleDeleteLoad}
            onAddLoad={handleAddLoad}
          />
        </aside>

        {/* Center Content (Visuals & Results) */}
        <div className="lg:col-span-9 space-y-6 lg:space-y-8 pb-10">
          
          {/* Top KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {/* Reactions Card */}
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">Support Reactions</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                    <span className="text-sm text-slate-600">Ra (Vertical)</span>
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm">{reactions.Ra.toFixed(2)} kN</span>
                  </div>
                  {beamState.type === 'simple' && (
                     <div className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                       <span className="text-sm text-slate-600">Rb (Vertical)</span>
                       <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm">{reactions.Rb.toFixed(2)} kN</span>
                     </div>
                  )}
                  {beamState.type !== 'simple' && (
                     <div className="flex justify-between items-center pb-2 border-b border-slate-50 last:border-0 last:pb-0">
                       <span className="text-sm text-slate-600">Ma (Moment)</span>
                       <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded text-sm">{reactions.Ma.toFixed(2)} kNm</span>
                     </div>
                  )}
                </div>
             </div>
             
             {/* Stress Card */}
             <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-2">
                   <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Max Stress</h3>
                   <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">Limit: {beamState.material.yield}</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                   <span className="text-3xl font-bold text-slate-900">{maxStress.toFixed(1)}</span>
                   <span className="text-sm text-slate-500 font-medium">MPa</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2 mt-3 overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-700 ease-out ${isSafe ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' : 'bg-gradient-to-r from-red-400 to-red-500'}`}
                      style={{ width: `${Math.min((maxStress / beamState.material.yield) * 100, 100)}%` }}
                   />
                </div>
             </div>

             {/* Safety Status */}
             <div className={`p-5 rounded-2xl border shadow-sm flex items-center justify-between relative overflow-hidden ${isSafe ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
                <div className="relative z-10">
                  <h3 className="text-[11px] font-bold uppercase tracking-widest mb-1 opacity-70">Safety Status</h3>
                  <div className="font-bold text-xl flex items-center gap-2">
                    {isSafe ? 'Structure Safe' : 'Overloaded'}
                  </div>
                  <div className="text-xs mt-1 opacity-80 font-medium">
                     Factor of Safety: <span className="font-bold">{safetyFactor.toFixed(2)}</span>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${isSafe ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} relative z-10`}>
                   {isSafe ? <ShieldCheck size={28} strokeWidth={1.5} /> : <AlertTriangle size={28} strokeWidth={1.5} />}
                </div>
             </div>
          </div>

          {/* Interactive Beam Visualizer */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1">
            <div className="flex justify-between items-center p-4 border-b border-slate-50">
               <div className="flex items-center gap-2">
                  <span className="w-2 h-8 bg-blue-500 rounded-sm"></span>
                  <h2 className="text-base font-bold text-slate-800">Free Body Diagram</h2>
               </div>
               <div className="text-xs text-slate-500 flex items-center gap-2">
                  <span>Click components to edit</span>
                  <ArrowRight size={14} />
               </div>
            </div>
            <div className="p-4 bg-slate-50/50 rounded-b-xl overflow-x-auto">
               <div className="min-w-[600px]">
                   <BeamVisualizer 
                      state={beamState} 
                      onSelectLoad={setSelectedLoadId} 
                      selectedLoadId={selectedLoadId} 
                   />
               </div>
            </div>
          </section>

          {/* Results Charts */}
          <section>
             <div className="flex items-center gap-2 mb-4 px-1">
                  <span className="w-2 h-6 bg-indigo-500 rounded-sm"></span>
                  <h2 className="text-lg font-bold text-slate-800">Analysis Results</h2>
             </div>
             <ResultsCharts data={results} />
          </section>
        </div>

      </main>
    </div>
  );
};

export default App;