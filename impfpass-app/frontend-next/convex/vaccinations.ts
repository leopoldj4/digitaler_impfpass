import { v } from "convex/values";
import { mutation } from "./_generated/server";

const nullableString = v.union(v.string(), v.null());

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

function signatureHash(parts: string[]) {
  let hash = 0x811c9dc5;
  for (const part of parts.join("|")) {
    hash ^= part.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return Math.abs(hash >>> 0).toString(16).padStart(8, "0");
}

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

export const sign = mutation({
  args: {
    vaccination_ids: v.array(v.id("vaccinations")),
  },
  handler: async (ctx, args) => {
    const now = new Date().toISOString();
    const signerName = "Dr. Demo";
    const signaturePayload = {
      signed_at: now,
      signed_by: signerName,
      signer_id: "demo-signer",
      signer_email: "demo@example.com",
      vaccination_ids: args.vaccination_ids,
    };
    const hash = signatureHash([now, signerName, ...args.vaccination_ids]);

    let signedCount = 0;
    for (const id of args.vaccination_ids) {
      const vaccination = await ctx.db.get(id);
      if (!vaccination) {
        throw new Error("Mindestens ein Impfeintrag wurde nicht gefunden.");
      }

      await ctx.db.patch(id, {
        is_verified: true,
        verified_at: now,
        verified_by: signerName,
        digital_signature_hash: hash,
        digital_signature_payload: signaturePayload,
        digital_signed_at: now,
        digital_signed_by: signerName,
        needs_review: false,
        updated_at: now,
      });

      await ctx.db.insert("audit_log", {
        patient_id: vaccination.patient_id,
        action: "SIGN",
        field_changed: "digital_signature_hash",
        old_value: vaccination.digital_signature_hash,
        new_value: hash,
        performed_by: signerName,
        performed_at: now,
      });
      signedCount += 1;
    }

    return {
      signed_count: signedCount,
      signature_hash: hash,
      signed_at: now,
      signed_by: signerName,
      vaccination_ids: args.vaccination_ids,
      message: `${signedCount} Impfeintrag/Einträge erfolgreich digital signiert.`,
    };
  },
});
