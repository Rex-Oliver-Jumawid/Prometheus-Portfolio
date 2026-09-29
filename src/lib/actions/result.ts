import type { ZodError } from "zod";

export type ActionResult<T = undefined> =
  | { status: "success"; message: string; data: T }
  | {
      status: "error";
      message: string;
      fieldErrors?: Record<string, string[]>;
    };

export function actionSuccess<T>(message: string, data: T): ActionResult<T> {
  return { status: "success", message, data };
}

export function actionError(message: string): ActionResult<never> {
  return { status: "error", message };
}

export function validationError(error: ZodError): ActionResult<never> {
  const flattened = error.flatten();

  return {
    status: "error",
    message: "Check the highlighted fields and try again.",
    fieldErrors: flattened.fieldErrors,
  };
}
