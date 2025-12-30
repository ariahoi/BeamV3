import React from 'react';
import { BeamState, Load } from '../types';

interface Props {
  state: BeamState;
  onSelectLoad: (id: string | null) => void;
  selectedLoadId: string | null;
}

export const BeamVisualizer: React.FC<Props> = ({ state, onSelectLoad, selectedLoadId }) => {
  const { length, loads, type, supportA, supportB } = state;
  const beamY = 100;
  const paddingX = 40;
  const width = 800;
  const scaleX = (width - paddingX * 2) / length;

  const toPx = (m: number) => paddingX + m * scaleX;

  const renderSupport = (x: number, label: string) => (
    <g key={label} transform={`translate(${toPx(x)}, ${beamY + 10})`}>
      <path d="M0,0 L-10,15 L10,15 Z" fill="#475569" />
      <line x1="-12" y1="15" x2="12" y2="15" stroke="#475569" strokeWidth="2" />
      <g stroke="#94a3b8" strokeWidth="1">
        {[0, 4, 8, 12].map(i => (
          <line key={i} x1={-10 + i} y1="15" x2={-13 + i} y2="20" />
        ))}
      </g>
      <circle cx="0" cy="0" r="2" fill="white" stroke="#475569" strokeWidth="1"/>
      <text y="35" textAnchor="middle" className="text-xs fill-slate-500 font-bold select-none">{label}</text>
    </g>
  );

  const renderWall = (x: number, isRight: boolean) => (
      <g transform={`translate(${toPx(x)}, ${beamY - 20})`}>
          <rect x={isRight ? 0 : -10} y="-20" width="10" height="80" fill="url(#diagonal-hatch)" stroke="#94a3b8" />
          <line x1={isRight ? 0 : 0} y1="-20" x2={isRight ? 0 : 0} y2="60" stroke="#475569" strokeWidth="3" />
      </g>
  );

  const renderLoad = (load: Load) => {
    const isSelected = selectedLoadId === load.id;
    const color = isSelected ? '#2563eb' : '#ef4444';
    const x = toPx(load.position);

    if (load.type === 'point') {
      return (
        <g key={load.id} onClick={(e) => { e.stopPropagation(); onSelectLoad(load.id); }} className="cursor-pointer group">
          {/* Hit area */}
          <rect x={x - 10} y={beamY - 60} width="20" height="60" fill="transparent" />
          <line x1={x} y1={beamY - 50} x2={x} y2={beamY} stroke={color} strokeWidth="3" markerEnd={`url(#arrowhead-${isSelected ? 'selected' : 'normal'})`} className="transition-all group-hover:stroke-width-4" />
          <rect x={x - 20} y={beamY - 75} width="40" height="20" rx="4" fill={isSelected ? color : "white"} stroke={isSelected ? "none" : "#e2e8f0"} className="shadow-sm opacity-0 group-hover:opacity-100 transition-opacity" />
          <text x={x} y={beamY - 60} textAnchor="middle" className={`text-xs font-bold pointer-events-none transition-all ${isSelected ? 'fill-blue-600 -translate-y-1' : 'fill-slate-500'}`}>{load.value} kN</text>
        </g>
      );
    } else if (load.type === 'distributed') {
      const len = load.length || 0;
      const xEnd = toPx(load.position + len);
      const width = xEnd - x;
      return (
        <g key={load.id} onClick={(e) => { e.stopPropagation(); onSelectLoad(load.id); }} className="cursor-pointer group">
          <rect x={x} y={beamY - 30} width={width} height="30" fill={isSelected ? "rgba(37, 99, 235, 0.15)" : "rgba(239, 68, 68, 0.05)"} stroke="none" className="transition-all" />
          <line x1={x} y1={beamY - 30} x2={xEnd} y2={beamY - 30} stroke={color} strokeWidth="2" />
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map(f => (
             <line key={f} x1={x + width * f} y1={beamY - 30} x2={x + width * f} y2={beamY} stroke={color} strokeWidth="1" markerEnd={`url(#arrowhead-sm-${isSelected ? 'selected' : 'normal'})`} />
          ))}
          <text x={x + width / 2} y={beamY - 40} textAnchor="middle" className={`text-xs font-bold transition-all ${isSelected ? 'fill-blue-600' : 'fill-slate-500'}`}>{load.value} kN/m</text>
        </g>
      );
    } else if (load.type === 'moment') {
      return (
         <g key={load.id} onClick={(e) => { e.stopPropagation(); onSelectLoad(load.id); }} className="cursor-pointer group">
            <path d={`M${x-15},${beamY-20} A15,15 0 1,1 ${x+10},${beamY-25}`} fill="none" stroke={isSelected ? '#d97706' : '#f59e0b'} strokeWidth="3" markerEnd={`url(#arrowhead-${isSelected ? 'selected-orange' : 'normal-orange'})`} className="transition-all group-hover:stroke-width-4"/>
            <text x={x} y={beamY - 40} textAnchor="middle" className={`text-xs font-bold transition-all ${isSelected ? 'fill-amber-600' : 'fill-slate-500'}`}>{load.value} kNm</text>
         </g>
      )
    }
  };

  return (
    <div className="w-full overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm relative">
       {/* Background Grid Hint */}
       <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ 
          backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
          backgroundSize: '20px 20px' 
       }}></div>

      <div className="overflow-x-auto p-4">
      <svg width={width} height={200} viewBox={`0 0 ${width} 200`} className="mx-auto select-none" onClick={() => onSelectLoad(null)}>
        <defs>
          <pattern id="diagonal-hatch" patternUnits="userSpaceOnUse" width="4" height="4">
            <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#cbd5e1" strokeWidth="1" />
          </pattern>
          <marker id="arrowhead-normal" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-selected" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#2563eb" />
          </marker>
          <marker id="arrowhead-sm-normal" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#ef4444" />
          </marker>
          <marker id="arrowhead-sm-selected" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
            <polygon points="0 0, 6 2, 0 4" fill="#2563eb" />
          </marker>
           <marker id="arrowhead-normal-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#f59e0b" />
          </marker>
           <marker id="arrowhead-selected-orange" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="#d97706" />
          </marker>
        </defs>

        {/* Center Line */}
        <line x1={toPx(0)} y1={beamY} x2={toPx(length)} y2={beamY} stroke="#94a3b8" strokeDasharray="4 4" strokeWidth="1" />

        {/* Beam Body */}
        <rect x={toPx(0)} y={beamY - 6} width={toPx(length) - toPx(0)} height="12" fill="#e2e8f0" stroke="#475569" strokeWidth="2" rx="2" />

        {/* Supports */}
        {type === 'simple' && (
          <>
            {renderSupport(supportA, 'A')}
            {renderSupport(supportB, 'B')}
          </>
        )}
        {type === 'cantilever-left' && renderWall(supportA, false)}
        {type === 'cantilever-right' && renderWall(length, true)}

        {/* Loads */}
        {loads.map(renderLoad)}

        {/* Ruler */}
        <line x1={toPx(0)} y1={beamY + 40} x2={toPx(length)} y2={beamY + 40} stroke="#cbd5e1" strokeWidth="1" />
        {Array.from({ length: length + 1 }).map((_, i) => (
          <g key={i}>
            <line x1={toPx(i)} y1={beamY + 38} x2={toPx(i)} y2={beamY + 42} stroke="#94a3b8" />
            <text x={toPx(i)} y={beamY + 55} textAnchor="middle" className="text-[10px] fill-slate-400 font-medium">{i}m</text>
          </g>
        ))}
      </svg>
      </div>
    </div>
  );
};