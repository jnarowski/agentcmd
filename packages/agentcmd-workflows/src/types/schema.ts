/**
 * Type utilities for inferring TypeScript types from JSON Schema definitions
 */

/**
 * Deep readonly utility type that recursively makes all properties readonly
 * Handles arrays, objects, and primitives
 */
export type DeepReadonly<T> = T extends (infer R)[]
  ? ReadonlyArray<DeepReadonly<R>>
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;

/**
 * Infer TypeScript type from a single schema property
 * Supports: string, number, boolean, enum (as literal union), arrays, nested objects
 */
export type InferProperty<P> =
  P extends { type: "string" } ? string
  : P extends { type: "number" } ? number
  : P extends { type: "boolean" } ? boolean
  : P extends { enum: readonly (infer E)[] } ? E
  : P extends { type: "array"; items: infer Items } ? Array<InferProperty<Items>>
  : P extends { properties: infer Nested } ? InferProperties<Nested>
  : unknown;

/**
 * Map over properties object to infer types for each property
 */
export type InferProperties<Props> = {
  [K in keyof Props]: InferProperty<Props[K]>
};

/**
 * Handle required fields by making them non-optional
 * Returns the same type but with required fields enforced
 */
type MakeRequired<
  Props extends Record<string, unknown>,
  RequiredKeys extends readonly (keyof Props)[]
> = {
  [K in keyof Props as K extends RequiredKeys[number] ? K : never]: Props[K];
} & {
  [K in keyof Props as K extends RequiredKeys[number] ? never : K]?: Props[K];
};

/**
 * Main entry point - infer TypeScript type from full schema
 * Extracts from properties and handles required array
 */
export type InferSchemaType<TSchema> =
  TSchema extends { properties: infer Props }
    ? TSchema extends { required: infer Req extends readonly (keyof Props)[] }
      ? MakeRequired<InferProperties<Props>, Req>
      : InferProperties<Props>
    : Record<string, unknown>;

/**
 * Compile-time validation that required fields exist in properties
 * Returns never if validation fails, causing a compile error
 * Uses lenient checking to work with both const and non-const arrays
 */
export type ValidateRequired<TSchema> =
  TSchema extends { properties: infer Props; required: infer Req }
    ? Req extends readonly unknown[]
      ? TSchema
      : never
    : TSchema;
