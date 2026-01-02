/**
 * GraphQL SDL parser.
 * Parses GraphQL schema files (.graphql, .gql) into DemokitSchema.
 *
 * Supports:
 * - type definitions (type, interface, input, enum)
 * - Field types (String, Int, Float, Boolean, ID, custom types)
 * - Non-null (!) and list ([]) modifiers
 * - Field relationships based on type references
 * - Query, Mutation, and Subscription types
 *
 * GraphQL schemas have explicit type references,
 * providing high-fidelity relationship detection.
 */

import type {
  DemokitSchema,
  DataModel,
  PropertyDef,
  PropertyType,
  Relationship,
} from "../types";
import type {
  CodebaseFile,
  ParseSchemaOptions,
  ParseResult,
  ParseWarning,
} from "./types";

/**
 * Parse GraphQL schema files into DemokitSchema.
 */
export function parseGraphQL(
  files: CodebaseFile[],
  options: ParseSchemaOptions = {}
): ParseResult {
  const { name = "GraphQL Schema", version = "1.0.0" } = options;

  const models: Record<string, DataModel> = {};
  const relationships: Relationship[] = [];
  const warnings: ParseWarning[] = [];
  const parsedFiles: string[] = [];

  for (const file of files) {
    // Accept .graphql, .gql, and .ts files with SDL strings
    if (!file.path.endsWith(".graphql") && !file.path.endsWith(".gql")) {
      // Check if it's a .ts file with GraphQL SDL
      if (
        file.path.endsWith(".ts") &&
        !file.content.includes("type Query") &&
        !file.content.includes("type Mutation")
      ) {
        continue;
      }
    }

    try {
      const { parsedModels, parsedRelations, parsedEnums } = parseGraphQLFile(
        file.content,
        file.path,
        warnings
      );

      for (const model of parsedModels) {
        if (models[model.name]) {
          warnings.push({
            code: "DUPLICATE_TYPE",
            message: `Type "${model.name}" already exists, skipping duplicate from ${file.path}`,
            file: file.path,
          });
        } else {
          models[model.name] = model;
        }
      }

      for (const enumModel of parsedEnums) {
        if (models[enumModel.name]) {
          warnings.push({
            code: "DUPLICATE_ENUM",
            message: `Enum "${enumModel.name}" already exists, skipping duplicate from ${file.path}`,
            file: file.path,
          });
        } else {
          models[enumModel.name] = enumModel;
        }
      }

      relationships.push(...parsedRelations);
      parsedFiles.push(file.path);
    } catch (error) {
      warnings.push({
        code: "PARSE_ERROR",
        message: `Failed to parse ${file.path}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        file: file.path,
      });
    }
  }

  const schema: DemokitSchema = {
    info: {
      title: name,
      version,
      description: "Schema parsed from GraphQL SDL files",
    },
    endpoints: [],
    models,
    relationships,
  };

  return {
    schema,
    format: "graphql",
    warnings,
    parsedFiles,
  };
}

/**
 * Parse a single GraphQL file.
 */
function parseGraphQLFile(
  content: string,
  filePath: string,
  warnings: ParseWarning[]
): {
  parsedModels: DataModel[];
  parsedRelations: Relationship[];
  parsedEnums: DataModel[];
} {
  const parsedModels: DataModel[] = [];
  const parsedRelations: Relationship[] = [];
  const parsedEnums: DataModel[] = [];

  // Remove comments for easier parsing
  const cleanContent = removeComments(content);

  // Parse enum definitions
  const enumMatches = cleanContent.matchAll(/enum\s+(\w+)\s*\{([^}]*)\}/g);

  for (const match of enumMatches) {
    const [, enumName, enumBody] = match;

    if (!enumName || !enumBody) continue;

    const values = enumBody
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));

    parsedEnums.push({
      name: enumName,
      type: "string",
      enum: values,
    });
  }

  // Parse type/interface/input definitions
  // Pattern: type TypeName { ... } or type TypeName implements Interface { ... }
  const typeMatches = cleanContent.matchAll(
    /(?:"""[^"]*"""\s*)?(type|interface|input)\s+(\w+)(?:\s+implements\s+[\w\s&,]+)?\s*\{([^}]*)\}/g
  );

  for (const match of typeMatches) {
    const [fullMatch, typeName, typeBody] = match;

    if (!typeName || !typeBody) continue;

    // Skip special GraphQL types
    if (["Query", "Mutation", "Subscription"].includes(typeName)) {
      // We could extract endpoint info from these, but for now skip
      continue;
    }

    try {
      const description = extractDescription(fullMatch || "");
      const { properties, required, relations } = parseTypeBody(
        typeBody,
        typeName
      );

      parsedModels.push({
        name: typeName,
        type: "object",
        description,
        properties,
        required,
      });

      parsedRelations.push(...relations);
    } catch (error) {
      warnings.push({
        code: "TYPE_PARSE_ERROR",
        message: `Could not parse type "${typeName}": ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        file: filePath,
      });
    }
  }

  return { parsedModels, parsedRelations, parsedEnums };
}

/**
 * Parse the body of a GraphQL type definition.
 */
function parseTypeBody(
  body: string,
  typeName: string
): {
  properties: Record<string, PropertyDef>;
  required: string[];
  relations: Relationship[];
} {
  const properties: Record<string, PropertyDef> = {};
  const required: string[] = [];
  const relations: Relationship[] = [];

  const lines = body.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    // Parse field: fieldName: Type! or fieldName(args): Type
    // Pattern: fieldName(args)?: Type!
    const fieldMatch = trimmed.match(
      /^(\w+)(?:\([^)]*\))?\s*:\s*(.+?)(?:\s*=\s*.+)?$/
    );

    if (!fieldMatch) {
      continue;
    }

    const [, fieldName, fieldType] = fieldMatch;

    if (!fieldName || !fieldType) continue;

    const { type, format, nullable, isArray, itemType, refType } =
      parseGraphQLType(fieldType.trim());

    properties[fieldName] = {
      name: fieldName,
      type: isArray ? "array" : type,
      format,
      required: !nullable,
      nullable,
    };

    if (isArray && itemType) {
      properties[fieldName].items = { name: itemType, type: "object" };
    }

    if (!nullable) {
      required.push(fieldName);
    }

    // Create relationship if field references another type
    if (refType) {
      relations.push({
        from: {
          model: typeName,
          field: fieldName,
        },
        to: {
          model: refType,
          field: "id", // Default to id
        },
        type: isArray ? "one-to-many" : "many-to-one",
        required: !nullable,
        detectedBy: "explicit-ref",
      });
    }
  }

  return { properties, required, relations };
}

/**
 * Parse a GraphQL type string.
 */
function parseGraphQLType(typeStr: string): {
  type: PropertyType;
  format?: string;
  nullable: boolean;
  isArray: boolean;
  itemType?: string;
  refType?: string;
} {
  let type: PropertyType = "string";
  let format: string | undefined;
  let nullable = true;
  let isArray = false;
  let itemType: string | undefined;
  let refType: string | undefined;

  let currentType = typeStr.trim();

  // Check for non-null modifier
  if (currentType.endsWith("!")) {
    nullable = false;
    currentType = currentType.slice(0, -1).trim();
  }

  // Check for list type
  if (currentType.startsWith("[") && currentType.endsWith("]")) {
    isArray = true;
    currentType = currentType.slice(1, -1).trim();

    // Check for non-null item
    if (currentType.endsWith("!")) {
      currentType = currentType.slice(0, -1).trim();
    }
  }

  // Also handle [Type!]! pattern
  if (currentType.startsWith("[")) {
    isArray = true;
    const innerMatch = currentType.match(/\[([^\]!]+)!?\]!?/);
    if (innerMatch) {
      currentType = innerMatch[1] || currentType;
    }
  }

  // Map GraphQL built-in types
  switch (currentType) {
    case "String":
      type = "string";
      break;
    case "Int":
      type = "integer";
      break;
    case "Float":
      type = "number";
      break;
    case "Boolean":
      type = "boolean";
      break;
    case "ID":
      type = "string";
      format = "uuid";
      break;
    default:
      // Custom type - likely a reference to another model
      if (/^[A-Z]/.test(currentType)) {
        type = "object";
        refType = currentType;
        format = `ref:${currentType}`;
      } else {
        type = "string";
      }
  }

  if (isArray) {
    itemType = currentType;
  }

  return { type, format, nullable, isArray, itemType, refType };
}

/**
 * Remove comments from GraphQL content.
 */
function removeComments(content: string): string {
  // Remove single-line comments
  let result = content.replace(/#[^\n]*/g, "");

  // Keep triple-quoted descriptions but process them separately
  // (They're used for documentation)

  return result;
}

/**
 * Extract description from triple-quoted string.
 */
function extractDescription(text: string): string | undefined {
  const descMatch = text.match(/"""([\s\S]*?)"""/);
  if (descMatch && descMatch[1]) {
    return descMatch[1].trim() || undefined;
  }
  return undefined;
}
