import { useEffect, useState } from 'react';

/**
 * Hook để debounce giá trị
 * Chỉ cập nhật giá trị sau khi user dừng gõ trong thời gian chỉ định
 */
export const useDebounce = <T,>(value: T, delay: number = 500): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Tạo timeout để cập nhật giá trị
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: xóa timeout nếu value thay đổi trước khi timeout hoàn thành
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook để debounce hàm callback
 * Chỉ gọi callback sau khi user dừng gõ
 */
export const useDebouncedCallback = (
  callback: (...args: any[]) => void,
  delay: number = 500
): ((...args: any[]) => void) => {
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const debouncedCallback = (...args: any[]) => {
    // Clear previous timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    // Set new timeout
    const newTimeoutId = setTimeout(() => {
      callback(...args);
    }, delay);

    setTimeoutId(newTimeoutId);
  };

  return debouncedCallback;
};
