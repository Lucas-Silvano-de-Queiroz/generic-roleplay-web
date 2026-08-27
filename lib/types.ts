export type RegisterFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
};

export type RegisterState = {
  errors?: RegisterFieldErrors;
  message?: string;
  success?: boolean;
};
