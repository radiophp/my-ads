'use client';

import { useEffect, useMemo, useState, type JSX } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslations } from 'next-intl';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  useGetCitiesQuery,
  useGetCurrentUserQuery,
  useGetProvincesQuery,
  useUpdateCurrentUserMutation,
} from '@/features/api/apiSlice';
import { useAppDispatch, useAppSelector } from '@/lib/hooks';
import { updateUser } from '@/features/auth/authSlice';
import { ProfileImageUploader } from '@/components/profile/profile-image-uploader';
import { useToast } from '@/components/ui/use-toast';

const profileSchemaFactory = (t: (path: string) => string) =>
  z
    .object({
      firstName: z
        .string()
        .trim()
        .max(50, t('validation.firstNameMax'))
        .optional()
        .transform((val) => (val === undefined || val === '' ? '' : val)),
      lastName: z
        .string()
        .trim()
        .max(50, t('validation.lastNameMax'))
        .optional()
        .transform((val) => (val === undefined || val === '' ? '' : val)),
      email: z
        .string()
        .trim()
        .max(160, t('validation.emailMax'))
        .optional()
        .refine(
          (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
          t('validation.emailInvalid'),
        )
        .transform((val) => (val === undefined ? '' : val)),
      provinceId: z.string().optional().transform((val) => (val ?? '')),
      cityId: z.string().optional().transform((val) => (val ?? '')),
      profileImageUrl: z
        .string()
        .trim()
        .optional()
        .refine(
          (val) => !val || /^https?:\/\//i.test(val),
          t('validation.imageUrlInvalid'),
        )
        .transform((val) => (val === undefined ? '' : val)),
    })
    .superRefine((data, ctx) => {
      if (data.cityId && !data.provinceId) {
        ctx.addIssue({
          path: ['provinceId'],
          code: z.ZodIssueCode.custom,
          message: t('validation.provinceRequired'),
        });
      }
    });

type ProfileFormValues = z.infer<ReturnType<typeof profileSchemaFactory>>;

export function ProfileForm(): JSX.Element {
  const t = useTranslations('profile');
  const schema = useMemo(() => profileSchemaFactory(t), [t]);
  const imageTexts = useMemo(
    () => ({
      title: t('image.title'),
      callToAction: t('image.cta'),
      helper: t('image.helper'),
      select: t('image.select'),
      uploading: t('image.uploading'),
      remove: t('image.remove'),
      successTitle: t('image.success'),
      successDescription: t('image.successDescription'),
      errorTitle: t('image.error'),
      errorDescription: t('image.errorDescription'),
      unsupportedTitle: t('image.unsupported'),
      unsupportedDescription: t('image.unsupportedDescription'),
      modalTitle: t('image.modalTitle'),
      modalDescription: t('image.modalDescription'),
      confirm: t('image.confirm'),
      cancel: t('image.cancel'),
      zoomLabel: t('image.zoomLabel'),
    }),
    [t],
  );
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((state) => state.auth.user);
  const { toast } = useToast();
  const { data: currentUser, isLoading: isLoadingUser } = useGetCurrentUserQuery();
  const { data: provinces = [], isLoading: isLoadingProvinces } = useGetProvincesQuery();
  const phoneNumber = currentUser?.phone ?? authUser?.phone ?? '';
  const [selectedProvince, setSelectedProvince] = useState<string>('');
  const {
    data: cities = [],
    isFetching: isFetchingCities,
    refetch: refetchCities,
  } = useGetCitiesQuery(selectedProvince ? Number(selectedProvince) : undefined, {
    skip: !selectedProvince,
  });

  const [updateCurrentUser, { isLoading: isUpdating }] = useUpdateCurrentUserMutation();

  const defaultValues = useMemo<ProfileFormValues>(
    () => ({
      firstName: currentUser?.firstName ?? '',
      lastName: currentUser?.lastName ?? '',
      email: currentUser?.email ?? '',
      provinceId: currentUser?.provinceId ? String(currentUser.provinceId) : '',
      cityId: currentUser?.cityId ? String(currentUser.cityId) : '',
      profileImageUrl: currentUser?.profileImageUrl ?? '',
    }),
    [currentUser],
  );

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => {
    if (!isLoadingUser && currentUser) {
      form.reset(defaultValues, { keepDirty: false });
    }
  }, [currentUser, defaultValues, form, isLoadingUser]);

  useEffect(() => {
    if (defaultValues.provinceId) {
      setSelectedProvince(defaultValues.provinceId);
    }
  }, [defaultValues.provinceId]);

  const onSubmit = async (values: ProfileFormValues) => {
    const payload = {
      firstName: values.firstName?.trim() ? values.firstName.trim() : null,
      lastName: values.lastName?.trim() ? values.lastName.trim() : null,
      email: values.email?.trim() ? values.email.trim() : null,
      provinceId: values.provinceId ? Number(values.provinceId) : null,
      cityId: values.cityId ? Number(values.cityId) : null,
      profileImageUrl: values.profileImageUrl?.trim()
        ? values.profileImageUrl.trim()
        : null,
    };

    try {
      const updatedUser = await updateCurrentUser(payload).unwrap();
      if (authUser) {
        dispatch(
          updateUser({
            ...authUser,
            phone: updatedUser.phone,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            provinceId: updatedUser.provinceId,
            province: updatedUser.province,
            cityId: updatedUser.cityId,
            city: updatedUser.city,
            profileImageUrl: updatedUser.profileImageUrl,
          }),
        );
      }
      toast({
        title: t('toast.successTitle'),
        description: t('toast.successDescription'),
      });
      const nextProvince = updatedUser.provinceId ? String(updatedUser.provinceId) : '';
      form.reset({
        firstName: updatedUser.firstName ?? '',
        lastName: updatedUser.lastName ?? '',
        email: updatedUser.email ?? '',
        provinceId: nextProvince,
        cityId: updatedUser.cityId ? String(updatedUser.cityId) : '',
        profileImageUrl: updatedUser.profileImageUrl ?? '',
      });
      setSelectedProvince(nextProvince);
      if (nextProvince) {
        refetchCities();
      }
    } catch (error) {
      console.error('Failed to update profile', error);
      toast({
        title: t('toast.errorTitle'),
        description: t('toast.errorDescription'),
        variant: 'destructive',
      });
    }
  };

  const handleProvinceChange = (provinceId: string) => {
    setSelectedProvince(provinceId);
    form.setValue('provinceId', provinceId, { shouldDirty: true });
    form.setValue('cityId', '', { shouldDirty: true });
  };

  const handleProfileImageChange = (url: string | null) => {
    form.setValue('profileImageUrl', url ?? '', { shouldDirty: true });
  };

  const isSaving = isUpdating || form.formState.isSubmitting;

  if (isLoadingUser) {
    return (
      <Card className="border-border/70 shadow-sm">
        <CardHeader>
          <CardTitle>{t('title')}</CardTitle>
          <CardDescription>{t('description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse rounded-md bg-muted" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <ProfileImageUploader
          value={form.watch('profileImageUrl') || null}
          onChange={handleProfileImageChange}
          disabled={isSaving}
          texts={imageTexts}
        />
        <Card className="border-border/70 shadow-sm">
          <CardHeader>
            <CardTitle>{t('title')}</CardTitle>
            <CardDescription>{t('description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <span className="text-sm font-medium text-muted-foreground">
                {t('fields.phone.label')}
              </span>
              <Input
                id="profile-phone"
                value={phoneNumber}
                disabled
                readOnly
                inputMode="tel"
                dir="ltr"
              />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.firstName.label')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('fields.firstName.placeholder')}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.lastName.label')}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder={t('fields.lastName.placeholder')}
                        disabled={isSaving}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('fields.email.label')}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder={t('fields.email.placeholder')}
                      disabled={isSaving}
                      inputMode="email"
                      autoComplete="email"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="provinceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.province.label')}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        onChange={(event) => handleProvinceChange(event.target.value)}
                        disabled={isSaving || isLoadingProvinces}
                      >
                        <option value="">{t('fields.province.placeholder')}</option>
                        {provinces.map((province) => (
                          <option key={province.id} value={String(province.id)}>
                            {province.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fields.city.label')}</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSaving || !selectedProvince || isFetchingCities}
                      >
                        <option value="">{t('fields.city.placeholder')}</option>
                        {cities.map((city) => (
                          <option key={city.id} value={String(city.id)}>
                            {city.name}
                          </option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="flex justify-end">
            <Button type="submit" disabled={isSaving || !form.formState.isDirty}>
              {isSaving ? t('actions.saving') : t('actions.save')}
            </Button>
          </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
