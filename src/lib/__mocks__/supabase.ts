interface QueuedResult {
  data?: unknown;
  error?: unknown;
}

export const mockQueue: QueuedResult[] = [];

export function queueResult(result: QueuedResult) {
  mockQueue.push(result);
}

type ChainMethod =
  | "select"
  | "insert"
  | "update"
  | "delete"
  | "eq"
  | "order"
  | "single";

function makeBuilder() {
  const builder: Record<string, unknown> = {};
  const chainMethods: ChainMethod[] = [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "order",
    "single",
  ];

  for (const method of chainMethods) {
    builder[method] = jest.fn(() => builder);
  }

  builder.then = (
    resolve: (value: QueuedResult) => void,
    reject?: (reason: unknown) => void
  ) => {
    const result = mockQueue.shift() ?? { data: null, error: null };
    return Promise.resolve(result).then(resolve, reject);
  };

  return builder;
}

export const mockGetUser = jest.fn();

export const supabase = {
  auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
  from: jest.fn(() => makeBuilder()),
};
