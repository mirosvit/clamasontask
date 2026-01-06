import React, { useState, useMemo } from 'react';
import { Task, UserData, MapSector, DBItem, SystemConfig, MapObstacle } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import { COLOR_MAP } from '../../constants/uiConstants';
import { findAStarPath, GRID_SIZE } from '../../utils/pathfinding';

interface MapVisualizationTabProps {
  tasks: Task[];
  draftTasks: Task[];
  fetchSanons: () => Promise<any[]>;
  users: UserData[];
  mapSectors: MapSector[];
  workplaces: DBItem[];
  logisticsOperations: DBItem[];
  mapObstacles: MapObstacle[];
  systemConfig: SystemConfig;
  resolveName: (username?: string | null) => string;
}

interface Point { x: number; y: number; label: string; type: 'wp' | 'sector' | 'log'; id: string; color?: string }
interface RouteSegment { path: {x: number, y: number}[]; worker: string; isTransit: boolean; taskType: 'prod' | 'log' }

interface HeatNode { x: number; y: number; freq: number; intensity: number }

interface MapData {
    segments: RouteSegment[];
    nodes: Point[];
    obstacles: MapObstacle[];
    viewBox: string;
    bottlenecks: { x: number, y: number, freq: number }[];
    heatNodes: HeatNode[];
}

const MapVisualizationTab: React.FC<MapVisualizationTabProps> = ({
  tasks, draftTasks, fetchSanons, users, mapSectors, workplaces, logisticsOperations, mapObstacles = [], systemConfig, resolveName
}) => {
  const { t, language } = useLanguage();
  
  const [dateFrom, setDateFrom] = useState(new Date().toISOString().split('T')[0]);
  const [dateTo, setDateTo] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([]);
  const [allData, setAllData] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoadMap = async () => {
    setIsLoading(true);
    try {
        const sanons = await fetchSanons();
        const combined: Task[] = [...tasks, ...draftTasks];
        sanons.forEach(s => { if (s.tasks) combined.push(...s.tasks); });
        const startTs = new Date(dateFrom).setHours(0,0,0,0);
        const endTs = new Date(dateTo).setHours(23,59,59,999);
        const filtered = combined.filter(t => {
            const ts = t.completedAt || t.createdAt || 0;
            return ts >= startTs && ts <= endTs && t.isDone;
        });
        const uniqueMap = new Map();
        filtered.forEach(t => uniqueMap.set(t.id, t));
        setAllData(Array.from(uniqueMap.values()));
    } catch (e) { console.error(e); }
    finally { setIsLoading(false); }
  };

  const { segments, nodes, obstacles, viewBox, bottlenecks, heatNodes } = useMemo((): MapData => {
    const pointsMap = new Map<string, Point>();
    workplaces.forEach(w => pointsMap.set(`wp_${w.value}`, { x: w.coordX || 0, y: w.coordY || 0, label: w.value, type: 'wp', id: w.id }));
    logisticsOperations.forEach(l => pointsMap.set(`log_${l.value}`, { x: l.coordX || 0, y: l.coordY || 0, label: l.value, type: 'log', id: l.id }));
    mapSectors.forEach(s => pointsMap.set(`sector_${s.id}`, { x: s.coordX || 0, y: s.coordY || 0, label: s.name, type: 'sector', id: s.id, color: s.color }));

    const allNodes = Array.from(pointsMap.values());
    if (allNodes.length === 0 && mapObstacles.length === 0) {
        return { segments: [], nodes: [], obstacles: [], viewBox: "0 0 1000 1000", bottlenecks: [], heatNodes: [] };
    }

    const nodeXs = allNodes.length > 0 ? allNodes.map(p => p.x) : [0, 1000];
    const nodeYs = allNodes.length > 0 ? allNodes.map(p => p.y) : [0, 1000];
    const minX = Math.min(...nodeXs, ...mapObstacles.flatMap(o => [o.x, o.x + o.w])) - 100;
    const minY = Math.min(...nodeYs, ...mapObstacles.flatMap(o => [o.y, o.y + o.h])) - 100;
    const maxX = Math.max(...nodeXs, ...mapObstacles.flatMap(o => [o.x, o.x + o.w])) + 100;
    const maxY = Math.max(...nodeYs, ...mapObstacles.flatMap(o => [o.y, o.y + o.h])) + 100;

    const workerSegments: RouteSegment[] = [];
    const heatmap: Record<string, number> = {};

    const filteredByWorker = selectedWorkers.length > 0 ? allData.filter(t => selectedWorkers.includes(t.completedBy || '')) : allData;
    const grouped = new Map<string, Task[]>();
    filteredByWorker.forEach(t => {
        const worker = t.completedBy || 'Unknown';
        if (!grouped.has(worker)) grouped.set(worker, []);
        grouped.get(worker)!.push(t);
    });

    grouped.forEach((workerTasks, worker) => {
        const sorted = [...workerTasks].sort((a,b) => (a.completedAt || 0) - (b.completedAt || 0));
        let prevEnd: Point | null = null;
        sorted.forEach(task => {
            let startPoint: Point | null = null;
            let endPoint: Point | null = null;
            if (task.isLogistics) {
                const op = pointsMap.get(`log_${task.workplace}`);
                startPoint = pointsMap.get(`sector_${task.sourceSectorId}`) || op || null;
                endPoint = pointsMap.get(`sector_${task.targetSectorId}`) || op || null;
            } else {
                startPoint = pointsMap.get(`sector_${task.pickedFromSectorId}`) || null;
                endPoint = pointsMap.get(`wp_${task.workplace}`) || null;
            }
            if (startPoint && endPoint) {
                if (prevEnd) {
                    const transitPath = findAStarPath(prevEnd, startPoint, mapObstacles);
                    if (transitPath.length > 0) {
                        workerSegments.push({ path: transitPath, worker, isTransit: true, taskType: task.isLogistics ? 'log' : 'prod' });
                        transitPath.forEach(pt => {
                            const key = `${Math.round(pt.x/GRID_SIZE)*GRID_SIZE},${Math.round(pt.y/GRID_SIZE)*GRID_SIZE}`;
                            heatmap[key] = (heatmap[key] || 0) + 1;
                        });
                    }
                }
                const workPath = findAStarPath(startPoint, endPoint, mapObstacles);
                if (workPath.length > 0) {
                    workerSegments.push({ path: workPath, worker, isTransit: false, taskType: task.isLogistics ? 'log' : 'prod' });
                    workPath.forEach(pt => {
                        const key = `${Math.round(pt.x/GRID_SIZE)*GRID_SIZE},${Math.round(pt.y/GRID_SIZE)*GRID_SIZE}`;
                        heatmap[key] = (heatmap[key] || 0) + 1;
                    });
                }
                prevEnd = endPoint;
            }
        });
    });

    let maxFreq = 0;
    Object.values(heatmap).forEach(f => { if(f > maxFreq) maxFreq = f; });

    const finalHeatNodes: HeatNode[] = [];
    const finalBottlenecks: { x: number, y: number, freq: number }[] = [];

    Object.entries(heatmap).forEach(([key, freq]) => {
        const [x, y] = key.split(',').map(Number);
        const intensity = freq / maxFreq;
        
        if (intensity > 0.1) {
            finalHeatNodes.push({ x, y, freq, intensity });
        }

        if (intensity > 0.8) {
            finalBottlenecks.push({ x, y, freq });
        }
    });

    return { 
        segments: workerSegments, 
        nodes: allNodes, 
        obstacles: mapObstacles, 
        viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}`, 
        bottlenecks: finalBottlenecks,
        heatNodes: finalHeatNodes
    };
  }, [allData, selectedWorkers, workplaces, logisticsOperations, mapSectors, mapObstacles]);

  const generatePathData = (path: {x: number, y: number}[]) => {
      if (path.length === 0) return "";
      const simplified = [path[0]];
      for (let i = 1; i < path.length - 1; i++) {
          const prev = path[i-1], curr = path[i], next = path[i+1];
          if (!((prev.x === curr.x && curr.x === next.x) || (prev.y === curr.y && curr.y === next.y))) simplified.push(curr);
      }
      if (path.length > 1) simplified.push(path[path.length - 1]);
      return `M ${simplified[0].x} ${simplified[0].y} ` + simplified.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest border-b border-amber-900/30 pb-2">Analytické obdobie</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-all" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-emerald-500 transition-all" />
                    </div>
                    <button onClick={handleLoadMap} disabled={isLoading} className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-emerald-400 disabled:opacity-50">
                        {isLoading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : '🔄 ' + t('map_load_btn')}
                    </button>
                </div>
                <div className="md:col-span-2 space-y-4 border-l border-slate-800 pl-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('map_filter_workers')}</h3>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {users.map(u => (
                            <button key={u.username} onClick={() => setSelectedWorkers(prev => prev.includes(u.username) ? prev.filter(w => w !== u.username) : [...prev, u.username])} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedWorkers.includes(u.username) ? 'bg-teal-500 border-teal-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>{u.nickname || u.username}</button>
                        ))}
                    </div>
                </div>
                <div className="md:col-span-1 space-y-4 border-l border-slate-800 pl-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Legenda</h3>
                    <div className="flex flex-col gap-2 items-start text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-teal-500 rounded"></div> {t('map_legend_prod')}</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-1 bg-sky-500 rounded"></div> {t('map_legend_log')}</div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-600/20 border border-red-500 rounded-full"></div> {t('map_bottleneck_label')}</div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative min-h-[650px] flex flex-col group">
            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-emerald-500 font-black animate-pulse uppercase tracking-[0.4em] text-lg">{t('map_loading')}</p>
                </div>
            )}
            <div className="flex-grow relative overflow-hidden bg-slate-950">
                <svg viewBox={viewBox} className="w-full h-full min-h-[650px]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid5m" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.05" /></pattern>
                        <pattern id="grid1m" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.02" /></pattern>
                        <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10"><path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="white" strokeWidth="1" strokeOpacity="0.1" /></pattern>
                        
                        <filter id="blurHeat" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur in="SourceGraphic" stdDeviation="6" />
                        </filter>
                    </defs>
                    
                    <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid1m)" />
                    <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid5m)" />

                    {/* PREKÁŽKY */}
                    {obstacles.map((o, idx) => (
                        <g key={o.id || idx}>
                            <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#1e293b" stroke="#334155" strokeWidth="2" rx="4" />
                            <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="url(#hatch)" rx="4" />
                            {o.w > 40 && <text x={o.x + o.w/2} y={o.y + o.h/2} textAnchor="middle" dominantBaseline="middle" className="fill-slate-600 text-[10px] font-black uppercase tracking-widest pointer-events-none">{o.name}</text>}
                        </g>
                    ))}

                    {/* HEATMAPA */}
                    <g filter="url(#blurHeat)">
                        {heatNodes.map((hn, i) => (
                            <circle 
                                key={`heat-${i}`} 
                                cx={hn.x} 
                                cy={hn.y} 
                                r={18} 
                                fill={hn.intensity > 0.7 ? '#ef4444' : hn.intensity > 0.4 ? '#f59e0b' : '#10b981'} 
                                opacity={hn.intensity * 0.35} 
                            />
                        ))}
                    </g>

                    {/* TRASY */}
                    {segments.map((s, i) => (
                        <path 
                            key={`${s.isTransit ? 'tr' : 'ride'}-${i}`} 
                            d={generatePathData(s.path)} 
                            fill="none" 
                            stroke={s.isTransit ? '#475569' : (s.taskType === 'prod' ? '#14b8a6' : '#0ea5e9')} 
                            strokeWidth={s.isTransit ? 1 : 2.5} 
                            strokeDasharray={s.isTransit ? '4 4' : 'none'} 
                            strokeOpacity={s.isTransit ? 0.3 : 0.6} 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        />
                    ))}
                    
                    {/* BOTTLENECKY */}
                    {bottlenecks.map((bn, i) => (
                        <g key={`bn-${i}`} transform={`translate(${bn.x}, ${bn.y})`}>
                            <circle r="30" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 2" className="animate-spin" style={{ animationDuration: '4s' }} />
                            <circle r="15" fill="#ef4444" opacity="0.1" />
                        </g>
                    ))}

                    {/* PRACOVISKÁ A SEKTORY - VYLEPŠENÝ HOVER */}
                    {nodes.map(node => {
                        const isSector = node.type === 'sector';
                        const colorValue = isSector ? (COLOR_MAP[node.color as keyof typeof COLOR_MAP]?.replace('bg-', '') || 'pink-500') : 'blue-500';
                        return (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="group/node">
                                {isSector ? (
                                    <rect x="-12" y="-12" width="24" height="24" rx="6" fill="currentColor" className={`text-${colorValue} opacity-20 border-2 border-current group-hover/node:opacity-60 group-hover/node:scale-125 transition-all duration-200`} />
                                ) : (
                                    <circle r="8" fill="#0f172a" stroke={node.type === 'wp' ? '#3b82f6' : '#0ea5e9'} strokeWidth="2.5" className="group-hover/node:scale-150 transition-all duration-200" />
                                )}
                                
                                {/* ROZŠÍRENÝ ŠTÍTOK SÚRADNÍC A NÁZVU */}
                                <g className="opacity-0 group-hover/node:opacity-100 transition-opacity duration-200 pointer-events-none">
                                    {/* Pozadie pre text pre lepšiu čitateľnosť */}
                                    <rect 
                                        x="-60" 
                                        y={isSector ? -55 : -45} 
                                        width="120" 
                                        height="35" 
                                        rx="8" 
                                        fill="#0f172a" 
                                        className="shadow-2xl border border-slate-700" 
                                    />
                                    <text 
                                        y={isSector ? -40 : -30} 
                                        textAnchor="middle" 
                                        className="fill-white text-sm font-black uppercase tracking-tight"
                                    >
                                        {node.label}
                                    </text>
                                    <text 
                                        y={isSector ? -28 : -18} 
                                        textAnchor="middle" 
                                        className="fill-teal-500 text-[9px] font-mono font-bold tracking-widest"
                                    >
                                        [{node.x}, {node.y}]
                                    </text>
                                </g>
                            </g>
                        );
                    })}
                </svg>

                {/* SCALE */}
                <div className="absolute bottom-6 left-6 bg-slate-900/60 backdrop-blur-md border border-slate-700 p-4 rounded-2xl pointer-events-none shadow-2xl">
                     <div className="flex flex-col items-center gap-2">
                        <div className="w-[100px] h-3 border-x-2 border-slate-400 relative"><div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-400 -translate-y-1/2"></div></div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">{t('map_scale_label')}</span>
                     </div>
                </div>

                {/* INFO PANEL */}
                {allData.length > 0 && (
                    <div className="absolute top-6 right-6 bg-slate-900/80 backdrop-blur-md border border-slate-700 p-5 rounded-2xl shadow-2xl pointer-events-none">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Spracované dáta</p>
                        <div className="space-y-2">
                            <div className="flex justify-between items-center gap-6">
                                <span className="text-xs font-bold text-slate-300">Hotové úlohy:</span>
                                <span className="text-sm font-black text-white font-mono">{allData.length}</span>
                            </div>
                            <div className="flex justify-between items-center gap-6">
                                <span className="text-xs font-bold text-slate-300">Aktívni vodiči:</span>
                                <span className="text-sm font-black text-emerald-400 font-mono">{new Set(allData.map(t=>t.completedBy)).size}</span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};

export default MapVisualizationTab;