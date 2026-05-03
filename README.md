# Get Shit Done
A mission-based focus timer web app inspired by the original **Get Shit Done** app developed by **plafhop** around 2015.

That app has since been discontinued and unlisted, but it left a strong impression on me. Back when I was a student, it helped me stop overthinking, organize my tasks, and actually get my shit together.

This project is my attempt to recreate that feeling as a simple web app: the same direct tone, mission-like flow, and no-nonsense approach to focusing on the next task.

Pick a mission. Start the countdown. Get it done.

### 👉 **Try it here:** [Get Shit Done](https://andrewkotw.github.io/GetShitDone/)
---

## Features

- Mission-based countdown timer
- Task queue for working through multiple tasks
- Break system with break bank
- Mini Player mode using `documentPictureInPicture` when supported
- Browser notifications
- Sound feedback
- Draggable task rows
- Dynamic browser tab title
- PWA support with manifest, service worker, and app icons

---

## How to Use

1. Set the overall mission you want to complete.
2. Choose the countdown length for the mission.
3. Define the stakes: write a consequence if you fail and a reward if you finish.
4. Break the mission into smaller targets.
5. Reorder or add targets until the battle plan feels clear.
6. Start the mission and focus on the current target.
7. Mark targets as done to earn break time, then spend or save your break bank.
8. Finish the mission to claim the reward — or face the consequence.

On supported devices, you can also install it as a PWA and use it like a small standalone app.

---

## Tech Stack

This project is intentionally simple:

- HTML
- CSS
- JavaScript
- PWA manifest
- Service worker
- GitHub Pages

No framework, no backend, no build tools.

---

## Why I Made This

I wanted a small tool that helps me focus on the current task instead of managing a huge productivity system.

The app is designed to feel like a personal mission board: add tasks, start the timer, take breaks, and keep going.

It is also a learning project, so the code may not be perfect, but it already does what I need.
---
## Future Direction

The app is already usable, so future work will focus on making it more reliable, easier to maintain, and better on mobile.

Planned or possible improvements:

- Improve mobile/PWA behavior, especially notifications and sound
- Explore a Capacitor Android version for stronger background alarms and lock-screen countdown support
- Clean up the codebase and separate HTML, CSS, and JavaScript more clearly
- Add simple mission history and completed-session summaries
- Add data export or backup
- Polish the Mini Player experience
- Improve accessibility, keyboard navigation, and mobile layout
- Keep the app lightweight instead of turning it into a full productivity platform
---

## Project Structure

```text
get-shit-done/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
└── README.md

