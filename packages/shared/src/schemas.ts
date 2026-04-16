import { z } from "zod";

export const walletAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const publisherSchema = z.object({
  id: z.string().min(2).max(64),
  displayName: z.string().min(2).max(120),
  walletAddress: walletAddressSchema
});

export const articleContentSchema = z.object({
  title: z.string().min(5).max(180),
  body: z.string().min(50),
  summary: z.string().min(20).max(400),
  sourceLinks: z.array(z.string().url()).max(10)
});

export const saveDraftSchema = z.object({
  publisherId: z.string().min(2).max(64),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  content: articleContentSchema
});

export const publishArticleSchema = saveDraftSchema.extend({
  contentRef: z.string().min(3).max(190),
  walletAddress: walletAddressSchema
});

export const reviseArticleSchema = z.object({
  articleId: z.string().uuid(),
  content: articleContentSchema,
  changeNote: z.string().min(4).max(280),
  walletAddress: walletAddressSchema,
  expectedRevision: z.number().int().positive()
});

export const adminPublisherActionSchema = z.object({
  action: z.enum(["approve", "revoke"]),
  publisherId: z.string().min(2).max(64),
  displayName: z.string().min(2).max(120).optional(),
  walletAddress: walletAddressSchema
});
