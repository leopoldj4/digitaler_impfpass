import { v } from "convex/values";
import { mutation } from "./_generated/server";

const nullableString = v.union(v.string(), v.null());

export const create = mutation({
  args: {
    patient_id: v.id("patients"),
    vaccine_name: v.string(),
    vaccine_type: nullableString,
    manufacturer: nullableString,
    batch_number: nullableString,
    vaccination_date: nullableString,
    valid_until: nullableString,
    indication: nullableString,
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const id = await ctx.db.insert("vaccinations", {
      patient_id: args.patient_id,
      vaccine_name: args.vaccine_name,
      vaccine_type: args.vaccine_type,
      manufacturer: args.manufacturer,
      batch_number: args.batch_number,
      vaccination_date: args.vaccination_date,
      valid_until: args.valid_until,
      indication: args.indication,
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
      raw_json: null,
      created_at: now,
      updated_at: now,
    });
    return id;
  },
});

const updateValidator = v.object({
  vaccine_name: v.optional(v.string()),
  vaccine_type: v.optional(nullableString),
  manufacturer: v.optional(nullableString),
  batch_number: v.optional(nullableString),
  vaccination_date: v.optional(nullableString),
  valid_until: v.optional(nullableString),
  indication: v.optional(nullableString),
  doctor_stamp: v.optional(nullableString),
  needs_review: v.optional(v.boolean()),
});

export const update = mutation({
  args: {
    id: v.id("vaccinations"),
    data: updateValidator,
    performed_by: v.string(),
  },
  handler: async (ctx, args) => {
    const vaccination = await ctx.db.get(args.id);
    if (!vaccination) {
      throw new Error("Impfeintrag nicht gefunden.");
    }

    const now = new Date().toISOString();
    const patch = { ...args.data, updated_at: now };
    await ctx.db.patch(args.id, patch);

    for (const [field, newValue] of Object.entries(args.data)) {
      const oldValue = vaccination[field as keyof typeof vaccination];
      if (String(oldValue ?? "") === String(newValue ?? "")) {
        continue;
      }

      await ctx.db.insert("audit_log", {
        patient_id: vaccination.patient_id,
        action: "UPDATE",
        field_changed: field,
        old_value: oldValue == null ? null : String(oldValue),
        new_value: newValue == null ? null : String(newValue),
        performed_by: args.performed_by,
        performed_at: now,
      });
    }

    return await ctx.db.get(args.id);
  },
});

export const verify = mutation({
  args: {
    id: v.id("vaccinations"),
    performed_by: v.string(),
  },
  handler: async (ctx, args) => {
    const vaccination = await ctx.db.get(args.id);
    if (!vaccination) {
      throw new Error("Impfeintrag nicht gefunden.");
    }

    const now = new Date().toISOString();
    await ctx.db.patch(args.id, {
      is_verified: true,
      verified_at: now,
      verified_by: args.performed_by,
      needs_review: false,
      updated_at: now,
    });

    await ctx.db.insert("audit_log", {
      patient_id: vaccination.patient_id,
      action: "VERIFY",
      field_changed: "is_verified",
      old_value: String(vaccination.is_verified),
      new_value: "true",
      performed_by: args.performed_by,
      performed_at: now,
    });

    return {
      id: args.id,
      is_verified: true,
      verified_at: now,
      verified_by: args.performed_by,
      message: `Impfeintrag ${args.id} erfolgreich signiert.`,
    };
  },
});
