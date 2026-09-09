import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "DCF Vision — Production Intelligence",
  description: "Explore DCF Vision's food production inspection concept and working demonstration workspace. Founded by Christian Del Carmen and Steven Flogio.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
