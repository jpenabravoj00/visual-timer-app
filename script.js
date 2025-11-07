document.addEventListener('DOMContentLoaded', () => {

    // --- DOM References ---
    const timerForm = document.getElementById('timerForm');
    const timerNameInput = document.getElementById('timerName');
    const timerDurationInput = document.getElementById('timerDuration');
    const timersContainer = document.getElementById('timersContainer');
    const timerTemplate = document.getElementById('timerTemplate');

    // --- NEW: SVG Circle Calculations ---
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

        // 1. Clone template
        const templateClone = timerTemplate.content.cloneNode(true);
        const timerInstanceEl = templateClone.querySelector('.timer-instance');
        const labelEl = templateClone.querySelector('.timer-label');
        
        // --- MODIFIED: Get SVG path instead of disk div ---
        const pathEl = templateClone.querySelector('.timer-path-remaining');
        const timeDisplayEl = templateClone.querySelector('.timer-time-display');

        // 2. Set initial values
        labelEl.textContent = name;
        timeDisplayEl.textContent = formatTime(totalDurationMs);
        
        // --- NEW: Set initial SVG properties ---
        pathEl.setAttribute("stroke-dasharray", CIRCUMFERENCE);
        pathEl.setAttribute("stroke-dashoffset", 0); // Start with a full ring

        // 3. Create timer state object
        const timerObj = {
            element: timerInstanceEl,
            pathElement: pathEl, // <-- MODIFIED: Storing path element
            timeDisplayElement: timeDisplayEl,
            endTime: endTime,
            totalDuration: totalDurationMs,
            isFinished: false
        };

        // 4. Add to DOM and state array
        timersContainer.appendChild(templateClone);
        activeTimers.push(timerObj);

        // 5. Start a (single) animation loop if not already running
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
            if (timer.isFinished) {
                continue;
            }

            const timeRemaining = timer.endTime - now;

            if (timeRemaining <= 0) {
                // Timer finished
                timer.isFinished = true;
                // --- MODIFIED: Set offset to full circumference to "empty" the ring ---
                timer.pathElement.setAttribute("stroke-dashoffset", CIRCUMFERENCE);
                timer.timeDisplayElement.textContent = 'Done!';
                timer.element.classList.add('finished');
            } else {
                // Timer still running
                const remainingPercent = timeRemaining / timer.totalDuration;
                
                // --- MODIFIED: Calculate and set stroke-dashoffset ---
                const offset = CIRCUMFERENCE * (1 - remainingPercent);
                timer.pathElement.setAttribute("stroke-dashoffset", offset);
                
                timer.timeDisplayElement.textContent = formatTime(timeRemaining);
                hasActiveTimers = true; // Mark that we still have work to do
            }
        }

        // If there are still active timers, request the next frame.
        // Otherwise, stop the loop.
        if (hasActiveTimers) {
            requestAnimationFrame(updateAllTimers);
        } else {
            isAnimationLoopRunning = false;
        }
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

    // --- Event Listeners (No changes here) ---

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

    timersContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('timer-delete')) {
            const timerInstance = event.target.closest('.timer-instance');
            if (timerInstance) {
                removeTimer(timerInstance);
            }
        }
    });

});