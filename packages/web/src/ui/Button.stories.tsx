import { Button, ButtonProps } from '@taskmoto/web/src/ui/Button';
import { Story, Meta } from '@storybook/react';

const Template: Story<ButtonProps> = (args) => (
  <Button {...args}>Button</Button>
);

export const Default = Template.bind({});
Default.args = {};

export const Primary = Template.bind({});
Primary.args = {
  ...Default.args,
  variant: 'primary',
};

export const Neutral = Template.bind({});
Primary.args = {
  ...Default.args,
  variant: 'neutral',
};

const meta: Meta = {
  title: 'Button',
  component: Button,
  parameters: {
    componentSubtitle:
      'Buttons are used primarily for actions, such as “Add”, “Close”, “Cancel”, or “Save”.',
  },
};

export default meta;
// export const Secondary = Template.bind({});
// Secondary.args = {
//   label: "Button",
// };
