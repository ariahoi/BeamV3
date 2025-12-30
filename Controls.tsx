import React from 'react';
import { BeamState, Load, LoadType } from '../types';
import { MATERIALS, PROFILES } from '../constants';
import { ArrowDown, RotateCcw, BoxSelect, Trash2, ChevronDown, Settings, Ruler, Box } from 'lucide-react';

interface Props {
  state: BeamState;
  onUpdate: (newState: BeamState) => void;
  selectedLoadId: string | null;
  onDeleteLoad: (id: string) => void;
  onAddLoad: (type: LoadType) => void;
}

const AccordionItem = ({ title, icon: Icon, children, defaultOpen = false }: any) => (
  <details className="group border-b border-slate-100 last:border-0" open={defaultOpen}>
    <summary className="flex items-center justify-between p-4 cursor-pointer list-none hover:bg-slate-50 transition-colors">
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <Icon size={16} className="text-blue-500" />
        {title}
      </div>
      <ChevronDown size={16} className="text-slate-400 transform group-open:rotate-180 transition-transform" />
    </summary>
    <div className="px-4 pb-4 animate-in slide-in-from-top-1 fade-in duration-200">
      {children}
    </div>
  </details>
);

export const Controls: React.FC<Props> = ({ state, onUpdate, selectedLoadId, onDeleteLoad, onAddLoad }) => {
  const selectedLoad = state.loads.find(l => l.id === selectedLoadId);

  const updateLoad = (key: keyof Load, value: number) => {
    if (!selectedLoadId) return;
    const newLoads = state.loads.map(l => l.id === selectedLoadId ? { ...l, [key]: value } : l);
    onUpdate({ ...state, loads: newLoads });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 h-full flex flex-col overflow-hidden">
      <div className="p-4 border-b border-slate-200 bg-slate-50">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Settings size={18} />
          Configuration
        </h2>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        
        {/* Geometry Section */}
        <AccordionItem title="Geometry" icon={Ruler} defaultOpen>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Length (m)</label>
              <input 
                type="number" 
                value={state.length} 
                onChange={(e) => onUpdate({ ...state, length: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Beam Type</label>
              <select 
                value={state.type} 
                onChange={(e) => onUpdate({ ...state, type: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              >
                <option value="simple">Simple Supported</option>
                <option value="cantilever-left">Cantilever (Left Fix)</option>
                <option value="cantilever-right">Cantilever (Right Fix)</option>
              </select>
            </div>
            {state.type === 'simple' && (
              <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Support A (m)</label>
                    <input 
                      type="number" step="0.1"
                      value={state.supportA} 
                      onChange={(e) => onUpdate({ ...state, supportA: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">Support B (m)</label>
                    <input 
                      type="number" step="0.1"
                      value={state.supportB} 
                      onChange={(e) => onUpdate({ ...state, supportB: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
                    />
                 </div>
              </div>
            )}
          </div>
        </AccordionItem>

        {/* Section Properties */}
        <AccordionItem title="Material & Profile" icon={Box}>
          <div className="space-y-3">
             <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Material</label>
              <select 
                value={state.material.name}
                onChange={(e) => {
                    const mat = MATERIALS.find(m => m.name === e.target.value);
                    if(mat) onUpdate({ ...state, material: mat });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                {MATERIALS.map(m => <option key={m.name} value={m.name}>{m.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Profile</label>
              <select 
                value={state.profile.name}
                onChange={(e) => {
                    const prof = PROFILES.find(p => p.name === e.target.value);
                    if(prof) onUpdate({ ...state, profile: prof, customI: undefined, customW: undefined });
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
              >
                {PROFILES.map(p => <option key={p.name} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
                 <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">I (cm⁴)</label>
                    <input 
                      type="number" 
                      value={state.customI ?? state.profile.I} 
                      disabled={state.profile.name !== 'Custom'}
                      onChange={(e) => onUpdate({ ...state, customI: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-medium text-slate-500 block mb-1">W (cm³)</label>
                    <input 
                      type="number" 
                      value={state.customW ?? state.profile.W} 
                      disabled={state.profile.name !== 'Custom'}
                      onChange={(e) => onUpdate({ ...state, customW: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm disabled:opacity-50"
                    />
                 </div>
            </div>
          </div>
        </AccordionItem>

        {/* Load Editor */}
        <AccordionItem title="Loads" icon={ArrowDown} defaultOpen>
          <div className="grid grid-cols-3 gap-2 mb-4">
             <button onClick={() => onAddLoad('point')} className="p-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all group">
                <ArrowDown className="w-4 h-4 text-slate-500 group-hover:text-blue-600" /> Point
             </button>
             <button onClick={() => onAddLoad('distributed')} className="p-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all group">
                <BoxSelect className="w-4 h-4 text-slate-500 group-hover:text-blue-600" /> Dist
             </button>
             <button onClick={() => onAddLoad('moment')} className="p-2 border border-slate-200 hover:border-blue-500 hover:bg-blue-50 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all group">
                <RotateCcw className="w-4 h-4 text-slate-500 group-hover:text-blue-600" /> Moment
             </button>
          </div>

          {selectedLoad ? (
             <div className="bg-slate-50 p-3 rounded-lg border border-blue-200 animate-in fade-in slide-in-from-top-2 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <div className="flex justify-between items-center mb-3">
                   <span className="text-xs font-bold text-slate-700 uppercase pl-2">Selected Load</span>
                   <button onClick={() => onDeleteLoad(selectedLoad.id)} className="text-slate-400 hover:text-red-500 transition-colors p-1"><Trash2 size={14}/></button>
                </div>
                <div className="space-y-2 pl-2">
                   <div>
                      <label className="text-xs text-slate-500 block mb-1">Magnitude {selectedLoad.type === 'distributed' ? '(kN/m)' : selectedLoad.type === 'moment' ? '(kNm)' : '(kN)'}</label>
                      <input type="number" value={selectedLoad.value} onChange={(e) => updateLoad('value', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-400 outline-none" />
                   </div>
                   <div>
                      <label className="text-xs text-slate-500 block mb-1">Position (m)</label>
                      <input type="number" step="0.1" value={selectedLoad.position} onChange={(e) => updateLoad('position', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-400 outline-none" />
                   </div>
                   {selectedLoad.type === 'distributed' && (
                       <div>
                        <label className="text-xs text-slate-500 block mb-1">Length (m)</label>
                        <input type="number" step="0.1" value={selectedLoad.length || 1} onChange={(e) => updateLoad('length', Number(e.target.value))} className="w-full px-2 py-1.5 text-sm bg-white border border-slate-200 rounded focus:border-blue-400 outline-none" />
                     </div>
                   )}
                </div>
             </div>
          ) : (
             <div className="text-center py-6 px-4 text-slate-400 text-xs border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                Click a load on the diagram or add new one
             </div>
          )}
        </AccordionItem>
      </div>
    </div>
  );
};