import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Включает 'use cache', cacheTag и частичный пререндер.
  // Публичные страницы клиентов кешируются по тегам, а админка после правки
  // сбрасывает нужный тег через updateTag — правка видна сразу, но каждый
  // просмотр страницы не ходит в базу.
  cacheComponents: true,
  // В родительской папке (G:\claude project) лежит свой package-lock.json,
  // и Turbopack принимает её за корень воркспейса — начинает следить за
  // соседними проектами. Прибиваем корень к самому mini-cms.
  turbopack: {
    root: __dirname,
  },
  images: {
    // Картинки меню и новостей лежат в Supabase Storage.
    // Хост берём из URL проекта, чтобы не хардкодить.
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [
          {
            protocol: "https",
            hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
};

export default nextConfig;
