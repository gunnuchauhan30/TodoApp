import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { LoginSchema, LoginInput } from '../types';
import { useLogin } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { Spinner } from '../components/Spinner';

export const LoginPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginInput>({ resolver: zodResolver(LoginSchema) });
  const login = useLogin();

  return (
    <AuthLayout title="Welcome back" subtitle="Log in to pick up where you left off.">
      <form onSubmit={handleSubmit((d) => login.mutate(d))} className="space-y-4" noValidate>
        <FormField
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register('email')}
        />
        <FormField
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="Your password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Forgot password?
          </Link>
        </div>
        <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
          {login.isPending && <Spinner />} Log in
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{' '}
        <Link to="/signup" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
};
