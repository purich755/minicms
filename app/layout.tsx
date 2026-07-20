import type { Metadata } from "next";
import { Lora, Manrope } from "next/font/google";
import "./globals.css";

// Manrope вместо Inter: у Inter есть кириллица, но он же стоит на каждом
// втором сайте. Manrope геометричнее и заметнее, кириллический набор полный.
const manrope = Manrope({
  // Имя отличается от --font-sans намеренно: под тем именем Tailwind заводит
  // свою переменную темы, и ссылка сама на себя была бы циклической.
  variable: "--font-body",
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

// Заголовки публичных сайтов — засечками: у заведения это читается как
// «меню ресторана», а не как «панель управления». В админке не используется.
const lora = Lora({
  variable: "--font-heading",
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
    <html
      lang="ru"
      className={`${manrope.variable} ${lora.variable} font-sans h-full antialiased`}
      // Плавная прокрутка к якорям; Next 16 сам её больше не переопределяет,
      // поэтому атрибут обязателен, иначе переходы между страницами дёргаются.
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
