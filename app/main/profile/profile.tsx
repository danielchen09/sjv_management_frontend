'use client';

import { Button } from "@/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/card";
import { Input } from "@/components/input";
import { Label } from "@/components/label";
import { createClient } from "@/utils/supabase/client";
import { Loader2, Lock, Mail, User } from "lucide-react";
import Image from "next/image";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast, Toaster } from "sonner";

export default function Profile({
    user
}: {
    user: any | null
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [isSavingProfile, setIsSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

    const buildAvatarUrl = useCallback((path: string | null | undefined) => {
        if (!path) return null;
        if (path.startsWith('http')) return path;
        if (!supabaseUrl) return null;
        return `${supabaseUrl}/storage/v1/object/public/avatars/${path}`;
    }, [supabaseUrl]);

    const initialAvatar = useMemo(() => buildAvatarUrl(user?.avatar_url), [buildAvatarUrl, user?.avatar_url]);
    const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatar);
    const [isAvatarUploading, setIsAvatarUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const initials = useMemo(() => {
        const firstInitial = firstName?.[0] || user?.first_name?.[0] || '';
        const lastInitial = lastName?.[0] || user?.last_name?.[0] || '';
        return (firstInitial + lastInitial || user?.email?.[0] || '?').toUpperCase();
    }, [firstName, lastName, user?.first_name, user?.last_name, user?.email]);

    const openFilePicker = () => {
        if (!isEditing) return;
        fileInputRef.current?.click();
    };

    const handleAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) {
            return;
        }
        setIsAvatarUploading(true);
        const supabase = createClient();
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${Date.now()}.${fileExt}`;
            const filePath = `${user.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) {
                toast.error(uploadError.message || 'Unable to upload profile picture.');
                return;
            }

            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: filePath })
                .eq('id', user.id);

            if (updateError) {
                toast.error(updateError.message || 'Uploaded image but failed to update profile.');
                return;
            }

            const publicUrl = buildAvatarUrl(filePath);
            setAvatarUrl(publicUrl);
            toast.success('Profile picture updated.');
        } finally {
            setIsAvatarUploading(false);
            event.target.value = '';
        }
    };

    const handleCancelEdit = () => {
        setIsEditing(false);
        setFirstName(user?.first_name || '');
        setLastName(user?.last_name || '');
        setEmail(user?.email || '');
        fileInputRef.current && (fileInputRef.current.value = '');
    };

    const handleSaveProfile = async () => {
        if (!user?.id) return;
        setIsSavingProfile(true);
        const supabase = createClient();
        try {
            const updates: Record<string, unknown> = {
                first_name: firstName,
                last_name: lastName,
                email,
            };

            const { error: profileError } = await supabase
                .from('profiles')
                .update(updates)
                .eq('id', user.id);

            if (profileError) {
                toast.error(profileError.message || 'Failed to update profile.');
                return;
            }

            if (email && email !== user.email) {
                const { error: emailError } = await supabase.auth.updateUser({ email });
                if (emailError) {
                    toast.error(emailError.message || 'Profile saved but email update failed.');
                } else {
                    toast.success('Profile updated. Please verify your new email if required.');
                }
            } else {
                toast.success('Profile updated.');
            }

            setIsEditing(false);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!email) {
            toast.error('Email is required to change password.');
            return;
        }
        if (!currentPassword || !newPassword || !confirmPassword) {
            toast.error('Please fill out all password fields.');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New password and confirmation do not match.');
            return;
        }
        if (newPassword.length < 6) {
            toast.error('New password should be at least 6 characters.');
            return;
        }

        setIsUpdatingPassword(true);
        const supabase = createClient();
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password: currentPassword,
            });
            if (signInError) {
                toast.error('Current password is incorrect.');
                return;
            }

            const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
            if (updateError) {
                toast.error(updateError.message || 'Failed to change password.');
                return;
            }

            toast.success('Password updated successfully.');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } finally {
            setIsUpdatingPassword(false);
        }
    };

    return (
        <div className="space-y-6 max-w-2xl">
            <Card>
                <CardHeader>
                    <CardTitle>Profile Details</CardTitle>
                    <CardDescription>Update your personal information and profile picture.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-6 space-y-4 sm:space-y-0">
                        <div
                            className={`relative w-32 h-32 rounded-full overflow-hidden ${isEditing ? 'group cursor-pointer' : ''}`}
                            onClick={openFilePicker}
                        >
                            {avatarUrl ? (
                                <Image
                                    src={avatarUrl}
                                    alt="Profile picture"
                                    fill
                                    className="object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-muted text-2xl font-semibold">
                                    {initials}
                                </div>
                            )}
                            {isEditing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isAvatarUploading ? (
                                        <Loader2 className="h-5 w-5 animate-spin" />
                                    ) : (
                                        <span className="text-sm font-medium">Change photo</span>
                                    )}
                                </div>
                            )}
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleAvatarChange}
                        />
                        <div className="flex-1 space-y-4 w-full">
                            <div className="flex flex-col sm:flex-row sm:space-x-2 space-y-4 sm:space-y-0">
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="first_name">First Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="first_name"
                                            disabled={!isEditing}
                                            className="pl-9"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2 flex-1">
                                    <Label htmlFor="last_name">Last Name</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="last_name"
                                            disabled={!isEditing}
                                            className="pl-9"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="email"
                                        type="email"
                                        disabled={!isEditing}
                                        className="pl-9"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" onClick={handleCancelEdit} disabled={isSavingProfile || isAvatarUploading}>
                                    Cancel
                                </Button>
                                <Button onClick={handleSaveProfile} disabled={isSavingProfile || isAvatarUploading}>
                                    {isSavingProfile ? (
                                        <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Saving
                                        </>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </Button>
                            </>
                        ) : (
                            <Button onClick={() => setIsEditing(true)}>
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>Update your password by confirming your current credentials.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current_password">Current Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="current_password"
                                type="password"
                                className="pl-9"
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                placeholder="Enter current password"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="new_password">New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="new_password"
                                type="password"
                                className="pl-9"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                placeholder="Enter new password"
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm_password">Confirm New Password</Label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="confirm_password"
                                type="password"
                                className="pl-9"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Confirm new password"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handlePasswordChange} disabled={isUpdatingPassword}>
                            {isUpdatingPassword ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Updating
                                </>
                            ) : (
                                'Update Password'
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
            <Toaster />
        </div>
    )
}
