import { useEffect, useState } from "react";

export function usePersistentState<T>(key: string, initial: () => T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return { ...(initial() as object), ...(JSON.parse(raw) as object) } as T;
    } catch {
      /* 读取失败时回落到初始数据 */
    }
    return initial();
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      /* 存储不可用时静默 */
    }
  }, [key, state]);

  return [state, setState];
}
