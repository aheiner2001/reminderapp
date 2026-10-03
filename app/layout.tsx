import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Remember — birthdays & anniversaries",
  description: "A little reminder for the people who matter.",
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
