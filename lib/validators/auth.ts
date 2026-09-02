import { z } from 'zod';

export const registerSchema = z.object({
  full_name: z.string().min(2, 'Enter your full name').max(100),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(10, 'Enter a valid phone number').max(15).optional(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  exam_target: z.enum(['jamb', 'waec', 'both']).optional(),

  // Students now activate PTA with an Activation Key only.
  access_key: z
    .string()
    .trim()
    .min(1, 'Enter your Activation Key')
    .max(100, 'Invalid activation key'),
});

export const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const bootstrapAdminSchema = z.object({
  secret: z.string().min(1),
  email: z.string().email(),
});
