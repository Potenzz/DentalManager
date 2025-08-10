import { useState } from "react";
import { CalendarIcon, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";

export type SearchCriteria = {
  searchTerm: string;
  searchBy: "name" | "insuranceId" | "phone" | "gender" | "dob" | "all";
};

interface PatientSearchProps {
  onSearch: (criteria: SearchCriteria) => void;
  onClearSearch: () => void;
  isSearchActive: boolean;
}

export function PatientSearch({
  onSearch,
  onClearSearch,
  isSearchActive,
}: PatientSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchBy, setSearchBy] = useState<SearchCriteria["searchBy"]>("name");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advancedCriteria, setAdvancedCriteria] = useState<SearchCriteria>({
    searchTerm: "",
    searchBy: "name",
  });

  const handleSearch = () => {
    onSearch({
      searchTerm,
      searchBy,
    });
  };

  const handleClear = () => {
    setSearchTerm("");
    setSearchBy("all");
    onClearSearch();
  };

  const handleAdvancedSearch = () => {
    onSearch(advancedCriteria);
    setShowAdvanced(false);
  };

  const updateAdvancedCriteria = (
    field: keyof SearchCriteria,
    value: string
  ) => {
    setAdvancedCriteria({
      ...advancedCriteria,
      [field]: value,
    });
  };

  return (
    <div className="w-full pt-8 pb-4 px-4">
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          {searchBy === "dob" ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSearch();
                  }}
                  className={cn(
                    "w-full pl-3 pr-20 text-left font-normal",
                    !searchTerm && "text-muted-foreground"
                  )}
                >
                  {searchTerm ? (
                    format(new Date(searchTerm), "PPP")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-4">
                <Calendar
                  mode="single"
                  selected={searchTerm ? new Date(searchTerm) : undefined}
                  onSelect={(date: Date | undefined) => {
                    if (date) {
                      const formattedDate = format(date, "yyyy-MM-dd");
                      setSearchTerm(String(formattedDate));
                    }
                  }}
                  disabled={(date) => date > new Date()}
                />
              </PopoverContent>
            </Popover>
          ) : (
            <Input
              placeholder="Search patients..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch();
                }
              }}
            />
          )}
          {searchTerm && (
            <button
              className="absolute right-10 top-3 text-gray-400 hover:text-gray-600"
              onClick={() => {
                setSearchTerm("");
                if (isSearchActive) onClearSearch();
              }}
            >
              <X size={16} />
            </button>
          )}

          <button
            className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            onClick={handleSearch}
          >
            <Search size={16} />
          </button>
        </div>

        <Select
          value={searchBy}
          onValueChange={(value) =>
            setSearchBy(value as SearchCriteria["searchBy"])
          }
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Search by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Fields</SelectItem>
            <SelectItem value="name">Name</SelectItem>
            <SelectItem value="phone">Phone</SelectItem>
            <SelectItem value="insuranceId">InsuranceId</SelectItem>
            <SelectItem value="gender">Gender</SelectItem>
            <SelectItem value="dob">DOB</SelectItem>
          </SelectContent>
        </Select>

        <Dialog open={showAdvanced} onOpenChange={setShowAdvanced}>
          <DialogTrigger asChild>
            <Button variant="outline">Advanced</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Advanced Search</DialogTitle>
              <DialogDescription>
                Search for patients using multiple criteria
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">
                  Search by
                </label>
                <Select
                  value={advancedCriteria.searchBy}
                  onValueChange={(value) =>
                    updateAdvancedCriteria(
                      "searchBy",
                      value as SearchCriteria["searchBy"]
                    )
                  }
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Name" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Fields</SelectItem>
                    <SelectItem value="name">Name</SelectItem>
                    <SelectItem value="phone">Phone</SelectItem>
                    <SelectItem value="insuranceId">InsuranceId</SelectItem>
                    <SelectItem value="gender">Gender</SelectItem>
                    <SelectItem value="dob">DOB</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <label className="text-right text-sm font-medium">
                  Search term
                </label>
                {advancedCriteria.searchBy === "dob" ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSearch();
                        }}
                        className={cn(
                          "col-span-3 text-left font-normal",
                          !advancedCriteria.searchTerm &&
                            "text-muted-foreground"
                        )}
                      >
                        {advancedCriteria.searchTerm ? (
                          format(new Date(advancedCriteria.searchTerm), "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-4">
                      <Calendar
                        mode="single"
                        selected={
                          advancedCriteria.searchTerm
                            ? new Date(advancedCriteria.searchTerm)
                            : undefined
                        }
                        onSelect={(date) => {
                          if (date) {
                            const formattedDate = format(date, "yyyy-MM-dd");
                            updateAdvancedCriteria(
                              "searchTerm",
                              String(formattedDate)
                            );
                          }
                        }}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <Input
                    className="col-span-3"
                    value={advancedCriteria.searchTerm}
                    onChange={(e) =>
                      updateAdvancedCriteria("searchTerm", e.target.value)
                    }
                    placeholder="Enter search term..."
                  />
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleAdvancedSearch}>Search</Button>
            </div>
          </DialogContent>
        </Dialog>

        {isSearchActive && (
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}
