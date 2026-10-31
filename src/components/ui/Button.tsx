'use client';
import { Button as Primitive } from '@base-ui/react/button';
import { cn } from '@/lib/cn';
export function Button({ variant = 'secondary', className, ...props }: Primitive.Props & { variant?: 'primary' | 'secondary' | 'quiet' | 'icon' }) {
  return <Primitive {...props} className={cn('button', `button-${variant}`, className)} />;
}
