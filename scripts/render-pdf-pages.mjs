import fs from "fs";
import path from "path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

// Patch fillRule object → string for @napi-rs/canvas compatibility with pdfjs.
const proto = Object.getPrototypeOf(createCanvas(1, 1).getContext("2d"));
const originalFill = proto.fill;
proto.fill = function patchedFill(pathOrRule, maybeRule) {
  if (pathOrRule && typeof pathOrRule === "object" && !(pathOrRule instanceof Path2D) && "fillRule" in pathOrRule === false) {
    // pdfjs sometimes passes fillRule as object; ignore and fill normally
    return originalFill.call(this);
  }
  if (typeof pathOrRule === "object" && pathOrRule !== null && !(typeof Path2D !== "undefined" && pathOrRule instanceof Path2D)) {
    const rule = maybeRule || "nonzero";
    return originalFill.call(this, typeof rule === "string" ? rule : "nonzero");
  }
  if (typeof pathOrRule === "string" || pathOrRule === undefined) {
    return originalFill.call(this, pathOrRule);
  }
  try {
    return originalFill.apply(this, arguments);
  } catch {
    return originalFill.call(this);
  }
};

async function renderPdf(pdfPath, outDir, prefix) {
  const data = new Uint8Array(fs.readFileSync(pdfPath));
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  fs.mkdirSync(outDir, { recursive: true });
  console.log(prefix, "pages", doc.numPages);
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 1.25 });
    const canvas = createCanvas(
      Math.ceil(viewport.width),
      Math.ceil(viewport.height),
    );
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    try {
      await page.render({ canvasContext: ctx, viewport }).promise;
    } catch (err) {
      console.warn("render warning page", i, err.message);
      // Fall back: paint only embedded images from the page ops
      const ops = await page.getOperatorList();
      console.log("page", i, "ops", ops.fnArray.length);
    }
    const out = path.join(
      outDir,
      `${prefix}-page-${String(i).padStart(2, "0")}.png`,
    );
    fs.writeFileSync(out, canvas.toBuffer("image/png"));
    console.log("wrote", out, `${canvas.width}x${canvas.height}`);
  }
}

await renderPdf(
  path.join("assets", "I'm working on this.pdf"),
  path.join("assets", "pdf-pages"),
  "notes",
);
