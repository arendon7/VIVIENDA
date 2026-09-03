import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIVIENDA",
  description:
    "Herramientas para entender, comparar, optimizar y proteger las decisiones financieras de tu vivienda.",
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
    <html lang="es">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
