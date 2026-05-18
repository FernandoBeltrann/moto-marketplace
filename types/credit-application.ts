export type QuoteContext = {
  price: number;
  downPayment: number;
  months: number;
  monthly: number;
};

export type ContactData = {
  email: string;
  phone: string;
};

export type IdentityData = {
  curp: string;
  firstName: string;
  middleName: string;
  lastName: string;
  secondLastName: string;
  birthDate: string;
};

export type AddressData = {
  street: string;
  exteriorNumber: string;
  interiorNumber: string;
  postalCode: string;
  neighborhood: string;
};

export type EmploymentData = {
  company: string;
  role: string;
  tenureMonths: number;
};

export type CreditApplicationFormData = {
  contact?: ContactData;
  identity?: IdentityData;
  address?: AddressData;
  employment?: EmploymentData;
};

export type CreditApplicationState = {
  applicationId: string | null;
  motorcycleId: string;
  motorcycleName: string;
  quote: QuoteContext;
  step: number;
  form: CreditApplicationFormData;
};

export const CREDIT_APP_STEPS = [
  { id: 1, title: 'Datos de contacto', subtitle: 'Solo email y WhatsApp para avanzar.' },
  { id: 2, title: 'Identificación', subtitle: 'Consultamos tu CURP y confirmas tus datos.' },
  { id: 3, title: 'Domicilio', subtitle: 'Usa el domicilio de tus comprobantes.' },
  { id: 4, title: 'Empleo actual', subtitle: 'Información laboral básica.' },
  { id: 5, title: 'Buró de crédito', subtitle: 'Acepta términos, autoriza la consulta e ingresa tu NIP.' },
  { id: 6, title: 'Conoce tu oferta', subtitle: 'Continúa con tu agente Finva por WhatsApp.' },
] as const;
