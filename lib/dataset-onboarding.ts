import { z } from "zod";

const existingClientSchema = z.object({
  mode: z.literal("existing"),
  id: z.string().uuid(),
});
const newClientSchema = z.object({
  mode: z.literal("new"),
  code: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(200),
});
const organizationOwnershipSchema = z.object({
  kind: z.literal("organization"),
  organizationId: z.string().uuid(),
});
const privateOwnershipSchema = z.object({
  kind: z.literal("private"),
  personId: z.string().uuid(),
});

export const datasetOnboardingInputSchema = z.object({
  client: z.discriminatedUnion("mode", [existingClientSchema, newClientSchema]),
  ownership: z.discriminatedUnion("kind", [
    organizationOwnershipSchema,
    privateOwnershipSchema,
  ]),
  primaryFarmId: z.string().uuid(),
  surveyIds: z.array(z.string().trim().min(1).max(200)).min(1).max(100),
});

const validationMessageSchema = z.object({
  field: z.string(),
  code: z.string(),
  message: z.string(),
  value: z.string().optional(),
  values: z.array(z.string()).optional(),
});

export const datasetOnboardingPreviewSchema = z.object({
  valid: z.boolean(),
  errors: z.array(validationMessageSchema),
  warnings: z.array(validationMessageSchema),
  normalized: z.object({
    client: z.object({
      mode: z.enum(["existing", "new"]),
      id: z.string().uuid().nullable(),
      code: z.string().nullable(),
      name: z.string().nullable(),
      classificationKind: z.enum(["organization", "individual"]),
      willCreate: z.boolean(),
      willClassify: z.boolean(),
      willCreateOwnerMapping: z.boolean(),
    }),
    ownership: z.object({
      kind: z.enum(["organization", "private"]),
      id: z.string(),
      name: z.string().nullable(),
    }),
    primaryFarm: z.object({
      id: z.string(),
      name: z.string().nullable(),
      relationshipType: z.literal("operator"),
    }),
    surveyIds: z.array(z.string()),
    surveyDefaults: z.object({
      status: z.literal("draft"),
      code: z.string().nullable(),
      accessCode: z.string().nullable(),
      organizationCode: z.null(),
    }),
  }),
  summary: z.object({
    surveyCount: z.number().int().nonnegative(),
    ownerMappingWillBeCreated: z.boolean(),
    clientWillBeCreated: z.boolean(),
  }),
});

export const datasetOnboardingCommitSchema = z.object({
  success: z.literal(true),
  auditId: z.string().uuid(),
  clientId: z.string().uuid(),
  clientCode: z.string(),
  surveyIds: z.array(z.string()),
  surveyCount: z.number().int().positive(),
});

export type DatasetOnboardingInput = z.infer<typeof datasetOnboardingInputSchema>;
export type DatasetOnboardingPreview = z.infer<typeof datasetOnboardingPreviewSchema>;
export type DatasetOnboardingCommit = z.infer<typeof datasetOnboardingCommitSchema>;
export type DatasetOnboardingActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };
