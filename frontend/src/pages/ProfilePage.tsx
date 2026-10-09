import { ChangeEvent, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { AppHeader } from '../components/AppHeader';
import { ConfirmModal } from '../components/ConfirmModal';
import { FormField } from '../components/FormField';
import { Spinner } from '../components/Spinner';
import { useAuthStore } from '../store/authStore';
import { useChangePassword, useDeleteAccount, useUpdateProfile } from '../hooks/useAuth';
import { useExport, useImport } from '../hooks/useTodos';
import { parseCsv } from '../lib/csv';
import { ChangePasswordInput, ChangePasswordSchema, ProfileInput, ProfileSchema } from '../types';

const Section = ({
  title,
  description,
  children,
  danger
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  danger?: boolean;
}) => (
  <section className={`card p-5 sm:p-6 ${danger ? '!border-red-200 dark:!border-red-900/60' : ''}`}>
    <h2 className={`text-lg font-semibold ${danger ? 'text-red-600 dark:text-red-400' : ''}`}>{title}</h2>
    <p className="mb-5 mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
    {children}
  </section>
);

const ProfileForm = () => {
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty }
  } = useForm<ProfileInput>({ resolver: zodResolver(ProfileSchema), defaultValues: { name: user?.name ?? '' } });

  return (
    <form onSubmit={handleSubmit((d) => update.mutate(d.name))} className="space-y-4" noValidate>
      <FormField label="Name" autoComplete="name" error={errors.name?.message} {...register('name')} />
      <div>
        <label htmlFor="profile-email" className="label">
          Email
        </label>
        <input
          id="profile-email"
          className="input cursor-not-allowed opacity-70"
          value={user?.email ?? ''}
          readOnly
          disabled
        />
      </div>
      <button type="submit" className="btn-primary" disabled={update.isPending || !isDirty}>
        {update.isPending && <Spinner />} Save changes
      </button>
    </form>
  );
};

const PasswordForm = () => {
  const change = useChangePassword();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ChangePasswordInput>({ resolver: zodResolver(ChangePasswordSchema) });

  return (
    <form
      onSubmit={handleSubmit((d) => change.mutate(d, { onSuccess: () => reset() }))}
      className="space-y-4"
      noValidate
    >
      <FormField
        label="Current password"
        type="password"
        autoComplete="current-password"
        error={errors.currentPassword?.message}
        {...register('currentPassword')}
      />
      <FormField
        label="New password"
        type="password"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <FormField
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        {...register('confirmPassword')}
      />
      <button type="submit" className="btn-primary" disabled={change.isPending}>
        {change.isPending && <Spinner />} Change password
      </button>
    </form>
  );
};

const DataSection = () => {
  const exporter = useExport();
  const importer = useImport();
  const fileRef = useRef<HTMLInputElement>(null);

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return void toast.error('File is too large (max 2 MB)');

    try {
      const text = await file.text();
      let rows: unknown[];
      if (file.name.toLowerCase().endsWith('.csv')) rows = parseCsv(text);
      else {
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : parsed.todos;
      }
      if (!Array.isArray(rows) || rows.length === 0) return void toast.error('No todos found in that file');
      importer.mutate(rows);
    } catch {
      toast.error('Could not read that file. Use a JSON or CSV file exported from TaskFlow.');
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      <button className="btn-ghost" disabled={exporter.isPending} onClick={() => exporter.mutate('json')}>
        ⬇ Export JSON
      </button>
      <button className="btn-ghost" disabled={exporter.isPending} onClick={() => exporter.mutate('csv')}>
        ⬇ Export CSV
      </button>
      <button className="btn-ghost" disabled={importer.isPending} onClick={() => fileRef.current?.click()}>
        {importer.isPending ? <Spinner /> : '⬆'} Import file
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".json,.csv,application/json,text/csv"
        className="hidden"
        onChange={onFile}
      />
    </div>
  );
};

export const ProfilePage = () => {
  const del = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');

  const close = () => {
    setOpen(false);
    setPassword('');
  };

  return (
    <div className="min-h-screen">
      <AppHeader />
      <main className="mx-auto max-w-3xl space-y-6 px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Profile &amp; settings</h1>

        <Section title="Account" description="Your name is shown on your dashboard.">
          <ProfileForm />
        </Section>

        <Section title="Password" description="Changing your password signs you out of all other devices.">
          <PasswordForm />
        </Section>

        <Section
          title="Your data"
          description="Download a backup of your todos, or import todos from a JSON/CSV file (up to 500 per file). Deleted todos are not exported."
        >
          <DataSection />
        </Section>

        <Section
          title="Danger zone"
          description="Permanently delete your account together with every todo and attachment. This cannot be undone."
          danger
        >
          <button className="btn-danger" onClick={() => setOpen(true)}>
            Delete my account
          </button>
        </Section>
      </main>

      <ConfirmModal
        open={open}
        title="Delete your account?"
        confirmLabel="Delete account"
        danger
        busy={del.isPending}
        disabled={!password}
        onClose={close}
        onConfirm={() => del.mutate(password)}
      >
        <p className="mb-3">Everything will be permanently deleted. Enter your password to confirm.</p>
        <label htmlFor="confirm-password" className="label">
          Password
        </label>
        <input
          id="confirm-password"
          type="password"
          className="input"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </ConfirmModal>
    </div>
  );
};
