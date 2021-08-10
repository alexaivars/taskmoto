import { FormField, FormFieldProps } from '@taskmoto/web/src/ui/FormField';
import { TextInput } from '@taskmoto/web/src/ui/TextInput';
import { Story, Meta } from '@storybook/react';

const Template: Story<FormFieldProps> = (args: FormFieldProps) => (
  <FormField {...args} />
);

export const Default = Template.bind({});
Default.args = {
  id: 'default',
  label: 'Display name (optional)',
  description:
    "Your display name will be public. So don't use your real name, or any other information that could identify you, like your phone number, email address, street name or school name.",
  children: <TextInput type="text" name="text" />,
};

export const Error = Template.bind({});
Error.args = {
  id: 'default',
  label: 'Display name (optional)',
  description:
    "Your display name will be public. So don't use your real name, or any other information that could identify you, like your phone number, email address, street name or school name.",
  error: 'Use a display name that is shorter than 256 characters.',
  children: <TextInput type="text" name="text" />,
};

const meta: Meta = {
  title: 'FormField',
  component: FormField,
  parameters: {
    componentSubtitle:
      'Use form field to display input fields within a form using standard spacing, descriptions and error messages.',
  },
};

export default meta;
