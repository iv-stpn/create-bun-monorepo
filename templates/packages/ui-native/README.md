# UI Native Components

A collection of reusable React Native components for mobile applications.

## Components

### Button
A customizable button component with multiple variants and sizes.

```tsx
import { Button } from '@your-app/ui-native';

<Button
  title="Press me"
  onPress={() => console.log('Pressed!')}
  variant="primary"
  size="medium"
/>
```

**Props:**
- `title` - Button text
- `onPress` - Function to call when pressed
- `variant` - 'primary' | 'secondary' | 'outline' (default: 'primary')
- `size` - 'small' | 'medium' | 'large' (default: 'medium')
- `disabled` - Boolean to disable the button
- `loading` - Boolean to show loading spinner

### Card
A container component with different styling variants.

```tsx
import { Card } from '@your-app/ui-native';

<Card variant="elevated" padding="medium">
  <Text>Card content</Text>
</Card>
```

**Props:**
- `children` - React node content
- `variant` - 'default' | 'elevated' | 'outlined' (default: 'default')
- `padding` - 'none' | 'small' | 'medium' | 'large' (default: 'medium')

### Input
A text input component with label and error states.

```tsx
import { Input } from '@your-app/ui-native';

<Input
  label="Email"
  placeholder="Enter your email"
  value={email}
  onChangeText={setEmail}
  variant="outlined"
/>
```

**Props:**
- `label` - Input label text
- `placeholder` - Placeholder text
- `value` - Input value
- `onChangeText` - Function to handle text changes
- `error` - Error message to display
- `variant` - 'default' | 'filled' | 'outlined' (default: 'default')
- `size` - 'small' | 'medium' | 'large' (default: 'medium')

### Avatar
A user avatar component with image or initials fallback.

```tsx
import { Avatar } from '@your-app/ui-native';

<Avatar
  source={{ uri: 'https://example.com/avatar.jpg' }}
  size="large"
  fallbackText="John Doe"
/>
```

**Props:**
- `source` - Image source (URI or local)
- `size` - 'small' | 'medium' | 'large' | 'xlarge' (default: 'medium')
- `fallbackText` - Text to generate initials from

## Installation

This package is designed to be used in a monorepo setup. It depends on:
- React Native
- React

Make sure these dependencies are installed in your React Native application.
