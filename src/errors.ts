import { ZodError, ZodInvalidLiteralIssue, ZodIssue } from "zod";

export class MissingParamsError extends Error {
  public readonly missingParams: string[];
  public readonly givenParams: { [k: string]: string };
  public readonly optionalParams: string[];
  public readonly name = "MissingParamsError";

  constructor(
    missingParams: string[],
    givenParams: { [k: string]: string },
    optionalParams: string[]
  ) {
    super(`Missing the following params: ${missingParams.join(", ")}`);
    this.missingParams = missingParams;
    this.givenParams = givenParams;
    this.optionalParams = optionalParams;
  }
}

type ParamValidationContext =
  | {
      stage: "urlParams" | "finalCheck";
    }
  | {
      stage: "jsonParams";
      fileName: string;
    };

export class ParamValidationError extends Error {
  public readonly name = "ParamValidationError";
  public readonly zodError: ZodError;
  public readonly context: ParamValidationContext;

  constructor(
    message: string,
    zodError: ZodError,
    context: ParamValidationContext
  ) {
    super(message);
    this.zodError = zodError;
    this.context = context;
  }
}

type SomeOtherError = Omit<Error, "name"> & { name: "SomethingElse" };

export type ParamError =
  | ParamValidationError
  | MissingParamsError
  | SomeOtherError;

export function issueFeedback(issue: ZodIssue) {
  let message = issue.message;

  // Special case for literal unions - show "expected one of [a, b, c, d]; received e" instead of default "Invalid input"
  if (
    issue.code === "invalid_union" &&
    issue.unionErrors.every((e) => e.issues[0].code === "invalid_literal")
  ) {
    message = `Expected one of ${JSON.stringify(issue.unionErrors.map((e) => (e.issues[0] as ZodInvalidLiteralIssue).expected))}; received ${JSON.stringify((issue.unionErrors[0].issues[0] as ZodInvalidLiteralIssue).received)}`;
  }

  return `${issue.path.join(".")}: ${message}`;
}

export function throwParamValidationError(
  zodError: ZodError,
  context: ParamValidationContext
) {
  throw new ParamValidationError(
    `Validation failed in stage ${context.stage}${context.stage === "jsonParams" ? ` (file: ${context.fileName})` : ""}`,
    zodError,
    context
  );
}
