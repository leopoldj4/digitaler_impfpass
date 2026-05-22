import { v } from "convex/values";
import { mutation, query, type QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function documentsForPatient(ctx: QueryCtx, patientId: Id<"patients">) {
  const documents = await ctx.db
    .query("vaccination_documents")
    .withIndex("by_patient_id", (q) => q.eq("patient_id", patientId))
    .take(100);

  return await Promise.all(
    documents.map(async (document) => ({
      ...document,
      extraction_status: document.extraction_status ?? "skipped",
      extraction_result: document.extraction_result ?? null,
      extraction_error: document.extraction_error ?? null,
      extracted_at: document.extracted_at ?? null,
      url: await ctx.storage.getUrl(document.storage_id),
    }))
  );
}

export const create = mutation({
  args: {
    first_name: v.string(),
    last_name: v.string(),
    birth_date: v.string(),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("patients", {
      first_name: args.first_name,
      last_name: args.last_name,
      birth_date: args.birth_date,
      created_at: now,
    });
    return id;
  },
});

export const list = query({
  args: {
    search: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const patients = await ctx.db.query("patients").withIndex("by_last_name").take(200);
    const search = args.search?.trim().toLowerCase();
    const filtered = search
      ? patients.filter((patient) =>
          `${patient.first_name} ${patient.last_name}`.toLowerCase().includes(search)
        )
      : patients;

    return await Promise.all(
      filtered.map(async (patient) => {
        const vaccinations = await ctx.db
          .query("vaccinations")
          .withIndex("by_patient_id", (q) => q.eq("patient_id", patient._id))
          .take(200);

        return {
          ...patient,
          vaccination_count: vaccinations.length,
          needs_review_count: vaccinations.filter((vaccination) => vaccination.needs_review).length,
        };
      })
    );
  },
});

export const get = query({
  args: {
    id: v.id("patients"),
  },
  handler: async (ctx, args) => {
    const patient = await ctx.db.get(args.id);
    if (!patient) {
      return null;
    }

    const [vaccinations, documents] = await Promise.all([
      ctx.db
        .query("vaccinations")
        .withIndex("by_patient_id_and_vaccination_date", (q) => q.eq("patient_id", args.id))
        .take(200),
      documentsForPatient(ctx, args.id),
    ]);

    return {
      ...patient,
      vaccination_count: vaccinations.length,
      needs_review_count: vaccinations.filter((vaccination) => vaccination.needs_review).length,
      vaccinations,
      documents,
    };
  },
});
