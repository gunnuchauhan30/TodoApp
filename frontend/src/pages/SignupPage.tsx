import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { SignupSchema, SignupInput } from '../types';
import { useSignup } from '../hooks/useAuth';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { Spinner } from '../components/Spinner';

export const SignupPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<SignupInput>({ resolver: zodResolver(SignupSchema) });
  const signup = useSignup();

  return (
    <AuthLayout title="Create your account" subtitle="Organise your tasks in under a minute.">
      <form onSubmit={handleSubmit((d) => signup.mutate(d))} className="space-y-4" noValidate>
        <FormField
          label="Name"
          autoComplete="name"
          placeholder="Your name"
          error={errors.name?.message}
          {...register('name')}
        />
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
          autoComplete="new-password"
          placeholder="At least 6 characters"
          error={errors.password?.message}
          {...register('password')}
        />
        <button type="submit" className="btn-primary w-full" disabled={signup.isPending}>
          {signup.isPending && <Spinner />} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link to="/login" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
};
