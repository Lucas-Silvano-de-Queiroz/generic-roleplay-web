export type RegisterFieldErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export type RegisterState = {
  errors?: RegisterFieldErrors;
  message?: string;
  success?: boolean;
};

export type LoginFieldErrors = {
  email?: string;
  password?: string;
};

export type LoginState = {
  errors?: LoginFieldErrors;
  message?: string;
  success?: boolean;
};
