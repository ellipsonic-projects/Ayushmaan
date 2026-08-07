"use client";

import * as React from "react";
import { Combobox as ComboboxPrimitive } from "@base-ui/react/combobox";
import { CheckIcon, Loader2Icon, SearchIcon, XIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const Combobox = ComboboxPrimitive.Root;

function ComboboxInputGroup({ className, ...props }: ComboboxPrimitive.InputGroup.Props) {
  return (
    <ComboboxPrimitive.InputGroup
      data-slot="combobox-input-group"
      className={cn("relative flex items-center", className)}
      {...props}
    />
  );
}

function ComboboxInput({ className, ...props }: ComboboxPrimitive.Input.Props) {
  return (
    <>
      <SearchIcon className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
      <ComboboxPrimitive.Input
        data-slot="combobox-input"
        className={cn(
          "h-9 w-full rounded-lg border border-input bg-transparent py-1 pl-9 pr-8 text-sm outline-none placeholder:text-muted-foreground transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    </>
  );
}

function ComboboxLoadingIcon({ loading, className }: { loading: boolean; className?: string }) {
  if (!loading) return null;
  return (
    <Loader2Icon
      className={cn(
        "pointer-events-none absolute right-3 h-3.5 w-3.5 animate-spin text-muted-foreground",
        className
      )}
    />
  );
}

function ComboboxClear({ className, ...props }: ComboboxPrimitive.Clear.Props) {
  return (
    <ComboboxPrimitive.Clear
      data-slot="combobox-clear"
      className={cn(
        "absolute right-2.5 flex h-4 w-4 items-center justify-center text-muted-foreground hover:text-foreground",
        className
      )}
      {...props}
    >
      <XIcon className="h-3.5 w-3.5" />
    </ComboboxPrimitive.Clear>
  );
}

function ComboboxContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  ...props
}: ComboboxPrimitive.Popup.Props &
  Pick<ComboboxPrimitive.Positioner.Props, "side" | "sideOffset" | "align">) {
  return (
    <ComboboxPrimitive.Portal>
      <ComboboxPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <ComboboxPrimitive.Popup
          data-slot="combobox-content"
          className={cn(
            "relative isolate z-50 max-h-80 w-(--anchor-width) overflow-x-hidden overflow-y-auto rounded-lg border border-border bg-popover text-popover-foreground shadow-md duration-100 data-[side=bottom]:slide-in-from-top-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
            className
          )}
          {...props}
        >
          {children}
        </ComboboxPrimitive.Popup>
      </ComboboxPrimitive.Positioner>
    </ComboboxPrimitive.Portal>
  );
}

function ComboboxList({ className, ...props }: ComboboxPrimitive.List.Props) {
  return (
    <ComboboxPrimitive.List
      data-slot="combobox-list"
      className={cn("flex flex-col gap-0.5 p-1", className)}
      {...props}
    />
  );
}

function ComboboxEmpty({ className, ...props }: ComboboxPrimitive.Empty.Props) {
  return (
    <ComboboxPrimitive.Empty
      data-slot="combobox-empty"
      className={cn("px-3 py-4 text-center text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

function ComboboxItem({ className, children, ...props }: ComboboxPrimitive.Item.Props) {
  return (
    <ComboboxPrimitive.Item
      data-slot="combobox-item"
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm outline-none select-none data-[highlighted]:bg-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
      {...props}
    >
      {children}
      <ComboboxPrimitive.ItemIndicator className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center text-primary">
        <CheckIcon className="h-4 w-4" />
      </ComboboxPrimitive.ItemIndicator>
    </ComboboxPrimitive.Item>
  );
}

export {
  Combobox,
  ComboboxInputGroup,
  ComboboxInput,
  ComboboxLoadingIcon,
  ComboboxClear,
  ComboboxContent,
  ComboboxList,
  ComboboxEmpty,
  ComboboxItem,
};
