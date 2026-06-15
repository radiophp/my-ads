'use client';

import { createContext, forwardRef, useContext, useId, useMemo } from 'react';
import type { ComponentPropsWithoutRef, ElementRef, HTMLAttributes, LabelHTMLAttributes, ReactNode } from 'react';
import { Slot } from '@radix-ui/react-slot';
import {
  Controller,
  type ControllerProps,
  type FieldPath,
  type FieldValues,
  FormProvider,
  useFormContext,
  type UseFormReturn,
} from 'react-hook-form';

import { cn } from '@/lib/utils';

type FormProps<TFieldValues extends FieldValues = FieldValues, TContext = unknown> = {
  children: ReactNode;
} & UseFormReturn<TFieldValues, TContext>;

function Form<TFieldValues extends FieldValues, TContext>({
  children,
  ...form
}: FormProps<TFieldValues, TContext>) {
  return <FormProvider {...form}>{children}</FormProvider>;
}

const FormFieldContext = createContext<{ name: string } | null>(null);

const FormField = <TFieldValues extends FieldValues, TName extends FieldPath<TFieldValues>>({
  ...props
}: ControllerProps<TFieldValues, TName>) => {
  const contextValue = useMemo(() => ({ name: props.name }), [props.name]);
  return (
    <FormFieldContext.Provider value={contextValue}>
      <Controller {...props} />
    </FormFieldContext.Provider>
  );
};

const FormItemContext = createContext<{ id: string } | null>(null);

const FormItem = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    const id = useId();
    const contextValue = useMemo(() => ({ id }), [id]);
    return (
      <FormItemContext.Provider value={contextValue}>
        <div ref={ref} className={cn('space-y-2', className)} {...props} />
      </FormItemContext.Provider>
    );
  },
);
FormItem.displayName = 'FormItem';

const useFormField = () => {
  const fieldContext = useContext(FormFieldContext);
  const itemContext = useContext(FormItemContext);
  const { getFieldState, formState } = useFormContext();

  if (!fieldContext || !itemContext) {
    throw new Error('useFormField should be used inside <FormField> and <FormItem> components');
  }

  const fieldState = getFieldState(fieldContext.name, formState);

  return {
    id: itemContext.id,
    name: fieldContext.name,
    formItemId: `${itemContext.id}-form-item`,
    formDescriptionId: `${itemContext.id}-form-item-description`,
    formMessageId: `${itemContext.id}-form-item-message`,
    ...fieldState,
  };
};

const FormLabel = forwardRef<HTMLLabelElement, LabelHTMLAttributes<HTMLLabelElement>>(
  ({ className, ...props }, ref) => {
    const { formItemId } = useFormField();
    return (
      <label
        ref={ref}
        className={cn(
          'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
          className,
        )}
        htmlFor={formItemId}
        {...props}
      />
    );
  },
);
FormLabel.displayName = 'FormLabel';

const FormControl = forwardRef<
  ElementRef<typeof Slot>,
  ComponentPropsWithoutRef<typeof Slot>
>(({ className, ...props }, ref) => {
  const { formItemId } = useFormField();
  return <Slot ref={ref} id={formItemId} className={className} {...props} />;
});
FormControl.displayName = 'FormControl';

const FormDescription = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
  const { formDescriptionId } = useFormField();
  return (
    <p
      ref={ref}
      className={cn('text-sm text-muted-foreground', className)}
      id={formDescriptionId}
      {...props}
    />
  );
});
FormDescription.displayName = 'FormDescription';

const FormMessage = forwardRef<
  HTMLParagraphElement,
  HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { formMessageId, error } = useFormField();
  const body = error ? String(error?.message ?? '') : children;
  if (!body) return null;

  return (
    <p
      ref={ref}
      className={cn('text-sm font-medium text-destructive', className)}
      id={formMessageId}
      {...props}
    >
      {body}
    </p>
  );
});
FormMessage.displayName = 'FormMessage';

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };
