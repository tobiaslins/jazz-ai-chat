"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ModelId, modelsByProvider } from "@/lib/models";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
  selectedModel: ModelId;
  setSelectedModel: (model: ModelId) => void;
  singleLine?: boolean;
}

export function ModelSelector({
  selectedModel,
  setSelectedModel,
  singleLine,
}: ModelSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedProvider = selectedModel.split("/")[0];
  const selectedModelName = selectedModel.split("/").slice(1).join("/");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          role="combobox"
          aria-expanded={open}
          className="overflow-hidden"
        >
          <div
            className={cn(
              "text-xs flex flex-col items-start overflow-hidden",
              singleLine && "flex-row gap-1"
            )}
          >
            <span className="font-semibold">{selectedProvider}</span>
            <span className="truncate max-w-full">{selectedModelName}</span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0">
        <Command>
          <CommandInput placeholder="Search models..." />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            {Object.entries(modelsByProvider).map(
              ([provider, models], index, array) => (
                <CommandGroup key={provider} heading={provider}>
                  {models.map((model) => (
                    <CommandItem
                      key={model.id}
                      onSelect={(currentValue) => {
                        const modelId = models.find(
                          (m) => m.name.toLowerCase() === currentValue
                        )?.id;
                        if (modelId) {
                          setSelectedModel(modelId);
                        }
                        setOpen(false);
                      }}
                      value={model.name}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          selectedModel === model.id
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {model.name}
                    </CommandItem>
                  ))}
                  {index < array.length - 1 && <CommandSeparator />}
                </CommandGroup>
              )
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
