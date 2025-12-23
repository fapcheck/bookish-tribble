import { useEffect, useRef } from "react";

interface SwipeHandlerProps {
    onSwipeRight: () => void;
    children: React.ReactNode;
}

export default function SwipeHandler({ onSwipeRight, children }: SwipeHandlerProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const startX = useRef<number | null>(null);
    const startY = useRef<number | null>(null);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const handleTouchStart = (e: TouchEvent) => {
            const touch = e.touches[0];
            // Only trigger from left edge (first 30px)
            if (touch.clientX < 30) {
                startX.current = touch.clientX;
                startY.current = touch.clientY;
            }
        };

        const handleTouchMove = (e: TouchEvent) => {
            if (startX.current === null || startY.current === null) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - startX.current;
            const deltaY = Math.abs(touch.clientY - startY.current);

            // Swipe right gesture: moved at least 80px horizontally, and not too much vertically
            if (deltaX > 80 && deltaY < 50) {
                onSwipeRight();
                startX.current = null;
                startY.current = null;
            }
        };

        const handleTouchEnd = () => {
            startX.current = null;
            startY.current = null;
        };

        el.addEventListener("touchstart", handleTouchStart, { passive: true });
        el.addEventListener("touchmove", handleTouchMove, { passive: true });
        el.addEventListener("touchend", handleTouchEnd, { passive: true });

        return () => {
            el.removeEventListener("touchstart", handleTouchStart);
            el.removeEventListener("touchmove", handleTouchMove);
            el.removeEventListener("touchend", handleTouchEnd);
        };
    }, [onSwipeRight]);

    return (
        <div ref={containerRef} className="h-full w-full">
            {children}
        </div>
    );
}
