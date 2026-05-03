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

- **HTML** for the app structure
- **CSS** for the interface and responsive layout
- **JavaScript** for the timer, tasks, break bank, notifications, and app behavior
- **PWA support** with `manifest.json` and `sw.js`
- **GitHub Pages** for hosting

No framework, no backend, no database, and no build tools.

---

## Why I Made This

I wanted a small tool that helps me focus on the current task instead of managing a huge productivity system.

The app is designed to feel like a personal mission board: add tasks, start the timer, take breaks, and keep going.

It is also a learning project, so the code may not be perfect, but it already does what I need.

---

## Planned Improvements

- Clean up and refactor the current codebase.
- Improve PWA install and update behavior.
- Make the timer more reliable across longer sessions.
- Polish the mobile and Mini Player experience.
- Explore an Android version later if needed.

---

## Project Structure

```text
get-shit-done/
├── index.html
├── manifest.json
├── sw.js
├── icons/
└── README.md

