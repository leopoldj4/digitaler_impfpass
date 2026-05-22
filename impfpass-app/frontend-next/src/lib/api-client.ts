import { ConvexHttpClient } from "convex/browser";
import { api as convexApi } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { UploadResponse, VaccinationDocument } from "@/types/document";
import type { PatientDetail, PatientListItem } from "@/types/patient";
import type { SignVaccinationsResponse, Vaccination, VaccinationUpdate } from "@/types/vaccination";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;

if (!convexUrl) {
  throw new Error("NEXT_PUBLIC_CONVEX_URL is required.");
}

const convex = new ConvexHttpClient(convexUrl);

type ConvexPatient = {
  _id: Id<"patients">;
  first_name: string;
  last_name: string;
  birth_date: string;
  created_at: string;
  vaccination_count: number;
  needs_review_count: number;
};

type ConvexVaccination = Omit<Vaccination, "id"> & {
  _id: Id<"vaccinations">;
};

type ConvexDocument = Omit<VaccinationDocument, "id" | "file_path" | "url"> & {
  _id: Id<"vaccination_documents">;
  url: string | null;
};

type ConvexPatientDetail = ConvexPatient & {
  vaccinations: ConvexVaccination[];
  documents: ConvexDocument[];
};

function mapPatient(patient: ConvexPatient): PatientListItem {
  return {
    id: patient._id,
    first_name: patient.first_name,
    last_name: patient.last_name,
    birth_date: patient.birth_date,
    vaccination_count: patient.vaccination_count,
    needs_review_count: patient.needs_review_count,
  };
}

function mapVaccination(vaccination: ConvexVaccination): Vaccination {
  return {
    ...vaccination,
    id: vaccination._id,
  };
}

function mapDocument(document: ConvexDocument): VaccinationDocument {
  return {
    id: document._id,
    patient_id: document.patient_id,
    file_name: document.file_name,
    file_path: document.url ?? "",
    file_type: document.file_type,
    page_number: document.page_number,
    uploaded_at: document.uploaded_at,
    url: document.url ?? "",
  };
}

function mapPatientDetail(patient: ConvexPatientDetail): PatientDetail {
  return {
    ...mapPatient(patient),
    created_at: patient.created_at,
    vaccinations: patient.vaccinations.map(mapVaccination),
    documents: patient.documents.map(mapDocument),
  };
}

export const api = {
  patients: {
    list: async (search?: string): Promise<PatientListItem[]> => {
      const patients = await convex.query(convexApi.patients.list, { search: search ?? null });
      return patients.map(mapPatient);
    },

    get: async (id: Id<"patients">): Promise<PatientDetail> => {
      const patient = await convex.query(convexApi.patients.get, { id });
      if (!patient) {
        throw new Error("Patient not found");
      }
      return mapPatientDetail(patient);
    },
  },

  vaccinations: {
    update: (
      id: Id<"vaccinations">,
      data: VaccinationUpdate,
      performedBy: string
    ): Promise<Vaccination> =>
      convex
        .mutation(convexApi.vaccinations.update, { id, data, performed_by: performedBy })
        .then((vaccination) => {
          if (!vaccination) {
            throw new Error("Impfeintrag nicht gefunden.");
          }
          return mapVaccination(vaccination);
        }),

    verify: (id: Id<"vaccinations">, performedBy: string): Promise<unknown> =>
      convex.mutation(convexApi.vaccinations.verify, { id, performed_by: performedBy }),

    sign: async (vaccinationIds: Id<"vaccinations">[]): Promise<SignVaccinationsResponse> => {
      const signedAt = new Date().toISOString();

      return {
        signed_count: vaccinationIds.length,
        signature_hash: `mock-${signedAt}`,
        signed_at: signedAt,
        signed_by: "Dr. Demo",
        vaccination_ids: vaccinationIds,
        message: `${vaccinationIds.length} Impfeintrag/Einträge als Mock signiert.`,
      };
    },
  },

  documents: {
    upload: async (patientId: Id<"patients">, files: File[]): Promise<UploadResponse> => {
      for (const file of files) {
        const uploadUrl = await convex.mutation(convexApi.documents.generateUploadUrl, {});
        const upload = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": file.type || "application/octet-stream" },
          body: file,
        });

        if (!upload.ok) {
          throw new Error(`Upload failed: HTTP ${upload.status}`);
        }

        const { storageId } = (await upload.json()) as { storageId: Id<"_storage"> };
        await convex.mutation(convexApi.documents.registerUploadedDocument, {
          patient_id: patientId,
          storage_id: storageId,
          file_name: file.name,
          file_type: file.type || "application/octet-stream",
          page_number: null,
        });
      }

      return {
        documents: await api.documents.list(patientId),
        extracted_count: 0,
      };
    },

    list: async (patientId: Id<"patients">): Promise<VaccinationDocument[]> => {
      const documents = await convex.query(convexApi.documents.listByPatient, {
        patient_id: patientId,
      });
      return documents.map(mapDocument);
    },
  },
};
