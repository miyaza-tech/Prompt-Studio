'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

interface ResizeHandleProps {
  /** 'left' | 'right' = 수평 리사이즈, 'bottom' = 수직 리사이즈 */
  side: 'left' | 'right' | 'bottom';
  onResize: (delta: number) => void;
  onResizeEnd?: () => void;
}

export default function ResizeHandle({ side, onResize, onResizeEnd }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const startPos = useRef(0);
  const isVertical = side === 'bottom';

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    startPos.current = isVertical ? e.clientY : e.clientX;
    setIsDragging(true);
  }, [isVertical]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isVertical) {
        const delta = e.clientY - startPos.current;
        startPos.current = e.clientY;
        // 위로 드래그하면 커져야 하므로 부호 반전
        onResize(-delta);
      } else {
        const delta = e.clientX - startPos.current;
        startPos.current = e.clientX;
        onResize(side === 'right' ? -delta : delta);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onResizeEnd?.();
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = isVertical ? 'row-resize' : 'col-resize';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, onResize, onResizeEnd, side, isVertical]);

  if (isVertical) {
    return (
      <div
        onMouseDown={handleMouseDown}
        className={`
          relative z-10 shrink-0 h-[5px] cursor-row-resize
          group flex items-center justify-center
          transition-colors duration-150
          ${isDragging ? 'bg-primary/30' : 'hover:bg-primary/15'}
        `}
        style={{ touchAction: 'none' }}
      >
        <div
          className={`
            h-[3px] w-8 rounded-full transition-all duration-150
            ${isDragging
              ? 'bg-primary/60 w-12'
              : 'bg-transparent group-hover:bg-primary/40 group-hover:w-10'
            }
          `}
        />
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`
        relative z-10 shrink-0 w-[5px] cursor-col-resize
        group flex items-center justify-center
        transition-colors duration-150
        ${isDragging ? 'bg-primary/30' : 'hover:bg-primary/15'}
      `}
      style={{ touchAction: 'none' }}
    >
      <div
        className={`
          w-[3px] h-8 rounded-full transition-all duration-150
          ${isDragging
            ? 'bg-primary/60 h-12'
            : 'bg-transparent group-hover:bg-primary/40 group-hover:h-10'
          }
        `}
      />
    </div>
  );
}
