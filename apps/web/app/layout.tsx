import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth/context";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/lib/theme/theme-provider";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-sans",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: "Ayushman - Professional Consultation Platform",
  description:
    "Book confidential consultations with certified professionals. Secure, verified, and flexible scheduling.",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const initialTheme = cookieStore.get(THEME_STORAGE_KEY)?.value === "dark" ? "dark" : "light";

  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${jetbrainsMono.variable} bg-background ${initialTheme === "dark" ? "dark" : ""}`}
      suppressHydrationWarning
    >
      <body className="antialiased font-sans">
        <ThemeProvider initialTheme={initialTheme}>
          <AuthProvider>{children}</AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
