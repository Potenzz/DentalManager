import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL_BACKEND ?? "";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem("token");
      if (!window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
        throw new Error(`${res.status}: Unauthorized`);
      }
      return;
    }

    // Try to parse the response as JSON for a more meaningful error message
    let message = `${res.status}: ${res.statusText}`;
    try {
      const errorBody = await res.json();
      if (errorBody?.message) {
        message = errorBody.message;
      }
    } catch {
      // ignore JSON parse errors, keep default message
    }

    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined
): Promise<Response> {
  const token = localStorage.getItem("token");

  const isFormData =
    typeof FormData !== "undefined" && data instanceof FormData;

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    // Only set Content-Type if not using FormData
    ...(isFormData ? {} : { "Content-Type": "application/json" }),
  };

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: isFormData ? (data as FormData) : JSON.stringify(data),
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = `${API_BASE_URL}${queryKey[0] as string}`;

    const token = localStorage.getItem("token");

    const res = await fetch(url, {
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnMount: true, 
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
