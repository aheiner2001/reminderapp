import fs from "fs";
import path from "path";
import { pdf } from "pdf-to-img";

const pdfPath = path.join("assets", "I'm working on this.pdf");
const outDir = path.join("assets", "pdf-pages");
fs.mkdirSync(outDir, { recursive: true });

const doc = await pdf(pdfPath, { scale: 2 });
let i = 0;
for await (const img of doc) {
  i += 1;
  const out = path.join(outDir, `notes-page-${String(i).padStart(2, "0")}.png`);
  fs.writeFileSync(out, img);
  console.log("wrote", out, img.length);
}
console.log("done pages", i);
