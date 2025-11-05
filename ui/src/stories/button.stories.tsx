import type { Meta, StoryObj } from '@storybook/react';

import { Button, type ButtonProps } from '@/components/ui/button';

const meta: Meta<ButtonProps> = {
  title: 'Design System/Button',
  component: Button,
  args: {
    children: 'Get started'
  }
};

export default meta;

type Story = StoryObj<ButtonProps>;

export const Primary: Story = {};
export const Outline: Story = {
  args: {
    variant: 'outline'
  }
};
export const Destructive: Story = {
  args: {
    variant: 'destructive',
    children: 'Delete'
  }
};
