
import React, { useState, useMemo } from 'react';
import { Task, UserData, MapSector, DBItem, SystemConfig, MapObstacle } from '../../types/appTypes';
import { useLanguage } from '../LanguageContext';
import { COLOR_MAP } from '../../constants/uiConstants';

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

// --- PATHFINDING UTILITIES (A*) ---
const GRID_SIZE = 20; // 2 metre

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

  // Trajektórie s rešpektovaním prekážok
  const { segments, nodes, obstacles, viewBox } = useMemo(() => {
    const pointsMap = new Map<string, Point>();
    workplaces.forEach(w => pointsMap.set(`wp_${w.value}`, { x: w.coordX || 0, y: w.coordY || 0, label: w.value, type: 'wp', id: w.id }));
    logisticsOperations.forEach(l => pointsMap.set(`log_${l.value}`, { x: l.coordX || 0, y: l.coordY || 0, label: l.value, type: 'log', id: l.id }));
    mapSectors.forEach(s => pointsMap.set(`sector_${s.id}`, { x: s.coordX || 0, y: s.coordY || 0, label: s.name, type: 'sector', id: s.id, color: s.color }));

    const allNodes = Array.from(pointsMap.values());
    // Ak nemáme žiadne body ani prekážky, vrátime defaultný viewBox
    if (allNodes.length === 0 && mapObstacles.length === 0) {
        return { segments: [], nodes: [], obstacles: [], viewBox: "0 0 1000 1000" };
    }

    // Bezpečný výpočet hraníc mapy
    const nodeXs = allNodes.length > 0 ? allNodes.map(p => p.x) : [0, 1000];
    const nodeYs = allNodes.length > 0 ? allNodes.map(p => p.y) : [0, 1000];
    const obsXs = mapObstacles.length > 0 ? mapObstacles.flatMap(o => [o.x, o.x + o.w]) : [];
    const obsYs = mapObstacles.length > 0 ? mapObstacles.flatMap(o => [o.y, o.y + o.h]) : [];

    const minX = Math.min(...nodeXs, ...obsXs) - 200;
    const minY = Math.min(...nodeYs, ...obsYs) - 200;
    const maxX = Math.max(...nodeXs, ...obsXs) + 200;
    const maxY = Math.max(...nodeYs, ...obsYs) + 200;

    // --- Pathfinding Logic (Obstacle Aware) ---
    const isBlocked = (x: number, y: number) => {
        return mapObstacles.some(o => x >= o.x && x <= o.x + o.w && y >= o.y && y <= o.y + o.h);
    };

    const findPath = (from: {x: number, y: number}, to: {x: number, y: number}) => {
        const path = [{x: from.x, y: from.y}];
        const pivot = { x: to.x, y: from.y };
        
        if (!isBlocked(pivot.x, pivot.y)) {
            path.push(pivot);
        } else {
            const pivot2 = { x: from.x, y: to.y };
            if (!isBlocked(pivot2.x, pivot2.y)) {
                path.push(pivot2);
            } else {
                path.push({ x: from.x, y: from.y - 40 });
                path.push({ x: to.x, y: from.y - 40 });
            }
        }
        
        path.push({x: to.x, y: to.y});
        return path;
    };

    const workerSegments: RouteSegment[] = [];
    const filteredByWorker = selectedWorkers.length > 0 
        ? allData.filter(t => selectedWorkers.includes(t.completedBy || '')) 
        : allData;

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
            let startNode: Point | null = null;
            let endNode: Point | null = null;

            if (task.isLogistics) {
                const op = pointsMap.get(`log_${task.workplace}`);
                startNode = pointsMap.get(`sector_${task.sourceSectorId}`) || op || null;
                endNode = pointsMap.get(`sector_${task.targetSectorId}`) || op || null;
            } else {
                startNode = pointsMap.get(`sector_${task.pickedFromSectorId}`) || null;
                endNode = pointsMap.get(`wp_${task.workplace}`) || null;
            }

            if (startNode && endNode) {
                if (prevEnd) {
                    workerSegments.push({ path: findPath(prevEnd, startNode), worker, isTransit: true, taskType: task.isLogistics ? 'log' : 'prod' });
                }
                workerSegments.push({ path: findPath(startNode, endNode), worker, isTransit: false, taskType: task.isLogistics ? 'log' : 'prod' });
                prevEnd = endNode;
            }
        });
    });

    return { 
        segments: workerSegments, 
        nodes: allNodes, 
        obstacles: mapObstacles,
        viewBox: `${minX} ${minY} ${maxX - minX} ${maxY - minY}` 
    };
  }, [allData, selectedWorkers, workplaces, logisticsOperations, mapSectors, mapObstacles]);

  const generatePathData = (path: {x: number, y: number}[]) => {
      if (path.length === 0) return "";
      return `M ${path[0].x} ${path[0].y} ` + path.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
  };

  const toggleWorker = (id: string) => {
      setSelectedWorkers(prev => prev.includes(id) ? prev.filter(w => w !== id) : [...prev, id]);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 animate-fade-in px-2 md:px-0">
        
        {/* CONTROL PANEL */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="md:col-span-1 space-y-4">
                    <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest border-b border-amber-900/30 pb-2">Analytické obdobie</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 transition-colors" />
                        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-amber-500 transition-colors" />
                    </div>
                    <button onClick={handleLoadMap} disabled={isLoading} className="w-full h-12 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl uppercase text-xs tracking-widest shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 border-2 border-amber-500 disabled:opacity-50">
                        {isLoading ? '⏳ ...' : '🔄 ' + t('map_load_btn')}
                    </button>
                </div>

                <div className="md:col-span-2 space-y-4 border-l border-slate-800 pl-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">{t('map_filter_workers')}</h3>
                    <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                        {(users || []).map(u => (
                            <button key={u.username} onClick={() => toggleWorker(u.username)} className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all ${selectedWorkers.includes(u.username) ? 'bg-teal-500 border-teal-400 text-white shadow-[0_0_10px_rgba(20,184,166,0.3)]' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'}`}>
                                {u.nickname || u.username}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="md:col-span-1 space-y-4 border-l border-slate-800 pl-6">
                    <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest border-b border-slate-800 pb-2">Metrika Mapy</h3>
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase">Mierka:</span>
                            <span className="text-[10px] font-black text-teal-400">10 PX = 1 M</span>
                        </div>
                        <div className="flex items-center gap-2">
                             <div className="h-1 w-[50px] bg-slate-700 rounded-full relative">
                                <div className="absolute inset-y-0 left-0 w-px bg-slate-500"></div>
                                <div className="absolute inset-y-0 right-0 w-px bg-slate-500"></div>
                             </div>
                             <span className="text-[9px] font-mono text-slate-500">5 metrov</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* MAP VISUALIZATION AREA */}
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl shadow-2xl overflow-hidden relative min-h-[650px] flex flex-col group">
            {isLoading && (
                <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-amber-500 font-black animate-pulse uppercase tracking-[0.4em] text-lg">{t('map_loading')}</p>
                </div>
            )}

            <div className="flex-grow relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-900 to-slate-950">
                <svg viewBox={viewBox} className="w-full h-full min-h-[650px]" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="grid5m" width="50" height="50" patternUnits="userSpaceOnUse"><path d="M 50 0 L 0 0 0 50" fill="none" stroke="white" strokeWidth="1" strokeOpacity="0.05" /></pattern>
                        <pattern id="grid1m" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" strokeOpacity="0.02" /></pattern>
                        <pattern id="hatch" patternUnits="userSpaceOnUse" width="10" height="10"><path d="M-1,1 l2,-2 M0,10 l10,-10 M9,11 l2,-2" stroke="white" strokeWidth="1" strokeOpacity="0.1" /></pattern>
                        <filter id="glow-teal"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                        <filter id="glow-sky"><feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
                    </defs>
                    
                    <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid1m)" />
                    <rect width="10000" height="10000" x="-5000" y="-5000" fill="url(#grid5m)" />

                    {/* OBSTACLES (Layer 0) */}
                    {obstacles.map((o, idx) => (
                        <g key={o.id || idx}>
                            <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="#1e293b" stroke="#334155" strokeWidth="2" rx="4" />
                            <rect x={o.x} y={o.y} width={o.w} height={o.h} fill="url(#hatch)" rx="4" />
                        </g>
                    ))}

                    {/* ROUTES - Transit (Layer 1) */}
                    {segments.filter(s => s.isTransit).map((s, i) => (
                        <path key={`transit-${i}`} d={generatePathData(s.path)} fill="none" stroke="#475569" strokeWidth="1.2" strokeDasharray="5 5" strokeOpacity="0.5" />
                    ))}

                    {/* ROUTES - Work (Layer 2) */}
                    {segments.filter(s => !s.isTransit).map((s, i) => (
                        <path key={`ride-${i}`} d={generatePathData(s.path)} fill="none" stroke={s.taskType === 'prod' ? '#14b8a6' : '#0ea5e9'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.8" filter={s.taskType === 'prod' ? 'url(#glow-teal)' : 'url(#glow-sky)'} className="hover:stroke-white hover:strokeOpacity-100 transition-all" />
                    ))}

                    {/* NODES - Workplaces & Sectors (Layer 3) */}
                    {nodes.map(node => {
                        const isSector = node.type === 'sector';
                        const colorValue = isSector ? (COLOR_MAP[node.color as keyof typeof COLOR_MAP]?.replace('bg-', '') || 'pink-500') : 'blue-500';
                        return (
                            <g key={node.id} transform={`translate(${node.x}, ${node.y})`} className="group/node">
                                {isSector ? (
                                    <rect x="-12" y="-12" width="24" height="24" rx="6" fill="currentColor" className={`text-${colorValue} opacity-20 border-2 border-current group-hover/node:opacity-40 transition-opacity`} />
                                ) : (
                                    <circle r="9" fill="#0f172a" stroke={node.type === 'wp' ? '#3b82f6' : '#0ea5e9'} strokeWidth="2.5" className="group-hover/node:stroke-white transition-colors" />
                                )}
                                <text y={isSector ? -28 : -22} textAnchor="middle" fill="white" className="text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/node:opacity-100 transition-opacity pointer-events-none drop-shadow-md">{node.label}</text>
                            </g>
                        );
                    })}
                </svg>

                <div className="absolute bottom-6 right-6 bg-slate-900/60 backdrop-blur-md border border-slate-700 p-3 rounded-xl pointer-events-none shadow-2xl">
                     <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center gap-0 w-[100px] h-3 border-x border-slate-400 relative">
                            <div className="absolute top-1/2 left-0 right-0 h-px bg-slate-400 -translate-y-1/2"></div>
                        </div>
                        <span className="text-[10px] font-black text-white uppercase tracking-widest">10 METROV</span>
                     </div>
                </div>
            </div>
        </div>
    </div>
  );
};

export default MapVisualizationTab;
