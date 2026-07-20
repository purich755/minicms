import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter, а не Geist из шаблона: у Geist нет кириллического набора, и русский
// текст сваливался бы на системный шрифт.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Панель управления сайтом",
  description: "Меню, акции и новости вашего заведения — в одном месте",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
