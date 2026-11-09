/*
 * Shared print support for every Gallery book.
 * Printer selection is delegated to the browser/operating system.
 */
(function () {
  "use strict";
  const byId = id => document.getElementById(id);
  let book = null;
  let printPageButton = null;
  let loadError = null;

  function pageNumber() {
    return Number.parseInt((byId("current-page") || {}).textContent, 10);
  }
  function maxPage() {
    return Math.max(1, book.pages.length - Number(book.pageOffset || 0));
  }
  function pagesToPrint(from, to) {
    const offset = Number(book.pageOffset || 0);
    const result = [];
    for (let visible = from; visible <= to; visible += 1) {
      const filename = book.pages[visible - 1 + offset];
      if (!filename) throw new Error("Page " + visible + " is unavailable.");
      result.push({
        number: visible,
        src: new URL(String(book.imageDir || "webp") + "/" + filename, location.href).href
      });
    }
    return result;
  }

  function makePrintWindow(popup, requested) {
    const doc = popup.document;
    doc.open();
    doc.write('<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Gallery print</title></head><body></body></html>');
    doc.close();
    doc.title = (book.book || document.title.replace(" - Viewer", "")) +
      " — page" + (requested.length === 1 ? " " : "s ") +
      requested[0].number + (requested.length === 1 ? "" : "–" + requested[requested.length - 1].number);

    const style = doc.createElement("style");
    style.textContent = [
      "@page portraitSheet { size: A4 portrait; margin: 4mm; }",
      "@page landscapeSheet { size: A4 landscape; margin: 4mm; }",
      "* { box-sizing: border-box; }",
      "html, body { margin: 0; padding: 0; }",
      ".print-sheet { break-inside: avoid; break-after: page; page-break-after: always; display: flex; align-items: center; justify-content: center; overflow: hidden; }",
      ".print-sheet.portrait { page: portraitSheet; width: 202mm; height: 289mm; }",
      ".print-sheet.landscape { page: landscapeSheet; width: 289mm; height: 202mm; }",
      ".print-sheet:last-child { break-after: auto; page-break-after: auto; }",
      ".print-sheet img { display: block; width: 100%; height: 100%; object-fit: contain; }",
      ".print-toolbar { font: 14px system-ui, sans-serif; padding: 12px; background: #fff; color: #222; }",
      ".print-toolbar button { font: inherit; padding: 7px 14px; margin-right: 10px; cursor: pointer; }",
      "@media screen { body { background: #eceff1; } .print-sheet { margin: 14px auto; background: white; box-shadow: 0 2px 12px #0002; max-width: calc(100vw - 32px); } }",
      "@media print { .print-toolbar { display: none !important; } .print-sheet { margin: 0 !important; max-width: none !important; box-shadow: none !important; } }"
    ].join("\n");
    doc.head.appendChild(style);

    const toolbar = doc.createElement("div");
    toolbar.className = "print-toolbar";
    const reprint = doc.createElement("button");
    reprint.type = "button";
    reprint.textContent = "Print";
    reprint.addEventListener("click", () => popup.print());
    const message = doc.createElement("span");
    message.setAttribute("role", "status");
    message.textContent = "Preparing " + requested.length + " page(s) for printing…";
    toolbar.append(reprint, message);
    doc.body.appendChild(toolbar);

    const loaded = requested.map(item => {
      const sheet = doc.createElement("section");
      sheet.className = "print-sheet portrait";
      const img = doc.createElement("img");
      img.alt = "Page " + item.number;
      sheet.appendChild(img);
      doc.body.appendChild(sheet);
      return new Promise((resolve, reject) => {
        img.addEventListener("load", () => {
          const landscape = img.naturalWidth > img.naturalHeight;
          sheet.className = "print-sheet " + (landscape ? "landscape" : "portrait");
          resolve();
        }, { once: true });
        img.addEventListener("error", () => reject(new Error("Could not load page " + item.number + ".")), { once: true });
        img.src = item.src;
      });
    });

    Promise.all(loaded).then(() => {
      if (popup.closed) return;
      message.textContent = "Ready. Select any available Windows or school printer under Destination.";
      popup.focus();
      // Allow print layout to update after each image's actual orientation is known.
      setTimeout(() => { if (!popup.closed) popup.print(); }, 150);
    }).catch(error => {
      if (!popup.closed) message.textContent = error.message + " Check the network and retry.";
    });
  }

  function openPrint(from, to) {
    if (loadError) { alert("Printing is unavailable: " + loadError); return; }
    if (!book) { alert("The book page list is still loading. Please try again."); return; }
    const max = maxPage();
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 1 || to > max || from > to) {
      alert("Enter a valid page range from 1 to " + max + ".");
      return;
    }
    const pages = pagesToPrint(from, to);
    // Open synchronously in response to the click to avoid popup blockers.
    const popup = window.open("", "_blank");
    if (!popup) {
      alert("Please allow pop-ups for this Gallery site to open the print dialogue.");
      return;
    }
    const dialog = byId("print-range-dialog");
    if (dialog) dialog.classList.remove("open");
    makePrintWindow(popup, pages);
  }

  function install() {
    const rangeButton = byId("print-range-btn");
    const doButton = byId("print-do");
    if (!rangeButton || !doButton || byId("print-page-btn")) return;

    printPageButton = document.createElement("button");
    printPageButton.type = "button";
    printPageButton.id = "print-page-btn";
    printPageButton.className = "toolbar-btn";
    printPageButton.textContent = "Print page";
    printPageButton.title = "Print current page — automatic orientation and fit to A4";
    printPageButton.disabled = true;
    rangeButton.parentNode.insertBefore(printPageButton, rangeButton);
    rangeButton.title = "Print a page range — mixed portrait and landscape supported";
    rangeButton.setAttribute("aria-label", "Print page range");
    printPageButton.addEventListener("click", () => openPrint(pageNumber(), pageNumber()));

    // Keep the original range dialogue but replace its page-printing routine.
    doButton.onclick = () => {
      const from = Number.parseInt(byId("print-from").value, 10);
      const to = Number.parseInt(byId("print-to").value, 10);
      openPrint(from, to);
    };

    fetch(new URL("index.json", location.href), { cache: "no-cache" })
      .then(response => {
        if (!response.ok) throw new Error("Could not read the book index (HTTP " + response.status + ").");
        return response.json();
      })
      .then(data => {
        if (!Array.isArray(data.pages) || !data.pages.length) throw new Error("The book has no printable pages.");
        book = data;
        printPageButton.disabled = false;
      })
      .catch(error => {
        loadError = error.message || "Unknown error";
        printPageButton.title = "Printing unavailable: " + loadError;
        doButton.disabled = true;
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", install, { once: true });
  } else {
    install();
  }
})();
