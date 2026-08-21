import { z } from 'zod'

export const bookmarkTypeSchema = z.enum(['link', 'text', 'asset'])
export const platformSchema = z.enum(['youtube', 'instagram', 'tiktok', 'article', 'note', 'other'])

const optionalNonEmptyString = (maxLength = 10_000) =>
  z
    .string()
    .trim()
    .min(1)
    .max(maxLength)
    .optional()

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(256),
  name: optionalNonEmptyString(160),
})

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(256),
})

export const createSaveSchema = z.object({
  id: z.string().trim().min(1).max(128).optional(),
  spaceId: z.string().trim().min(1).max(128).nullable().optional(),
  type: bookmarkTypeSchema,
  title: z.string().trim().min(1).max(500),
  url: z.string().trim().url().optional(),
  summary: z.string().max(10_000).default(''),
  note: optionalNonEmptyString(10_000),
  tags: z.array(z.string().trim().min(1).max(100)).max(100).default([]),
  thumbnailUrl: z.string().trim().url().optional(),
  platform: platformSchema,
  createdAt: z.string().datetime().optional(),
  archived: z.boolean().optional(),
  extractedText: optionalNonEmptyString(200_000),
  keywords: z.array(z.string().trim().min(1).max(100)).max(200).optional(),
})

export const patchSaveSchema = createSaveSchema
  .omit({ id: true, createdAt: true })
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required.',
  })

export const batchSavesSchema = z.object({
  items: z.array(createSaveSchema).min(1).max(500),
})

export const surfacingStateSchema = z.object({
  byDay: z.record(z.string(), z.array(z.string())),
  lastSurfaced: z.record(z.string(), z.string()),
  lastOpened: z.record(z.string(), z.string()),
  dismissed: z.array(z.string()),
})

export const surfacingEventSchema = z
  .object({
    type: z.enum(['surfaced', 'opened', 'dismissed']),
    ids: z.array(z.string().min(1)).optional(),
    id: z.string().min(1).optional(),
    at: z.string().datetime().optional(),
  })
  .refine((value) => value.id || (value.ids && value.ids.length > 0), {
    message: 'Provide id or ids.',
  })

export const embeddingUpsertSchema = z.object({
  model: z.string().trim().min(1).max(120),
  dims: z.number().int().min(8).max(4096),
  vector: z.array(z.number()).min(8).max(4096),
})

export const createSaveLinkSchema = z.object({
  toSaveId: z.string().trim().min(1).max(128),
})

export const createSpaceSchema = z.object({
  name: z.string().trim().min(1).max(80),
})

export const patchSpaceSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    position: z.number().int().min(0).max(10_000).optional(),
  })
  .refine((value) => value.name !== undefined || value.position !== undefined, {
    message: 'At least one field is required.',
  })

export type RegisterInput = z.infer<typeof registerSchema>
export type LoginInput = z.infer<typeof loginSchema>
export type CreateSaveInput = z.infer<typeof createSaveSchema>
export type PatchSaveInput = z.infer<typeof patchSaveSchema>
export type SurfacingState = z.infer<typeof surfacingStateSchema>
export type EmbeddingUpsertInput = z.infer<typeof embeddingUpsertSchema>
