'use server';

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/card'
import "../globals.css"
import { Input } from '@/components/input'
import { Lock, Mail, AlertCircle } from 'lucide-react';
import { Label } from '@/components/label';
import { Button } from '@/components/button';

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
    const supabase = await createClient()
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const data = {
        email: formData.get('email') as string,
        password: formData.get('password') as string,
    }
    console.log(data)
    const { error } = await supabase.auth.signInWithPassword(data)
    if (error) {
        console.log('error', error)
        return { success: false, message: error.message || 'Invalid login credentials.' }
    }
    revalidatePath('/', 'layout')
    redirect('/main/profile')
}

export async function handleLogin(formData: FormData) {
    'use server'
    const result = await login(formData);
    if (result?.success === false) {
        redirect(`/login?error=${encodeURIComponent(result.message ?? 'Invalid login credentials.')}`);
    }
}


export default async function LoginPage({ searchParams }: { searchParams?: Record<string, string | string[] | undefined> }) {
    const errorMessage = typeof searchParams?.error === 'string' ? searchParams.error : null;
    return (
        <html>
            <body>
                <div className="min-h-screen w-full flex items-center justify-center p-4">
                    <div className="w-full max-w-md space-y-6">
                        <div className="text-center space-y-2">
                            <h1 className="text-4xl">SJ Venture Inventory Management System</h1>
                        </div>

                        <Card>
                            <CardHeader>
                                <CardTitle>Sign in</CardTitle>
                                <CardDescription>Enter your credentials to access your account</CardDescription>
                            </CardHeader>

                            <CardContent>
                                <form
                                    className='space-y-4'
                                    action={handleLogin}
                                >
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
                                                name="email"
                                                placeholder="name@example.com"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="password"
                                                type="password"
                                                name="password"
                                                placeholder="••••••••"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {errorMessage && (
                                        <div className="flex items-center gap-2 text-destructive text-sm">
                                            <AlertCircle className="h-4 w-4" />
                                            <span>{errorMessage}</span>
                                        </div>
                                    )}
                                    <Button type="submit" className="w-full">
                                        Sign In
                                    </Button>
                                </form>
                            </CardContent>

                        </Card>


                    </div>
                </div>
            </body>
        </html>
    )
}
