import {
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";
import { durations } from "@/theme";

export type ToastTone = "default" | "success" | "destructive";

export type ToastOptions = {
  title: string;
  description?: string;
  tone?: ToastTone;
  /** Milliseconds before auto-dismiss. Defaults to a slow beat times ten. */
  durationMs?: number;
};

type Toast = ToastOptions & { id: string };

type ToastContextValue = {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
};

const DEFAULT_TOAST_DURATION_MS = durations.slow * 10;

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const toneClasses: Record<ToastTone, string> = {
  default: "border-border bg-popover",
  success: "border-secondary bg-secondary",
  destructive: "border-destructive bg-destructive",
};

const toneTextClasses: Record<ToastTone, string> = {
  default: "text-popover-foreground",
  success: "text-secondary-foreground",
  destructive: "text-destructive-foreground",
};

/** Holds the toast queue and renders the stack. Mount once, near the app root. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current, { ...options, id }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), options.durationMs ?? DEFAULT_TOAST_DURATION_MS),
      );
      return id;
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext value={value}>
      {children}
      <View
        style={{ pointerEvents: "box-none" }}
        className="absolute bottom-xl right-xl z-toast gap-sm"
        accessibilityLiveRegion="polite"
      >
        {toasts.map((item) => {
          const tone = item.tone ?? "default";
          return (
            <View
              key={item.id}
              className={cn(
                "max-w-menu gap-xxs rounded-md border-hairline p-lg shadow-ink-lifted",
                toneClasses[tone],
              )}
            >
              <Text variant="h4" className={cn("text-lg", toneTextClasses[tone])}>
                {item.title}
              </Text>
              {item.description ? (
                <Text variant="small" className={toneTextClasses[tone]}>
                  {item.description}
                </Text>
              ) : null}
              <Button
                variant="ghost"
                size="sm"
                className="self-end"
                onPress={() => dismiss(item.id)}
              >
                <Text className={toneTextClasses[tone]}>Dismiss</Text>
              </Button>
            </View>
          );
        })}
      </View>
    </ToastContext>
  );
}

/** `const { toast } = useToast()` — queues a toast from anywhere under the provider. */
export function useToast(): ToastContextValue {
  const context = use(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside a <ToastProvider>");
  }
  return context;
}
