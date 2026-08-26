import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "VIVIENDA",
  description:
    "Herramientas para entender, comparar, optimizar y proteger las decisiones financieras de tu vivienda.",
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
