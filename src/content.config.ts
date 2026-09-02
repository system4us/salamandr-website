import { defineCollection, z } from 'astro:content';
import { docsLoader } from '@astrojs/starlight/loaders';
import { docsSchema } from '@astrojs/starlight/schema';
import { glob } from 'astro/loaders';

const docs = defineCollection({ loader: docsLoader(), schema: docsSchema() });

const comparisons = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/comparisons' }),
  schema: z.object({
    // Display name of the competitor, e.g. "Zendesk".
    competitor: z.string(),
    // Short line under the H1, e.g. "Salamandr vs Zendesk".
    tagline: z.string(),
    // One paragraph shown at the top of the page, plain text (rendered, not markdown).
    summary: z.string(),
    // Shown in the /compare index card.
    cardBlurb: z.string(),
    // Feature-by-feature rows. `salamandr`/`competitor` are short strings ("Yes", "No",
    // "Self-hosted only", a number, etc.) rendered verbatim in the comparison table.
    features: z.array(
      z.object({
        label: z.string(),
        salamandr: z.string(),
        competitor: z.string()
      })
    ),
    // Controls card order on the /compare index page.
    order: z.number().default(0)
  })
});

const industries = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/industries' }),
  schema: z.object({
    // Display name, e.g. "Healthcare & Life Sciences".
    name: z.string(),
    // One line under the card title.
    tagline: z.string(),
    // The problem this industry has with a typical cloud helpdesk.
    painPoint: z.string(),
    // Bullet points: why Salamandr fits, each tied to a real shipped feature.
    whyFit: z.array(z.string()),
    // Controls card order on the /industries page.
    order: z.number().default(0)
  })
});

const caseStudies = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/case-studies' }),
  schema: z.object({
    // TEMPLATE CONTENT — see each file's placeholder values. Replace every
    // field with a real customer's before this collection goes live; do not
    // publish these as-is. Set placeholder: false once a card is real.
    placeholder: z.boolean().default(true),
    company: z.string(),
    // Should match an `industries` entry's `name`.
    industry: z.string(),
    challenge: z.string(),
    solution: z.string(),
    result: z.string(),
    order: z.number().default(0)
  })
});

export const collections = { docs, comparisons, industries, caseStudies };
