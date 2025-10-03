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

  const isFileLike =
    (typeof File !== "undefined" && data instanceof File) ||
    (typeof Blob !== "undefined" && data instanceof Blob);

  const isArrayBufferLike =
    (typeof ArrayBuffer !== "undefined" && data instanceof ArrayBuffer) ||
    (typeof Uint8Array !== "undefined" && data instanceof Uint8Array) ||
    (data != null && (data as any)?.constructor?.name === "Buffer"); // Node Buffer

  // Decide Content-Type header appropriately:
  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  if (!isFormData) {
    if (isFileLike) {
      // File/Blob: use its own MIME type if present, otherwise fallback
      const mime = (data as File | Blob).type || "application/octet-stream";
      headers["Content-Type"] = mime;
    } else if (isArrayBufferLike) {
      // ArrayBuffer / Buffer / Uint8Array: use generic octet-stream
      headers["Content-Type"] = "application/octet-stream";
    } else {
      // Normal JSON body
      headers["Content-Type"] = "application/json";
    }
  }
  // If FormData, we must NOT set Content-Type (browser will set multipart boundary)

  // Build final body
  const finalBody = isFormData
    ? (data as FormData)
    : isFileLike
      ? // File/Blob can be passed directly as BodyInit
        (data as BodyInit)
      : isArrayBufferLike
        ? // ArrayBuffer / Uint8Array / Buffer -> convert to Uint8Array if needed
          (data as BodyInit)
        : data !== undefined
          ? JSON.stringify(data)
          : undefined;

  const res = await fetch(`${API_BASE_URL}${url}`, {
    method,
    headers,
    body: finalBody,
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

    if (
      unauthorizedBehavior === "returnNull" &&
      (res.status === 401 || res.status === 403)
    ) {
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
