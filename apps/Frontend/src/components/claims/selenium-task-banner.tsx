import { Loader2, CheckCircle, XCircle } from "lucide-react";

export type TaskStatus = "idle" | "pending" | "success" | "error";

interface Props {
  status: TaskStatus;
  message: string;
  show: boolean;
  onClear: () => void;
}

export const SeleniumTaskBanner = ({
  status,
  message,
  show,
  onClear,
}: Props) => {
  if (!show) return null;

  const getIcon = () => {
    switch (status) {
      case "pending":
        return <Loader2 className="w-5 h-5 animate-spin text-blue-500" />;
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 shadow-md rounded-lg p-3 m-4 flex items-start justify-between">
      <div className="flex items-start gap-3">
        {getIcon()}
        <div>
          <div className="font-medium text-gray-800">
            {status === "pending"
              ? "Selenium Task In Progress"
              : status === "success"
                ? "Selenium Task Completed"
                : "Selenium Task Error"}
          </div>
          <p className="text-gray-600 text-sm">{message}</p>
        </div>
      </div>
      <button
        onClick={onClear}
        className="text-sm text-gray-500 hover:text-gray-800"
      >
        ✕
      </button>
    </div>
  );
};
