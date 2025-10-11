import React from 'react';
import { MapState, MapEntity, EntityType } from '../types';
import CameraIcon from './icons/CameraIcon';
import CreatureTokenIcon from './icons/CreatureTokenIcon';

interface MapViewProps {
  mapState: MapState | null;
  onEntityClick: (entity: MapEntity, event: React.MouseEvent) => void;
  characterName?: string;
}

const getEntityVisuals = (entity: MapEntity | { type: 'floor' }, characterName?: string): { component: React.ReactNode, title: string } => {
  switch (entity.type) {
    case 'player':
      return {
        component: <CreatureTokenIcon className="w-5/6 h-5/6 text-blue-500 drop-shadow-lg" />,
        title: characterName || (entity as MapEntity).name || 'Player'
      };
    case 'wall':
      return {
        component: <div className="w-full h-full bg-slate-600" />,
        title: 'Wall'
      };
    case 'enemy':
      return {
        component: <CreatureTokenIcon className="w-5/6 h-5/6 text-red-600" />,
        title: (entity as MapEntity).name || 'Enemy'
      };
    case 'object':
      return {
        component: <div className="w-2/3 h-2/3 rounded-full" style={{ backgroundColor: (entity as MapEntity).color || '#facc15' }} />,
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

const MapView: React.FC<MapViewProps> = ({ mapState, onEntityClick, characterName }) => {
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
                const visual = entity ? getEntityVisuals(entity, characterName) : getEntityVisuals({ type: 'floor' });
                return (
                    <button
                        key={`${x}-${y}`}
                        className="relative flex items-center justify-center border-r border-b border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:z-10 disabled:cursor-default"
                        title={visual.title}
                        role="gridcell"
                        onClick={(e) => entity && onEntityClick(entity, e)}
                        disabled={!entity || entity.type === 'wall' || entity.type === 'floor'}
                    >
                       {visual.component}
                       {entity?.imageBase64 && (
                          <CameraIcon className="absolute bottom-0 right-0 w-2 h-2 text-white bg-black/50 rounded-full p-px" />
                       )}
                    </button>
                );
            })}
        </div>
    </div>
  );
};

export default MapView;