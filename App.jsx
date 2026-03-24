import React, { useEffect } from 'react';
import WordsOfHopeScreen from './WordsOfHopeScreen';
import { audioManager } from './audio';
import './App.css';
import './index.css';

const App = () => {
    // Initialize audio on first interact
    useEffect(() => {
        const initAudio = () => {
            audioManager.init();
            document.removeEventListener('click', initAudio);
            document.removeEventListener('touchstart', initAudio);
        };
        document.addEventListener('click', initAudio);
        document.addEventListener('touchstart', initAudio);
    }, []);

    const handleExit = () => {
        if (confirm("Reset the path of wisdom?")) {
            window.location.reload();
        }
    };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
            <WordsOfHopeScreen 
                audioManager={audioManager} 
                onExit={handleExit} 
                isPaused={false} 
                playerGender="guy" 
            />
        </div>
    );
};

export default App;
