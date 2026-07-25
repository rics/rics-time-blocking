export class AppError extends Error {
  constructor(code, params = {}, fallbackMessage = '') {
    super(fallbackMessage || code);
    this.name = 'AppError';
    this.code = code;
    this.params = params;
  }
}

export function appError(code, params, fallbackMessage) {
  return new AppError(code, params, fallbackMessage);
}
