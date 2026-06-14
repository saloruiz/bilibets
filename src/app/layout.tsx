import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Vilibets — Gestión de Apuestas",
  description: "Panel de control para gestionar casas de apuestas y beneficios",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${jakarta.variable} h-full antialiased dark`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-jakarta)]">{children}</body>
    </html>
  );
}
