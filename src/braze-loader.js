const BRAZE_SDK_URL = "https://js.appboycdn.com/web-sdk/latest/braze.min.js";

let loadPromise = null;

export function loadBrazeSdk() {
  if (window.braze) {
    return Promise.resolve(window.braze);
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = BRAZE_SDK_URL;
      script.async = true;
      script.onload = () => {
        if (window.braze) {
          resolve(window.braze);
          return;
        }
        reject(new Error("Braze SDK loaded but window.braze is missing"));
      };
      script.onerror = () => reject(new Error("Failed to load Braze SDK"));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}
