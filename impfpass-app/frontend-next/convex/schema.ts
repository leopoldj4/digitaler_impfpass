import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import type { GenericValidator } from "convex/values";

const nullable = <T extends GenericValidator>(validator: T) => v.union(validator, v.null());

export default defineSchema({
  patients: defineTable({
    first_name: v.string(),
    last_name: v.string(),
    birth_date: v.string(),
    created_at: v.string(),
  }).index("by_last_name", ["last_name"]),

  vaccines: defineTable({
    id: v.number(),
    name: v.string(),
    brand: v.string(),
    diseases: v.array(v.string()),
  })
    .index("by_catalog_id", ["id"])
    .index("by_brand", ["brand"])
    .searchIndex("search_name", {
      searchField: "name",
      filterFields: ["brand"],
    }),

  vaccinations: defineTable({
    patient_id: v.id("patients"),
    vaccine_name: v.string(),
    vaccine_type: nullable(v.string()),
    manufacturer: nullable(v.string()),
    batch_number: nullable(v.string()),
    vaccination_date: nullable(v.string()),
    valid_until: nullable(v.string()),
    indication: nullable(v.string()),
    doctor_stamp: nullable(v.string()),
    is_verified: v.boolean(),
    verified_at: nullable(v.string()),
    verified_by: nullable(v.string()),
    digital_signature_hash: nullable(v.string()),
    digital_signature_payload: nullable(v.any()),
    digital_signed_at: nullable(v.string()),
    digital_signed_by: nullable(v.string()),
    confidence_score: nullable(v.number()),
    needs_review: v.boolean(),
    raw_json: nullable(v.any()),
    created_at: v.string(),
    updated_at: v.string(),
  })
    .index("by_patient_id", ["patient_id"])
    .index("by_patient_id_and_vaccination_date", ["patient_id", "vaccination_date"]),

  audit_log: defineTable({
    patient_id: v.id("patients"),
    action: v.string(),
    field_changed: nullable(v.string()),
    old_value: nullable(v.string()),
    new_value: nullable(v.string()),
    performed_by: v.string(),
    performed_at: v.string(),
  }).index("by_patient_id", ["patient_id"]),

  vaccination_documents: defineTable({
    patient_id: v.id("patients"),
    storage_id: v.id("_storage"),
    file_name: v.string(),
    file_type: v.string(),
    page_number: nullable(v.number()),
    extraction_status: v.union(
      v.literal("pending"),
      v.literal("succeeded"),
      v.literal("failed"),
      v.literal("skipped")
    ),
    extraction_result: nullable(v.any()),
    extraction_error: nullable(v.string()),
    extracted_at: nullable(v.string()),
    uploaded_at: v.string(),
  })
    .index("by_patient_id", ["patient_id"])
    .index("by_storage_id", ["storage_id"]),
});
