// AUTO-GENERATED FILE - DO NOT EDIT
import type { WasmSchema, QueryBuilder } from "jazz-tools";
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

export type PermissionIntrospectionColumn = "$canRead" | "$canEdit" | "$canDelete";
export interface PermissionIntrospectionColumns {
  $canRead: boolean | null;
  $canEdit: boolean | null;
  $canDelete: boolean | null;
}

export interface Chat {
  id: string;
  title: string;
  created_at: string;
  owner_id: string;
}

export interface Message {
  id: string;
  chat: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatInit {
  title: string;
  created_at: string;
  owner_id: string;
}

export interface MessageInit {
  chat: string;
  role: string;
  content: string;
  created_at: string;
}

export interface ChatWhereInput {
  id?: string | { eq?: string; ne?: string; in?: string[] };
  title?: string | { eq?: string; ne?: string; contains?: string };
  created_at?: string | { eq?: string; ne?: string; contains?: string };
  owner_id?: string | { eq?: string; ne?: string; contains?: string };
  $canRead?: boolean;
  $canEdit?: boolean;
  $canDelete?: boolean;
}

export interface MessageWhereInput {
  id?: string | { eq?: string; ne?: string; in?: string[] };
  chat?: string | { eq?: string; ne?: string };
  role?: string | { eq?: string; ne?: string; contains?: string };
  content?: string | { eq?: string; ne?: string; contains?: string };
  created_at?: string | { eq?: string; ne?: string; contains?: string };
  $canRead?: boolean;
  $canEdit?: boolean;
  $canDelete?: boolean;
}

type AnyChatQueryBuilder<T = any> = { readonly _table: "chats" } & QueryBuilder<T>;
type AnyMessageQueryBuilder<T = any> = { readonly _table: "messages" } & QueryBuilder<T>;

export interface ChatInclude {
  messagesViaChat?: true | MessageInclude | AnyMessageQueryBuilder<any>;
}

export interface MessageInclude {
  chat?: true | ChatInclude | AnyChatQueryBuilder<any>;
}

export type ChatIncludedRelations<I extends ChatInclude = {}> = {
  [K in keyof I]-?:
    K extends "messagesViaChat"
      ? NonNullable<I["messagesViaChat"]> extends infer RelationInclude
        ? RelationInclude extends true
          ? Message[]
          : RelationInclude extends AnyMessageQueryBuilder<infer QueryRow>
            ? QueryRow[]
            : RelationInclude extends MessageInclude
              ? MessageWithIncludes<RelationInclude>[]
              : never
        : never
    : never;
};

export type MessageIncludedRelations<I extends MessageInclude = {}> = {
  [K in keyof I]-?:
    K extends "chat"
      ? NonNullable<I["chat"]> extends infer RelationInclude
        ? RelationInclude extends true
          ? Chat
          : RelationInclude extends AnyChatQueryBuilder<infer QueryRow>
            ? QueryRow
            : RelationInclude extends ChatInclude
              ? ChatWithIncludes<RelationInclude>
              : never
        : never
    : never;
};

export interface ChatRelations {
  messagesViaChat: Message[];
}

export interface MessageRelations {
  chat: Chat;
}

export type ChatWithIncludes<I extends ChatInclude = {}> = Omit<Chat, Extract<keyof I, keyof Chat>> & ChatIncludedRelations<I>;

export type MessageWithIncludes<I extends MessageInclude = {}> = Omit<Message, Extract<keyof I, keyof Message>> & MessageIncludedRelations<I>;

export type ChatSelectableColumn = keyof Chat | PermissionIntrospectionColumn | "*";
export type ChatOrderableColumn = keyof Chat | PermissionIntrospectionColumn;

export type ChatSelected<S extends ChatSelectableColumn = keyof Chat> = "*" extends S ? Chat : Pick<Chat, Extract<S | "id", keyof Chat>> & Pick<PermissionIntrospectionColumns, Extract<S, PermissionIntrospectionColumn>>;

export type ChatSelectedWithIncludes<I extends ChatInclude = {}, S extends ChatSelectableColumn = keyof Chat> = Omit<ChatSelected<S>, Extract<keyof I, keyof ChatSelected<S>>> & ChatIncludedRelations<I>;

export type MessageSelectableColumn = keyof Message | PermissionIntrospectionColumn | "*";
export type MessageOrderableColumn = keyof Message | PermissionIntrospectionColumn;

export type MessageSelected<S extends MessageSelectableColumn = keyof Message> = "*" extends S ? Message : Pick<Message, Extract<S | "id", keyof Message>> & Pick<PermissionIntrospectionColumns, Extract<S, PermissionIntrospectionColumn>>;

export type MessageSelectedWithIncludes<I extends MessageInclude = {}, S extends MessageSelectableColumn = keyof Message> = Omit<MessageSelected<S>, Extract<keyof I, keyof MessageSelected<S>>> & MessageIncludedRelations<I>;

export const wasmSchema: WasmSchema = {
  "chats": {
    "columns": [
      {
        "name": "title",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      },
      {
        "name": "created_at",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      },
      {
        "name": "owner_id",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      }
    ],
    "policies": {
      "select": {
        "using": {
          "type": "Cmp",
          "column": "owner_id",
          "op": "Eq",
          "value": {
            "type": "SessionRef",
            "path": [
              "user_id"
            ]
          }
        }
      },
      "insert": {
        "with_check": {
          "type": "Cmp",
          "column": "owner_id",
          "op": "Eq",
          "value": {
            "type": "SessionRef",
            "path": [
              "user_id"
            ]
          }
        }
      },
      "update": {
        "using": {
          "type": "Cmp",
          "column": "owner_id",
          "op": "Eq",
          "value": {
            "type": "SessionRef",
            "path": [
              "user_id"
            ]
          }
        },
        "with_check": {
          "type": "Cmp",
          "column": "owner_id",
          "op": "Eq",
          "value": {
            "type": "SessionRef",
            "path": [
              "user_id"
            ]
          }
        }
      },
      "delete": {
        "using": {
          "type": "Cmp",
          "column": "owner_id",
          "op": "Eq",
          "value": {
            "type": "SessionRef",
            "path": [
              "user_id"
            ]
          }
        }
      }
    }
  },
  "messages": {
    "columns": [
      {
        "name": "chat",
        "column_type": {
          "type": "Uuid"
        },
        "nullable": false,
        "references": "chats"
      },
      {
        "name": "role",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      },
      {
        "name": "content",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      },
      {
        "name": "created_at",
        "column_type": {
          "type": "Text"
        },
        "nullable": false
      }
    ],
    "policies": {
      "select": {
        "using": {
          "type": "Inherits",
          "operation": "Select",
          "via_column": "chat"
        }
      },
      "insert": {
        "with_check": {
          "type": "Inherits",
          "operation": "Insert",
          "via_column": "chat"
        }
      },
      "update": {
        "using": {
          "type": "Inherits",
          "operation": "Update",
          "via_column": "chat"
        },
        "with_check": {
          "type": "Inherits",
          "operation": "Update",
          "via_column": "chat"
        }
      },
      "delete": {
        "using": {
          "type": "Inherits",
          "operation": "Delete",
          "via_column": "chat"
        }
      }
    }
  }
};

export class ChatQueryBuilder<I extends ChatInclude = {}, S extends ChatSelectableColumn = keyof Chat> implements QueryBuilder<ChatSelectedWithIncludes<I, S>> {
  readonly _table = "chats";
  readonly _schema: WasmSchema = wasmSchema;
  readonly _rowType!: ChatSelectedWithIncludes<I, S>;
  readonly _initType!: ChatInit;
  private _conditions: Array<{ column: string; op: string; value: unknown }> = [];
  private _includes: Partial<ChatInclude> = {};
  private _selectColumns?: string[];
  private _orderBys: Array<[string, "asc" | "desc"]> = [];
  private _limitVal?: number;
  private _offsetVal?: number;
  private _hops: string[] = [];
  private _gatherVal?: {
    max_depth: number;
    step_table: string;
    step_current_column: string;
    step_conditions: Array<{ column: string; op: string; value: unknown }>;
    step_hops: string[];
  };

  where(conditions: ChatWhereInput): ChatQueryBuilder<I, S> {
    const clone = this._clone();
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [op, opValue] of Object.entries(value)) {
          if (opValue !== undefined) {
            clone._conditions.push({ column: key, op, value: opValue });
          }
        }
      } else {
        clone._conditions.push({ column: key, op: "eq", value });
      }
    }
    return clone;
  }

  select<NewS extends ChatSelectableColumn>(...columns: [NewS, ...NewS[]]): ChatQueryBuilder<I, NewS> {
    const clone = this._clone<I, NewS>();
    clone._selectColumns = [...columns] as string[];
    return clone;
  }

  include<NewI extends ChatInclude>(relations: NewI): ChatQueryBuilder<I & NewI, S> {
    const clone = this._clone<I & NewI, S>();
    clone._includes = { ...this._includes, ...relations };
    return clone;
  }

  orderBy(column: ChatOrderableColumn, direction: "asc" | "desc" = "asc"): ChatQueryBuilder<I, S> {
    const clone = this._clone();
    clone._orderBys.push([column as string, direction]);
    return clone;
  }

  limit(n: number): ChatQueryBuilder<I, S> {
    const clone = this._clone();
    clone._limitVal = n;
    return clone;
  }

  offset(n: number): ChatQueryBuilder<I, S> {
    const clone = this._clone();
    clone._offsetVal = n;
    return clone;
  }

  hopTo(relation: "messagesViaChat"): ChatQueryBuilder<I, S> {
    const clone = this._clone();
    clone._hops.push(relation);
    return clone;
  }

  gather(options: {
    start: ChatWhereInput;
    step: (ctx: { current: string }) => QueryBuilder<unknown>;
    maxDepth?: number;
  }): ChatQueryBuilder<I, S> {
    if (options.start === undefined) {
      throw new Error("gather(...) requires start where conditions.");
    }
    if (typeof options.step !== "function") {
      throw new Error("gather(...) requires step callback.");
    }

    const maxDepth = options.maxDepth ?? 10;
    if (!Number.isInteger(maxDepth) || maxDepth <= 0) {
      throw new Error("gather(...) maxDepth must be a positive integer.");
    }
    if (Object.keys(this._includes).length > 0) {
      throw new Error("gather(...) does not support include(...) in MVP.");
    }
    if (this._hops.length > 0) {
      throw new Error("gather(...) must be called before hopTo(...).");
    }

    const currentToken = "__jazz_gather_current__";
    const stepOutput = options.step({ current: currentToken });
    if (!stepOutput || typeof stepOutput !== "object" || typeof (stepOutput as { _build?: unknown })._build !== "function") {
      throw new Error("gather(...) step must return a query expression built from app.<table>.");
    }

    const stepBuilt = JSON.parse(
      stepOutput._build(),
    ) as {
      table?: unknown;
      conditions?: Array<{ column: string; op: string; value: unknown }>;
      hops?: unknown;
    };

    if (typeof stepBuilt.table !== "string" || !stepBuilt.table) {
      throw new Error("gather(...) step query is missing table metadata.");
    }
    if (!Array.isArray(stepBuilt.conditions)) {
      throw new Error("gather(...) step query is missing condition metadata.");
    }

    const stepHops = Array.isArray(stepBuilt.hops)
      ? stepBuilt.hops.filter((hop): hop is string => typeof hop === "string")
      : [];
    if (stepHops.length !== 1) {
      throw new Error("gather(...) step must include exactly one hopTo(...).");
    }

    const currentConditions = stepBuilt.conditions.filter(
      (condition) => condition.op === "eq" && condition.value === currentToken,
    );
    if (currentConditions.length !== 1) {
      throw new Error("gather(...) step must include exactly one where condition bound to current.");
    }

    const currentCondition = currentConditions[0];
    const stepConditions = stepBuilt.conditions.filter(
      (condition) => !(condition.op === "eq" && condition.value === currentToken),
    );

    const withStart = this.where(options.start);
    const clone = withStart._clone();
    clone._hops = [];
    clone._gatherVal = {
      max_depth: maxDepth,
      step_table: stepBuilt.table,
      step_current_column: currentCondition.column,
      step_conditions: stepConditions,
      step_hops: stepHops,
    };

    return clone;
  }

  _build(): string {
    return JSON.stringify({
      table: this._table,
      conditions: this._conditions,
      includes: this._includes,
      select: this._selectColumns,
      orderBy: this._orderBys,
      limit: this._limitVal,
      offset: this._offsetVal,
      hops: this._hops,
      gather: this._gatherVal,
    });
  }

  toJSON(): unknown {
    return JSON.parse(this._build());
  }

  private _clone<CloneI extends ChatInclude = I, CloneS extends ChatSelectableColumn = S>(): ChatQueryBuilder<CloneI, CloneS> {
    const clone = new ChatQueryBuilder<CloneI, CloneS>();
    clone._conditions = [...this._conditions];
    clone._includes = { ...this._includes };
    clone._selectColumns = this._selectColumns ? [...this._selectColumns] : undefined;
    clone._orderBys = [...this._orderBys];
    clone._limitVal = this._limitVal;
    clone._offsetVal = this._offsetVal;
    clone._hops = [...this._hops];
    clone._gatherVal = this._gatherVal
      ? {
          ...this._gatherVal,
          step_conditions: this._gatherVal.step_conditions.map((condition) => ({ ...condition })),
          step_hops: [...this._gatherVal.step_hops],
        }
      : undefined;
    return clone;
  }
}

export class MessageQueryBuilder<I extends MessageInclude = {}, S extends MessageSelectableColumn = keyof Message> implements QueryBuilder<MessageSelectedWithIncludes<I, S>> {
  readonly _table = "messages";
  readonly _schema: WasmSchema = wasmSchema;
  readonly _rowType!: MessageSelectedWithIncludes<I, S>;
  readonly _initType!: MessageInit;
  private _conditions: Array<{ column: string; op: string; value: unknown }> = [];
  private _includes: Partial<MessageInclude> = {};
  private _selectColumns?: string[];
  private _orderBys: Array<[string, "asc" | "desc"]> = [];
  private _limitVal?: number;
  private _offsetVal?: number;
  private _hops: string[] = [];
  private _gatherVal?: {
    max_depth: number;
    step_table: string;
    step_current_column: string;
    step_conditions: Array<{ column: string; op: string; value: unknown }>;
    step_hops: string[];
  };

  where(conditions: MessageWhereInput): MessageQueryBuilder<I, S> {
    const clone = this._clone();
    for (const [key, value] of Object.entries(conditions)) {
      if (value === undefined) continue;
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        for (const [op, opValue] of Object.entries(value)) {
          if (opValue !== undefined) {
            clone._conditions.push({ column: key, op, value: opValue });
          }
        }
      } else {
        clone._conditions.push({ column: key, op: "eq", value });
      }
    }
    return clone;
  }

  select<NewS extends MessageSelectableColumn>(...columns: [NewS, ...NewS[]]): MessageQueryBuilder<I, NewS> {
    const clone = this._clone<I, NewS>();
    clone._selectColumns = [...columns] as string[];
    return clone;
  }

  include<NewI extends MessageInclude>(relations: NewI): MessageQueryBuilder<I & NewI, S> {
    const clone = this._clone<I & NewI, S>();
    clone._includes = { ...this._includes, ...relations };
    return clone;
  }

  orderBy(column: MessageOrderableColumn, direction: "asc" | "desc" = "asc"): MessageQueryBuilder<I, S> {
    const clone = this._clone();
    clone._orderBys.push([column as string, direction]);
    return clone;
  }

  limit(n: number): MessageQueryBuilder<I, S> {
    const clone = this._clone();
    clone._limitVal = n;
    return clone;
  }

  offset(n: number): MessageQueryBuilder<I, S> {
    const clone = this._clone();
    clone._offsetVal = n;
    return clone;
  }

  hopTo(relation: "chat"): MessageQueryBuilder<I, S> {
    const clone = this._clone();
    clone._hops.push(relation);
    return clone;
  }

  gather(options: {
    start: MessageWhereInput;
    step: (ctx: { current: string }) => QueryBuilder<unknown>;
    maxDepth?: number;
  }): MessageQueryBuilder<I, S> {
    if (options.start === undefined) {
      throw new Error("gather(...) requires start where conditions.");
    }
    if (typeof options.step !== "function") {
      throw new Error("gather(...) requires step callback.");
    }

    const maxDepth = options.maxDepth ?? 10;
    if (!Number.isInteger(maxDepth) || maxDepth <= 0) {
      throw new Error("gather(...) maxDepth must be a positive integer.");
    }
    if (Object.keys(this._includes).length > 0) {
      throw new Error("gather(...) does not support include(...) in MVP.");
    }
    if (this._hops.length > 0) {
      throw new Error("gather(...) must be called before hopTo(...).");
    }

    const currentToken = "__jazz_gather_current__";
    const stepOutput = options.step({ current: currentToken });
    if (!stepOutput || typeof stepOutput !== "object" || typeof (stepOutput as { _build?: unknown })._build !== "function") {
      throw new Error("gather(...) step must return a query expression built from app.<table>.");
    }

    const stepBuilt = JSON.parse(
      stepOutput._build(),
    ) as {
      table?: unknown;
      conditions?: Array<{ column: string; op: string; value: unknown }>;
      hops?: unknown;
    };

    if (typeof stepBuilt.table !== "string" || !stepBuilt.table) {
      throw new Error("gather(...) step query is missing table metadata.");
    }
    if (!Array.isArray(stepBuilt.conditions)) {
      throw new Error("gather(...) step query is missing condition metadata.");
    }

    const stepHops = Array.isArray(stepBuilt.hops)
      ? stepBuilt.hops.filter((hop): hop is string => typeof hop === "string")
      : [];
    if (stepHops.length !== 1) {
      throw new Error("gather(...) step must include exactly one hopTo(...).");
    }

    const currentConditions = stepBuilt.conditions.filter(
      (condition) => condition.op === "eq" && condition.value === currentToken,
    );
    if (currentConditions.length !== 1) {
      throw new Error("gather(...) step must include exactly one where condition bound to current.");
    }

    const currentCondition = currentConditions[0];
    const stepConditions = stepBuilt.conditions.filter(
      (condition) => !(condition.op === "eq" && condition.value === currentToken),
    );

    const withStart = this.where(options.start);
    const clone = withStart._clone();
    clone._hops = [];
    clone._gatherVal = {
      max_depth: maxDepth,
      step_table: stepBuilt.table,
      step_current_column: currentCondition.column,
      step_conditions: stepConditions,
      step_hops: stepHops,
    };

    return clone;
  }

  _build(): string {
    return JSON.stringify({
      table: this._table,
      conditions: this._conditions,
      includes: this._includes,
      select: this._selectColumns,
      orderBy: this._orderBys,
      limit: this._limitVal,
      offset: this._offsetVal,
      hops: this._hops,
      gather: this._gatherVal,
    });
  }

  toJSON(): unknown {
    return JSON.parse(this._build());
  }

  private _clone<CloneI extends MessageInclude = I, CloneS extends MessageSelectableColumn = S>(): MessageQueryBuilder<CloneI, CloneS> {
    const clone = new MessageQueryBuilder<CloneI, CloneS>();
    clone._conditions = [...this._conditions];
    clone._includes = { ...this._includes };
    clone._selectColumns = this._selectColumns ? [...this._selectColumns] : undefined;
    clone._orderBys = [...this._orderBys];
    clone._limitVal = this._limitVal;
    clone._offsetVal = this._offsetVal;
    clone._hops = [...this._hops];
    clone._gatherVal = this._gatherVal
      ? {
          ...this._gatherVal,
          step_conditions: this._gatherVal.step_conditions.map((condition) => ({ ...condition })),
          step_hops: [...this._gatherVal.step_hops],
        }
      : undefined;
    return clone;
  }
}

export interface GeneratedApp {
  chats: ChatQueryBuilder;
  messages: MessageQueryBuilder;
  wasmSchema: WasmSchema;
}

export const app: GeneratedApp = {
  chats: new ChatQueryBuilder(),
  messages: new MessageQueryBuilder(),
  wasmSchema,
};
