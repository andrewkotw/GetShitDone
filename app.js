// =========================================================
      // State and Shortcuts
      // =========================================================

      const state = {
        missionTitle: "Finish report",
        consequence: "10 push-ups",
        reward: "make yourself the hero",
        tasks: [],
        activeTaskIndex: 0,
        remainingSeconds: 0,
        breakBankSeconds: 0,
        breakRemainingSeconds: 0,
        mode: "setup",
        timerId: null,
        taskStartedAt: null,
        lastTickAt: null,
        focusedWorkSinceBonus: 0,
        earningPeriodSeconds: 0,
        breakEarnRatio: 6,
        intervalBonusEvery: 30 * 60,
        intervalBonusAmount: 5 * 60,
        soundEnabled: true,
        audioContext: null,

        missionDurationSeconds: 0,
        missionStartedAt: null,
        missionEndedAt: null,
      };

      const $ = (id) => document.getElementById(id);

      const SETTINGS_KEY = "get-shit-done-settings-v1";

      let draggedRow = null;
      let pipTimerEl = null;
      let pipTaskEl = null;
      let pipWindowRef = null;
      let pipOpenedAt = 0;

      // =========================================================
      // Local Settings
      // =========================================================

      function saveSettings() {
        const settings = {
          breakEarnRatio: state.breakEarnRatio,
          intervalBonusEvery: state.intervalBonusEvery,
          intervalBonusAmount: state.intervalBonusAmount,
          soundEnabled: state.soundEnabled,
          heroName: $("hero-name")?.value || "human",
          missionHours: $("mission-hours")?.value || "1",
          missionMinutes: $("mission-minutes")?.value || "30",
        };

        localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      }

      function loadSettings() {
        const saved = localStorage.getItem(SETTINGS_KEY);
        if (!saved) return;

        try {
          const settings = JSON.parse(saved);

          state.breakEarnRatio = Number(settings.breakEarnRatio) || 6;
          state.intervalBonusEvery = Number(settings.intervalBonusEvery) || 30 * 60;
          state.intervalBonusAmount = Number(settings.intervalBonusAmount) || 5 * 60;
          state.soundEnabled = settings.soundEnabled !== false;

          if ($("hero-name")) {
            $("hero-name").value = settings.heroName || "human";
          }

          if ($("mission-hours")) {
            $("mission-hours").value = settings.missionHours || "1";
          }

          if ($("mission-minutes")) {
            $("mission-minutes").value = String(settings.missionMinutes || "30").padStart(2, "0");
          }
        } catch (error) {
          console.warn("Could not load saved settings:", error);
        }
      }

      function setupSettingsAutoSave() {
        ["hero-name", "mission-hours", "mission-minutes"].forEach((id) => {
          const input = $(id);
          if (!input) return;

          input.addEventListener("change", saveSettings);
          input.addEventListener("blur", saveSettings);
        });
      }

      function applySettingsToUI() {
        if ($("sound-toggle")) {
          $("sound-toggle").textContent = state.soundEnabled ? "Sound ON" : "Sound OFF";
          $("sound-toggle").classList.toggle("off", !state.soundEnabled);
        }

        if ($("break-ratio-slider")) {
          $("break-ratio-slider").value = state.breakEarnRatio;
        }

        if ($("bonus-interval-slider")) {
          $("bonus-interval-slider").value = Math.round(state.intervalBonusEvery / 60);
        }

        if (typeof updateBreakRulesUI === "function") {
          updateBreakRulesUI();
        }
      }

      // =========================================================
      // Audio and Notifications
      // =========================================================

      function ensureAudio() {
        if (!state.soundEnabled) return null;

        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return null;

        if (!state.audioContext) {
          state.audioContext = new AudioContext();
        }

        if (state.audioContext.state === "suspended") {
          state.audioContext.resume();
        }

        return state.audioContext;
      }

      function beep(freq, start, duration, type = "sine", gain = 0.045) {
        const ctx = ensureAudio();
        if (!ctx) return;

        const osc = ctx.createOscillator();
        const volume = ctx.createGain();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime + start);

        volume.gain.setValueAtTime(0.0001, ctx.currentTime + start);
        volume.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + start + 0.015);
        volume.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration);

        osc.connect(volume).connect(ctx.destination);
        osc.start(ctx.currentTime + start);
        osc.stop(ctx.currentTime + start + duration + 0.03);
      }

      function playSound(kind) {
        if (!state.soundEnabled) return;

        const soundMap = {
          start: [
            [220, 0, 0.08, "square", 0.035],
            [330, 0.09, 0.08, "square", 0.035],
            [440, 0.18, 0.12, "square", 0.04],
          ],
          done: [
            [392, 0, 0.07, "square", 0.04],
            [523, 0.08, 0.1, "square", 0.045],
          ],
          break: [
            [523, 0, 0.12, "sine", 0.035],
            [659, 0.13, 0.18, "sine", 0.035],
          ],
          return: [
            [330, 0, 0.07, "triangle", 0.035],
            [247, 0.08, 0.1, "triangle", 0.03],
          ],
          success: [
            [330, 0, 0.08, "square", 0.04],
            [440, 0.09, 0.08, "square", 0.04],
            [554, 0.18, 0.08, "square", 0.04],
            [660, 0.28, 0.18, "square", 0.045],
          ],
          fail: [
            [180, 0, 0.16, "sawtooth", 0.035],
            [120, 0.18, 0.25, "sawtooth", 0.035],
          ],
          warning: [
            [220, 0, 0.08, "square", 0.03],
            [220, 0.14, 0.08, "square", 0.03],
          ],
          extend: [
            [294, 0, 0.08, "triangle", 0.035],
            [392, 0.1, 0.12, "triangle", 0.035],
          ],
        };

        soundMap[kind]?.forEach((args) => beep(...args));
      }

      function toggleSound() {
        state.soundEnabled = !state.soundEnabled;

        const btn = $("sound-toggle");
        btn.textContent = state.soundEnabled ? "Sound ON" : "Sound OFF";
        btn.classList.toggle("off", !state.soundEnabled);

        if (state.soundEnabled) {
          playSound("done");
        }

        saveSettings();
      }

      function requestNotificationPermission() {
        if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
          Notification.requestPermission();
        }
      }

      function sendNotification(title, body) {
        if (!("Notification" in window) || Notification.permission !== "granted") return;

        new Notification(title, {
          body,
          icon: "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>⚡</text></svg>",
        });
      }

      // =========================================================
      // Navigation and Page Flow
      // =========================================================

      function showPage(id) {
        document.querySelectorAll(".page").forEach((page) => {
          page.classList.remove("active");
        });

        $(id).classList.add("active");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function goToStakes() {
        state.missionTitle = $("mission-title").value.trim() || "Unnamed mission";
        showPage("stakes-page");
      }

      function goToTasks() {
        state.consequence = $("consequence").value.trim() || "accept the consequence";
        state.reward = $("reward").value.trim() || "enjoy the victory";

        if ($("task-list").children.length === 0) {
          addTask("", "Write one clear target");
        }

        showPage("tasks-page");
      }

      function jumpToStart() {
        const ok = confirm("Are you sure you want to jump back to the start? This will clear the current mission.");
        if (!ok) return;

        clearAllData();
        showPage("setup-page");
      }

      // =========================================================
      // Task Editor and Drag-and-Drop
      // =========================================================

      function addTask(value = "", placeholder = "Write one clear target", afterRow = null) {
        const list = $("task-list");
        const row = document.createElement("div");

        row.className = "task-row";
        row.draggable = true;
        row.innerHTML = `
    <div style="cursor: grab; color: #a1a1aa; font-weight: bold; padding-right: 5px; user-select: none;">⋮</div>
    <input value="${escapeHtml(value)}" placeholder="${escapeHtml(placeholder)}" onkeydown="handleTaskKeydown(event, this)" />
    <button class="icon-btn" onclick="this.parentElement.remove()" title="Remove target">×</button>
  `;

        setupTaskDragHandlers(row, list);

        if (afterRow && afterRow.parentElement === list) {
          afterRow.insertAdjacentElement("afterend", row);
        } else {
          list.appendChild(row);
        }

        return row;
      }

      function setupTaskDragHandlers(row, list) {
        row.addEventListener("dragstart", (event) => {
          draggedRow = row;
          event.dataTransfer.effectAllowed = "move";
          row.style.opacity = "0.5";
        });

        row.addEventListener("dragend", () => {
          draggedRow = null;
          row.style.opacity = "1";
          document.querySelectorAll(".task-row").forEach((el) => {
            el.style.borderTop = "";
          });
        });

        row.addEventListener("dragover", (event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = "move";

          if (draggedRow !== row) {
            row.style.borderTop = "2px solid var(--accent)";
          }
        });

        row.addEventListener("dragleave", () => {
          row.style.borderTop = "";
        });

        row.addEventListener("drop", (event) => {
          event.preventDefault();
          row.style.borderTop = "";

          if (draggedRow && draggedRow !== row) {
            list.insertBefore(draggedRow, row);
          }
        });
      }

      function handleTaskKeydown(event, input) {
        if (event.key !== "Enter") return;

        event.preventDefault();

        const newRow = addTask("", "Next target", input.parentElement);
        const newInput = newRow.querySelector("input");
        newInput.focus();
      }

      // =========================================================
      // Form Inputs and Time Controls
      // =========================================================

      function stepNumber(id, delta) {
        const input = $(id);
        const min = input.min === "" ? -Infinity : parseInt(input.min, 10);
        const max = input.max === "" ? Infinity : parseInt(input.max, 10);
        const current = parseInt(input.value || "0", 10);
        const next = Math.max(min, Math.min(max, current + delta));

        if (id.includes("minutes")) {
          input.value = String(next).padStart(2, "0");
        } else {
          input.value = next;
        }
      }

      function formatMinuteInput(input) {
        const min = input.min === "" ? 0 : parseInt(input.min, 10);
        const max = input.max === "" ? 59 : parseInt(input.max, 10);
        const value = Math.max(min, Math.min(max, parseInt(input.value || "0", 10)));

        input.value = String(value).padStart(2, "0");
      }

      // =========================================================
      // Mission Lifecycle
      // =========================================================

      function startMission() {
        requestNotificationPermission();

        const hours = Math.max(0, parseInt($("mission-hours").value || "0", 10));
        const minutes = Math.max(0, parseInt($("mission-minutes").value || "0", 10));

        state.remainingSeconds = Math.max(60, hours * 3600 + minutes * 60);
        state.missionDurationSeconds = state.remainingSeconds;
        state.missionStartedAt = Date.now();
        state.missionEndedAt = null;
        state.tasks = collectTasksFromEditor();

        if (state.tasks.length === 0) {
          state.tasks = [createTask(state.missionTitle)];
        }

        state.activeTaskIndex = 0;
        state.breakBankSeconds = 0;
        state.breakRemainingSeconds = 0;
        state.focusedWorkSinceBonus = 0;
        state.earningPeriodSeconds = 0;
        state.mode = "work";
        state.taskStartedAt = Date.now();
        state.lastTickAt = Date.now();
        state.tasks[0].status = "active";

        $("active-mission-title").textContent = state.missionTitle;

        updateDisplay();
        showPage("active-page");
        startTicking();
        playSound("start");
      }

      function collectTasksFromEditor() {
        return [...document.querySelectorAll("#task-list input")]
          .map((input) => input.value.trim())
          .filter(Boolean)
          .map(createTask);
      }

      function createTask(title) {
        return {
          title,
          status: "pending",
          startedAt: null,
          completedAt: null,
          workDurationSeconds: 0,
          breakEarnedSeconds: 0,
        };
      }

      function completeTask() {
        if (state.mode !== "work") return;

        applyElapsedTimerTime();
        if (state.mode !== "work") return;

        const task = state.tasks[state.activeTaskIndex];
        const now = Date.now();
        const duration = Math.max(1, state.earningPeriodSeconds);
        const earned = Math.round(duration / state.breakEarnRatio);

        task.status = "done";
        task.completedAt = now;
        task.workDurationSeconds = duration;
        task.breakEarnedSeconds = earned;

        state.breakBankSeconds += earned;
        state.earningPeriodSeconds = 0;

        if ("totalBreakEarnedSeconds" in state) {
          state.totalBreakEarnedSeconds += earned;
        }

        playSound("done");

        const nextIndex = state.tasks.findIndex((task) => task.status !== "done");

        if (nextIndex === -1) {
          succeedMission();
          return;
        }

        state.activeTaskIndex = nextIndex;
        state.tasks[nextIndex].status = "active";
        state.taskStartedAt = Date.now();

        updateDisplay();
      }

      function skipTask() {
        if (state.mode !== "work") return;

        applyElapsedTimerTime();
        if (state.mode !== "work") return;
        if (state.tasks.length <= 1) return;

        const currentTask = state.tasks[state.activeTaskIndex];

        currentTask.status = "pending";

        state.tasks.splice(state.activeTaskIndex, 1);
        state.tasks.push(currentTask);

        const nextIndex = state.tasks.findIndex((task) => task.status !== "done");

        if (nextIndex === -1) {
          succeedMission();
          return;
        }

        state.activeTaskIndex = nextIndex;
        state.tasks[state.activeTaskIndex].status = "active";

        // Important:
        // Do NOT reset state.taskStartedAt here.
        // The work time should continue accumulating until any task is completed.

        updateDisplay();
      }

      function pauseMission() {
        if (state.mode !== "work") return;

        applyElapsedTimerTime();
        state.mode = "paused-work";
        state.lastTickAt = Date.now();
        updateDisplay();
      }

      function resumeMission() {
        if (state.mode !== "paused-work") return;

        state.mode = "work";
        state.lastTickAt = Date.now();
        updateDisplay();
      }

      function togglePauseMission() {
        if (state.mode === "work") {
          pauseMission();
          return;
        }

        if (state.mode === "paused-work") {
          resumeMission();
        }
      }

      function takeBreak() {
        if (state.mode !== "work") return;

        if (state.breakBankSeconds <= 0) {
          $("empty-break-modal").classList.add("show");
          playSound("warning");
          return;
        }

        applyElapsedTimerTime();
        if (state.mode !== "work") return;

        state.mode = "break";
        state.breakRemainingSeconds = state.breakBankSeconds;
        state.lastTickAt = Date.now();

        updateDisplay();
        showPage("break-page");
        playSound("break");
      }

      function returnToWork() {
        if (state.mode !== "break" && state.mode !== "paused") return;

        state.mode = "work";
        state.lastTickAt = Date.now();

        updateDisplay();
        showPage("active-page");
        playSound("return");
      }

      function extendMission() {
        const add = Math.max(1, parseInt($("extend-minutes").value || "10", 10));

        state.remainingSeconds += add * 60;
        $("extend-modal").classList.remove("show");
        state.mode = "work";
        state.lastTickAt = Date.now();

        updateDisplay();
        playSound("extend");
      }

      function succeedMission() {
        clearInterval(state.timerId);

        state.mode = "success";
        state.missionEndedAt = Date.now();

        $("result-title").textContent = "Mission complete";
        $("result-label").textContent = "Your reward";
        $("result-text").textContent = state.reward;

        renderSessionSummary();

        showPage("result-page");
        playSound("success");
      }

      function failMission() {
        clearInterval(state.timerId);

        $("extend-modal").classList.remove("show");

        state.mode = "failed";
        state.missionEndedAt = Date.now();

        $("result-title").textContent = "Mission failed";
        $("result-label").textContent = "Your consequence";
        $("result-text").textContent = state.consequence;

        renderSessionSummary();

        showPage("result-page");
        playSound("fail");
      }

      function resetApp() {
        clearAllData();
        showPage("setup-page");
      }

      function clearAllData() {
        clearInterval(state.timerId);
        $("extend-modal").classList.remove("show");
        $("empty-break-modal").classList.remove("show");

        state.missionTitle = "Finish report";
        state.consequence = "10 push-ups";
        state.reward = "make yourself the hero";
        state.tasks = [];
        state.activeTaskIndex = 0;
        state.remainingSeconds = 0;
        state.breakBankSeconds = 0;
        state.breakRemainingSeconds = 0;
        state.mode = "setup";
        state.timerId = null;
        state.taskStartedAt = null;
        state.lastTickAt = null;
        state.focusedWorkSinceBonus = 0;
        state.earningPeriodSeconds = 0;
        state.missionDurationSeconds = 0;
        state.missionStartedAt = null;
        state.missionEndedAt = null;

        $("mission-title").value = "Finish report";
        const saved = localStorage.getItem(SETTINGS_KEY);

        if (saved) {
          loadSettings();
          applySettingsToUI();
        } else {
          $("hero-name").value = "human";
          $("mission-hours").value = 1;
          $("mission-minutes").value = "30";
        }
        $("consequence").value = "";
        $("reward").value = "";
        $("task-list").innerHTML = "";
        $("extend-minutes").value = 10;
        $("mercy-break-minutes").value = 3;

        if ($("session-summary")) {
          $("session-summary").innerHTML = "";
        }

        updateDisplay();
      }

      // =========================================================
      // Mercy Break Modal
      // =========================================================

      function closeEmptyBreakModal() {
        $("empty-break-modal").classList.remove("show");
      }

      function grantMercyBreak() {
        const minutes = Math.max(1, parseInt($("mercy-break-minutes").value || "3", 10));

        state.breakBankSeconds += minutes * 60;
        $("empty-break-modal").classList.remove("show");
        takeBreak();
      }

      // =========================================================
      // Timer Loop
      // =========================================================

      function startTicking() {
        clearInterval(state.timerId);
        state.lastTickAt = Date.now();

        state.timerId = setInterval(() => {
          applyElapsedTimerTime();
          updateDisplay();
        }, 1000);
      }

      function applyElapsedTimerTime() {
        if (state.mode !== "work" && state.mode !== "break") {
          state.lastTickAt = Date.now();
          return;
        }

        const now = Date.now();

        if (!state.lastTickAt) {
          state.lastTickAt = now;
          return;
        }

        const elapsedSeconds = Math.floor((now - state.lastTickAt) / 1000);
        if (elapsedSeconds <= 0) return;

        state.lastTickAt += elapsedSeconds * 1000;

        if (state.mode === "work") {
          applyWorkElapsedSeconds(elapsedSeconds);
          return;
        }

        if (state.mode === "break") {
          applyBreakElapsedSeconds(elapsedSeconds);
        }
      }

      function applyWorkElapsedSeconds(elapsedSeconds) {
        const workSeconds = Math.min(elapsedSeconds, state.remainingSeconds);

        state.remainingSeconds = Math.max(0, state.remainingSeconds - elapsedSeconds);
        state.focusedWorkSinceBonus += workSeconds;
        state.earningPeriodSeconds += workSeconds;

        earnIntervalBonusesIfNeeded();

        if (state.remainingSeconds <= 0) {
          pauseForEmergencyTime();
        }
      }

      function applyBreakElapsedSeconds(elapsedSeconds) {
        const breakSeconds = Math.min(elapsedSeconds, state.breakRemainingSeconds, state.breakBankSeconds);

        state.breakRemainingSeconds = Math.max(0, state.breakRemainingSeconds - breakSeconds);
        state.breakBankSeconds = Math.max(0, state.breakBankSeconds - breakSeconds);

        if (state.breakRemainingSeconds <= 0 || state.breakBankSeconds <= 0) {
          returnToWork();
        }
      }

      function earnIntervalBonusesIfNeeded() {
        if (state.intervalBonusEvery <= 0) return;

        let bonusesEarned = 0;

        while (state.focusedWorkSinceBonus >= state.intervalBonusEvery) {
          state.focusedWorkSinceBonus -= state.intervalBonusEvery;
          bonusesEarned++;
        }

        if (bonusesEarned <= 0) return;

        state.breakBankSeconds += state.intervalBonusAmount * bonusesEarned;
        playSound("break");

        const bonusMinutes = Math.round((state.intervalBonusAmount * bonusesEarned) / 60);
        sendNotification("Bonus Time Earned!", `+${bonusMinutes} minutes added to your break bank.`);
      }

      function pauseForEmergencyTime() {
        state.remainingSeconds = 0;
        state.mode = "paused";
        state.lastTickAt = Date.now();

        updateDisplay();
        $("extend-modal").classList.add("show");
        playSound("warning");
        sendNotification("Timer Paused", "Time is up! Add emergency time or accept your consequence.");
      }

      // =========================================================
      // Break Rule Settings
      // =========================================================

      function toggleRulesPanel() {
        const panel = $("rules-panel");
        const toggle = $("rules-toggle");

        const isOpen = panel.classList.toggle("show");

        toggle.setAttribute("aria-expanded", String(isOpen));
        toggle.textContent = isOpen ? "Hide ▴" : "Customize ▾";
      }

      function updateBreakRulesFromInputs() {
        const ratio = parseInt($("break-ratio-slider").value || "6", 10);
        const bonusIntervalMinutes = parseInt($("bonus-interval-slider").value || "30", 10);

        state.breakEarnRatio = ratio;
        state.intervalBonusEvery = bonusIntervalMinutes * 60;
        state.intervalBonusAmount = 5 * 60;

        updateBreakRulesUI();
        saveSettings();
      }

      function updateBreakRulesUI() {
        const ratio = state.breakEarnRatio;
        const bonusIntervalMinutes = Math.round(state.intervalBonusEvery / 60);

        $("break-ratio-value").textContent = ratio;
        $("break-ratio-copy").textContent = ratio;

        $("bonus-interval-value").textContent = bonusIntervalMinutes;
        $("bonus-interval-copy").textContent = bonusIntervalMinutes;

        $("rules-summary").textContent = `1 minute break per ${ratio} minutes of work. +5 minutes every ${bonusIntervalMinutes} focused minutes.`;
      }

      // =========================================================
      // Mini Player / Picture-in-Picture
      // =========================================================

      async function openMiniTimer() {
        if (!("documentPictureInPicture" in window)) {
          alert("Your browser doesn't support the Mini Player API yet. Try Chrome or Edge!");
          return;
        }

        try {
          const pipWindow = await window.documentPictureInPicture.requestWindow({
            width: 320,
            height: 160,
          });
          pipWindowRef = pipWindow;
          pipOpenedAt = Date.now();
          pipPageWasHidden = false;

          pipWindow.document.head.innerHTML = getMiniPlayerStyles();
          pipWindow.document.body.innerHTML = `
  <div id="pip-timer">00:00</div>
  <div id="pip-task" title="Return to main timer">Loading...</div>
`;

          pipTimerEl = pipWindow.document.getElementById("pip-timer");
          pipTaskEl = pipWindow.document.getElementById("pip-task");

          pipTaskEl.addEventListener("click", returnToMainTimerFromMini);

          pipWindow.addEventListener("pagehide", () => {
            pipWindowRef = null;
            pipTimerEl = null;
            pipTaskEl = null;
          });

          updateDisplay();
        } catch (error) {
          console.error("Failed to open Mini Player:", error);
        }
      }

      function returnToMainTimerFromMini() {
        showPage("active-page");

        // Ask the browser to focus the main Get Shit Done page.
        window.focus();

        // Close the mini player after returning.
        closeMiniTimer();
      }

      function closeMiniTimer() {
        if (!pipWindowRef || pipWindowRef.closed) return;

        const justOpened = Date.now() - pipOpenedAt < 800;
        if (justOpened) return;

        pipWindowRef.close();

        pipWindowRef = null;
        pipTimerEl = null;
        pipTaskEl = null;
      }

      function getMiniPlayerStyles() {
        return `
    <link rel="stylesheet" href="styles.css" />
  `;
      }

      // =========================================================
      // Display Updates
      // =========================================================

      function updateDisplay() {
        const task = state.tasks[state.activeTaskIndex];
        const currentTaskText = task ? task.title : "Mission complete";
        const timeStr = formatTime(state.remainingSeconds);

        const mainTimerEl = $("main-timer");

        mainTimerEl.textContent = timeStr;
        mainTimerEl.classList.remove("timer-warning", "timer-danger", "timer-paused");

        if (state.mode === "paused-work") {
          mainTimerEl.classList.add("timer-paused");
        }

        if (state.mode === "work") {
          if (state.remainingSeconds <= 60) {
            mainTimerEl.classList.add("timer-danger");
          } else if (state.remainingSeconds <= 5 * 60) {
            mainTimerEl.classList.add("timer-warning");
          }
        }

        $("break-bank").textContent = formatTime(state.breakBankSeconds);
        $("break-timer").textContent = formatTime(state.breakRemainingSeconds);

        updateCurrentTaskTitle(currentTaskText);
        updateMiniTaskList();
        updateActiveControls();
        updateBrowserTitle(timeStr, currentTaskText);
        updateMiniPlayer(timeStr, currentTaskText);
      }

      function updateCurrentTaskTitle(currentTaskText) {
        const currentTaskEl = $("current-task");

        currentTaskEl.textContent = currentTaskText;
        currentTaskEl.title = currentTaskText;
        currentTaskEl.classList.remove("long-task", "very-long-task", "insane-long-task", "paused-task");

        if (state.mode === "paused-work") {
          currentTaskEl.classList.add("paused-task");
        }

        if (currentTaskText.length > 90) {
          currentTaskEl.classList.add("insane-long-task");
        } else if (currentTaskText.length > 60) {
          currentTaskEl.classList.add("very-long-task");
        } else if (currentTaskText.length > 36) {
          currentTaskEl.classList.add("long-task");
        }
      }

      function updateMiniTaskList() {
        const list = $("mini-task-list");
        if (!list) return;

        list.innerHTML = "";

        state.tasks.forEach((task, index) => {
          const item = document.createElement("div");

          item.className = "task-pill";
          if (task.status === "done") item.classList.add("done");
          if (index === state.activeTaskIndex && task.status !== "done") {
            item.classList.add("active-task");
          }

          item.textContent = task.title;
          list.appendChild(item);
        });
      }

      function updateActiveControls() {
        const pauseBtn = $("pause-toggle-btn");
        if (!pauseBtn) return;

        const isPaused = state.mode === "paused-work";
        pauseBtn.classList.toggle("is-paused", isPaused);
        pauseBtn.title = isPaused ? "Resume mission" : "Pause mission";
        pauseBtn.setAttribute("aria-label", isPaused ? "Resume mission" : "Pause mission");
      }

      function updateBrowserTitle(timeStr, currentTaskText) {
        if (state.mode === "work") {
          document.title = `[${timeStr}] ${currentTaskText}`;
          return;
        }

        if (state.mode === "paused-work") {
          document.title = `[PAUSED ${timeStr}] ${currentTaskText}`;
          return;
        }

        document.title = "Get Shit Done";
      }

      function updateMiniPlayer(timeStr, currentTaskText) {
        if (pipTimerEl) pipTimerEl.textContent = state.mode === "paused-work" ? `PAUSED ${timeStr}` : timeStr;
        if (pipTaskEl) pipTaskEl.textContent = state.mode === "paused-work" ? `Paused · ${currentTaskText}` : currentTaskText;
      }

      function updateClock() {
        const now = new Date();
        $("clock").textContent = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      }

      function renderSessionSummary() {
        const summaryEl = $("session-summary");
        if (!summaryEl) return;

        const clearedTargets = state.tasks.filter((task) => task.status === "done").length;
        const totalTargets = state.tasks.length;

        const plannedDuration = state.missionDurationSeconds || 0;

        const startedAt = state.missionStartedAt || Date.now();
        const endedAt = state.missionEndedAt || Date.now();

        const actualElapsedSeconds = Math.max(0, Math.round((endedAt - startedAt) / 1000));

        const baseBreakEarned = Math.floor(plannedDuration / state.breakEarnRatio);
        const actualBaseBreakEarned = Math.floor(actualElapsedSeconds / state.breakEarnRatio);

        const isSuccess = state.mode === "success";

        summaryEl.innerHTML = `
    <div class="session-summary-title">
      ${isSuccess ? "Mission report" : "Attempt report"}
    </div>

    <div class="session-summary-grid">
      <div class="summary-item">
        <div class="summary-label">
          ${isSuccess ? "Mission length" : "Time survived"}
        </div>
        <div class="summary-value">
          ${formatDurationWords(isSuccess ? plannedDuration : actualElapsedSeconds)}
        </div>
      </div>

      <div class="summary-item">
        <div class="summary-label">Targets cleared</div>
        <div class="summary-value">
          ${clearedTargets} / ${totalTargets}
        </div>
      </div>

      <div class="summary-item">
        <div class="summary-label">
          ${isSuccess ? "Base break earned" : "Base break earned so far"}
        </div>
        <div class="summary-value">
          ${formatDurationWords(isSuccess ? baseBreakEarned : actualBaseBreakEarned)}
        </div>
      </div>

      <div class="summary-item">
        <div class="summary-label">Unused break bank</div>
        <div class="summary-value">
          ${formatDurationWords(state.breakBankSeconds)}
        </div>
      </div>
    </div>

    <p class="summary-note">
      Base break follows your rule: 1 minute of break for every 6 minutes of mission time.
      Bonus break and unused bank may make the final bank higher.
    </p>
  `;
      }

      // =========================================================
      // Keyboard Shortcuts
      // =========================================================

      function setupKeyboardShortcuts() {
        document.addEventListener("keydown", handleKeyboardShortcut);
      }

      function handleKeyboardShortcut(event) {
        if (event.repeat) return;
        if (isTypingTarget(event.target)) return;

        const key = event.key.toLowerCase();

        if (key === "escape") {
          closeKeyboardDismissibleModals();
          return;
        }

        if (state.mode !== "work" && state.mode !== "paused-work") return;

        if (event.code === "Space") {
          event.preventDefault();
          togglePauseMission();
          return;
        }

        if (key === "enter") {
          event.preventDefault();
          completeTask();
          return;
        }

        if (key === "s") {
          event.preventDefault();
          skipTask();
          return;
        }

        if (key === "b") {
          event.preventDefault();
          takeBreak();
        }
      }

      function isTypingTarget(target) {
        if (!target) return false;

        const tagName = target.tagName?.toLowerCase();
        return tagName === "input" || tagName === "textarea" || tagName === "select" || tagName === "button" || tagName === "a" || target.isContentEditable;
      }

      function closeKeyboardDismissibleModals() {
        closeEmptyBreakModal();

        const panel = $("rules-panel");
        const toggle = $("rules-toggle");
        if (panel?.classList.contains("show")) {
          panel.classList.remove("show");
          toggle?.setAttribute("aria-expanded", "false");
          if (toggle) toggle.textContent = "Customize ▾";
        }
      }

      // =========================================================
      // Utility Functions
      // =========================================================

      function formatTime(seconds) {
        seconds = Math.max(0, Math.floor(seconds));

        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;

        if (h > 0) {
          return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
        }

        return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }

      function formatDurationWords(seconds) {
        seconds = Math.max(0, Math.floor(seconds));

        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);

        if (hours > 0 && minutes > 0) {
          return `${hours} hr ${minutes} min`;
        }

        if (hours > 0) {
          return `${hours} hr`;
        }

        if (minutes > 0) {
          return `${minutes} min`;
        }

        return `${seconds} sec`;
      }

      function escapeHtml(text) {
        return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
      }

      // =========================================================
      // PWA Service Worker
      // =========================================================

      function registerServiceWorker() {
        if (!("serviceWorker" in navigator)) return;

        window.addEventListener("load", () => {
          navigator.serviceWorker.register("./sw.js").catch((error) => {
            console.warn("Service worker registration failed:", error);
          });
        });
      }

      // =========================================================
      // Initialization
      // =========================================================

      let pipPageWasHidden = false;

      document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
          if (pipWindowRef && !pipWindowRef.closed) {
            pipPageWasHidden = true;
          }
          return;
        }

        applyElapsedTimerTime();
        updateDisplay();

        if (pipPageWasHidden) {
          closeMiniTimer();
          pipPageWasHidden = false;
        }
      });

      window.addEventListener("focus", () => {
        applyElapsedTimerTime();
        updateDisplay();
      });

      loadSettings();
      applySettingsToUI();
      setupSettingsAutoSave();
      setupKeyboardShortcuts();
      registerServiceWorker();

      updateClock();
      setInterval(updateClock, 1000);
    
    <script src="app.js" defer>
