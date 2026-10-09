import { Link, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ResetPasswordSchema, ResetPasswordInput } from '../types';
import { useResetPassword } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { Spinner } from '../components/Spinner';

export const ResetPasswordPage = () => {
  const { token = '' } = useParams<{ token: string }>();
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ResetPasswordInput>({ resolver: zodResolver(ResetPasswordSchema) });
  const reset = useResetPassword();

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password you haven't used before.">
      <form onSubmit={handleSubmit((data) => reset.mutate({ token, data }))} className="space-y-4" noValidate>
        <FormField
          label="New password"
          type="password"
          autoComplete="new-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <FormField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <button type="submit" className="btn-primary w-full" disabled={reset.isPending}>
          {reset.isPending && <Spinner />} Reset password
        </button>
      </form>
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          ← Back to login
        </Link>
      </p>
    </AuthLayout>
  );
};
