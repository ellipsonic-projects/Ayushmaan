"use client";

import { Plus, Trash2, Copy, ChevronUp, ChevronDown } from "lucide-react";
import type {
  ArrayFieldTemplateItemType,
  ArrayFieldTemplateProps,
  DescriptionFieldProps,
  ErrorListProps,
  FieldTemplateProps,
  IconButtonProps,
  ObjectFieldTemplateProps,
  SubmitButtonProps,
  TemplatesType,
  TitleFieldProps,
} from "@rjsf/utils";
import { getSubmitButtonOptions } from "@rjsf/utils";

// `registry` is required by rjsf's IconButtonProps (so the button component
// signature matches what ButtonTemplates expects), but every button here is
// presentational and never reads it — omitting it from our own prop type
// keeps manual call sites in ArrayFieldTemplate below from having to thread
// it through, while remaining assignable to ComponentType<IconButtonProps>.
type ButtonProps = Omit<IconButtonProps, "registry">;

import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

function FieldTemplate({
  id,
  classNames,
  label,
  required,
  description,
  errors,
  children,
  hidden,
  displayLabel,
}: FieldTemplateProps) {
  if (hidden) return <div className="hidden">{children}</div>;
  return (
    <div className={classNames ?? "flex flex-col gap-1.5"}>
      {displayLabel && label && (
        <Label htmlFor={id}>
          {label}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {children}
      {description}
      {errors}
    </div>
  );
}

function ObjectFieldTemplate({ properties }: ObjectFieldTemplateProps) {
  return (
    <div className="flex flex-col gap-4">
      {properties.map((prop) => (
        <div key={prop.name}>{prop.content}</div>
      ))}
    </div>
  );
}

function IconButton({
  icon,
  iconType: _iconType,
  className,
  uiSchema: _uiSchema,
  ...rest
}: ButtonProps) {
  return (
    <Button type="button" variant="outline" size="icon-sm" className={className} {...rest}>
      {icon}
    </Button>
  );
}

function AddButton({ uiSchema: _uiSchema, ...rest }: ButtonProps) {
  return (
    <Button type="button" variant="outline" size="sm" className="gap-1.5" {...rest}>
      <Plus className="h-3.5 w-3.5" />
      Add
    </Button>
  );
}

function RemoveButton(props: ButtonProps) {
  return <IconButton {...props} icon={<Trash2 className="h-3.5 w-3.5" />} />;
}

function MoveUpButton(props: ButtonProps) {
  return <IconButton {...props} icon={<ChevronUp className="h-3.5 w-3.5" />} />;
}

function MoveDownButton(props: ButtonProps) {
  return <IconButton {...props} icon={<ChevronDown className="h-3.5 w-3.5" />} />;
}

function CopyButton(props: ButtonProps) {
  return <IconButton {...props} icon={<Copy className="h-3.5 w-3.5" />} />;
}

// Repeatable-group field type from the builder palette — each item renders as
// its own bordered row with move/remove controls, "Add" appends a new item.
function ArrayFieldTemplate({
  items,
  canAdd,
  onAddClick,
  title,
  required,
}: ArrayFieldTemplateProps) {
  return (
    <div className="flex flex-col gap-2">
      {title && (
        <Label>
          {title}
          {required && <span className="text-destructive"> *</span>}
        </Label>
      )}
      {items.map((item: ArrayFieldTemplateItemType) => (
        <div key={item.key} className="flex items-start gap-2 rounded-lg border border-border p-3">
          <div className="min-w-0 flex-1">{item.children}</div>
          <div className="flex shrink-0 flex-col gap-1">
            {item.hasMoveUp && (
              <MoveUpButton onClick={item.onReorderClick(item.index, item.index - 1)} />
            )}
            {item.hasMoveDown && (
              <MoveDownButton onClick={item.onReorderClick(item.index, item.index + 1)} />
            )}
            {item.hasCopy && <CopyButton onClick={item.onCopyIndexClick(item.index)} />}
            {item.hasRemove && <RemoveButton onClick={item.onDropIndexClick(item.index)} />}
          </div>
        </div>
      ))}
      {canAdd && (
        <div>
          <AddButton onClick={onAddClick} />
        </div>
      )}
    </div>
  );
}

function TitleField({ title }: TitleFieldProps) {
  if (!title) return null;
  return <h3 className="text-sm font-semibold text-foreground">{title}</h3>;
}

function DescriptionField({ description }: DescriptionFieldProps) {
  if (!description) return null;
  return <p className="text-xs text-muted-foreground">{description}</p>;
}

function ErrorListTemplate({ errors }: ErrorListProps) {
  if (errors.length === 0) return null;
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
      {errors.map((error) => (
        <p key={error.stack} className="text-xs text-destructive">
          {error.stack}
        </p>
      ))}
    </div>
  );
}

function SubmitButton(props: SubmitButtonProps) {
  const { submitText, norender, props: buttonProps } = getSubmitButtonOptions(props.uiSchema);
  if (norender) return null;
  return (
    <Button type="submit" className="mt-2" {...buttonProps}>
      {submitText ?? "Submit"}
    </Button>
  );
}

export const rjsfTemplates: Partial<TemplatesType> = {
  FieldTemplate,
  ObjectFieldTemplate,
  ArrayFieldTemplate,
  TitleFieldTemplate: TitleField,
  DescriptionFieldTemplate: DescriptionField,
  ErrorListTemplate,
  ButtonTemplates: {
    SubmitButton,
    AddButton,
    CopyButton,
    RemoveButton,
    MoveUpButton,
    MoveDownButton,
  },
};
