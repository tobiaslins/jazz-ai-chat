// AUTO-GENERATED FILE - DO NOT EDIT
import type { WasmSchema, QueryBuilder } from "jazz-tools";
export type JsonValue = string | number | boolean | null | { [key: string]: JsonValue } | JsonValue[];

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
}

export interface MessageWhereInput {
  id?: string | { eq?: string; ne?: string; in?: string[] };
  chat?: string | { eq?: string; ne?: string };
  role?: string | { eq?: string; ne?: string; contains?: string };
  content?: string | { eq?: string; ne?: string; contains?: string };
  created_at?: string | { eq?: string; ne?: string; contains?: string };
}

export interface ChatInclude {
  messagesViaChat?: true | MessageInclude | MessageQueryBuilder;
}

export interface MessageInclude {
  chat?: true | ChatInclude | ChatQueryBuilder;
}

export interface ChatRelations {
  messagesViaChat: Message[];
}

export interface MessageRelations {
  chat: Chat;
}

export type ChatWithIncludes<I extends ChatInclude = {}> = Chat & {
  messagesViaChat?: NonNullable<I["messagesViaChat"]> extends infer RelationInclude
    ? RelationInclude extends true
      ? Message[]
      : RelationInclude extends MessageQueryBuilder<infer QueryInclude extends MessageInclude>
        ? MessageWithIncludes<QueryInclude>[]
        : RelationInclude extends MessageInclude
          ? MessageWithIncludes<RelationInclude>[]
          : never
    : never;
};

export type MessageWithIncludes<I extends MessageInclude = {}> = Message & {
  chat?: NonNullable<I["chat"]> extends infer RelationInclude
    ? RelationInclude extends true
      ? Chat
      : RelationInclude extends ChatQueryBuilder<infer QueryInclude extends ChatInclude>
        ? ChatWithIncludes<QueryInclude>
        : RelationInclude extends ChatInclude
          ? ChatWithIncludes<RelationInclude>
          : never
    : never;
};

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
    ]
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
    ]
  }
};

export class ChatQueryBuilder<I extends ChatInclude = {}> implements QueryBuilder<ChatWithIncludes<I>> {
  readonly _table = "chats";
  readonly _schema: WasmSchema = wasmSchema;
  declare readonly _rowType: ChatWithIncludes<I>;
  declare readonly _initType: ChatInit;
  private _conditions: Array<{ column: string; op: string; value: unknown }> = [];
  private _includes: Partial<ChatInclude> = {};
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

  where(conditions: ChatWhereInput): ChatQueryBuilder<I> {
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

  include<NewI extends ChatInclude>(relations: NewI): ChatQueryBuilder<I & NewI> {
    const clone = this._clone<I & NewI>();
    clone._includes = { ...this._includes, ...relations };
    return clone;
  }

  orderBy(column: keyof Chat, direction: "asc" | "desc" = "asc"): ChatQueryBuilder<I> {
    const clone = this._clone();
    clone._orderBys.push([column as string, direction]);
    return clone;
  }

  limit(n: number): ChatQueryBuilder<I> {
    const clone = this._clone();
    clone._limitVal = n;
    return clone;
  }

  offset(n: number): ChatQueryBuilder<I> {
    const clone = this._clone();
    clone._offsetVal = n;
    return clone;
  }

  hopTo(relation: "messagesViaChat"): ChatQueryBuilder<I> {
    const clone = this._clone();
    clone._hops.push(relation);
    return clone;
  }

  gather(options: {
    start: ChatWhereInput;
    step: (ctx: { current: string }) => QueryBuilder<unknown>;
    maxDepth?: number;
  }): ChatQueryBuilder<I> {
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
      orderBy: this._orderBys,
      limit: this._limitVal,
      offset: this._offsetVal,
      hops: this._hops,
      gather: this._gatherVal,
    });
  }

  private _clone<CloneI extends ChatInclude = I>(): ChatQueryBuilder<CloneI> {
    const clone = new ChatQueryBuilder<CloneI>();
    clone._conditions = [...this._conditions];
    clone._includes = { ...this._includes };
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

export class MessageQueryBuilder<I extends MessageInclude = {}> implements QueryBuilder<MessageWithIncludes<I>> {
  readonly _table = "messages";
  readonly _schema: WasmSchema = wasmSchema;
  declare readonly _rowType: MessageWithIncludes<I>;
  declare readonly _initType: MessageInit;
  private _conditions: Array<{ column: string; op: string; value: unknown }> = [];
  private _includes: Partial<MessageInclude> = {};
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

  where(conditions: MessageWhereInput): MessageQueryBuilder<I> {
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

  include<NewI extends MessageInclude>(relations: NewI): MessageQueryBuilder<I & NewI> {
    const clone = this._clone<I & NewI>();
    clone._includes = { ...this._includes, ...relations };
    return clone;
  }

  orderBy(column: keyof Message, direction: "asc" | "desc" = "asc"): MessageQueryBuilder<I> {
    const clone = this._clone();
    clone._orderBys.push([column as string, direction]);
    return clone;
  }

  limit(n: number): MessageQueryBuilder<I> {
    const clone = this._clone();
    clone._limitVal = n;
    return clone;
  }

  offset(n: number): MessageQueryBuilder<I> {
    const clone = this._clone();
    clone._offsetVal = n;
    return clone;
  }

  hopTo(relation: "chat"): MessageQueryBuilder<I> {
    const clone = this._clone();
    clone._hops.push(relation);
    return clone;
  }

  gather(options: {
    start: MessageWhereInput;
    step: (ctx: { current: string }) => QueryBuilder<unknown>;
    maxDepth?: number;
  }): MessageQueryBuilder<I> {
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
      orderBy: this._orderBys,
      limit: this._limitVal,
      offset: this._offsetVal,
      hops: this._hops,
      gather: this._gatherVal,
    });
  }

  private _clone<CloneI extends MessageInclude = I>(): MessageQueryBuilder<CloneI> {
    const clone = new MessageQueryBuilder<CloneI>();
    clone._conditions = [...this._conditions];
    clone._includes = { ...this._includes };
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
