import React from 'react';
import { MapState, MapEntity, EntityType } from '../types';

interface MapViewProps {
  mapState: MapState | null;
}

const getEntityVisuals = (entity: MapEntity | { type: 'floor' }): { component: React.ReactNode, title: string } => {
  switch (entity.type) {
    case 'player':
      return {
        component: <div className="w-3/4 h-3/4 bg-blue-500 rounded-full shadow-lg" />,
        title: (entity as MapEntity).name || 'Player'
      };
    case 'wall':
      return {
        component: <div className="w-full h-full bg-slate-600" />,
        title: 'Wall'
      };
    case 'enemy':
      return {
        component: <div className="w-3/4 h-3/4 bg-red-600 rounded-full shadow-md" />,
        title: (entity as MapEntity).name || 'Enemy'
      };
    case 'object':
      return {
        component: <div className="w-2/3 h-2/3 bg-yellow-400 rounded-full" />,
        title: (entity as MapEntity).name || 'Object'
      };
    case 'door':
      return {
        component: <div className="w-full h-full bg-amber-800" />,
        title: (entity as MapEntity).name || 'Door'
      };
    case 'floor':
    default:
      return {
        component: <div className="w-1/6 h-1/6 bg-slate-700 rounded-full" />,
        title: 'Floor'
      };
  }
};

const MapView: React.FC<MapViewProps> = ({ mapState }) => {
  if (!mapState) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500 bg-black font-signika italic">
        The mists of creation swirl... awaiting a world to be born.
      </div>
    );
  }

  const { entities, width, height } = mapState;

  // Create a map for quick lookups
  const entityMap = new Map<string, MapEntity>();
  for (const entity of entities) {
    entityMap.set(`${entity.x},${entity.y}`, entity);
  }

  // Create a grid array
  const gridCells = Array.from({ length: width * height }, (_, index) => {
    const x = index % width;
    const y = Math.floor(index / width);
    const entity = entityMap.get(`${x},${y}`);
    return { x, y, entity };
  });

  return (
    <div className="w-full h-full aspect-square max-h-full max-w-full bg-black">
        <div
            className="grid w-full h-full"
            style={{
                gridTemplateColumns: `repeat(${width}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${height}, minmax(0, 1fr))`,
            }}
            aria-label="Game Map"
        >
            {gridCells.map(({ x, y, entity }) => {
                const visual = entity ? getEntityVisuals(entity) : getEntityVisuals({ type: 'floor' });
                return (
                    <div
                        key={`${x}-${y}`}
                        className="flex items-center justify-center border-r border-b border-slate-800"
                        title={visual.title}
                        role="gridcell"
                    >
                       {visual.component}
                    </div>
                );
            })}
        </div>
    </div>
  );
};

export default MapView;