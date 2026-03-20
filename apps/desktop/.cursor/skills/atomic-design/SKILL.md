---
name: atomic-design
description: Atomic Design component organization pattern for React applications. Use when creating new components or organizing component structures.
---

# Atomic Design Skill

This skill covers the Atomic Design pattern for organizing React components into a clear hierarchy that promotes reusability, consistency, and scalability.

## When to Use

Use this skill when:
- Creating new components
- Organizing existing component structures
- Deciding where a component should live
- Building component libraries
- Setting up new React projects

## Core Principle

**COMPOSITION FROM SIMPLE TO COMPLEX** - Build complex interfaces by composing simple, well-tested building blocks.

## The Five-Level Hierarchy

| Level | Alternative Name | Description | Examples | State | Storybook |
|-------|------------------|-------------|----------|-------|-----------|
| **Atoms** | Elements | Basic building blocks | Button, Input, Label, Icon | Stateless | Yes |
| **Molecules** | Widgets | Functional units combining atoms | SearchForm, FormField, Card | Minimal state | Yes |
| **Organisms** | Modules | Complex UI sections | Header, Footer, LoginForm | Can have state | Yes |
| **Templates** | Layouts | Page-level layout structures | MainLayout, AuthLayout | Layout state only | No |
| **Pages** | - | Specific template instances | HomePage, DashboardPage | Full state | No |

## Component Classification Decision

Use this flowchart to determine the correct atomic level:

| Question | Answer | Level |
|----------|--------|-------|
| Can it be broken down further? | No | **Atom** |
| Does it combine atoms for a single purpose? | Yes | **Molecule** |
| Is it a larger section with business logic? | Yes | **Organism** |
| Does it define page structure without content? | Yes | **Template** |
| Does it have real content and data connections? | Yes | **Page** |

## Classification Checklists

### Is it an Atom?

- [ ] Cannot be broken down into smaller components
- [ ] Single HTML element or very simple composition
- [ ] No business logic
- [ ] Stateless or only UI state (hover, focus)
- [ ] No dependencies on other custom components

### Is it a Molecule?

- [ ] Combines 2+ atoms
- [ ] Single functional purpose
- [ ] Minimal internal state
- [ ] No data fetching
- [ ] No connection to global state

### Is it an Organism?

- [ ] Larger interface section
- [ ] May have business logic
- [ ] May connect to stores
- [ ] Relatively standalone
- [ ] Could be used across multiple pages

### Is it a Template?

- [ ] Defines page structure
- [ ] Uses slots/children for content
- [ ] No real data
- [ ] Handles layout concerns (responsive, spacing)

### Is it a Page?

- [ ] Uses a template
- [ ] Has real content
- [ ] Connects to data sources
- [ ] Handles routing/navigation

## Code Examples

### Atom Example

```typescript
// src/components/atoms/Button/Button.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant, size = 'md', loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          'inline-flex items-center justify-center rounded-md font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-2',
          {
            'bg-blue-600 text-white hover:bg-blue-700': variant === 'primary',
            'bg-gray-200 text-gray-900 hover:bg-gray-300': variant === 'secondary',
            'bg-red-600 text-white hover:bg-red-700': variant === 'danger',
            'bg-transparent hover:bg-gray-100': variant === 'ghost',
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
            'opacity-50 cursor-not-allowed': disabled || loading,
          },
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <span className="mr-2 h-4 w-4 animate-spin">...</span>}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
```

### Molecule Example

```typescript
// src/components/molecules/FormField/FormField.tsx
import { Label, Input, Text } from '@/components/atoms';

interface FormFieldProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  error?: string;
  required?: boolean;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FormField({
  label,
  name,
  type = 'text',
  placeholder,
  error,
  required,
  value,
  onChange,
}: FormFieldProps): React.ReactElement {
  return (
    <div className="space-y-1">
      <Label htmlFor={name}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>
      <Input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : undefined}
      />
      {error && (
        <Text id={`${name}-error`} className="text-red-500 text-sm">
          {error}
        </Text>
      )}
    </div>
  );
}
```

### Organism Example

```typescript
// src/components/organisms/LoginForm/LoginForm.tsx
import { useState } from 'react';
import { Button } from '@/components/atoms';
import { FormField } from '@/components/molecules';

interface LoginFormProps {
  onSubmit: (email: string, password: string) => Promise<void>;
  onForgotPassword?: () => void;
}

export function LoginForm({ onSubmit, onForgotPassword }: LoginFormProps): React.ReactElement {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!email) newErrors.email = 'Email is required';
    if (!password) newErrors.password = 'Password is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      await onSubmit(email, password);
    } catch {
      setErrors({ form: 'Invalid credentials' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <FormField
        label="Email"
        name="email"
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        required
      />
      <FormField
        label="Password"
        name="password"
        type="password"
        placeholder="********"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        required
      />
      {errors.form && <div className="text-red-500 text-sm">{errors.form}</div>}
      <Button variant="primary" type="submit" loading={loading} className="w-full">
        Sign In
      </Button>
      {onForgotPassword && (
        <button
          type="button"
          onClick={onForgotPassword}
          className="text-sm text-blue-600 hover:underline"
        >
          Forgot password?
        </button>
      )}
    </form>
  );
}
```

### Template Example

```typescript
// src/components/templates/AuthLayout/AuthLayout.tsx
interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
}

export function AuthLayout({ children, title, subtitle }: AuthLayoutProps): React.ReactElement {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-3xl font-bold">{title}</h1>
          {subtitle && <p className="mt-2 text-gray-600">{subtitle}</p>}
        </div>
        {children}
      </div>
    </div>
  );
}
```

### Page Example (Vite SPA)

```typescript
// src/pages/Login/LoginPage.tsx
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '@/components/templates';
import { LoginForm } from '@/components/organisms';
import { useAuth } from '@/hooks/useAuth';

export function LoginPage(): React.ReactElement {
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (email: string, password: string) => {
    await login(email, password);
    navigate('/dashboard');
  };

  return (
    <AuthLayout title="Welcome Back" subtitle="Sign in to your account">
      <LoginForm onSubmit={handleLogin} onForgotPassword={() => navigate('/forgot-password')} />
    </AuthLayout>
  );
}
```

## Storybook Story Templates

### Atom Story Template

```typescript
// Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';

const meta: Meta<typeof Button> = {
  title: 'Atoms/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'danger', 'ghost'],
      description: 'The visual style of the button',
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
      description: 'The size of the button',
    },
    loading: {
      control: 'boolean',
      description: 'Shows a loading spinner',
    },
    disabled: {
      control: 'boolean',
      description: 'Disables the button',
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    variant: 'primary',
    children: 'Primary Button',
  },
};

export const Secondary: Story = {
  args: {
    variant: 'secondary',
    children: 'Secondary Button',
  },
};

export const Loading: Story = {
  args: {
    variant: 'primary',
    children: 'Saving...',
    loading: true,
  },
};

export const AllVariants: Story = {
  render: () => (
    <div className="flex gap-4">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="ghost">Ghost</Button>
    </div>
  ),
};
```

### Molecule Story Template

```typescript
// FormField.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { FormField } from './FormField';

const meta: Meta<typeof FormField> = {
  title: 'Molecules/FormField',
  component: FormField,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: 'Email',
    name: 'email',
    placeholder: 'you@example.com',
  },
};

export const WithError: Story = {
  args: {
    label: 'Email',
    name: 'email',
    error: 'Email is required',
    required: true,
  },
};

export const Required: Story = {
  args: {
    label: 'Password',
    name: 'password',
    type: 'password',
    required: true,
  },
};
```

### Organism Story Template

```typescript
// LoginForm.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { LoginForm } from './LoginForm';

const meta: Meta<typeof LoginForm> = {
  title: 'Organisms/LoginForm',
  component: LoginForm,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof LoginForm>;

export const Default: Story = {
  args: {
    onSubmit: async (email, password) => {
      console.log('Login:', { email, password });
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
    onForgotPassword: () => console.log('Forgot password clicked'),
  },
};

export const WithoutForgotPassword: Story = {
  args: {
    onSubmit: async () => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    },
  },
};
```

## Naming Conventions

```
atoms/
  Button/           # PascalCase - noun (what it is)
  Input/
  Icon/

molecules/
  SearchForm/       # PascalCase - descriptive compound name
  InputGroup/
  FormField/

organisms/
  Header/           # PascalCase - section name
  LoginForm/
  ProductCard/

templates/
  MainLayout/       # PascalCase - always end with "Layout"
  DashboardLayout/
  AuthLayout/

pages/
  HomePage/         # PascalCase - always end with "Page"
  DashboardPage/
  ProfilePage/
```

## Import Strategy

```typescript
// Within same level - use relative imports
import { Button } from '../Button';

// Across levels - use path alias
import { Button, Input } from '@/components/atoms';
import { SearchForm, FormField } from '@/components/molecules';
import { Header, LoginForm } from '@/components/organisms';
import { MainLayout, AuthLayout } from '@/components/templates';

// From top-level barrel (when importing many components)
import { Button, Input, SearchForm, Header } from '@/components';
```

### Path Alias Configuration

**Vite (`vite.config.ts`):**
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

**Next.js (`tsconfig.json`):**
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Barrel Export Patterns

### Atom Level Barrel Export

```typescript
// src/components/atoms/index.ts
export { Button } from './Button';
export { Input } from './Input';
export { Label } from './Label';
export { Icon } from './Icon';
export { Text } from './Text';
export { Image } from './Image';
export { Badge } from './Badge';
export { Avatar } from './Avatar';
export { Spinner } from './Spinner';

// Re-export types
export type { ButtonProps } from './Button';
export type { InputProps } from './Input';
```

### Molecule Level Barrel Export

```typescript
// src/components/molecules/index.ts
export { SearchForm } from './SearchForm';
export { InputGroup } from './InputGroup';
export { Card } from './Card';
export { FormField } from './FormField';
export { MenuItem } from './MenuItem';

export type { FormFieldProps } from './FormField';
```

### Organism Level Barrel Export

```typescript
// src/components/organisms/index.ts
export { Header } from './Header';
export { Footer } from './Footer';
export { Navigation } from './Navigation';
export { Sidebar } from './Sidebar';
export { LoginForm } from './LoginForm';

export type { LoginFormProps } from './LoginForm';
```

### Template Level Barrel Export

```typescript
// src/components/templates/index.ts
export { MainLayout } from './MainLayout';
export { DashboardLayout } from './DashboardLayout';
export { AuthLayout } from './AuthLayout';
```

### Main Barrel Export

```typescript
// src/components/index.ts
export * from './atoms';
export * from './molecules';
export * from './organisms';
export * from './templates';
```

## PRD Override Configuration

Projects can opt out of Atomic Design by specifying in their PRD:

```yaml
# .molcajete/prd/tech-stack.yaml or tech-stack.md frontmatter
techStack:
  framework: react
  componentOrganization: atomic    # Default - Atomic Design
  # componentOrganization: flat    # Simple flat structure
  # componentOrganization: feature-based  # Feature modules
```

### Alternative: Flat Structure

When `componentOrganization: flat`:
```
src/
├── components/
│   ├── Button/
│   ├── Input/
│   ├── Header/
│   ├── LoginForm/
│   └── ...
```

### Alternative: Feature-Based Structure

When `componentOrganization: feature-based`:
```
src/
├── features/
│   ├── auth/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── stores/
│   ├── dashboard/
│   └── profile/
├── shared/
│   └── components/
│       ├── Button/
│       └── Input/
```

## Best Practices

1. **Start with atoms** - Build basic building blocks first
2. **Compose upward** - Molecules use atoms, organisms use molecules
3. **Keep atoms stateless** - UI state only (hover, focus)
4. **Elevate state** - Keep state at organism level or higher
5. **Type everything** - Strict TypeScript interfaces for all props
6. **Write stories** - Every atom, molecule, and organism has Storybook stories
7. **Test in isolation** - Each component testable independently
8. **Use forwardRef** - For focusable/interactive atoms
9. **Set displayName** - For DevTools debugging

## Notes

- Atomic Design is the default for new projects
- Templates and Pages do not get Storybook stories
- Brad Frost's original article: https://bradfrost.com/blog/post/atomic-web-design/
- shadcn/ui components can be classified as atoms or molecules
