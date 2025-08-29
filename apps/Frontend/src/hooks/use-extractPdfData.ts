import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface ExtractedData {
  name: string;
  memberId: string;
  dob: string;
}

export default function useExtractPdfData() {
  const { toast } = useToast();

  return useMutation<ExtractedData, Error, File>({
    mutationFn: async (pdfFile: File) => {
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const res = await apiRequest("POST", "/api/patientDataExtraction/patientdataextract", formData);
      if (!res.ok) throw new Error("Failed to extract PDF");
      return res.json();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to extract PDF: ${error.message}`,
        variant: "destructive",
      });
    },
  }); 
}
