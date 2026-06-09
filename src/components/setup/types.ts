import { MaritalStatus, OsekType } from "@/lib/persona";

/** Per-step wizard state. Numeric fields stay strings until buildPersona. */

export interface Step1Data {
  firstName: string;
  lastName: string;
  teudatZehut: string;
  birthDate: string;
  gender: "male" | "female";
  maritalStatus: MaritalStatus;
}

export interface Step2Data {
  isSoldierDischarged: boolean;
  soldierDischargeDate: string;
  isNewResident: boolean;
  aliyahDate: string;
  academicDegreeYear: string;
  children: { birthYear: string }[];
}

export interface Step3Data {
  tradeName: string;
  primaryOccupation: string;
  osekType: OsekType;
  isOsekZeir: boolean;
}

export interface Step4Data {
  totalRevenue: string;
}

export interface Step5Data {
  totalDeductibleExpenses: string;
  bituachLeumiAnnualPaid: string;
  kerenHishtalmut: string;
  pensionContributions: string;
  donations: string;
}

export interface Step6Data {
  bankName: string;
  bankCode: string;
  branchCode: string;
  accountNumber: string;
}

export type Errors = Record<string, string>;
