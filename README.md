# Stinky Dragon Listening Room

A static podcast player that groups a user-imported RSS feed by campaign and release date.

## GitHub Pages

Publish this directory only. In repository Settings → Pages, select Deploy from a branch, main, and / (root). No build step is needed.

## Listen

Open your private Patreon RSS link in your browser and save its XML to your device. Choose the file using Choose RSS file in the player, or paste its XML content. Episodes are grouped by campaign, with oldest first by default. Use Show to select story episodes, Second Wind, or all entries.

The RSS is parsed locally and saved in this device’s IndexedDB storage, then restored when the app reopens. It is never uploaded or synced. Use Settings → Forget saved feed to remove it. Clearing site data or using private browsing can remove the saved library. Audio requests go directly to the enclosure host. No proxy, analytics, or third-party script is used. Private feed links and episode data must never be committed to this repository.

