import React, { useState, useRef } from 'react';

interface ResizableThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
    initialWidth?: number | string;
    minWidth?: number;
}

export function ResizableTh({ children, initialWidth = 100, minWidth = 40, style, ...props }: ResizableThProps) {
    const [width, setWidth] = useState<number>(typeof initialWidth === 'number' ? initialWidth : 100);
    const startX = useRef(0);
    const startWidth = useRef(0);

    const onMouseDown = (e: React.MouseEvent) => {
        startX.current = e.pageX;
        startWidth.current = width;
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
        e.preventDefault();
        e.stopPropagation();
    };

    const onMouseMove = (e: MouseEvent) => {
        const newWidth = Math.max(minWidth, startWidth.current + (e.pageX - startX.current));
        setWidth(newWidth);
    };

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    };

    return (
        <th
            {...props}
            style={{
                ...style,
                width: width,
                minWidth: width,
                maxWidth: width,
                position: 'relative',
                whiteSpace: 'nowrap',
                userSelect: 'none'
            }}
        >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>
                {children}
            </div>
            <div
                onMouseDown={onMouseDown}
                style={{
                    position: 'absolute',
                    top: 0,
                    right: 0,
                    width: '10px',
                    height: '100%',
                    cursor: 'col-resize',
                    zIndex: 10,
                    backgroundColor: 'transparent'
                }}
                onMouseOver={(e) => {
                    (e.target as HTMLDivElement).style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseOut={(e) => {
                    (e.target as HTMLDivElement).style.backgroundColor = 'transparent';
                }}
            />
        </th>
    );
}
