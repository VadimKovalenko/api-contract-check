import type { ComponentType } from 'react';

interface ClassNameProp {
  className?: string;
}

export function withUserAccessibilityThereStyle<Props extends ClassNameProp>(
  Component: ComponentType<Props>,
) {
  return function UserAccessibilityThereStyleComponent({ className = '', ...props }: Props) {
    const accessibilityClassName = ['user-accessibility-theme-style', className]
      .filter(Boolean)
      .join(' ');

    return <Component {...({ ...props, className: accessibilityClassName } as Props)} />;
  };
}
