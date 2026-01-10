
import { MapObstacle } from '../types/appTypes';

export const GRID_SIZE = 20;

export interface Point {
    x: number;
    y: number;
}

/**
 * Vypočíta Manhattan vzdialenosť v metroch s A* obchádzaním prekážok.
 * 10px = 1 meter.
 */
export const calculateAStarDistance = (
    start: Point,
    end: Point,
    obstacles: MapObstacle[] = []
): number => {
    const path = findAStarPath(start, end, obstacles);
    if (path.length < 2) return (Math.abs(start.x - end.x) + Math.abs(start.y - end.y)) / 10;

    let totalDistPx = 0;
    for (let i = 0; i < path.length - 1; i++) {
        totalDistPx += Math.abs(path[i].x - path[i+1].x) + Math.abs(path[i].y - path[i+1].y);
    }
    return totalDistPx / 10;
};

/**
 * Jadro A* algoritmu optimalizované pre vykonávanie v browseri.
 */
export const findAStarPath = (
    start: Point,
    end: Point,
    obstacles: MapObstacle[] = []
): Point[] => {
    const startG = { x: Math.round(start.x / GRID_SIZE), y: Math.round(start.y / GRID_SIZE) };
    const endG = { x: Math.round(end.x / GRID_SIZE), y: Math.round(end.y / GRID_SIZE) };

    if (startG.x === endG.x && startG.y === endG.y) return [start, end];

    const isBlocked = (px: number, py: number) => {
        return obstacles.some(o => px >= o.x && px < o.x + o.w && py >= o.y && py < o.y + o.h);
    };

    interface Node { x: number; y: number; g: number; f: number; path: Point[]; }

    const openSet: Node[] = [{ 
        ...startG, g: 0, 
        f: Math.abs(startG.x - endG.x) + Math.abs(startG.y - endG.y), 
        path: [start] 
    }];
    
    const closedSet = new Set<string>();
    let steps = 0, maxSteps = 1500;

    while (openSet.length > 0 && steps < maxSteps) {
        steps++;
        openSet.sort((a, b) => a.f - b.f);
        const current = openSet.shift()!;

        if (current.x === endG.x && current.y === endG.y) return [...current.path, end];

        closedSet.add(`${current.x},${current.y}`);
        const neighbors = [{x:current.x+1,y:current.y},{x:current.x-1,y:current.y},{x:current.x,y:current.y+1},{x:current.x,y:current.y-1}];

        for (const n of neighbors) {
            if (closedSet.has(`${n.x},${n.y}`)) continue;
            const realX = n.x * GRID_SIZE, realY = n.y * GRID_SIZE;
            if (isBlocked(realX, realY)) continue;

            const g = current.g + 1;
            const h = Math.abs(n.x - endG.x) + Math.abs(n.y - endG.y);
            const newNode = { ...n, g, f: g+h, path: [...current.path, { x: realX, y: realY }] };

            const existing = openSet.find(o => o.x === n.x && o.y === n.y);
            if (!existing) openSet.push(newNode);
            else if (existing.g > g) {
                existing.g = g; existing.f = g+h; existing.path = newNode.path;
            }
        }
    }
    return [];
};
