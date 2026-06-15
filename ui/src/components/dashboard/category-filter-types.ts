import type { TranslationValues } from 'next-intl';

export type FilterOption = { value: string; label: string };

export type BaseWidget = {
  id: string;
  label: string;
  description?: string;
  uid?: string;
};

export type TitleWidget = BaseWidget & { kind: 'title' };

export type NumberRangeWidget = BaseWidget & {
  kind: 'numberRange';
  key: string;
  unit?: string;
};

export type MultiSelectWidget = BaseWidget & {
  kind: 'multiSelect';
  key: string;
  options: FilterOption[];
  layout: 'chips' | 'list';
};

export type SingleSelectWidget = BaseWidget & {
  kind: 'singleSelect';
  key: string;
  options: FilterOption[];
  clearable: boolean;
};

export type ToggleWidget = BaseWidget & {
  kind: 'toggle';
  key: string;
};

export type UnsupportedWidget = BaseWidget & {
  kind: 'unsupported';
  key?: string | null;
  rawType: string;
};

export type ParsedWidget =
  | TitleWidget
  | NumberRangeWidget
  | MultiSelectWidget
  | SingleSelectWidget
  | ToggleWidget
  | UnsupportedWidget;

export type FilterOptionsModalState =
  | {
      type: 'multi';
      key: string;
      title: string;
      description?: string;
      options: FilterOption[];
    }
  | {
      type: 'single';
      key: string;
      title: string;
      description?: string;
      options: FilterOption[];
      clearable: boolean;
    };

export type TranslateFn = (key: string, values?: TranslationValues) => string;
