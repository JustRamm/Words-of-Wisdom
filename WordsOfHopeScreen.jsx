import React, { useState, useEffect, useRef } from 'react';
import { TERMINOLOGY_DATA } from './terminologyData';

const WordsOfHopeScreen = ({ audioManager, onExit, isPaused = false, playerGender = 'guy' }) => {
    // Game Flow States
    const [gameState, setGameState] = useState('INTRO'); // INTRO, TUTORIAL, PLAYING, RESULTS, GAME_OVER, TRANSITIONING
    const [score, setScore] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [harmony, setHarmony] = useState(50); // 0 (Gloomy) to 100 (Radiant)
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState(null); // Side panel data
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [stigmaAlert, setStigmaAlert] = useState(null); // Left side alert data
    const [isAlertVisible, setIsAlertVisible] = useState(false);

    // New Enhanced Features
    const [streak, setStreak] = useState(0); // Consecutive correct catches
    const [maxStreak, setMaxStreak] = useState(0); // Best streak this session
    const [explanationMode, setExplanationMode] = useState(false); // Toggle for showing explanations
    const [wordHistory, setWordHistory] = useState([]); // Track all word pairs encountered
    const [baseSpeed, setBaseSpeed] = useState(0.05); // Progressive difficulty - increases with score
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); // Glossary panel toggle

    // Refs for Game Loop (Prevents stale closures)
    const scoreRef = useRef(0);
    const currentIndexRef = useRef(0);
    const mistakesRef = useRef(0);
    const sidebarTimerRef = useRef(null);
    const alertTimerRef = useRef(null);
    const spawnCooldownRef = useRef(0);
    const isProcessingSetRef = useRef(false);
    const hasInteractionRef = useRef(false);
    const requestRef = useRef();

    // Physics State in Ref for synchronous updates
    const fallingItemsRef = useRef([]);

    // Player Position Ref
    const playerRef = useRef(50);
    const [playerX, setPlayerX] = useState(50);
    const gameContainerRef = useRef(null);
    const [fallingItems, setFallingItems] = useState([]);

    // --- Core Game Logic ---

    // Local copy of shuffled questions
    const [shuffledQuestions, setShuffledQuestions] = useState([]);

    useEffect(() => {
        // Initial shuffle
        setShuffledQuestions([...TERMINOLOGY_DATA.questions].sort(() => Math.random() - 0.5));

        // SPLASH SCREEN AUTO-TRANSITION
        if (gameState === 'INTRO') {
            const timer = setTimeout(() => {
                setGameState('TUTORIAL');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    const startGame = () => {
        // Shuffle again for a fresh start each time
        const reshuffled = [...TERMINOLOGY_DATA.questions].sort(() => Math.random() - 0.5);
        setShuffledQuestions(reshuffled);

        setGameState('PLAYING');
        setHarmony(50);
        setScore(0);
        scoreRef.current = 0;
        setMistakes(0);
        mistakesRef.current = 0;
        setCurrentIndex(0);
        currentIndexRef.current = 0;
        setFallingItems([]);
        setExplanation(null);
        setIsSidebarVisible(false);
        setStigmaAlert(null);
        setIsAlertVisible(false);
        isProcessingSetRef.current = false;
        hasInteractionRef.current = false;
        spawnCooldownRef.current = 6000; // Initial delay

        // Reset new enhanced features
        setStreak(0);
        setWordHistory([]);
        setBaseSpeed(0.05); // Start at base difficulty
        setIsHistoryOpen(false);

        audioManager.playPop();
        if (audioManager) audioManager.startAmbient('park');
    };

    // Sidebar auto-hide logic
    useEffect(() => {
        if (explanation) {
            setIsSidebarVisible(true);
            if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current);
            sidebarTimerRef.current = setTimeout(() => {
                setIsSidebarVisible(false);
            }, 6000);
        }
        return () => { if (sidebarTimerRef.current) clearTimeout(sidebarTimerRef.current); };
    }, [explanation]);

    // Stigma Alert auto-hide logic
    useEffect(() => {
        if (stigmaAlert) {
            setIsAlertVisible(true);
            if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
            alertTimerRef.current = setTimeout(() => {
                setIsAlertVisible(false);
            }, 5000);
        }
        return () => { if (alertTimerRef.current) clearTimeout(alertTimerRef.current); };
    }, [stigmaAlert]);

    // Handle Mouse/Touch Movement
    const handlePointerMove = (e) => {
        if (gameState !== 'PLAYING' || isPaused || !gameContainerRef.current) return;

        // Robust coordinate extraction for both Pointer and Touch events
        let clientX;
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
        } else {
            clientX = e.clientX;
        }

        if (clientX === undefined || clientX === null) return;

        const rect = gameContainerRef.current.getBoundingClientRect();
        const x = ((clientX - rect.left) / rect.width) * 100;
        const clampedX = Math.max(5, Math.min(95, x));

        setPlayerX(clampedX);
        playerRef.current = clampedX;
    };

    // The Game Loop
    const update = () => {
        if (gameState !== 'PLAYING' || isPaused) {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        // 1. Move & Process Items
        const currentItems = fallingItemsRef.current;
        const nextItems = [];
        let collisionOccurred = false;
        const handledQuestionIds = new Set();

        for (const item of currentItems) {
            // If we already handled this question in this frame (collision or miss), skip
            if (handledQuestionIds.has(item.questionId)) continue;

            // Apply gravity/speed
            const newItem = { ...item, y: item.y + item.speed };

            // Collision Check
            const distanceX = Math.abs(newItem.x - playerRef.current);
            const isYAligned = newItem.y > 75 && newItem.y < 95;

            if (isYAligned && distanceX < 15 && !collisionOccurred) {
                collisionOccurred = true;
                processCollision(newItem);
                handledQuestionIds.add(item.questionId);
                continue; // Item correctly processed, don't add to nextItems
            }

            // Off-screen Check (Missed)
            if (newItem.y >= 105) {
                if (item.isCorrect) {
                    // Only the 'correct' item triggers a mistake if missed
                    applyMistake();
                }
                handledQuestionIds.add(item.questionId);
                continue; // Item fell off, don't add to nextItems
            }

            nextItems.push(newItem);
        }

        // Filter out any other items belonging to handled questions (e.g., the other half of the pair)
        fallingItemsRef.current = nextItems.filter(item => !handledQuestionIds.has(item.questionId));
        setFallingItems([...fallingItemsRef.current]);

        // 2. Spawning Logic (Stream-based)
        if (gameState === 'PLAYING' && currentIndexRef.current < shuffledQuestions.length) {
            spawnCooldownRef.current -= 16;
            if (spawnCooldownRef.current <= 0) {
                spawnSet();
            }
        } else if (gameState === 'PLAYING' && currentIndexRef.current >= shuffledQuestions.length && fallingItemsRef.current.length === 0) {
            // Handle End of Game when all items are gone
            checkFinalOutcome();
        }

        requestRef.current = requestAnimationFrame(update);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    const spawnSet = () => {
        if (currentIndexRef.current >= shuffledQuestions.length) return;

        const q = shuffledQuestions[currentIndexRef.current];
        currentIndexRef.current += 1;
        setCurrentIndex(currentIndexRef.current);

        const items = [
            {
                id: `correct-${q.id}-${Date.now()}`,
                x: 25,
                y: -15,
                speed: baseSpeed,
                text: q.correct,
                isCorrect: true,
                questionId: q.id
            },
            {
                id: `stigma-${q.id}-${Date.now()}`,
                x: 75,
                y: -15,
                speed: baseSpeed,
                text: q.stigma,
                isCorrect: false,
                questionId: q.id
            }
        ];

        if (Math.random() > 0.5) {
            items[0].x = 75;
            items[1].x = 25;
        }

        fallingItemsRef.current = [...fallingItemsRef.current, ...items];
        setFallingItems([...fallingItemsRef.current]);

        // Cooldown between sets - User requested 1-2 seconds after appearance
        spawnCooldownRef.current = 10000;
    };

    const processCollision = (item) => {
        const q = shuffledQuestions.find(sq => sq.id === item.questionId);
        if (!q) return;

        // Add to word history (avoid duplicates)
        setWordHistory(prev => {
            const exists = prev.find(w => w.id === q.id);
            if (!exists) {
                return [...prev, { ...q, timestamp: Date.now(), wasCorrect: item.isCorrect }];
            }
            return prev;
        });

        if (item.isCorrect) {
            setScore(s => s + 1);
            scoreRef.current += 1;
            setHarmony(h => Math.min(100, h + 15));

            // Update streak
            setStreak(prev => {
                const newStreak = prev + 1;
                setMaxStreak(max => Math.max(max, newStreak));
                return newStreak;
            });

            // Progressive difficulty - increase speed slightly with each correct catch
            setBaseSpeed(prev => Math.min(0.12, prev + 0.01)); // Cap at 0.12 for playability

            audioManager.playDing();
            audioManager.playCoachTip();
            setExplanation({
                correct: q.correct,
                why: q.why,
                stigma: q.stigma
            });
        } else {
            setHarmony(h => Math.max(0, h - 25));

            // Break streak on mistake
            setStreak(0);

            audioManager.playSad();
            audioManager.playCoachTip();
            setStigmaAlert({
                stigma: q.stigma,
                correct: q.correct,
                why: q.why
            });
            applyMistake();
        }

        // Win state check
        if (scoreRef.current >= 4) {
            triggerEndGame('RESULTS');
        }
    };

    const checkFinalOutcome = () => {
        if (gameState !== 'PLAYING') return;
        setGameState('TRANSITIONING');
        setTimeout(() => {
            if (scoreRef.current >= 4) {
                setGameState('RESULTS');
            } else {
                setGameState('GAME_OVER');
            }
            audioManager.stopMusic();
        }, 1000);
    };

    const triggerEndGame = (finalState) => {
        setGameState('TRANSITIONING');
        fallingItemsRef.current = [];
        setFallingItems([]);
        isProcessingSetRef.current = false;

        setTimeout(() => {
            setGameState(finalState);
            audioManager.stopMusic();
        }, 1500);
    };

    const applyMistake = () => {
        setMistakes(m => {
            const newM = m + 1;
            mistakesRef.current = newM;
            if (newM >= 3) {
                triggerEndGame('GAME_OVER');
            }
            return newM;
        });
    };

    // Simplified endGame trigger handled in update loop and processCollision

    const bgStyle = {
        background: `linear-gradient(135deg, 
            hsl(${200 + (harmony * 0.4)}, ${20 + (harmony * 0.6)}%, ${10 + (harmony * 0.4)}%) 0%, 
            hsl(${220 + (harmony * 0.4)}, ${30 + (harmony * 0.5)}%, ${15 + (harmony * 0.4)}%) 100%)`,
        transition: 'all 2s ease-in-out'
    };

    return (
        <div
            ref={gameContainerRef}
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden font-sans select-none touch-none words-of-hope-container"
            style={bgStyle}
            onPointerDown={handlePointerMove}
            onPointerMove={handlePointerMove}
            onTouchStart={handlePointerMove}
            onTouchMove={handlePointerMove}
        >
            {/* ILLUSTRATIVE SCENERY BACKGROUND */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
                {/* Sun/Moon Glow */}
                <div
                    className="absolute top-[10%] left-[15%] w-64 h-64 rounded-full blur-[100px] transition-all duration-1000"
                    style={{
                        background: harmony > 50 ? 'rgba(255, 230, 100, 0.2)' : 'rgba(150, 180, 255, 0.1)',
                        transform: `scale(${1 + harmony / 100})`
                    }}
                />

                {/* Animated Clouds */}
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

            {/* Header */}
            <div className="absolute top-8 left-0 right-0 px-8 flex justify-between items-center z-50 words-of-hope-hdr">
                <div className="flex flex-col words-of-hope-hdr-title">
                    <h1 className="text-white font-black uppercase tracking-[0.3em] text-[10px] md:text-lg drop-shadow-lg">
                        {TERMINOLOGY_DATA.title}
                    </h1>
                    <div className="h-0.5 w-full bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-1" />
                </div>

                <div className="flex items-center gap-4 words-of-hope-hdr-actions">
                    {/* Streak Counter */}
                    {gameState === 'PLAYING' && (
                        <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-xl">
                            <span className="text-[8px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">🔥 Streak</span>
                            <span className="text-white font-black text-2xl leading-none">{streak}</span>
                            {maxStreak > 0 && <span className="text-[7px] text-white/40 mt-0.5">Best: {maxStreak}</span>}
                        </div>
                    )}

                    <div className="flex flex-col items-end">
                        <span className="text-[8px] font-black text-teal-400 uppercase tracking-widest leading-none mb-1">Target: 4 Seeds</span>
                        <span className="text-white font-black text-xl leading-none">{score}<span className="text-white/30 text-sm font-medium ml-1">/ 4</span></span>
                    </div>

                    {/* Explanation Mode Toggle */}
                    {gameState === 'PLAYING' && (
                        <button
                            onClick={() => setExplanationMode(!explanationMode)}
                            className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 border ${explanationMode
                                ? 'bg-teal-500 border-teal-400 text-white'
                                : 'bg-white/10 border-white/20 text-white/70 hover:bg-white/20'
                                }`}
                            title="Show explanations on words"
                        >
                            💡 Tips
                        </button>
                    )}

                    {/* Word History Button */}
                    {gameState === 'PLAYING' && wordHistory.length > 0 && (
                        <button
                            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                            className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                        >
                            📚 History ({wordHistory.length})
                        </button>
                    )}

                    <button
                        onClick={onExit}
                        className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                    >
                        Exit Path
                    </button>
                </div>
            </div>

            {gameState === 'INTRO' && (
                <div className="relative z-10 max-w-2xl w-full p-8 text-center animate-fade-in flex flex-col items-center words-of-hope-hero">
                    <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[2.5rem] mb-12 flex items-center justify-center border border-white/20 shadow-2xl rotate-3">
                        <img src="/stickman_assets/hope_stickman.svg" alt="Hope" className="w-20 h-20 animate-pulse" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight uppercase tracking-tighter">
                        Word <span className="text-teal-400">Wisdom.</span>
                    </h2>
                    <p className="text-slate-300 text-lg md:text-xl font-medium mb-12 text-balance leading-relaxed">
                        Identify the phrases of <span className="text-white font-bold underline decoration-teal-500 underline-offset-4">Hope</span> and let the <span className="text-slate-500 font-bold">Thorns of Stigma</span> fall.
                        <br /><span className="text-teal-400 font-black text-sm uppercase tracking-widest mt-4 block">Goal: Collect 4 Seeds of Wisdom</span>
                    </p>
                    <div className="w-full max-w-md bg-white/10 h-2 rounded-full overflow-hidden mb-4 border border-white/10">
                        <div className="h-full bg-teal-400 w-full animate-splash-loader origin-left" style={{ animationDuration: '5000ms' }} />
                    </div>
                    <span className="text-[10px] font-black text-teal-400 uppercase tracking-widest animate-pulse">
                        Entering the Wisdom Path...
                    </span>
                </div>
            )}

            {gameState === 'TUTORIAL' && (
                <div className="relative z-10 max-w-2xl w-full p-8 text-center animate-fade-in flex flex-col items-center words-of-hope-tutorial">
                    <div className="w-24 h-24 bg-teal-500/20 backdrop-blur-xl rounded-2xl mb-8 flex items-center justify-center border border-teal-400/30">
                        <img src="/stickman_assets/hope_stickman.svg" alt="Tutor" className="w-16 h-16 animate-bounce-subtle" />
                    </div>

                    <h2 className="text-3xl md:text-5xl font-black text-white mb-8 uppercase tracking-tighter">Your Mission</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12 w-full text-left">
                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-white">1</div>
                                <span className="text-teal-400 font-bold uppercase tracking-widest text-[10px]">Movement</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Move your cursor or touch to slide your character left and right.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black text-white">2</div>
                                <span className="text-orange-400 font-bold uppercase tracking-widest text-[10px]">Objective</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Catch the <span className="text-white font-bold underline decoration-teal-500">Seeds of Hope</span>. Let the harmful words pass.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center font-black text-white">3</div>
                                <span className="text-red-400 font-bold uppercase tracking-widest text-[10px]">Warning</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                You have 3 lives. Missing a Seed of Hope or catching a harmful word will cost a life.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-white">4</div>
                                <span className="text-white/60 font-bold uppercase tracking-widest text-[10px]">Victory</span>
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                Collect 4 Seeds of Hope to master the path and complete the lesson.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={startGame}
                        className="px-12 py-5 bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl hover:bg-teal-400 transition-all hover:-translate-y-1 active:scale-95 border-b-4 border-teal-700"
                    >
                        Start Your Path
                    </button>
                </div>
            )}

            {gameState === 'PLAYING' && (
                <>
                    {/* Falling Items Area */}
                    <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {fallingItems.map(item => {
                            const q = shuffledQuestions.find(sq => sq.id === item.questionId);
                            return (
                                <div
                                    key={item.id}
                                    className="absolute transition-transform duration-100 flex flex-col items-center justify-center p-4 rounded-3xl border-2 shadow-2xl bg-white/10 border-white/20 text-white group"
                                    style={{
                                        left: `${item.x}%`,
                                        top: `${item.y}%`,
                                        transform: `translate(-50%, -50%)`,
                                        maxWidth: 'min(260px, 40vw)',
                                        textAlign: 'center',
                                        backdropFilter: 'blur(12px)',
                                        WebkitBackdropFilter: 'blur(12px)',
                                    }}
                                >
                                    <span className="text-[10px] md:text-sm font-black leading-tight uppercase tracking-wider">{item.text}</span>

                                    {/* Explanation Mode Tooltip */}
                                    {explanationMode && q && (
                                        <div className={`mt-2 text-[8px] font-medium leading-snug px-2 py-1 rounded-lg ${item.isCorrect
                                            ? 'bg-teal-500/80 text-white'
                                            : 'bg-red-500/80 text-white'
                                            }`}>
                                            {item.isCorrect ? '✓ Empowering' : '✗ Stigmatizing'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Knowledge Sidebar */}
                    <div className={`absolute right-4 top-32 z-40 transition-all duration-700 words-of-hope-sidebar-right ${isSidebarVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
                        <div className="max-w-[240px] md:max-w-[320px] bg-white/95 rounded-2xl border border-white p-4 md:p-6 shadow-4xl flex flex-col h-fit"
                            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                                    </svg>
                                </div>
                                <span className="text-slate-900 font-black uppercase text-[9px] tracking-widest">Growth Log</span>
                            </div>
                            {explanation && (
                                <div className="space-y-4 animate-fade-in" key={explanation.correct}>
                                    <div className="space-y-1">
                                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Better choice</span>
                                        <p className="text-slate-800 font-bold text-xs italic leading-tight">"{explanation.correct}"</p>
                                    </div>
                                    <div className="space-y-1 opacity-50">
                                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Avoid</span>
                                        <p className="text-slate-500 font-bold text-[9px] line-through leading-tight">"{explanation.stigma}"</p>
                                    </div>
                                    <div className="pt-3 border-t border-slate-100">
                                        <p className="text-slate-600 text-[10px] md:text-xs font-medium leading-relaxed">{explanation.why}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Stigma Alert (Left Side) */}
                    <div className={`absolute left-4 top-40 z-40 transition-all duration-700 words-of-hope-sidebar-left ${isAlertVisible ? 'translate-x-0 opacity-100' : 'translate-x-[-120%] opacity-0'}`}>
                        <div className="max-w-[240px] md:max-w-[320px] bg-slate-900/95 rounded-2xl border border-red-500/30 p-4 md:p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col h-fit"
                            style={{ backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)' }}>
                            <div className="flex items-center gap-2 mb-4">
                                <div className="w-8 h-8 bg-red-500/20 rounded-lg flex items-center justify-center shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]">
                                    <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                    </svg>
                                </div>
                                <span className="text-red-400 font-black uppercase text-[9px] tracking-[0.2em]">Stigma Alert</span>
                            </div>

                            {stigmaAlert && (
                                <div className="space-y-4 animate-shake" key={stigmaAlert.stigma}>
                                    <div className="p-3 bg-red-500/10 rounded-xl border border-red-500/20">
                                        <span className="text-[7px] font-black text-red-400 uppercase tracking-widest block mb-2">Harmful Language</span>
                                        <p className="text-white font-bold text-[10px] leading-tight italic">"{stigmaAlert.stigma}"</p>
                                    </div>

                                    <div className="space-y-1">
                                        <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">The Impact</span>
                                        <p className="text-slate-300 text-[9px] md:text-xs font-medium leading-relaxed">
                                            This terminology increases isolation. It's better to use people-first language like <span className="text-teal-400 font-bold">"{stigmaAlert.correct}"</span>.
                                        </p>
                                    </div>

                                    <div className="h-0.5 w-full bg-slate-800 rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500 animate-shrink-timer" style={{ animationDuration: '5s' }} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="absolute top-28 left-8 flex gap-2 z-50">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center shadow-lg transition-all duration-500 ${i < (3 - mistakes) ? 'bg-teal-500 text-white border-teal-400 shadow-teal-500/20 scale-100' : 'bg-slate-900/40 text-slate-700 border-slate-800 scale-90 opacity-20'}`}>
                                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                </svg>
                            </div>
                        ))}
                    </div>

                    {/* Word History / Glossary Panel */}
                    {isHistoryOpen && (
                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] w-full max-w-2xl px-4 animate-scale-in">
                            <div className="bg-white/95 backdrop-blur-xl rounded-3xl border-2 border-white shadow-2xl p-6 max-h-[70vh] overflow-hidden flex flex-col">
                                {/* Header */}
                                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center p-2">
                                            <img src="/stickman_assets/scholar_stickman.svg" className="w-full h-full" alt="" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black uppercase text-slate-800 tracking-wide">Word Glossary</h3>
                                            <p className="text-[10px] text-slate-500 font-medium">Review what you've learned</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsHistoryOpen(false)}
                                        className="w-8 h-8 bg-slate-100 hover:bg-slate-200 rounded-full flex items-center justify-center text-slate-600 transition-all"
                                    >
                                        ✕
                                    </button>
                                </div>

                                {/* Scrollable Content */}
                                <div className="overflow-y-auto flex-1 space-y-3 pr-2 custom-scrollbar">
                                    {wordHistory.map((word, index) => (
                                        <div key={word.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                            <div className="flex items-start gap-3 mb-3">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${word.wasCorrect ? 'bg-teal-100 text-teal-600' : 'bg-red-100 text-red-600'
                                                    }`}>
                                                    {word.wasCorrect ?
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        :
                                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                                                    }
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest">Better Choice</span>
                                                    </div>
                                                    <p className="text-sm font-bold text-slate-800 leading-tight mb-2">"{word.correct}"</p>

                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">Avoid</span>
                                                    </div>
                                                    <p className="text-xs font-medium text-slate-500 line-through leading-tight mb-3">"{word.stigma}"</p>

                                                    <div className="pt-3 border-t border-slate-200">
                                                        <p className="text-[10px] text-slate-600 font-medium leading-relaxed">{word.why}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Footer */}
                                <div className="mt-4 pt-4 border-t border-slate-200 text-center">
                                    <p className="text-[10px] text-slate-400 font-bold italic">
                                        {wordHistory.length} word pair{wordHistory.length !== 1 ? 's' : ''} encountered
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Player */}
                    <div className="absolute z-[100]" style={{ left: `${playerX}%`, bottom: '10%', transform: 'translateX(-50%)' }}>
                        <div className="relative">
                            <div className={`absolute inset-0 bg-teal-400/20 blur-3xl rounded-full transition-all duration-500 ${harmony > 60 ? 'scale-150' : 'scale-75'}`} />
                            <img
                                src={harmony > 30 ? "/stickman_assets/hope_stickman.svg" : `/stickman_assets/${playerGender}_distressed.svg`}
                                alt="Player"
                                className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl"
                            />
                        </div>
                    </div>
                </>
            )}

            {gameState === 'GAME_OVER' && (
                <div className="relative z-10 max-w-xl w-full p-8 text-center animate-pop-in flex flex-col items-center words-of-hope-results">
                    <div className="w-32 h-32 bg-teal-500 rounded-[2.5rem] mb-8 flex items-center justify-center p-6 shadow-2xl border-4 border-white">
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                        </svg>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter">Don't Give Up!</h2>
                    <p className="text-teal-200 text-lg md:text-xl font-bold mb-4 uppercase tracking-widest text-balance">Mistakes are part of learning. Try again to master the language of hope.</p>
                    <div className="flex gap-6 mb-8">
                        <div className="flex flex-col items-center">
                            <p className="text-white/50 text-xs font-black uppercase tracking-widest">Progress</p>
                            <p className="text-white text-2xl font-black">{score}/4</p>
                        </div>
                        {maxStreak > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="text-white/50 text-xs font-black uppercase tracking-widest">Best Streak</p>
                                <p className="text-orange-400 text-2xl font-black">🔥 {maxStreak}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-4 w-full words-of-hope-retry-btns">
                        <button onClick={startGame} className="w-full py-5 bg-white text-slate-900 rounded-2xl font-black uppercase tracking-widest text-lg shadow-xl hover:bg-slate-100 transition-all">Try Again</button>
                        <button onClick={onExit} className="w-full py-5 bg-white/10 text-white border border-white/20 rounded-2xl font-black uppercase tracking-widest text-xs transition-all opacity-50">Return</button>
                    </div>
                </div>
            )}

            {gameState === 'RESULTS' && (
                <div className="relative z-10 max-w-xl w-full p-8 text-center animate-pop-in flex flex-col items-center words-of-hope-results">
                    <div className="w-32 h-32 bg-teal-400 rounded-[2.5rem] mb-8 flex items-center justify-center shadow-2xl border-4 border-white overflow-hidden">
                        <img src="/stickman_assets/hope_stickman.svg" alt="Success" className="w-20 h-20 drop-shadow-lg" />
                    </div>
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-4 uppercase tracking-tighter">Wisdom Path</h2>
                    <div className="flex gap-6 mb-4">
                        <div className="flex flex-col items-center">
                            <p className="text-teal-200 text-sm font-bold uppercase tracking-widest">Final Score</p>
                            <p className="text-white text-3xl font-black">{score}/4</p>
                        </div>
                        {maxStreak > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="text-orange-200 text-sm font-bold uppercase tracking-widest">Max Streak</p>
                                <p className="text-orange-400 text-3xl font-black">🔥 {maxStreak}</p>
                            </div>
                        )}
                    </div>
                    <p className="text-white/50 text-[10px] font-black uppercase tracking-widest mb-12 italic">Seeds of Wisdom Rooted</p>
                    <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 mb-12 border border-white/20">
                        <p className="text-white text-lg font-medium leading-relaxed italic">"You have successfully navigated the language of stigma. Choosing the right words is the first step in saving a life."</p>
                    </div>
                    <button onClick={onExit} className="w-full py-5 bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest text-lg shadow-2xl hover:bg-teal-400 transition-all">Complete Module</button>
                </div>
            )}
        </div>
    );
};

export default WordsOfHopeScreen;
