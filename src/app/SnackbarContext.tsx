import Alert, { type AlertColor } from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface NotifyOptions {
  severity?: AlertColor;
  action?: { label: string; onClick: () => void };
  autoHideMs?: number | null;
}

interface Message extends NotifyOptions {
  key: number;
  text: string;
}

type Notify = (text: string, options?: NotifyOptions) => void;

const SnackbarContext = createContext<Notify | null>(null);

export function SnackbarProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<Message | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback<Notify>((text, options = {}) => {
    setMessage({ key: Date.now(), text, ...options });
    setOpen(true);
  }, []);

  const close = () => setOpen(false);
  const value = useMemo(() => notify, [notify]);

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      <Snackbar
        key={message?.key}
        open={open}
        onClose={(_, reason) => reason !== "clickaway" && close()}
        autoHideDuration={message?.autoHideMs === undefined ? 4000 : message.autoHideMs}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        sx={{ mb: { xs: 8, md: 0 } }}
      >
        <Alert
          severity={message?.severity ?? "info"}
          variant="filled"
          onClose={close}
          action={
            message?.action ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  message.action?.onClick();
                  close();
                }}
              >
                {message.action.label}
              </Button>
            ) : undefined
          }
          sx={{ width: "100%", alignItems: "center" }}
        >
          {message?.text}
        </Alert>
      </Snackbar>
    </SnackbarContext.Provider>
  );
}

export function useNotify(): Notify {
  const ctx = useContext(SnackbarContext);
  if (!ctx) throw new Error("useNotify must be used inside SnackbarProvider");
  return ctx;
}
