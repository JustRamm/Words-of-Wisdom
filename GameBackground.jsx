import React from 'react';

const GameBackground = ({ harmony = 50 }) => {
    const bgStyle = {
        background: `linear-gradient(135deg, 
            hsl(${200 + (harmony * 0.4)}, ${20 + (harmony * 0.6)}%, ${10 + (harmony * 0.4)}%) 0%, 
            hsl(${220 + (harmony * 0.4)}, ${30 + (harmony * 0.5)}%, ${15 + (harmony * 0.4)}%) 100%)`,
        transition: 'all 2s ease-in-out'
    };

    return (
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden select-none" style={bgStyle}>
            {/* Sun/Moon Glow */}
            <div
                className="absolute top-[10%] left-[15%] w-64 h-64 rounded-full blur-[100px] transition-all duration-1000"
                style={{
                    background: harmony > 50 ? 'rgba(255, 230, 100, 0.2)' : 'rgba(150, 180, 255, 0.1)',
                    transform: `scale(${1 + harmony / 100})`
                }}
            />

            {/* Animated Clouds (Simulated) */}
            {[...Array(4)].map((_, i) => (
                <div
                    key={i}
                    className="absolute bg-white/10 backdrop-blur-sm rounded-full animate-float-slow"
                    style={{
                        width: `${150 + i * 50}px`,
                        height: `${40 + i * 10}px`,
                        top: `${15 + i * 8}%`,
                        left: `${(i * 30 + 10) % 100}%`,
                        animationDelay: `${i * 2}s`,
                        opacity: 0.2 + (harmony / 200)
                    }}
                />
            ))}

            {/* Distant Mountains */}
            <svg className="absolute bottom-0 w-full h-[40%] transition-all duration-1000" viewBox="0 0 1000 400" preserveAspectRatio="none">
                <path
                    d="M0,400 L0,300 L150,150 L350,280 L550,100 L800,320 L1000,200 L1000,400 Z"
                    style={{ fill: `hsl(${220 + harmony * 0.2}, ${10 + harmony * 0.2}%, ${10 + harmony * 0.1}%)` }}
                />
                <path
                    d="M0,400 L0,350 L200,220 L450,340 L700,180 L1000,330 L1000,400 Z"
                    style={{ fill: `hsl(${220 + harmony * 0.2}, ${15 + harmony * 0.2}%, ${12 + harmony * 0.15}%)`, opacity: 0.8 }}
                />
            </svg>

            {/* Stylized Trees (Mid-ground) */}
            <div className="absolute bottom-[10%] w-full flex justify-around items-end px-12 transition-all duration-1000" style={{ opacity: 0.3 + harmony / 200 }}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} className="flex flex-col items-center">
                        <div
                            className="w-0 h-0 border-l-[15px] border-r-[15px] border-b-[40px] border-l-transparent border-r-transparent transition-colors duration-1000"
                            style={{ borderBottomColor: `hsl(${140 + harmony * 0.2}, ${20 + harmony * 0.2}%, ${15 + harmony * 0.1}%)` }}
                        />
                        <div
                            className="w-2 h-4 transition-colors duration-1000"
                            style={{ backgroundColor: `hsl(${20 + harmony * 0.1}, 20%, 10%)` }}
                        />
                    </div>
                ))}
            </div>

            {/* Ground */}
            <div
                className="absolute bottom-0 left-0 right-0 h-[15%] transition-all duration-1000"
                style={{
                    background: `linear-gradient(to bottom, 
                        hsl(${130 + harmony * 0.2}, ${15 + harmony * 0.2}%, ${8 + harmony * 0.1}%) 0%,
                        hsl(${130 + harmony * 0.2}, ${15 + harmony * 0.2}%, ${5 + harmony * 0.1}%) 100%)`
                }}
            />
        </div>
    );
};

export default GameBackground;
