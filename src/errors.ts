import { ZodError } from "zod";

export class MissingParamsError extends Error {
  public readonly missingParams: string[];
  public readonly givenParams: { [k: string]: string };
  public readonly optionalParams: string[];
  public readonly name = "MissingParamsError";
  public readonly id = "MissingParams";

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

export function throwCustomError(
  zodError: ZodError,
  context: ParamValidationContext
) {
  throw new ParamValidationError(
    `Validation failed in stage ${context.stage}${context.stage === "jsonParams" ? ` (file: ${context.fileName})` : ""}`,
    zodError,
    context
  );
}
