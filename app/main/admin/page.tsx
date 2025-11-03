import { Card, CardContent, CardHeader, CardTitle } from "@/components/card";
import { createClient } from '@/utils/supabase/server'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import StoreManagement from "./store_management";
import UserManagement from "./user_management";
import { revalidatePath } from "next/cache";
import AdminDashboard from "./dashboard";

export default async function AdminPage() {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()

	const { data: stores } = await supabase.from('stores').select('*')

	const handleAddStore = (newStore: { name: string; address: string }) => {
		supabase.from('stores').insert(newStore)
		revalidatePath('/main/admin')
	}

	// async function addStoreAction () {
	// 	'use server';
	// 	const result = await supabase.from('stores').insert({ name: 'New Store', address: '123 Main St' })
		
	// }

	return (
		<div className="space-y-6">

			<div>
				<h1>Admin Portal</h1>
				<p className="text-muted-foreground">
					{profile?.role === 'admin'
						? 'Manage stores, users, and view system-wide analytics'
						: 'Manage your team and view store analytics'}
				</p>
			</div>
			
			<AdminDashboard profile={profile} />

			<Tabs defaultValue={profile?.role == 'admin' ? 'stores' : 'users'} className="space-y-4">
				<TabsList>
					{profile?.role == 'admin' && <TabsTrigger value="stores">Store Management</TabsTrigger>}
					<TabsTrigger value="users">User Management</TabsTrigger>
				</TabsList>
				{profile?.role == 'admin' && (
					<TabsContent value="stores">
						<StoreManagement stores={stores} />
					</TabsContent>
				)}
				<TabsContent value="users">
					<UserManagement stores={stores} currentUser={profile} />
				</TabsContent>
			</Tabs>
		</div>
	);
}
