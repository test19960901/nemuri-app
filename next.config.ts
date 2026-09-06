/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // 静的サイトとして書き出すための必須設定
  images: {
    unoptimized: true, // 外部画像エラーを防ぐ設定
  },
};

export default nextConfig;