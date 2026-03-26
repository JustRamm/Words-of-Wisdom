import { useState, useEffect, useRef } from 'react';
import { TERMINOLOGY_DATA } from './terminologyData';
import GameBackground from './GameBackground';
import { supabase } from './supabaseClient';

export default function WordsOfHopeScreen({ 
    audioManager, 
    onExit, 
    isPaused = false, 
    playerGender = 'guy', 
    playerData = null, 
    initialState = 'INTRO' 
}) {
    // Game Flow States
    const [gameState, setGameState] = useState(initialState); 
    const [score, setScore] = useState(0);
    const [mistakes, setMistakes] = useState(0);
    const [harmony, setHarmony] = useState(50); 
    const [currentIndex, setCurrentIndex] = useState(0);
    const [explanation, setExplanation] = useState(null); 
    const [isSidebarVisible, setIsSidebarVisible] = useState(false);
    const [stigmaAlert, setStigmaAlert] = useState(null); 
    const [isAlertVisible, setIsAlertVisible] = useState(false);

    // New Enhanced Features
    const [streak, setStreak] = useState(0); 
    const [maxStreak, setMaxStreak] = useState(0); 
    const [explanationMode, setExplanationMode] = useState(false); 
    const [wordHistory, setWordHistory] = useState([]); 
    const [baseSpeed, setBaseSpeed] = useState(0.05); 
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); 
    const [level, setLevel] = useState(1); 
    const [difficulty, setDifficulty] = useState('EASY'); // EASY, NORMAL, HARD
    const [review, setReview] = useState({ rating: 0, comment: '', submitted: false, loading: false });
    const [localPaused, setLocalPaused] = useState(false); 
    const [tipsRemaining, setTipsRemaining] = useState(2); 
    const [isSpeedBoosted, setIsSpeedBoosted] = useState(false);
    const isFirstSpawnRef = useRef(true);
    const [unlockedLevel, setUnlockedLevel] = useState(1);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const scoreRef = useRef(0);
    const currentIndexRef = useRef(0);
    const mistakesRef = useRef(0);
    const sidebarTimerRef = useRef(null);
    const alertTimerRef = useRef(null);
    const spawnCooldownRef = useRef(0);
    const isProcessingSetRef = useRef(false);
    const hasInteractionRef = useRef(false);
    const requestRef = useRef();
    const pausedRef = useRef(false);
    const speedBoostRef = useRef(false);
    const baseSpeedRef = useRef(0.05);
    const lastSpawnedYRef = useRef(100);
    const fallingItemsRef = useRef([]);
    const playerRef = useRef(50);
    const [playerX, setPlayerX] = useState(50);
    const gameContainerRef = useRef(null);
    const [fallingItems, setFallingItems] = useState([]);
    const [shuffledQuestions, setShuffledQuestions] = useState([]);

    useEffect(() => {
        setShuffledQuestions([...TERMINOLOGY_DATA.questions].sort(() => Math.random() - 0.5));
        if (audioManager) {
            audioManager.init();
            audioManager.startAmbient('park');
        }
        if (gameState === 'INTRO') {
            const timer = setTimeout(() => {
                setGameState('LEVEL_SELECT');
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [gameState]);

    const startGame = () => {
        const isMobile = window.innerWidth < 768;
        const speedMultiplier = isMobile ? 2.0 : 1;
        let initialSpeed = 0.05;
        if (difficulty === 'EASY') initialSpeed = 0.035;
        if (difficulty === 'HARD') initialSpeed = 0.08;
        initialSpeed *= speedMultiplier;

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
        spawnCooldownRef.current = 6000; 

        setStreak(0);
        setWordHistory([]);
        setBaseSpeed(initialSpeed); 
        baseSpeedRef.current = initialSpeed;
        setIsHistoryOpen(false);
        setExplanationMode(false);
        setLevel(1);
        setTipsRemaining(2); 
        isFirstSpawnRef.current = true; 

        audioManager.playPop();
        if (audioManager) audioManager.startAmbient('park');

        spawnSet(45);  
        spawnSet(5);   
        spawnSet(-35); 
        spawnSet(-75); 
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

    // Toggle Pause
    const togglePause = () => {
        if (gameState !== 'PLAYING') return;
        setLocalPaused(prev => {
            const next = !prev;
            pausedRef.current = next;
            if (next) {
                audioManager.pauseAll();
            } else {
                audioManager.resumeAll();
            }
            return next;
        });
    };

    // Keyboard Listeners
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
                togglePause();
            }
            if (e.key === 'Shift' || e.key === ' ') {
                setIsSpeedBoosted(true);
                speedBoostRef.current = true;
            }
        };
        const handleKeyUp = (e) => {
            if (e.key === 'Shift' || e.key === ' ') {
                setIsSpeedBoosted(false);
                speedBoostRef.current = false;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [gameState]);

    // Handle Mouse/Touch Movement
    const handlePointerMove = (e) => {
        if (gameState !== 'PLAYING' || isPaused || !gameContainerRef.current) return;
        
        // If on mobile, ignore direct screen movement (use joystick instead)
        if (isMobile) return;

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
        if (gameState !== 'PLAYING' || isPaused || localPaused || pausedRef.current) {
            requestRef.current = requestAnimationFrame(update);
            return;
        }

        // 1. Move & Process Items
        const currentItems = fallingItemsRef.current;
        const nextItems = [];
        let collisionOccurred = false;
        const handledQuestionIds = new Set();
        
        // Manual speed boost factor (Reads from ref to avoid stale closures in the loop)
        const effectiveSpeed = speedBoostRef.current ? baseSpeedRef.current * 3 : baseSpeedRef.current;
 
        // Track the vertical displacement of the last spawned item (persists even if caught)
        lastSpawnedYRef.current += effectiveSpeed;

        for (const item of currentItems) {
            // ... movement and collision ...
            const newItem = { ...item, y: item.y + effectiveSpeed };
            
            // ... Collision Check ...
            const distanceX = Math.abs(newItem.x - playerRef.current);
            const isYAligned = newItem.y > 75 && newItem.y < 95;

            if (isYAligned && distanceX < 15 && !collisionOccurred) {
                collisionOccurred = true;
                processCollision(newItem);
                handledQuestionIds.add(item.questionId);
                continue;
            }

            // Off-screen Check
            if (newItem.y >= 105) {
                if (item.isCorrect) applyMistake();
                handledQuestionIds.add(item.questionId);
                continue;
            }

            nextItems.push(newItem);
        }

        fallingItemsRef.current = nextItems.filter(item => !handledQuestionIds.has(item.questionId));
        setFallingItems([...fallingItemsRef.current]);

        // 2. Spawning Logic (Uses dedicated reference to guarantee uniform 40% gaps)
        if (gameState === 'PLAYING' && currentIndexRef.current < shuffledQuestions.length) {
            // Trigger next pair as soon as last one hits the threshold
            if (lastSpawnedYRef.current > -5) {
                spawnSet(-45);
            }
        } else if (gameState === 'PLAYING' && currentIndexRef.current >= shuffledQuestions.length && fallingItemsRef.current.length === 0) {
            checkFinalOutcome();
        }

        requestRef.current = requestAnimationFrame(update);
    };

    useEffect(() => {
        requestRef.current = requestAnimationFrame(update);
        return () => cancelAnimationFrame(requestRef.current);
    }, [gameState]);

    const spawnSet = (forcedY = null) => {
        if (currentIndexRef.current >= shuffledQuestions.length) return;

        const q = shuffledQuestions[currentIndexRef.current];
        currentIndexRef.current += 1;
        setCurrentIndex(currentIndexRef.current);

        const spawnY = forcedY !== null ? forcedY : -20; // Use forced height or start off-screen
        
        const items = [
            {
                id: `correct-${q.id}-${Date.now()}`,
                x: 25,
                y: spawnY,
                speed: baseSpeed,
                text: q.correct,
                isCorrect: true,
                questionId: q.id
            },
            {
                id: `stigma-${q.id}-${Date.now()}`,
                x: 75,
                y: spawnY,
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
        
        // Update the momentum reference to the latest spawn height
        lastSpawnedYRef.current = spawnY;
    };

    const processCollision = (item) => {
        // Auto-disable tip once a word is caught/missed
        setExplanationMode(false);

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

            // LEVEL UP CHECK: Every 4 seeds
            if (scoreRef.current % 4 === 0) {
                setLevel(prev => {
                    const nextLevel = prev + 1;
                    const isMobile = window.innerWidth < 768;
                    const speedMultiplier = isMobile ? 2.0 : 1;
                    const newSpeed = baseSpeedRef.current + (0.035 * speedMultiplier);
                    setBaseSpeed(newSpeed);
                    baseSpeedRef.current = newSpeed;
                    return nextLevel;
                });
                setTipsRemaining(prev => prev + 1); // Reward a tip
                audioManager.playInvestigate(); 
            }

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

        // Win state check - Final win at higher score (e.g. 12 seeds or all questions)
        if (scoreRef.current >= 12) {
            triggerEndGame('RESULTS');
        }
    };

    const checkFinalOutcome = () => {
        if (gameState !== 'PLAYING') return;
        setGameState('TRANSITIONING');
        setTimeout(() => {
            if (scoreRef.current >= 12) {
                setGameState('RESULTS');
            } else {
                setGameState('GAME_OVER');
            }
            audioManager.stopMusic();
        }, 1000);
    };

    const saveGameResult = async (finalState) => {
        if (!playerData?.id) return;
        
        const finalScore = scoreRef.current;
        const finalHarmony = harmony;
        const finalMistakes = mistakesRef.current;
        const missedTerms = wordHistory
            .filter(w => !w.wasCorrect)
            .map(w => ({ id: w.id, stigma: w.stigma, correct: w.correct }));

        try {
            const { error } = await supabase
                .from('players')
                .update({
                    final_score: finalScore,
                    final_harmony: finalHarmony,
                    mistakes_count: finalMistakes,
                    mistakes_list: missedTerms,
                    max_streak: maxStreak,
                    difficulty_played: difficulty,
                    completed_at: new Date().toISOString(),
                    status: finalState === 'RESULTS' ? 'COMPLETED' : 'FAILED'
                })
                .eq('id', playerData.id);

            if (error) console.error("Performance saving error:", error.message);
        } catch (err) {
            console.error("Unexpected error saving performance:", err);
        }
    };

    const triggerEndGame = (finalState) => {
        setGameState('TRANSITIONING');
        fallingItemsRef.current = [];
        setFallingItems([]);
        isProcessingSetRef.current = false;

        // Auto-save performance before switching screens
        saveGameResult(finalState);

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

    const handleReviewSubmit = async () => {
        if (!review.rating || !playerData?.id) {
            console.error("Missing rating or player ID");
            return;
        }
        setReview(prev => ({ ...prev, loading: true }));
        try {
            const { error } = await supabase
                .from('players')
                .update({ 
                    review_rating: review.rating, 
                    review_comment: review.comment 
                })
                .eq('id', playerData.id);
            if (error) throw error;
            setReview(prev => ({ ...prev, submitted: true }));
            if (audioManager) audioManager.playPop();
        } catch (err) {
            console.error("Error submitting review:", err.message);
        } finally {
            setReview(prev => ({ ...prev, loading: false }));
        }
    };

    const bgStyle = {
        background: `linear-gradient(135deg, 
            hsl(${200 + (harmony * 0.4)}, ${20 + (harmony * 0.6)}%, ${10 + (harmony * 0.4)}%) 0%, 
            hsl(${220 + (harmony * 0.4)}, ${30 + (harmony * 0.5)}%, ${15 + (harmony * 0.4)}%) 100%)`,
        transition: 'all 2s ease-in-out'
    };

    return (
        <div
            ref={gameContainerRef}
            className="fixed inset-0 z-[1000] flex flex-col items-center justify-center overflow-hidden font-sans select-none touch-none stickman-rescue-container"
            style={bgStyle}
            onPointerDown={handlePointerMove}
            onPointerMove={handlePointerMove}
            onTouchStart={handlePointerMove}
            onTouchMove={handlePointerMove}
        >
            <GameBackground harmony={harmony} />

            {/* Fixed Header (Gameplay only) */}
            {!['INTRO', 'LEVEL_SELECT', 'TUTORIAL'].includes(gameState) && (
                <div className="absolute top-4 md:top-8 left-0 right-0 px-4 md:px-8 flex justify-between items-center z-50 stickman-rescue-hdr">
                    {/* Hide Title on Mobile */}
                    <div className="hidden md:flex flex-col stickman-rescue-hdr-title">
                        <h1 className="text-white font-black uppercase tracking-[0.3em] text-lg drop-shadow-lg leading-tight">
                            {TERMINOLOGY_DATA.title}
                        </h1>
                        <div className="h-0.5 w-full bg-gradient-to-r from-teal-400 to-transparent rounded-full mt-1" />
                    </div>

                    <div className="flex items-center gap-2 md:gap-4 stickman-rescue-hdr-actions w-full md:w-auto justify-between md:justify-end">
                        {/* Streak Counter */}
                        {gameState === 'PLAYING' && (
                            <div className="flex flex-col items-center bg-white/10 backdrop-blur-md border border-white/20 px-3 md:px-4 py-1.5 md:py-2 rounded-xl">
                                <span className="text-[7px] md:text-[8px] font-black text-orange-400 uppercase tracking-widest leading-none mb-1">🔥 Streak</span>
                                <span className="text-white font-black text-lg md:text-2xl leading-none">{streak}</span>
                                {maxStreak > 0 && <span className="hidden md:block text-[7px] text-white/40 mt-0.5">Best: {maxStreak}</span>}
                            </div>
                        )}

                        <div className="flex flex-col items-end">
                            <span className="text-[7px] md:text-[8px] font-black text-teal-400 uppercase tracking-widest leading-none mb-0.5 md:mb-1">Lvl {level}</span>
                            <span className="text-white font-black text-sm md:text-xl leading-none">{score}<span className="text-white/30 text-[10px] md:text-sm font-medium ml-0.5 md:ml-1">/ 12</span></span>
                        </div>

                        {/* Explanation Mode Toggle */}
                        {gameState === 'PLAYING' && (
                            <button
                                onClick={() => {
                                    if (explanationMode) {
                                        setExplanationMode(false);
                                    } else if (tipsRemaining > 0) {
                                        setExplanationMode(true);
                                        setTipsRemaining(prev => prev - 1);
                                        audioManager.playPop();
                                    }
                                }}
                                disabled={!explanationMode && tipsRemaining === 0}
                                className={`px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all ${explanationMode
                                    ? 'bg-teal-500 border-teal-400 text-white hover:scale-105 active:scale-95 border'
                                    : tipsRemaining > 0
                                        ? 'bg-white/10 border-white/20 text-white hover:bg-white/20 hover:scale-105 active:scale-95 border'
                                        : 'bg-white/5 border-white/5 text-white/30 cursor-not-allowed border'
                                    }`}
                                title={tipsRemaining > 0 ? "Use a tip to reveal the answer" : "Out of tips for now"}
                            >
                                💡 Tips ({tipsRemaining})
                            </button>
                        )}

                        {/* Word History Button */}
                        {gameState === 'PLAYING' && wordHistory.length > 0 && (
                            <button
                                onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-2.5 md:px-3 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            >
                                📚 <span className="hidden md:inline">History </span>({wordHistory.length})
                            </button>
                        )}

                        {/* Back Button for Menus */}
                        {['LEVEL_SELECT', 'TUTORIAL'].includes(gameState) && (
                            <button
                                onClick={() => {
                                    audioManager.playPop();
                                    if (gameState === 'TUTORIAL') setGameState('LEVEL_SELECT');
                                    else onExit();
                                }}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                            >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Back
                            </button>
                        )}

                        {/* Exit Button - Hidden on mobile header (use pause menu) */}
                        {!['INTRO', 'LEVEL_SELECT', 'TUTORIAL'].includes(gameState) && (
                            <button
                                onClick={onExit}
                                className="hidden md:block bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                            >
                                Exit Mission
                            </button>
                        )}

                        {/* Pause Button - Active Gameplay only */}
                        {gameState === 'PLAYING' && (
                            <button
                                onClick={togglePause}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white p-2 rounded-full transition-all hover:scale-105 active:scale-95"
                                title="Pause Game (P)"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    {localPaused ?
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                        :
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    }
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            )}


            {/* PAUSE OVERLAY */}
            {localPaused && (
                <div className="fixed inset-0 z-[2000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center animate-fade-in">
                    <div className="bg-white rounded-3xl p-10 max-w-sm w-full shadow-4xl text-center animate-scale-in">
                        <div className="w-20 h-20 bg-teal-100 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                            <svg className="w-10 h-10 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h2 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tighter">Mission Paused</h2>
                        <p className="text-slate-500 font-medium mb-8">Take a moment to breathe. The path will wait for you.</p>
                        
                        <div className="space-y-3">
                            <button 
                                onClick={togglePause} 
                                className="w-full py-4 bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl hover:bg-teal-400 transition-all"
                            >
                                Resume Mission
                            </button>
                            <button 
                                onClick={onExit} 
                                className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-red-50 hover:text-red-500 transition-all"
                            >
                                Exit Quietly
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {gameState === 'LEVEL_SELECT' && (
                <div className="relative z-10 max-w-6xl w-full p-6 md:p-8 text-center animate-fade-in flex flex-col items-center stickman-rescue-level-select">
                    {/* Fixed Back Button in true corner */}
                    <button
                        onClick={() => { audioManager.playPop(); onExit(); }}
                        className="fixed top-6 left-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 z-[2000]"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>

                    <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tighter mb-12">Choose Your Mission</h2>
                    <div className="flex md:grid md:grid-cols-3 gap-6 md:gap-8 w-full overflow-x-auto md:overflow-visible pb-8 md:pb-0 px-4 md:px-0 snap-x snap-mandatory scrollbar-hide">
                        {/* Easy Mode */}
                        <div 
                            onClick={() => { setDifficulty('EASY'); setGameState('TUTORIAL'); audioManager.playPop(); }}
                            className="flex-shrink-0 w-[240px] xs:w-[280px] md:w-auto snap-center bg-white/5 border-2 border-white/10 hover:border-teal-400 p-6 md:p-8 rounded-3xl md:rounded-[3rem] backdrop-blur-xl transition-all hover:scale-105 active:scale-95 cursor-pointer flex flex-col items-center group shadow-2xl"
                        >
                            <div className="w-16 h-16 md:w-20 md:h-20 bg-teal-400/20 rounded-full mb-4 md:mb-6 flex items-center justify-center group-hover:bg-teal-400/40 transition-colors">
                                <span className="text-3xl md:text-4xl text-teal-400">🍃</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white mb-2 uppercase">Breeze</h3>
                            <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">Slower words. Focused on learning the terminology at your own pace.</p>
                            <div className="mt-6 md:mt-8 px-5 md:px-6 py-2 bg-white/10 rounded-full text-[9px] md:text-[10px] font-black text-teal-400 uppercase tracking-widest">Focus: Learning</div>
                        </div>
 
                        {/* Normal Mode */}
                        <div 
                            onClick={() => { 
                                if (unlockedLevel >= 2) {
                                    setDifficulty('NORMAL'); setGameState('TUTORIAL'); audioManager.playPop(); 
                                } else {
                                    audioManager.playSad();
                                }
                            }}
                            className={`flex-shrink-0 w-[240px] xs:w-[280px] md:w-auto snap-center p-8 md:p-10 rounded-3xl md:rounded-[3rem] backdrop-blur-xl transition-all flex flex-col items-center group shadow-4xl relative overflow-hidden ${unlockedLevel >= 2 
                                ? 'bg-white/10 border-2 border-teal-500 hover:scale-110 active:scale-95 cursor-pointer' 
                                : 'bg-slate-900/40 border-2 border-white/5 grayscale opacity-60 cursor-not-allowed'}`}
                        >
                            {unlockedLevel >= 2 && <div className="absolute top-0 right-0 px-3 md:px-4 py-1 bg-teal-500 text-white text-[7px] md:text-[8px] font-black uppercase tracking-widest rounded-bl-xl shadow-lg">Recommended</div>}
                            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full mb-4 md:mb-6 flex items-center justify-center transition-colors ${unlockedLevel >= 2 ? 'bg-white/20 group-hover:bg-white/30' : 'bg-slate-800'}`}>
                                <span className="text-4xl md:text-5xl">{unlockedLevel >= 2 ? '🌿' : '🔒'}</span>
                            </div>
                            <h3 className="text-2xl md:text-3xl font-black text-white mb-2 uppercase">Mist</h3>
                            <p className="text-slate-300 text-xs md:text-sm font-medium leading-relaxed">Standard speed. Balanced challenge for terminology mastery.</p>
                            {unlockedLevel >= 2 ? (
                                <div className="mt-6 md:mt-8 px-6 md:px-8 py-2.5 md:py-3 bg-teal-500 rounded-full text-[9px] md:text-[10px] font-black text-white uppercase tracking-widest shadow-xl">Focus: Mastery</div>
                            ) : (
                                <div className="mt-6 md:mt-8 px-5 md:px-6 py-2 bg-white/5 rounded-full text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Complete Breeze to Unlock</div>
                            )}
                        </div>
 
                        {/* Hard Mode */}
                        <div 
                            onClick={() => { 
                                if (unlockedLevel >= 3) {
                                    setDifficulty('HARD'); setGameState('TUTORIAL'); audioManager.playPop(); 
                                } else {
                                    audioManager.playSad();
                                }
                            }}
                            className={`flex-shrink-0 w-[240px] xs:w-[280px] md:w-auto snap-center p-6 md:p-8 rounded-3xl md:rounded-[3rem] backdrop-blur-xl transition-all flex flex-col items-center group shadow-2xl ${unlockedLevel >= 3 
                                ? 'bg-white/5 border-2 border-white/10 hover:border-orange-500 hover:scale-105 active:scale-95 cursor-pointer' 
                                : 'bg-slate-900/40 border-2 border-white/5 grayscale opacity-60 cursor-not-allowed'}`}
                        >
                            <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full mb-4 md:mb-6 flex items-center justify-center transition-colors ${unlockedLevel >= 3 ? 'bg-orange-500/20 group-hover:bg-orange-500/40' : 'bg-slate-800'}`}>
                                <span className="text-3xl md:text-4xl">{unlockedLevel >= 3 ? '⛈️' : '🔒'}</span>
                            </div>
                            <h3 className="text-xl md:text-2xl font-black text-white mb-2 uppercase">Storm</h3>
                            <p className="text-slate-400 text-xs md:text-sm font-medium leading-relaxed">Rapid words. Test your reflexes and quick thinking for higher stakes.</p>
                            {unlockedLevel >= 3 ? (
                                <div className="mt-6 md:mt-8 px-5 md:px-6 py-2 bg-white/10 rounded-full text-[9px] md:text-[10px] font-black text-orange-400 uppercase tracking-widest">Focus: Reflexes</div>
                            ) : (
                                <div className="mt-6 md:mt-8 px-5 md:px-6 py-2 bg-white/5 rounded-full text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-widest text-center">Complete Mist to Unlock</div>
                            )}
                        </div>
                    </div>
                </div>
            )}
 
            {gameState === 'INTRO' && (
                <>
                    {/* TOP LEFT BRANDING - NOW PINNED TO SCREEN CORNER */}
                    <div className="absolute top-6 left-6 z-[200] animate-slide-in-left cursor-default">
                        <div className="w-16 h-16 bg-white p-1 rounded-2xl shadow-4xl border-2 border-white/20 transform hover:scale-105 transition-transform overflow-hidden">
                            <img src="/ME.jpeg" alt="Mind Empowered" className="w-full h-full object-contain rounded-xl" />
                        </div>
                    </div>

                    <div className="relative z-10 max-w-4xl w-full h-full p-8 text-center animate-fade-in flex flex-col items-center justify-center stickman-rescue-hero overflow-hidden">
                        {/* MAIN HERO CONTENT (CENTRED) */}
                        <div className="flex flex-col items-center animate-scale-in">
                            <div className="w-40 h-40 bg-white/5 backdrop-blur-3xl rounded-[3rem] mb-12 flex items-center justify-center border border-white/20 shadow-[0_30px_60px_rgba(0,0,0,0.5)] -rotate-6 transform hover:rotate-0 transition-all duration-700">
                                <img src="/stickman_assets/hope_stickman.svg" alt="Hope" className="w-28 h-28 animate-pulse drop-shadow-[0_0_20px_rgba(45,212,191,0.5)]" />
                            </div>

                            <h2 className="text-6xl md:text-9xl font-black text-white mb-2 leading-none uppercase tracking-tighter drop-shadow-2xl">
                                Words of <span className="text-teal-400">Wisdome.</span>
                            </h2>
                            
                            {playerData && (
                                <div className="mt-2 animate-fade-in" style={{ animationDelay: '800ms' }}>
                                    <p className="text-teal-400/80 font-black uppercase tracking-[0.3em] text-[10px] md:text-xs">
                                        Welcome, {playerData.name} of {playerData.college}
                                    </p>
                                </div>
                            )}
                            
                            <div className="h-1.5 w-full max-w-[300px] bg-white/10 rounded-full mt-6 overflow-hidden border border-white/5">
                                <div className="h-full bg-teal-400 w-full animate-splash-loader origin-left" style={{ animationDuration: '5000ms' }} />
                            </div>
                        </div>
                        
                        {/* BOTTOM BRANDING */}
                        <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center animate-fade-in delay-500">
                            <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.5em] mb-3">A Collaborative Vision</span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-white/40 uppercase tracking-widest">Presented By</span>
                                <span className="text-xs font-black text-white uppercase tracking-[0.3em] border-b border-teal-400/30 pb-1">Mind Empowered</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {gameState === 'TUTORIAL' && (
                <div className="relative z-10 max-w-2xl w-full p-6 md:p-8 text-center animate-fade-in flex flex-col items-center stickman-rescue-tutorial">
                    {/* Fixed Back Button in true corner */}
                    <button
                        onClick={() => { audioManager.playPop(); setGameState('LEVEL_SELECT'); }}
                        className="fixed top-6 left-6 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 text-white px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 flex items-center gap-2 z-[2000]"
                    >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                        Back
                    </button>

                    <div className="w-16 h-16 md:w-24 md:h-24 bg-teal-500/20 backdrop-blur-xl rounded-2xl mb-4 md:mb-6 flex items-center justify-center border border-teal-400/30">
                        <img src="/stickman_assets/hope_stickman.svg" alt="Tutor" className="w-12 h-12 md:w-16 md:h-16 animate-bounce-subtle" />
                    </div>

                    <h2 className="text-2xl md:text-5xl font-black text-white mb-4 md:mb-8 uppercase tracking-tighter">Your Mission</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8 md:mb-12 w-full text-left max-h-[40vh] md:max-h-none overflow-y-auto md:overflow-visible pr-2 custom-scrollbar">
                        <div className="bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-teal-500 rounded-lg flex items-center justify-center font-black text-white text-xs md:text-base">1</div>
                                <span className="text-teal-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">Movement</span>
                            </div>
                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                Move your cursor or touch to slide your character left and right.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black text-white text-xs md:text-base">2</div>
                                <span className="text-orange-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">Objective</span>
                            </div>
                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                Catch the <span className="text-white font-bold underline decoration-teal-500">Seeds of Hope</span>. Let the harmful words pass.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-red-500 rounded-lg flex items-center justify-center font-black text-white text-xs md:text-base">3</div>
                                <span className="text-red-400 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">Warning</span>
                            </div>
                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                You have 3 lives. Missing a Seed of Hope or catching a harmful word will cost a life.
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 p-4 md:p-5 rounded-xl md:rounded-2xl backdrop-blur-md">
                            <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
                                <div className="w-6 h-6 md:w-8 md:h-8 bg-white/20 rounded-lg flex items-center justify-center font-black text-white text-xs md:text-base">4</div>
                                <span className="text-white/60 font-bold uppercase tracking-widest text-[8px] md:text-[10px]">Victory</span>
                            </div>
                            <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
                                Collect 4 Seeds of Support to master the mission and complete the lesson.
                            </p>
                        </div>
                    </div>
 
                    <button
                        onClick={startGame}
                        className="w-full md:w-auto mt-6 md:mt-10 px-12 py-4 md:py-5 bg-teal-500 text-white rounded-2xl font-black uppercase tracking-widest text-base md:text-lg shadow-2xl hover:bg-teal-400 transition-all hover:-translate-y-1 active:scale-95 border-b-4 border-teal-700"
                    >
                        Start Mission
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
                                        maxWidth: 'min(260px, 45vw)',
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
                    <div className={`absolute right-4 top-24 md:top-32 z-40 transition-all duration-700 stickman-rescue-sidebar-right ${isSidebarVisible ? 'translate-x-0 opacity-100' : 'translate-x-[120%] opacity-0'}`}>
                        <div className="max-w-[200px] xs:max-w-[240px] md:max-w-[320px] bg-white/95 rounded-2xl border border-white p-4 md:p-6 shadow-4xl flex flex-col h-fit"
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
                    <div className={`absolute left-4 top-28 md:top-40 z-40 transition-all duration-700 stickman-rescue-sidebar-left ${isAlertVisible ? 'translate-x-0 opacity-100' : 'translate-x-[-120%] opacity-0'}`}>
                        <div className="max-w-[200px] xs:max-w-[240px] md:max-w-[320px] bg-slate-900/95 rounded-2xl border border-red-500/30 p-4 md:p-6 shadow-[0_0_30px_rgba(239,68,68,0.2)] flex flex-col h-fit"
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

                    <div className="absolute top-20 md:top-28 left-4 md:left-8 flex gap-1.5 md:gap-2 z-50">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className={`w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl border-2 flex items-center justify-center shadow-lg transition-all duration-500 ${i < (3 - mistakes) ? 'bg-teal-500 text-white border-teal-400 shadow-teal-500/20 scale-100' : 'bg-slate-900/40 text-slate-700 border-slate-800 scale-90 opacity-20'}`}>
                                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
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
                    <div 
                        className="absolute z-[100] transition-colors" 
                        style={{ 
                            left: `${playerX}%`, 
                            bottom: isMobile ? '120px' : '10%', // Lift player above joystick area
                            transform: 'translateX(-50%)' 
                        }}
                    >
                        <div className="relative">
                            <div className={`absolute inset-0 bg-teal-400/20 blur-3xl rounded-full transition-all duration-500 ${harmony > 60 ? 'scale-150' : 'scale-75'}`} />
                            <img
                                src={harmony > 30 ? "/stickman_assets/hope_stickman.svg" : `/stickman_assets/${playerGender}_distressed.svg`}
                                alt="Player"
                                className="w-24 h-24 md:w-32 md:h-32 drop-shadow-2xl"
                            />
                        </div>
                    </div>

                    {/* MOBILE HORIZONTAL JOYSTICK & 2X BOOST */}
                    {isMobile && (
                        <>
                            {/* 2X SPEED BOOST BUTTON (Floating bottom right for ergonomic two-thumb play) */}
                            <button
                                onPointerDown={() => {
                                    setIsSpeedBoosted(true);
                                    speedBoostRef.current = true;
                                }}
                                onPointerUp={() => {
                                    setIsSpeedBoosted(false);
                                    speedBoostRef.current = false;
                                }}
                                onPointerCancel={() => {
                                    setIsSpeedBoosted(false);
                                    speedBoostRef.current = false;
                                }}
                                className={`absolute bottom-40 right-6 w-14 h-14 rounded-full flex items-center justify-center transition-all border-2 z-[300] active:scale-90 shadow-2xl ${isSpeedBoosted 
                                    ? 'bg-orange-500 border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.5)]' 
                                    : 'bg-white/5 backdrop-blur-xl border-white/20 text-white/40'}`}
                            >
                                <span className={`text-lg font-black italic tracking-tighter ${isSpeedBoosted ? 'text-white scale-110' : 'text-white/40'}`}>2X</span>
                            </button>

                            <div className="absolute bottom-4 left-0 right-0 px-8 py-6 z-[200] flex flex-col items-center">
                                <div 
                                    className="relative w-full max-w-[400px] h-20 bg-white/5 backdrop-blur-2xl rounded-3xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.3)] overflow-hidden touch-none"
                                    onPointerDown={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                                        const clampedX = Math.max(5, Math.min(95, x));
                                        setPlayerX(clampedX);
                                        playerRef.current = clampedX;
                                    }}
                                    onPointerMove={(e) => {
                                        if (e.buttons > 0) { // Pointer is pressed
                                            const rect = e.currentTarget.getBoundingClientRect();
                                            const x = ((e.clientX - rect.left) / rect.width) * 100;
                                            const clampedX = Math.max(5, Math.min(95, x));
                                            setPlayerX(clampedX);
                                            playerRef.current = clampedX;
                                        }
                                    }}
                                    onTouchMove={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const touch = e.touches[0];
                                        const x = ((touch.clientX - rect.left) / rect.width) * 100;
                                        const clampedX = Math.max(5, Math.min(95, x));
                                        setPlayerX(clampedX);
                                        playerRef.current = clampedX;
                                    }}
                                >
                                    {/* Track Background Accent */}
                                    <div className="absolute inset-0 bg-gradient-to-r from-teal-500/5 to-white/5 pointer-events-none" />
                                    
                                    {/* Dynamic Track Progress (Glow follows player) */}
                                    <div 
                                        className="absolute inset-y-0 left-0 bg-teal-400/20 blur-xl pointer-events-none transition-all duration-300"
                                        style={{ width: `${playerX}%` }}
                                    />

                                    {/* Center Guideline */}
                                    <div className="absolute inset-y-4 left-1/2 -translate-x-1/2 w-px bg-white/10" />
                                    
                                    {/* Thumb / Handle */}
                                    <div 
                                        className="absolute w-20 h-14 bg-white/10 backdrop-blur-md rounded-2xl border border-white/40 shadow-2xl flex flex-col items-center justify-center transition-all duration-75 group active:scale-95"
                                        style={{ 
                                            left: `${playerX}%`, 
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)' 
                                        }}
                                    >
                                        {/* Teal Glow Pulse when Active */}
                                        <div className="absolute inset-0 bg-teal-400/20 blur-md rounded-2xl opacity-0 group-active:opacity-100 transition-opacity" />
                                        
                                        <div className="flex gap-1.5 z-10">
                                            <div className="w-1 h-5 bg-white/40 rounded-full" />
                                            <div className="w-1 h-5 bg-teal-400 rounded-full shadow-[0_0_10px_rgba(45,212,191,0.5)]" />
                                            <div className="w-1 h-5 bg-white/40 rounded-full" />
                                        </div>
                                        <span className="text-[6px] font-black text-white/40 uppercase tracking-[0.2em] mt-1.5">Slide</span>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </>
            )}

            {gameState === 'GAME_OVER' && (
                <div className="relative z-10 max-w-xl w-full p-6 md:p-8 text-center animate-pop-in flex flex-col items-center stickman-rescue-results">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-teal-500 rounded-3xl md:rounded-[2.5rem] mb-6 md:mb-8 flex items-center justify-center p-5 md:p-6 shadow-2xl border-2 md:border-4 border-white">
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                        </svg>
                    </div>
                    <h2 className="text-3xl md:text-6xl font-black text-white mb-3 md:mb-4 uppercase tracking-tighter">Don't Give Up!</h2>
                    <p className="text-teal-200 text-base md:text-xl font-bold mb-4 md:mb-6 uppercase tracking-widest text-balance">Mistakes are part of learning. Try again!</p>
                    <div className="flex gap-4 md:gap-6 mb-6 md:mb-8">
                        <div className="flex flex-col items-center">
                            <p className="text-white/50 text-[10px] md:text-xs font-black uppercase tracking-widest">Progress</p>
                            <p className="text-white text-xl md:text-2xl font-black">{score}/12</p>
                        </div>
                        {maxStreak > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="text-white/50 text-[10px] md:text-xs font-black uppercase tracking-widest">Best Streak</p>
                                <p className="text-orange-400 text-xl md:text-2xl font-black">🔥 {maxStreak}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-3 md:gap-4 w-full stickman-rescue-retry-btns">
                        <button onClick={startGame} className="w-full py-4 md:py-5 bg-white text-slate-900 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-base md:text-lg shadow-xl hover:bg-slate-100 transition-all">Try Again</button>
                        <button onClick={onExit} className="w-full py-3.5 md:py-5 bg-white/10 text-white border border-white/20 rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-[9px] md:text-xs transition-all opacity-50">Return</button>
                    </div>
                </div>
            )}

            {gameState === 'RESULTS' && (
                <div className="relative z-10 max-w-xl w-full p-6 md:p-8 text-center animate-pop-in flex flex-col items-center stickman-rescue-results">
                    <div className="w-24 h-24 md:w-32 md:h-32 bg-teal-400 rounded-3xl md:rounded-[2.5rem] mb-6 md:mb-8 flex items-center justify-center shadow-2xl border-2 md:border-4 border-white overflow-hidden">
                        <img src="/stickman_assets/hope_stickman.svg" alt="Success" className="w-16 h-16 md:w-20 md:h-20 drop-shadow-lg" />
                    </div>
                    <h2 className="text-3xl md:text-6xl font-black text-white mb-3 md:mb-4 uppercase tracking-tighter">Rescue Mission</h2>
                    <div className="flex gap-4 md:gap-6 mb-4">
                        <div className="flex flex-col items-center">
                            <p className="text-teal-200 text-xs md:text-sm font-bold uppercase tracking-widest">Final Score</p>
                            <p className="text-white text-2xl md:text-3xl font-black">{score}/12</p>
                        </div>
                        {maxStreak > 0 && (
                            <div className="flex flex-col items-center">
                                <p className="text-orange-200 text-xs md:text-sm font-bold uppercase tracking-widest">Max Streak</p>
                                <p className="text-orange-400 text-2xl md:text-3xl font-black">🔥 {maxStreak}</p>
                            </div>
                        )}
                    </div>
                    <div className="bg-white/10 backdrop-blur-xl rounded-xl md:rounded-2xl p-6 md:p-8 mb-8 md:mb-12 border border-white/20">
                        <p className="text-white text-sm md:text-lg font-medium leading-relaxed italic">"You have successfully navigated the language of stigma. Choosing the right words is the first step in saving a life."</p>
                    </div>
                    {/* Review Section (Only for Breeze/Easy) */}
                    {difficulty === 'EASY' && !review.submitted && (
                        <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 animate-fade-in">
                            <h3 className="text-teal-400 font-black uppercase tracking-widest text-xs mb-4">How was your learning experience?</h3>
                            
                            {/* Star Rating */}
                            <div className="flex justify-center gap-3 mb-4">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button 
                                        key={star}
                                        onClick={() => setReview(prev => ({ ...prev, rating: star }))}
                                        className={`text-2xl transition-all transform active:scale-90 ${review.rating >= star ? 'scale-110' : 'grayscale opacity-30 hover:opacity-50'}`}
                                    >
                                        ⭐
                                    </button>
                                ))}
                            </div>

                            <textarea 
                                value={review.comment}
                                onChange={(e) => setReview(prev => ({ ...prev, comment: e.target.value }))}
                                placeholder="Your thoughts on the language of hope..."
                                className="w-full bg-black/20 border border-white/10 rounded-xl p-4 text-white text-xs font-medium placeholder:text-white/20 focus:outline-none focus:border-teal-500/50 transition-all mb-4 resize-none h-20"
                            />

                            <button
                                onClick={handleReviewSubmit}
                                disabled={review.loading || !review.rating || !review.comment.trim()}
                                className={`w-full py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${review.rating && review.comment.trim() ? 'bg-teal-500/20 text-teal-400 border border-teal-400/30 hover:bg-teal-400/30' : 'bg-white/5 text-white/20 border border-white/5 cursor-not-allowed'}`}
                            >
                                {review.loading ? 'Sending...' : 'Submit Feedback'}
                            </button>
                        </div>
                    )}

                    {review.submitted && (
                        <div className="w-full bg-teal-500/10 border border-teal-500/30 rounded-2xl p-6 mb-8 animate-pop-in">
                            <p className="text-teal-400 font-black uppercase tracking-widest text-[10px]">Thank you for your feedback! 💖</p>
                        </div>
                    )}


                    {(difficulty !== 'EASY' || review.submitted) && (
                        <button onClick={onExit} className="w-full py-4 md:py-5 bg-teal-500 text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-base md:text-lg shadow-2xl hover:bg-teal-400 transition-all animate-pop-in">
                            Complete Module
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
