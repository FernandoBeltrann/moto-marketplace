import type { EmploymentData } from '@/types/credit-application';
import type { FinvaSolicitudKeyQuestions } from '@/lib/finva/types';

/** Campos de empleo que Finva acepta en PUT `/cliente/{id}`. */
export function buildClienteEmploymentPatch(
  employment: EmploymentData,
  ids: { userId: number; finvaUserId: number }
) {
  return {
    profesion: employment.role,
    user_id: ids.userId,
    finva_user_id: ids.finvaUserId,
  };
}

/** Las 5 preguntas clave van en `/add_solicitud`, no en el cliente. */
export function buildSolicitudEmploymentFields(
  employment: EmploymentData
): FinvaSolicitudKeyQuestions {
  return {
    income_source_type: [employment.incomeSourceType],
    income_proof: [employment.incomeProof],
    monthly_income: employment.monthlyIncome,
    client_credit_history_description: employment.creditHistory,
    possible_guarantor: employment.possibleGuarantor,
  };
}
