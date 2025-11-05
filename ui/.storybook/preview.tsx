import type { Preview } from '@storybook/react';
import React from 'react';
import { Provider as ReduxProvider } from 'react-redux';
import { ThemeProvider } from 'next-themes';

import '../src/app/globals.css';
import { store } from '../src/lib/store';
import { Toaster } from '../src/components/ui/toaster';

const preview: Preview = {
  parameters: {
    actions: { argTypesRegex: '^on[A-Z].*' },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/,
      },
    },
    backgrounds: {
      default: 'slate',
      values: [
        { name: 'slate', value: '#0f172a' },
        { name: 'light', value: '#f8fafc' },
      ],
    },
  },
  decorators: [
    (Story) => (
      <ReduxProvider store={store}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <div className="min-h-screen bg-background p-8 text-foreground">
            <Story />
            <Toaster />
          </div>
        </ThemeProvider>
      </ReduxProvider>
    ),
  ],
};

export default preview;
