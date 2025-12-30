import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { CalculationResult } from '../types';

interface Props {
  data: CalculationResult[];
}

const ChartContainer = ({ title, dataKey, data, color, unit, fill }: any) => (
  <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-64 flex flex-col">
    <div className="flex justify-between items-center mb-2 px-2">
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">{unit}</span>
    </div>
    <div className="flex-1 min-h-0">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
              <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis dataKey="x" type="number" hide domain={['dataMin', 'dataMax']} />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip 
            contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
            formatter={(value: number) => [value.toFixed(2), unit]}
            labelFormatter={(label) => `Position: ${Number(label).toFixed(2)}m`}
          />
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
          <Area 
            type="monotone" 
            dataKey={dataKey} 
            stroke={color} 
            fill={`url(#gradient-${dataKey})`} 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

export const ResultsCharts: React.FC<Props> = ({ data }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <ChartContainer 
        title="Shear Force (V)" 
        dataKey="shear" 
        data={data} 
        color="#8b5cf6" 
        unit="kN" 
      />
      <ChartContainer 
        title="Bending Moment (M)" 
        dataKey="moment" 
        data={data} 
        color="#f97316" 
        unit="kNm" 
      />
      <ChartContainer 
        title="Slope (θ)" 
        dataKey="slope" 
        data={data} 
        color="#06b6d4" 
        unit="rad" 
      />
      <ChartContainer 
        title="Deflection (y)" 
        dataKey="deflection" 
        data={data} 
        color="#ec4899" 
        unit="mm" 
      />
    </div>
  );
};