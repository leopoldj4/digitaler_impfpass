import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const nullableString = v.union(v.string(), v.null());

const documentWithUrl = v.object({
  _id: v.id("vaccination_documents"),
  _creationTime: v.number(),
  patient_id: v.id("patients"),
  storage_id: v.id("_storage"),
  file_name: v.string(),
  file_type: v.string(),
  page_number: v.union(v.number(), v.null()),
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
      uploaded_at: new Date().toISOString(),
    });
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
