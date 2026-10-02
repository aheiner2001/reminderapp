import { expect, it } from "vitest";
import { summaryText } from "../src/lib/email";
it("renders meaningful dates and countdowns without including private notes", () => {
  expect(
    summaryText({
      date: "2026-10-02",
      sections: [
        {
          kind: "alerts",
          title: "Your reminders",
          items: [
            {
              id: "a",
              name: "Maya",
              type: "Birthday",
              date: "2026-10-09",
              days: 7,
            },
            {
              id: "b",
              name: "Ryan",
              type: "Anniversary",
              date: "2026-10-02",
              days: 0,
              number: 3,
            },
          ],
        },
      ],
    }),
  ).toBe(
    "Your reminders\nMaya — Birthday, 2026-10-09: 7 days away\nRyan — Anniversary, 2026-10-02 (3): today",
  );
});
