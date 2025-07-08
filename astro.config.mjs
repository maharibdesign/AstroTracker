import { defineConfig } from 'astro/config';

// 1. Use the correct, modern import path for the Vercel adapter
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  // 2. Set the output to 'server', which is explicitly supported and required for API routes.
  output: 'server',
  
  // 3. Attach the adapter.
  adapter: vercel({
    // This enables Vercel's Image Optimization for Astro's <Image /> component, a good practice.
    imageService: true 
  }),
});