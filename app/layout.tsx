import type { Metadata } from "next";
import { Lora, Work_Sans } from "next/font/google";
import "./globals.css";
import "../styles/casa-criterio.css";

const brandDisplay = Lora({
  subsets: ["latin"],
  variable: "--font-brand-display",
  display: "swap",
});

const brandUI = Work_Sans({
  subsets: ["latin"],
  variable: "--font-brand-ui",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Casa con Criterio",
    template: "%s · Casa con Criterio",
  },
  description:
    "Inteligencia para entender, comparar, optimizar y proteger las decisiones de tu vivienda.",
  icons: {
    icon: "/brand/favicon.svg",
  },
  manifest: "/brand/site.webmanifest",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: {
      index: false,
      follow: false,
      noimageindex: true,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${brandDisplay.variable} ${brandUI.variable}`}>
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
