import { buildEmailHtml } from "./index.mjs";

console.log("Testing Lambda Digest HTML Generation locally...");

const sampleEvents = [
  { name: "Maya", type: "Birthday", month: 10, day: 25, days: 2, notes: "Loves lavender flowers" },
  { name: "Sam & Alex", type: "Anniversary", month: 10, day: 28, days: 5 }
];

const html = buildEmailHtml("2 upcoming occasions this week", sampleEvents);

console.log("HTML generated successfully. Preview length:", html.length, "bytes.");
console.log("Sample HTML snippet:\n", html.slice(0, 450) + "...\n");
console.log("Local dry run passed!");
