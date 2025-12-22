import { useEffect, useState } from "react";

interface ConfettiPiece {
    id: number;
    x: number;
    color: string;
    delay: number;
    rotation: number;
}

const COLORS = [
    "#f43f5e", // rose
    "#8b5cf6", // violet
    "#3b82f6", // blue
    "#10b981", // emerald
    "#f59e0b", // amber
    "#ec4899", // pink
    "#06b6d4", // cyan
];

export default function Confetti({ trigger }: { trigger: boolean }) {
    const [pieces, setPieces] = useState<ConfettiPiece[]>([]);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        if (trigger) {
            const newPieces: ConfettiPiece[] = [];
            for (let i = 0; i < 50; i++) {
                newPieces.push({
                    id: i,
                    x: Math.random() * 100,
                    color: COLORS[Math.floor(Math.random() * COLORS.length)],
                    delay: Math.random() * 0.3,
                    rotation: Math.random() * 360,
                });
            }
            setPieces(newPieces);
            setVisible(true);

            const timer = setTimeout(() => {
                setVisible(false);
                setPieces([]);
            }, 2000);

            return () => clearTimeout(timer);
        }
    }, [trigger]);

    if (!visible) return null;

    return (
        <div className="fixed inset-0 pointer-events-none z-[9999] overflow-hidden">
            {pieces.map((piece) => (
                <div
                    key={piece.id}
                    className="absolute animate-confetti-fall"
                    style={{
                        left: `${piece.x}%`,
                        top: "-20px",
                        animationDelay: `${piece.delay}s`,
                        transform: `rotate(${piece.rotation}deg)`,
                    }}
                >
                    <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: piece.color }}
                    />
                </div>
            ))}
        </div>
    );
}

// Smaller burst version for inline use
export function ConfettiBurst({ active }: { active: boolean }) {
    const [particles, setParticles] = useState<
        { id: number; angle: number; color: string }[]
    >([]);

    useEffect(() => {
        if (active) {
            const newParticles = Array.from({ length: 12 }, (_, i) => ({
                id: i,
                angle: (i / 12) * 360,
                color: COLORS[Math.floor(Math.random() * COLORS.length)],
            }));
            setParticles(newParticles);

            const timer = setTimeout(() => setParticles([]), 600);
            return () => clearTimeout(timer);
        }
    }, [active]);

    if (particles.length === 0) return null;

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute left-1/2 top-1/2 w-1.5 h-1.5 rounded-full animate-burst"
                    style={{
                        backgroundColor: p.color,
                        transform: `rotate(${p.angle}deg) translateY(-20px)`,
                    }}
                />
            ))}
        </div>
    );
}
