(async function () {
  const USER = sys42.env.USER;

  const STEP_HELLO = 0;
  const STEP_PREPARE = 1;
  const STEP_DONE = 2;

  let step = STEP_HELLO;
  let installing = false;
  let dlg;

  // ─────────────────────────
  // Marquee
  // ─────────────────────────
  function createMarquee() {
    return {
      tag: ".pgmgr-marquee",
      style: {
        height: "16px",
        border: "1px solid #000",
        background: "#fff",
        overflow: "hidden",
        position: "relative",
        display: "none"
      },
      content: [
        {
          tag: ".pgmgr-marquee-bar",
          style: {
            position: "absolute",
            inset: "0 auto 0 0",
            width: "30%",
            background: "var(--pgmgr-accent, #000080)",
            animation: "pgmgr-marquee 1s linear infinite"
          }
        }
      ]
    };
  }

  // inject keyframes once
  if (!document.getElementById("pgmgr-marquee-style")) {
    const style = document.createElement("style");
    style.id = "pgmgr-marquee-style";
    style.textContent = `
      @keyframes pgmgr-marquee {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }
    `;
    document.head.appendChild(style);
  }

  // ─────────────────────────
  // Step text
  // ─────────────────────────
  function getStepText() {
    if (step === STEP_HELLO) {
      return `Welcome to the Soft93.

This wizard will install the Package Manager
required to load Soft93 packages.

Click Next to continue.`;
    }

    if (step === STEP_PREPARE) {
      return `Please wait while Setup prepares Soft93.

This may take a few moments.`;
    }

    return `Soft93 has been successfully installed.

You can now manage your scripts
from the system tray.

Click Finish to exit Setup.`;
  }
async function installCore() {
  const root = dlg.contentEl;
  const status = root.querySelector("#pgmgr-status");

  try {
    status.textContent = "Status: Downloading core...";
    const res = await fetch("https://waller648.github.io/windows93/soft93/core.js");
    if (!res.ok) throw new Error(`Failed to download core.js (${res.status})`);
    const code = await res.text();

    status.textContent = "Status: Writing files...";
    await sys42.fs.write(`/c/users/${USER}/soft93/core.js`, code);
    await sys42.fs.writeDir(`/c/users/${USER}/soft93/scripts`);
    status.textContent = "Status: Finalizing...";
    await new Promise(r => setTimeout(r, 500));

    step = STEP_DONE;
    status.textContent = "";
    updateWizard();
  } catch (err) {
    disableAllButtons();
    await sys42.alert("Installation failed: " + err.message, {
      icon: "error",
      label: "Soft93"
    });
    dlg.destroy();
  }
}
  function onEnterStep2() {
    if (installing) return;
    installing = true;
    installCore();
  }
  function getButtons() {
    const root = dlg.el || dlg.contentEl.parentElement;
    return {
      prev: root.querySelector("#pgmgr-prev"),
      next: root.querySelector("#pgmgr-next"),
      finish: root.querySelector("#pgmgr-finish")
    };
  }

  function disableAllButtons() {
    const { prev, next, finish } = getButtons();
    if (prev) prev.disabled = true;
    if (next) next.disabled = true;
    if (finish) finish.disabled = true;
  }
  function updateWizard() {
    const root = dlg.contentEl;
    const text = root.querySelector("#pgmgr-text");
    const marquee = root.querySelector(".pgmgr-marquee");

    const { prev, next, finish } = getButtons();

    text.textContent = getStepText();

    marquee.style.display =
      step === STEP_PREPARE ? "block" : "none";

    if (prev) {
      prev.disabled =
        step === STEP_HELLO || step === STEP_PREPARE;
    }

    if (next) {
      next.disabled = step !== STEP_HELLO;
      next.autofocus = step === STEP_HELLO;
    }

    if (finish) {
      finish.disabled = step !== STEP_DONE;
      finish.autofocus = step === STEP_DONE;
      prev.disabled = true;
    }
  }
  dlg = await sys42.dialog({
    width: 420,
    height: 210,
    label: "Soft93 Setup",
    closable: false,
    maximizable: false,
    minimizable: false,
    resizable: false,
    dockable: false,
    animation: false,
    
    content: [
        { tag: "span",
         style:{width:420,height:50,background:"var(--Background)",display:"flex"},
         content: {tag:"img.contour",src:"https://waller648.github.io/windows93/logo.png",style:{imageRendering:"pixelated",marginLeft:"auto",marginRight:"auto"},width:"250px",height:"250px"},
        },
      {
        tag: ".inset",
        style: {
          background: "#fff",
          padding: "10px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          height: "120px"
        },
        content: [
          {
            tag: "pre",
            id: "pgmgr-text",
            style: {
              margin: 0,
              whiteSpace: "pre-wrap"
            },
            content: ""
          },
          createMarquee(),
          
        ]
      },
        {
            tag: "div",
            id: "pgmgr-status",
            content: ""
          }
    ],
      
    footer: [
      {
        tag: "button",
        id: "pgmgr-prev",
        content: "Previous",
        disabled: true,
        onclick: () => {
          step--;
          updateWizard();
        }
      },
      {
        tag: "button",
        id: "pgmgr-next",
        content: "Next",
        onclick: () => {
          step = STEP_PREPARE;
          updateWizard();
          onEnterStep2();
        }
      },
      {
        tag: "button",
        id: "pgmgr-finish",
        content: "Finish",
        disabled: true,
        onclick: () => dlg.close()
      }
    ]
  });

  updateWizard();
})();
