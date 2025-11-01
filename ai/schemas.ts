import { z } from "zod";

export const ActionNameSchema = z.enum([
  "browsePublishers",
  "getPublisherDetails",
  "addToCart",
  "removeFromCart",
  "viewCart",
]);

export const BrowseParamsSchema = z.object({
  niche: z.string().trim().min(1).optional(),
  country: z.string().trim().min(1).optional(),
  minDR: z.number().int().min(0).max(100).optional(),
  maxDR: z.number().int().min(0).max(100).optional(),
  type: z.enum(["Premium", "Standard"]).optional(),
  searchQuery: z.string().trim().min(1).optional(),
  page: z.number().int().min(1).default(1).optional(),
  pageSize: z.number().int().min(1).max(100).default(20).optional(),
});

export const GetDetailsParamsSchema = z.object({
  publisherId: z.string().trim().min(1),
});

export const CartItemIdSchema = z.object({
  itemId: z.string().trim().min(1),
});

export const AddToCartParamsSchema = z.object({
  type: z.enum(["publisher", "product"]),
  name: z.string().trim().min(1),
  price: z.number().min(0),
  quantity: z.number().int().min(1).default(1).optional(),
  metadata: z
    .object({
      publisherId: z.string().optional(),
      website: z.string().optional(),
      niche: z.array(z.string()).optional(),
      dr: z.number().optional(),
      da: z.number().optional(),
    })
    .optional(),
});

export const ActionParamsSchema = z.union([
  BrowseParamsSchema,
  GetDetailsParamsSchema,
  CartItemIdSchema,
  AddToCartParamsSchema,
  z.object({}).strict(),
]);

export const ActionEnvelopeSchema = z.object({
  action: z.object({
    name: ActionNameSchema,
    params: ActionParamsSchema.optional(),
  }),
  rationale: z.string().min(1),
  uiHints: z
    .object({
      progressiveDisclosure: z.boolean().default(true).optional(),
      showRightPanel: z.boolean().default(true).optional(),
    })
    .optional(),
});

export type ActionEnvelope = z.infer<typeof ActionEnvelopeSchema>;

export const SummarizeRequestSchema = z.object({
  intentSummary: z.object({
    action: z.object({
      name: ActionNameSchema,
      params: ActionParamsSchema.optional(),
    }),
    resultMeta: z
      .object({
        total: z.number().int().min(0).optional(),
        filters: z.record(z.any()).optional(),
        page: z.number().int().min(1).optional(),
        pageSize: z.number().int().min(1).max(100).optional(),
      })
      .optional(),
  }),
});

export type SummarizeRequest = z.infer<typeof SummarizeRequestSchema>;


