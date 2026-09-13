(() => {
  const theme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  const manifest = document.createElement("link");
  manifest.rel = "manifest";
  manifest.href = `/brand/${theme}/manifest.webmanifest`;
  document.head.appendChild(manifest);
})();
