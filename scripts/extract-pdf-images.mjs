import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

// Extract embedded image streams (JPEG/PNG) from PDFs without full canvas text rendering.
function extractImages(pdfPath, outDir, prefix) {
  const buf = fs.readFileSync(pdfPath);
  fs.mkdirSync(outDir, { recursive: true });
  let count = 0;

  // JPEG in PDF: /Filter /DCTDecode ... stream ... endstream
  const text = buf.toString("latin1");
  const jpegStarts = [];
  let idx = 0;
  while (true) {
    const i = buf.indexOf(Buffer.from([0xff, 0xd8, 0xff]), idx);
    if (i < 0) break;
    const j = buf.indexOf(Buffer.from([0xff, 0xd9]), i + 3);
    if (j > i) {
      jpegStarts.push([i, j + 2]);
      idx = j + 2;
    } else {
      idx = i + 3;
    }
  }

  for (const [start, end] of jpegStarts) {
    // Skip tiny fragments
    if (end - start < 5000) continue;
    count += 1;
    const out = path.join(
      outDir,
      `${prefix}-img-${String(count).padStart(2, "0")}.jpg`,
    );
    fs.writeFileSync(out, buf.subarray(start, end));
    console.log("wrote", out, end - start);
  }

  // PNG signatures
  idx = 0;
  while (true) {
    const i = buf.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), idx);
    if (i < 0) break;
    const iend = buf.indexOf(Buffer.from("IEND", "ascii"), i);
    if (iend > i) {
      const end = iend + 8;
      if (end - i >= 5000) {
        count += 1;
        const out = path.join(
          outDir,
          `${prefix}-img-${String(count).padStart(2, "0")}.png`,
        );
        fs.writeFileSync(out, buf.subarray(i, end));
        console.log("wrote", out, end - i);
      }
      idx = end;
    } else {
      idx = i + 8;
    }
  }

  console.log(prefix, "extracted", count, "images; pdf size", buf.length);
  // Also dump operator hint counts for debugging
  const streamCount = (text.match(/stream/g) || []).length;
  console.log(prefix, "stream markers", streamCount);
}

extractImages(
  path.join("assets", "I'm working on this.pdf"),
  path.join("assets", "pdf-pages"),
  "notes",
);
extractImages(
  path.join("assets", "WebpageToPDF-drawnames___Features.pdf"),
  path.join("assets", "pdf-pages"),
  "drawnames",
);
