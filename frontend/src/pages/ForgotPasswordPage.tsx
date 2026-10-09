import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ForgotPasswordSchema, ForgotPasswordInput } from '../types';
import { useForgotPassword } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { Spinner } from '../components/Spinner';

export const ForgotPasswordPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<ForgotPasswordInput>({ resolver: zodResolver(ForgotPasswordSchema) });
  const forgot = useForgotPassword();
  const resetToken: string | undefined = forgot.data?.data?.resetToken;

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we'll send you a reset link.">
      {forgot.isSuccess ? (
        <div className="space-y-4">
          <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-300">
            {forgot.data?.message}
          </div>
          {resetToken && (
            <Link to={`/reset-password/${resetToken}`} className="btn-primary w-full">
              Open reset link (dev mode)
            </Link>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit((d) => forgot.mutate(d))} className="space-y-4" noValidate>
          <FormField
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />
          <button type="submit" className="btn-primary w-full" disabled={forgot.isPending}>
            {forgot.isPending && <Spinner />} Send reset link
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          ← Back to login
        </Link>
      </p>
    </AuthLayout>
  );
};
