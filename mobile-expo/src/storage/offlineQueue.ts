import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "koue_manager_offline_queue";

type Operation = {
  path: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload: unknown;
};

export async function getQueue(): Promise<Operation[]> {
  const raw = await AsyncStorage.getItem(KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function enqueueOperation(operation: Operation) {
  const queue = await getQueue();
  queue.push(operation);
  await AsyncStorage.setItem(KEY, JSON.stringify(queue));
}

export async function flushQueue(api: (path: string, options: RequestInit) => Promise<unknown>) {
  const queue = await getQueue();
  const remaining: Operation[] = [];

  for (const operation of queue) {
    try {
      await api(operation.path, {
        method: operation.method,
        body: JSON.stringify(operation.payload),
      });
    } catch {
      remaining.push(operation);
    }
  }

  await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
}
