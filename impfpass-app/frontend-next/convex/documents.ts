import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";

const nullableString = v.union(v.string(), v.null());

const documentWithUrl = v.object({
  _id: v.id("vaccination_documents"),
  _creationTime: v.number(),
  patient_id: v.id("patients"),
  storage_id: v.id("_storage"),
  file_name: v.string(),
  file_type: v.string(),
  page_number: v.union(v.number(), v.null()),
  extraction_status: v.union(
    v.literal("pending"),
    v.literal("succeeded"),
    v.literal("failed"),
    v.literal("skipped")
  ),
  extraction_result: v.union(v.any(), v.null()),
  extraction_error: nullableString,
  extracted_at: nullableString,
  uploaded_at: v.string(),
  url: nullableString,
  storage_metadata: v.union(
    v.object({
      size: v.number(),
      content_type: nullableString,
      sha256: v.string(),
    }),
    v.null()
  ),
});

export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const registerUploadedDocument = mutation({
  args: {
    patient_id: v.id("patients"),
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_type: v.string(),
    page_number: v.union(v.number(), v.null()),
  },
  returns: v.id("vaccination_documents"),
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.patient_id);
    if (!patient) {
      throw new Error("Patient not found");
    }

    const storageMetadata = await ctx.db.system.get("_storage", args.storage_id);
    if (!storageMetadata) {
      throw new Error("Uploaded file not found in Convex storage");
    }

    return await ctx.db.insert("vaccination_documents", {
      patient_id: args.patient_id,
      storage_id: args.storage_id,
      file_name: args.file_name,
      file_type: args.file_type,
      page_number: args.page_number,
      extraction_status: args.file_type.startsWith("image/") ? "pending" : "skipped",
      extraction_result: null,
      extraction_error: null,
      extracted_at: null,
      uploaded_at: new Date().toISOString(),
    });
  },
});

const extractedVaccination = v.object({
  date: v.union(v.string(), v.null()),
  id: v.union(v.string(), v.null()),
  name: v.optional(v.union(v.string(), v.null())),
  diseases: v.union(v.array(v.string()), v.null()),
  bounding_box: v.union(v.array(v.number()), v.null())
});

const extractionResponse = v.object({
  vaccinations: v.array(extractedVaccination),
});

function normalizeVaccinationDate(value: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!match) {
    return null;
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return null;
  }

  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;
}

async function resolveVaccineName(ctx: MutationCtx, vaccination: {
  id: string | null;
  name?: string | null;
}) {
  const rawId = vaccination.id?.trim() ?? "";
  const extractedName = vaccination.name?.trim() ?? "";
  const numericId = /^\d+$/.test(rawId) ? Number(rawId) : null;

  if (numericId !== null) {
    const vaccine = await ctx.db
      .query("vaccines")
      .withIndex("by_catalog_id", (q) => q.eq("id", numericId))
      .unique();

    if (vaccine) {
      return vaccine.brand || vaccine.name;
    }
  }

  return extractedName || rawId || null;
}

export const getDocumentForExtraction = internalQuery({
  args: {
    document_id: v.id("vaccination_documents"),
  },
  returns: v.union(
    v.object({
      storage_id: v.id("_storage"),
      file_type: v.string(),
    }),
    v.null()
  ),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.document_id);
    if (!document) {
      return null;
    }

    return {
      storage_id: document.storage_id,
      file_type: document.file_type,
    };
  },
});

export const storeExtractionResult = internalMutation({
  args: {
    document_id: v.id("vaccination_documents"),
    extraction: extractionResponse,
  },
  returns: v.object({
    inserted_count: v.number(),
  }),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.document_id);
    if (!document) {
      throw new Error("Vaccination document not found");
    }

    const now = new Date().toISOString();
    let insertedCount = 0;

    for (const vaccination of args.extraction.vaccinations ?? []) {
      const vaccineName = await resolveVaccineName(ctx, vaccination);
      if (!vaccineName) {
        continue;
      }

      await ctx.db.insert("vaccinations", {
        patient_id: document.patient_id,
        vaccine_name: vaccineName,
        vaccine_type: null,
        manufacturer: null,
        batch_number: null,
        vaccination_date: normalizeVaccinationDate(vaccination.date),
        valid_until: null,
        indication: null,
        doctor_stamp: null,
        is_verified: false,
        verified_at: null,
        verified_by: null,
        digital_signature_hash: null,
        digital_signature_payload: null,
        digital_signed_at: null,
        digital_signed_by: null,
        confidence_score: null,
        needs_review: true,
        raw_json: {
          document_id: args.document_id,
          extraction: args.extraction,
          vaccination,
        },
        created_at: now,
        updated_at: now,
      });
      insertedCount += 1;
    }

    await ctx.db.patch(args.document_id, {
      extraction_status: "succeeded",
      extraction_result: args.extraction,
      extraction_error: null,
      extracted_at: now,
    });

    return { inserted_count: insertedCount };
  },
});

export const storeExtractionError = internalMutation({
  args: {
    document_id: v.id("vaccination_documents"),
    error: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.document_id);
    if (!document) {
      throw new Error("Vaccination document not found");
    }

    await ctx.db.patch(args.document_id, {
      extraction_status: "failed",
      extraction_error: args.error,
      extracted_at: new Date().toISOString(),
    });

    return null;
  },
});

function extractorUrl() {
  const baseUrl = process.env.EXTRACTOR_BASE_URL;
  if (!baseUrl) {
    throw new Error("EXTRACTOR_BASE_URL is required for image extraction.");
  }

  return new URL("/extract", baseUrl).toString();
}

async function readExtractionError(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    return body?.error ?? `Extractor request failed with HTTP ${response.status}`;
  }

  const text = await response.text().catch(() => "");
  return text || `Extractor request failed with HTTP ${response.status}`;
}

export const processUploadedImage = action({
  args: {
    document_id: v.id("vaccination_documents"),
  },
  returns: v.object({
    inserted_count: v.number(),
  }),
  handler: async (ctx, args): Promise<{ inserted_count: number }> => {
    const document = await ctx.runQuery(internal.documents.getDocumentForExtraction, {
      document_id: args.document_id,
    });

    if (!document) {
      throw new Error("Vaccination document not found");
    }
    if (!document.file_type.startsWith("image/")) {
      return { inserted_count: 0 };
    }

    try {
      const imageUrl = await ctx.storage.getUrl(document.storage_id);
      if (!imageUrl) {
        throw new Error("Uploaded image not found in Convex storage");
      }

      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to read uploaded image: HTTP ${imageResponse.status}`);
      }

      const extractorResponse = await fetch(extractorUrl(), {
        method: "POST",
        headers: {
          "Content-Type": document.file_type,
        },
        body: await imageResponse.arrayBuffer(),
      });

      if (!extractorResponse.ok) {
        throw new Error(await readExtractionError(extractorResponse));
      }

      return await ctx.runMutation(internal.documents.storeExtractionResult, {
        document_id: args.document_id,
        extraction: await extractorResponse.json(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Extraction failed";
      await ctx.runMutation(internal.documents.storeExtractionError, {
        document_id: args.document_id,
        error: message,
      });
      throw error;
    }
  },
});

export const listByPatient = query({
  args: {
    patient_id: v.id("patients"),
  },
  returns: v.array(documentWithUrl),
  handler: async (ctx, args) => {
    const documents = await ctx.db
      .query("vaccination_documents")
      .withIndex("by_patient_id", (q) => q.eq("patient_id", args.patient_id))
      .collect();

    return await Promise.all(
      documents.map(async (document) => {
        const [url, metadata] = await Promise.all([
          ctx.storage.getUrl(document.storage_id),
          ctx.db.system.get("_storage", document.storage_id),
        ]);

        return {
          ...document,
          extraction_status: document.extraction_status ?? "skipped",
          extraction_result: document.extraction_result ?? null,
          extraction_error: document.extraction_error ?? null,
          extracted_at: document.extracted_at ?? null,
          url,
          storage_metadata: metadata
            ? {
                size: metadata.size,
                content_type: metadata.contentType ?? null,
                sha256: metadata.sha256,
              }
            : null,
        };
      })
    );
  },
});

export const deleteDocument = mutation({
  args: {
    document_id: v.id("vaccination_documents"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const document = await ctx.db.get(args.document_id);
    if (!document) {
      throw new Error("Vaccination document not found");
    }

    await ctx.storage.delete(document.storage_id);
    await ctx.db.delete(args.document_id);

    return null;
  },
});
