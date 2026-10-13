# GestureFlow

Train your own hand gestures in the browser and use them to control a YouTube video.

A small proof of concept: MediaPipe tracks 21 hand landmarks from your webcam, you record a few seconds of any static pose, and a nearest-neighbor classifier maps that pose to a control on an embedded YouTube player: **Play/Pause**, **Skip ±10s**, **Volume up/down** (10% steps) or **Mute/Unmute**.

## Run it

Requires Node 20.19+ or 22.12+.

```bash
npm install
npm run dev
```

Open http://localhost:5173, click **Enable camera** and allow access.

Other scripts: `npm run typecheck`, `npm run build`, `npm run preview`.

## Train a gesture

1. Click **Train New Gesture**.
2. Pick an action and name the gesture.
3. Hold the pose in view during the 3-second countdown.
4. Keep holding while 40 samples are captured. Shift your hand slightly (nearer, farther, small tilts) so it's recognized from more positions.
5. Save. Recognition starts immediately; relax your hand once, then show the pose to fire the action.

Good starting pair: **open palm** → Play/Pause and **peace sign** → Skip +10s. Avoid poses that resemble a relaxed hand.

Train as many gestures as you like; several gestures can share an action. Gestures are saved in `localStorage`. Use **Retrain** or **Delete** on a gesture card, and the **Detection** switch to pause recognition.

## How it works

- **Normalization** (`src/lib/gesture.ts` → `toFeatures`). Landmarks are corrected for the frame's aspect ratio, translated so the wrist is the origin, and divided by palm size. The result is position- and distance-invariant but keeps orientation. The same function produces both training samples and live features.
- **Classification** (`classify`). k-NN (k = 5) over every stored sample. A match is accepted only if the nearest distance is under the threshold, at least 60% of neighbors agree, and it is clearly closer than the next gesture (ratio ≤ 0.85).
- **Triggering** (`src/lib/trigger.ts`). A gesture must be held for 300 ms to fire. It then fires once and stays latched until the hand leaves that pose, with a 1.2 s global cooldown between actions.
- **Player.** Uses the official YouTube IFrame Player API. To switch videos, paste a watch link, `youtu.be` link, Shorts link or bare video ID into **Change video**. Your gesture mappings stay the same.

Open **Tuning & distances** under the camera to see live per-gesture distances, vote share, ratio and the threshold slider. If a relaxed hand triggers actions, lower the threshold. If your gesture shows as "Unknown pose", raise it or retrain.

## Privacy

Webcam frames are processed locally in the browser and never uploaded or stored. Only landmark coordinates of your trained gestures are saved, in `localStorage`. The MediaPipe hand model file and the YouTube player are loaded from Google's servers.

## Known limitations

- Static poses only, no motion gestures (swipes).
- One hand at a time. Gestures are hand-specific, so train with the hand you'll use.
- The default threshold is a starting point and needs calibration for your camera and lighting.
- Accuracy drops in poor lighting, with cluttered backgrounds, or when the hand is partly out of frame.
- Browsers may block playback that wasn't started by a click. If so, press the Play button once; gestures work after that.
- Some videos disable embedding and won't play in the player.
- Detection pauses while the tab is in the background.
