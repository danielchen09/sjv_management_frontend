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

export async function signup(formData: FormData) {
    const supabase = await createClient()
    // type-casting here for convenience
    // in practice, you should validate your inputs
    const reqData = {
        email: 'daniel.weihan.chen@gmail.com',
        password: 'test123',
        first_name: 'test',
        last_name: 'user',
        role: 'admin',
        avatar_url: ''
    }
    const { data, error } = await supabase.auth.signUp(reqData)
    if (error) {
        console.log(error)
        return
    }
    const user = data.user
    if (!user) {
        console.log('No user returned after sign up')
        return
    }
    console.log(await supabase.auth.getUser())
    const { error: profileError } = await supabase.from('profiles').insert({
        id: user.id,
        first_name: reqData.first_name,
        last_name: reqData.last_name,
        role: reqData.role,
        avatar_url: reqData.avatar_url,
    })
    if (profileError) {
        console.log(profileError)
        return
    }
    revalidatePath('/', 'layout')
    redirect('/main/profile')
}


export default async function SignupPage() {
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
                                <CardTitle>Sign up</CardTitle>
                                <CardDescription>Enter your credentials to create your account</CardDescription>
                            </CardHeader>

                            <CardContent>
                                <form className='space-y-4'>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="email"
                                                type="email"
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
                                                placeholder="••••••••"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="first_name">First Name</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="first_name"
                                                type="text"
                                                placeholder="First Name"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="last_name">Last Name</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="last_name"
                                                type="text"
                                                placeholder="Last Name"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div>
                                    {/* <div className="space-y-2">
                                        <Label htmlFor="role">Role</Label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                id="role"
                                                type="text"
                                                placeholder="Role"
                                                className="pl-9"
                                                required
                                            />
                                        </div>
                                    </div> */}
                                    <Button formAction={signup} className="w-full">
                                        Sign Up
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
