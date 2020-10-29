let editor = null;
let select = null;
let clipboard = null;
let statsEl = null;

const init = () => {
  initCodeEditor();
  initLangSelector();
  initCode();
  initClipboard();
  initModals();
};

const initCodeEditor = () => {
  CodeMirror.modeURL =
    "https://cdn.jsdelivr.net/npm/codemirror@5.58.1/mode/%N/%N.js";
  editor = new CodeMirror(byId("editor"), {
    lineNumbers: true,
    theme: "dracula",
    readOnly: readOnly,
    lineWrapping: false,
    scrollbarStyle: "simple",
  });
  if (readOnly) {
    document.body.classList.add("readonly");
  }

  statsEl = byId("stats");
  editor.on("change", () => {
    statsEl.innerHTML = `Length: ${editor.getValue().length} |  Lines: ${
      editor["doc"].size
    }`;
    hideCopyBar();
  });
};

const initLangSelector = () => {
  select = new SlimSelect({
    select: "#language",
    data: CodeMirror.modeInfo.map((e) => ({
      text: e.name,
      value: shorten(e.name),
      data: { mime: e.mime, mode: e.mode },
    })),
    showContent: "down",
    onChange: (e) => {
      const language = e.data || { mime: null, mode: null };
      editor.setOption("mode", language.mime);
      CodeMirror.autoLoadMode(editor, language.mode);
      document.title =
        e.text && e.text !== "Plain Text"
          ? `Hacker Paste - ${e.text} code snippet`
          : "Hacker Paste";
    },
  });

  // Set lang selector
  const l = new URLSearchParams(window.location.search).get("l");
  select.set(l ? decodeURIComponent(l) : shorten("Plain Text"));
};

const initCode = () => {
  let skylink = location.hash.substr(1);
  if (skylink.length === 0) return;
  fetch(`/${skylink}`)
    .then((response) => response.text())
    .then(function (data) {
      editor.setValue(data);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

const initClipboard = () => {
  clipboard = new ClipboardJS(".clipboard");
  clipboard.on("success", () => {
    hideCopyBar(true);
  });
};

const initModals = () => {
  MicroModal.init({
    onClose: () => editor.focus(),
  });
};

const generateUUID = () => {
  let uuid = "";
  const cs = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  for (let i = 0; i < 16; i++) {
    uuid += cs.charAt(Math.floor(Math.random() * cs.length));
  }
  return uuid;
};

const generateLink = (mode) => {
  const data = editor.getValue();
  var blob = new Blob([data], { type: "text/plain", encoding: "utf-8" });
  var formData = new FormData();
  formData.append("file", blob);
  const uuid = generateUUID();
  fetch(`/skynet/skyfile/${uuid}?filename=paste.txt`, {
    method: "POST",
    body: formData,
  })
    .then((response) => response.json())
    .then((result) => {
      skylink = result.skylink;
      url = buildUrl(skylink, mode);
      showCopyBar(url);
    })
    .catch((error) => {
      console.error("Error:", error);
    });
};

// Open the "Copy" bar and select the content
const showCopyBar = (dataToCopy) => {
  byId("copy").classList.remove("hidden");
  const linkInput = byId("copy-link");
  linkInput.value = dataToCopy;
  linkInput.focus();
  linkInput.setSelectionRange(0, dataToCopy.length);
};

// Close the "Copy" bar
const hideCopyBar = (success) => {
  const copyButton = byId("copy-btn");
  const copyBar = byId("copy");
  if (!success) {
    copyBar.classList.add("hidden");
    return;
  }
  copyButton.innerText = "Copied !";
  setTimeout(() => {
    copyBar.classList.add("hidden");
    copyButton.innerText = "Copy";
  }, 800);
};

const disableLineWrapping = () => {
  byId("disable-line-wrapping").classList.add("hidden");
  byId("enable-line-wrapping").classList.remove("hidden");
  editor.setOption("lineWrapping", false);
};

const enableLineWrapping = () => {
  byId("enable-line-wrapping").classList.add("hidden");
  byId("disable-line-wrapping").classList.remove("hidden");
  editor.setOption("lineWrapping", true);
};

const openInNewTab = () => {
  window.open(location.href.replace(/[?&]readonly/, ""));
};

const buildUrl = (skylink, mode) => {
  const base = `${location.protocol}//${location.host}${location.pathname}`;
  const query = shorten('Plain Text') === select.selected() ? '' : `?l=${encodeURIComponent(select.selected())}`;
  const url = base + query + "#" + skylink;
  if (mode === "markdown") {
    return `[Hacker Paste snippet](${url})`;
  }
  if (mode === "iframe") {
    const height = editor["doc"].height + 45;
    return `<iframe width="100%" height="${height}" frameborder="0" src="${url}"></iframe>`;
  }
  return url;
};

const slugify = (str) =>
  str
    .trim()
    .toString()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/\+/g, "-p")
    .replace(/#/g, "-sharp")
    .replace(/[^\w\-]+/g, "");

const shorten = (name) => {
  let n = slugify(name).replace("script", "-s").replace("python", "py");
  const nov = (s) => s[0] + s.substr(1).replace(/[aeiouy-]/g, "");
  if (n.replace(/-/g, "").length <= 4) {
    return n.replace(/-/g, "");
  }
  if (n.split("-").length >= 2) {
    return n
      .split("-")
      .map((x) => nov(x.substr(0, 2)))
      .join("")
      .substr(0, 4);
  }
  n = nov(n);
  if (n.length <= 4) {
    return n;
  }
  return n.substr(0, 2) + n.substr(n.length - 2, 2);
};

const byId = (id) => document.getElementById(id);

init();
