document.addEventListener('DOMContentLoaded', () => {

    // --- DOM References ---
    const timerForm = document.getElementById('timerForm');
    const timerNameInput = document.getElementById('timerName');
    const timerDurationInput = document.getElementById('timerDuration');
    const timersContainer = document.getElementById('timersContainer');
    const timerTemplate = document.getElementById('timerTemplate');
    const timerLogList = document.getElementById('timerLogList'); // NEW: For log

    // --- NEW: Audio Setup ---
    // Create a single AudioContext to be reused
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    /**
     * Plays a short beep sound.
     */
    function playBeep() {
        if (!audioCtx) return; // Audio not supported
        
        // Use a simple oscillator to create a beep
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine'; // A clean sine wave
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A high "A" note
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime); // Start at 30% volume

        // Ramp down volume quickly to create a "beep"
        gainNode.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.2);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        oscillator.start(audioCtx.currentTime);
        oscillator.stop(audioCtx.currentTime + 0.2);
    }

    // --- SVG Circle Calculations ---
    const CIRCLE_RADIUS = 45;
    const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

    // --- State ---
    /** @type {Array<Object>} */
    let activeTimers = [];
    let isAnimationLoopRunning = false;

    // --- Functions ---

    /**
     * Creates and starts a new timer.
     * @param {string} name - The label for the timer.
     * @param {number} durationInMinutes - The duration in minutes.
     */
    function createTimer(name, durationInMinutes) {
        const totalDurationMs = durationInMinutes * 60 * 1000;
        const now = Date.now();
        const endTime = now + totalDurationMs;

        const templateClone = timerTemplate.content.cloneNode(true);
        const timerInstanceEl = templateClone.querySelector('.timer-instance');
        const labelEl = templateClone.querySelector('.timer-label');
        const pathEl = templateClone.querySelector('.timer-path-remaining');
        const timeDisplayEl = templateClone.querySelector('.timer-time-display');
        const pauseButtonEl = templateClone.querySelector('.timer-toggle-pause');

        labelEl.textContent = name;
        timeDisplayEl.textContent = formatTime(totalDurationMs);
        pathEl.setAttribute("stroke-dasharray", CIRCUMFERENCE);
        pathEl.setAttribute("stroke-dashoffset", 0);

        // NEW: Add a span inside the pause button for text-swapping
        const pauseButtonText = document.createElement('span');
        pauseButtonText.textContent = 'Pause';
        pauseButtonEl.appendChild(pauseButtonText);

        const timerObj = {
            element: timerInstanceEl,
            pathElement: pathEl,
            timeDisplayElement: timeDisplayEl,
            endTime: endTime,
            totalDuration: totalDurationMs,
            name: name, // NEW: Store name for logging
            isFinished: false,
            isPaused: false, // NEW: Pause state
            timeRemainingWhenPaused: 0 // NEW: Store remaining time
        };

        timersContainer.appendChild(templateClone);
        activeTimers.push(timerObj);

        if (!isAnimationLoopRunning) {
            startAnimationLoop();
        }
    }

    /**
     * Starts the global requestAnimationFrame loop.
     */
    function startAnimationLoop() {
        isAnimationLoopRunning = true;
        requestAnimationFrame(updateAllTimers);
    }

    /**
     * The core animation loop. Updates all active timers.
     */
    function updateAllTimers() {
        const now = Date.now();
        let hasActiveTimers = false;

        for (const timer of activeTimers) {
            // NEW: Skip timers that are finished OR paused
            if (timer.isFinished || timer.isPaused) {
                if (!timer.isFinished) hasActiveTimers = true; // Keep loop running if paused
                continue;
            }

            const timeRemaining = timer.endTime - now;

            if (timeRemaining <= 0) {
                // Timer finished
                timer.isFinished = true;
                timer.pathElement.setAttribute("stroke-dashoffset", CIRCUMFERENCE);
                timer.timeDisplayElement.textContent = 'Done!';
                timer.element.classList.add('finished');
                
                playBeep(); // NEW: Play sound
                logTimer(timer); // NEW: Log the timer
            } else {
                // Timer still running
                const remainingPercent = timeRemaining / timer.totalDuration;
                const offset = CIRCUMFERENCE * (1 - remainingPercent);
                timer.pathElement.setAttribute("stroke-dashoffset", offset);
                timer.timeDisplayElement.textContent = formatTime(timeRemaining);
                hasActiveTimers = true; // Mark that we still have work to do
            }
        }

        if (hasActiveTimers) {
            requestAnimationFrame(updateAllTimers);
        } else {
            isAnimationLoopRunning = false;
        }
    }

    /**
     * NEW: Toggles the pause state of a timer.
     * @param {Object} timerObj - The timer object from the activeTimers array.
     */
    function togglePause(timerObj) {
        timerObj.isPaused = !timerObj.isPaused; // Flip the pause state

        if (timerObj.isPaused) {
            // --- PAUSING ---
            // Store how much time was left
            timerObj.timeRemainingWhenPaused = timerObj.endTime - Date.now();
            timerObj.element.classList.add('paused');
        } else {
            // --- RESUMING ---
            // Calculate new end time based on when we resumed
            timerObj.endTime = Date.now() + timerObj.timeRemainingWhenPaused;
            timerObj.element.classList.remove('paused');
            
            // Ensure animation loop is running
            if (!isAnimationLoopRunning) {
                startAnimationLoop();
            }
        }
    }

    /**
     * NEW: Adds a completed timer to the log.
     * @param {Object} timerObj - The timer object that just finished.
     */
    function logTimer(timerObj) {
        // Format total duration (which is in ms) to MM:SS
        const totalSeconds = Math.round(timerObj.totalDuration / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        // Create and add the log list item
        const logItem = document.createElement('li');
        logItem.innerHTML = `<strong>${timerObj.name}</strong> - ${timeString}`;
        
        // Add to top of list
        timerLogList.prepend(logItem);
    }

    /**
     * Formats milliseconds into a MM:SS string.
     * @param {number} ms - Milliseconds remaining.
     * @returns {string} - Formatted time string.
     */
    function formatTime(ms) {
        const totalSeconds = Math.ceil((ms + 999) / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60);

        return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    /**
     * Removes a timer from the DOM and the activeTimers array.
     * @param {HTMLElement} timerInstanceElement - The .timer-instance element to remove.
     */
    function removeTimer(timerInstanceElement) {
        const index = activeTimers.findIndex(timer => timer.element === timerInstanceElement);
        if (index > -1) {
            activeTimers.splice(index, 1);
        }
        timerInstanceElement.remove();
    }

    // --- Event Listeners ---

    timerForm.addEventListener('submit', (event) => {
        event.preventDefault(); 
        const name = timerNameInput.value.trim() || "Untitled Timer";
        const duration = parseFloat(timerDurationInput.value);

        if (isNaN(duration) || duration <= 0) {
            alert('Please enter a valid duration in minutes.');
            return;
        }
        createTimer(name, duration);
        timerNameInput.value = '';
        timerDurationInput.value = '';
        timerNameInput.focus();
    });

    // MODIFIED: Click listener now handles delete AND pause
    timersContainer.addEventListener('click', (event) => {
        const timerInstance = event.target.closest('.timer-instance');
        if (!timerInstance) return; // Click was not inside a timer

        // Find the corresponding timer object
        const timerObj = activeTimers.find(timer => timer.element === timerInstance);
        if (!timerObj) return;

        // Case 1: Clicked delete button
        if (event.target.classList.contains('timer-delete')) {
            removeTimer(timerInstance);
        }
        
        // Case 2: Clicked pause/resume button
        if (event.target.classList.contains('timer-toggle-pause')) {
            if (!timerObj.isFinished) { // Don't allow pause on finished timers
                togglePause(timerObj);
            }
        }
    });
});