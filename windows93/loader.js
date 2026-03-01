// Soft93 installer.
function createMarquee() {
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "16px !important";
  container.classList.add("inset");
  container.style.backgroundColor = "#fff";
  container.style.position = "relative";
  container.style.overflow = "hidden";
  const bar = document.createElement("div");
  bar.style.width = "30%"; 
  bar.style.height = "100%";
  bar.style.backgroundColor = "var(--Hilight)";
  bar.style.position = "absolute";
  bar.style.left = "-50%";
  container.appendChild(bar);
  let pos = -0.5;
  const speed = 0.02;
  const animate = () => {
    pos += speed;
    if (pos > 1) pos = -0.5;
    bar.style.left = `${pos * 100}%`;
    requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  return container;
}
function createMarquee() {
  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "16px";
  container.classList.add("inset");
  container.style.backgroundColor = "#fff";
  container.style.position = "relative";
  container.style.overflow = "hidden";

  const bar = document.createElement("div");
  bar.style.width = "30%";
  bar.style.height = "100%";
  bar.style.backgroundColor = "var(--Hilight)";
  bar.style.position = "absolute";
  bar.style.left = "-50%";
  container.appendChild(bar);

  let pos = -0.5;
  const speed = 0.02;

  const animate = () => {
    pos += speed;
    if (pos > 1) pos = -0.5;
    bar.style.left = `${pos * 100}%`;
    requestAnimationFrame(animate);
  };

  requestAnimationFrame(animate);
  return container;
}

function br() {
  return { tag: "br" };
}

function hr() {
  return { tag: "hr" };
}


async function loadScriptWithLoader(url) {
  return new Promise(async(resolve, reject) => {
    const marquee = createMarquee();
    const dlg = await sys42.dialog({
      animation: false,
      content: [
        { tag: "span.txt-center.liquid.pa-md", content: "Preparing to install..." },
        hr(),
        marquee
      ],
      width: 300,
      height: 55,
      closable: false,
      minimizable: false,
      maximizable: false,
      dockable: false,
      header: [],
      pivot: "center",
    });

    const script = document.createElement("script");
    script.src = url;
    script.onload = () => {
      dlg.destroy();
      resolve();
    };
    script.onerror = (e) => {
      dlg.destroy();
      sys42.alert({icon:"error",content:"Failed to load Soft93 Installer.",label:"Soft93 Fatal Error"})
      reject(new Error("Failed to load Soft93 Installer."));
    };
    
    document.head.appendChild(script);
  });
}

loadScriptWithLoader("https://waller648.github.io/windows93/soft93/wizard.js")
  .then(() => {
    
  })
  .catch(err => console.error(err));
