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

1. Add one or more tasks to your mission list.
2. Set the countdown length.
3. Start the mission.
4. Focus on the current task until the timer ends.
5. Take a break when needed.
6. Continue through the task queue.

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

## Project Structure

```text
get-shit-done/
├── index.html
├── manifest.json
├── service-worker.js
├── icons/
└── README.md
