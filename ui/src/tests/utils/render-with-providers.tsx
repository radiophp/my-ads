import { render } from '@testing-library/react';
import type { RenderOptions } from '@testing-library/react';
import type { ReactElement } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { Provider as ReduxProvider } from 'react-redux';

import enMessages from '@/messages/en.json';
import { store } from '@/lib/store';

const customRender = (ui: ReactElement, options?: RenderOptions) =>
  render(
    <ReduxProvider store={store}>
      <NextIntlClientProvider locale="en" messages={enMessages}>
        {ui}
      </NextIntlClientProvider>
    </ReduxProvider>,
    {
      ...options
    }
  );

export * from '@testing-library/react';
export { customRender as render };
