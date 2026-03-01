function loadScriptWithLoader(url) {
  return new Promise((resolve, reject) => {
    const marquee = createMarquee();
    const dlg = sys42.dialog({
      animation: false,
      content: [
        { tag: "span.center-content-y.liquid.pa-md", content: "Loading 93Soft Installer..." },
        hr(),
        marquee
      ],
      width: 300,
      height: 55,
      closable: false,
      minimizable: false,
      maximizable: false,
      dockable: false,
      header: []
    });

    const script = document.createElement("script");
    script.src = url;
    script.onload = () => {
      dlg.destroy();
      resolve();
    };
    script.onerror = (e) => {
      dlg.destroy();
      reject(new Error(`Failed to load script: ${url}`));
    };
    
    document.head.appendChild(script);
  });
}

loadScriptWithLoader("waller648.github.io/windows93/93soft/wizard.js")
  .then(() => {
    console.log("JS loaded");
  })
  .catch(err => console.error(err));
