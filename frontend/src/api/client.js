export async function apiRequest(handler) {
  try {
    return await handler();
  } catch (error) {
    console.error("API request failed", error);
    throw error;
  }
}
