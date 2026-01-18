import React, { useState } from 'react';
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from 'reactflow';
import { Minus } from 'lucide-react';
import './CustomEdge.css';

const CustomEdge = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
  data,
  selected,
}) => {
  const [isButtonHovered, setIsButtonHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onEdgeClick = (evt) => {
    evt.stopPropagation();
    if (data && data.onDelete) {
        data.onDelete(); 
    }
  };

  const edgeStyle = {
      ...style,
      stroke: selected || isButtonHovered ? '#60a5fa' : '#3b82f6',
      strokeWidth: selected || isButtonHovered ? 3 : 2,
      filter: selected || isButtonHovered ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.6))' : 'none',
      transition: 'all 0.2s ease',
      zIndex: selected || isButtonHovered ? 100 : 0
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
            zIndex: 1000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}
          className={`edge-button-container ${selected ? 'selected' : ''}`}
          onMouseEnter={() => setIsButtonHovered(true)}
          onMouseLeave={() => setIsButtonHovered(false)}
        >
          <button className="edge-delete-btn" onClick={onEdgeClick} title="Unlink">
            <Minus size={14} />
          </button>
        </div>
      </EdgeLabelRenderer>
    </>
  );
};

export default CustomEdge;
