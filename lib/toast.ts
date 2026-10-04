export type ToastKind = "success" | "error" | "info";

export function showToast(message: string, kind: ToastKind = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("aup:toast", { detail: { message, kind } }));
}
