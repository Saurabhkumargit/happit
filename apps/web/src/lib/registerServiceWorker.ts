// Register service worker for PWA support

export function registerServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration.scope);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    });
  }
}

export function unregisterServiceWorker(): void {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error("Service Worker unregistration failed:", error);
      });
  }
}
