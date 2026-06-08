import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    readTime: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    image: z.object({
      url: z.string(),
      alt: z.string(),
      credit: z.string(),
      creditUrl: z.string()
    })
  })
});

export const collections = { blog };
