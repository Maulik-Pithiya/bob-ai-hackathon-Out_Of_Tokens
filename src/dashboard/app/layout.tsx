import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PortPulse — Container Congestion Predictor",
  description: "72-hour port operations plan and congestion prediction dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
