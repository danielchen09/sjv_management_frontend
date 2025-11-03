import { createClient } from '@/utils/supabase/server'
import Profile from "./profile";

export default async function ProfilePage() {
	const supabase = await createClient()
	const {
		data: { user },
	} = await supabase.auth.getUser()
	const { data: profile } = await supabase.from('profiles').select('*').eq('id', user?.id).single()
	const hydratedProfile = profile ? { ...profile, email: profile.email ?? user?.email ?? '' } : null;

	return (
		<div className="space-y-6">
			<div>
				<h1>Profile</h1>
				<p className="text-muted-foreground">
					Manage your account information
				</p>
			</div>
			<Profile user={hydratedProfile} />
		</div>
	);
}
