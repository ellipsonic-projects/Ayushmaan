"use client";

import { authedFetch } from "@/lib/api/authed-fetch";
import type {
  GrievanceSubjectType,
  GrievanceCategory,
  GrievanceSeverity,
  MyGrievanceEscalation,
} from "@/lib/api/grievances.server";

export interface SubmitGrievanceInput {
  subjectType: GrievanceSubjectType;
  category: GrievanceCategory;
  severity: GrievanceSeverity;
  description: string;
}

export async function submitGrievanceEscalation(
  input: SubmitGrievanceInput
): Promise<MyGrievanceEscalation> {
  const { data } = await authedFetch("/grievances", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return data as MyGrievanceEscalation;
}
