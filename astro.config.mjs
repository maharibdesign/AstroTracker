import { defineConfig } from 'astro/config';
import vercel from "@astrojs/vercel/serverless";

// https://astro.build/config
export default defineConfig({
  // Now that the adapter is installed, we can set the output to 'hybrid'.
  output: 'hybrid',
  // The astro add command should have added this line for you.
  adapter: vercel()
});