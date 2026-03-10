/**
 * API utility functions for timeout handling and error management
 */

/**
 * Wraps a promise with a timeout
 * @param promise The promise to wrap
 * @param timeoutMs Timeout in milliseconds (default: 15000ms = 15s)
 * @param errorMessage Custom error message when timeout occurs
 * @returns Promise that rejects if timeout is reached
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 15000,
  errorMessage: string = 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.'
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      reject(new Error(errorMessage))
    }, timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

/**
 * Retry a failed promise with exponential backoff
 * @param fn Function that returns a promise
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @param delayMs Initial delay in milliseconds (default: 1000)
 * @returns Promise with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s, etc.
        const waitTime = delayMs * Math.pow(2, attempt)
        console.log(`⏳ Retry attempt ${attempt + 1}/${maxRetries} after ${waitTime}ms...`)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }

  throw lastError!
}
