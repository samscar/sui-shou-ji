import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * 两种构建形态：
 *
 * - `npm run build`            → 常规多文件产物（dev / preview 用）
 * - `npm run build:standalone` → 单文件 HTML，JS 与 CSS 全部内联，
 *                                可直接双击用 Chrome 打开（file:// 协议）
 *
 * 之所以分开：file:// 下浏览器对 ES module 按 opaque origin 施加 CORS，
 * 外链 <script type="module"> 会被拒绝加载；只有把脚本内联成普通
 * <script> 才能双击即用。开发时仍需要外链产物以获得热更新与可读的堆栈。
 */
export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone';

  return {
    plugins: [react(), ...(standalone ? [viteSingleFile()] : [])],
    server: {
      strictPort: true,
    },
    build: standalone
      ? {
          cssCodeSplit: false,
          // 大到没有资源会被拆成独立文件，全部转成内联 data URI 或内联文本
          assetsInlineLimit: 100_000_000,
          chunkSizeWarningLimit: 8_000,
          rollupOptions: {
            output: {
              // 动态 import（zip.js）也合并进主 chunk，避免产出额外文件
              inlineDynamicImports: true,
            },
          },
        }
      : {},
  };
});
