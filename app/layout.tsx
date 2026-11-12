import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Dates to Remember — birthdays, gifts & Secret Santa",
  description: "Remember people, plan gifts, and draw names in one place.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
